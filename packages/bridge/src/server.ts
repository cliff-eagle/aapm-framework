/**
 * AAPM Bridge Server — WebSocket gateway between Unity and the AAPM engine.
 *
 * Starts a WebSocket server that Unity connects to. Each client connection
 * gets its own SimulationSession from the session-orchestrator. Messages
 * flow through the bridge protocol defined in protocol.ts.
 *
 * Usage:
 *   npx tsx packages/bridge/src/server.ts
 *
 * Or programmatically:
 *   import { startBridgeServer } from './server';
 *   const server = startBridgeServer({ port: 8765 });
 *
 * @module bridge/server
 */

import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

import type {
    BridgeMessage,
    ClientMessageType,
    SessionInitRequest,
    NPCApproachRequest,
    DialogueStartRequest,
    DialogueTurnRequest,
    DialogueEndRequest,
    NavigateRequest,
    NPCInfo,
    SessionInitResponse,
    DialogueStartResponse,
    DialogueTurnResponse,
    DialogueEndResponse,
    NavigateResponse,
    ErrorResponse,
    ScenarioStartRequest,
    ScenarioAdvanceRequest,
    ScenarioChainResponse,
} from './protocol';

// ─── Session-Orchestrator imports ─────────────────────────────

import {
    initSession,
    navigate,
    startNPCDialogue,
    processLearnerTurn,
    finishDialogue,
    endSession,
    getVisibleNPCs,
    getNavigableLocations,
} from '../../core/src/session-orchestrator';

import type { SimulationSession } from '../../core/src/session-orchestrator';
import type { NPCWorldState } from '../../core/src/world-engine';
import type { NPCDialogueDefinition, FrictionEvent } from '../../core/src/dialogue-engine';

import {
    analyzeCulturalViolations,
    scheduleRetentionItems,
    evaluateTierProgression,
} from '../../core/src/session-orchestrator/module-wiring';

// ─── Types ────────────────────────────────────────────────────

export interface BridgeServerConfig {
    port: number;
    host?: string;
    /** Default persona schema environment to use */
    defaultEnvironment?: Record<string, unknown>;
}

interface ScenarioChain {
    cityName: string;
    locationId: string;
    steps: Array<{
        id: string;
        step: number;
        name: Record<string, string>;
        npcRole: string | null;
        register: string;
        goal: string;
        required: boolean;
        vocabularyFocus: string[];
        phase: string;
    }>;
    currentStep: number;
    completedSteps: string[];
    active: boolean;
}

const PORT_ARRIVAL_STEPS = [
    { id: 'vhf-radio-call', step: 1, name: { en: 'VHF Radio Call' }, npcRole: 'port-control', register: 'formal', goal: 'Request permission to enter the port and berth assignment', required: true, vocabularyFocus: ['maritime', 'radio-protocol'], phase: 'arrival' },
    { id: 'harbor-master', step: 2, name: { en: 'Harbor Master' }, npcRole: 'harbor-master', register: 'formal', goal: 'Complete arrival paperwork, negotiate berth fees', required: true, vocabularyFocus: ['maritime', 'regulations', 'numbers'], phase: 'arrival' },
    { id: 'customs-clearance', step: 3, name: { en: 'Customs' }, npcRole: 'customs-officer', register: 'formal', goal: 'Present crew passports and ship documents', required: true, vocabularyFocus: ['customs', 'documentation'], phase: 'arrival' },
    { id: 'fuel-dock', step: 4, name: { en: 'Fuel Dock' }, npcRole: 'fuel-attendant', register: 'neutral', goal: 'Refuel the yacht', required: false, vocabularyFocus: ['maritime', 'numbers'], phase: 'docked' },
    { id: 'explore-city', step: 5, name: { en: 'Explore' }, npcRole: null, register: 'mixed', goal: 'Provision and explore', required: false, vocabularyFocus: ['food-and-drink', 'shopping'], phase: 'docked' },
    { id: 'departure', step: 6, name: { en: 'Departure' }, npcRole: 'port-control', register: 'formal', goal: 'Request permission to depart', required: true, vocabularyFocus: ['maritime', 'radio-protocol', 'weather'], phase: 'departure' },
];

interface ClientState {
    session: SimulationSession | null;
    clientId: string;
    connectedAt: number;
    scenarioChain: ScenarioChain | null;
}

// ─── Server ───────────────────────────────────────────────────

export function startBridgeServer(config: BridgeServerConfig) {
    const { port, host = '0.0.0.0' } = config;
    const clients = new Map<WebSocket, ClientState>();

    const wss = new WebSocketServer({ port, host });

    console.log(`\n🌉 AAPM Bridge Server`);
    console.log(`   Listening on ws://${host}:${port}`);
    console.log(`   Waiting for Unity client...\n`);

    wss.on('connection', (ws) => {
        const clientId = randomUUID().slice(0, 8);
        console.log(`🎮 Client ${clientId} connected`);

        clients.set(ws, {
            session: null,
            clientId,
            connectedAt: Date.now(),
            scenarioChain: null,
        });

        ws.on('message', async (raw) => {
            try {
                const msg = JSON.parse(raw.toString()) as BridgeMessage<ClientMessageType>;
                const state = clients.get(ws)!;
                await handleMessage(ws, state, msg);
            } catch (err) {
                sendError(ws, 'parse_error', `Invalid message: ${(err as Error).message}`, '0');
            }
        });

        ws.on('close', () => {
            const state = clients.get(ws);
            if (state?.session) {
                endSession(state.session);
                console.log(`   Session ended for client ${state.clientId}`);
            }
            clients.delete(ws);
            console.log(`👋 Client ${clientId} disconnected`);
        });

        ws.on('error', (err) => {
            console.error(`❌ Client ${clientId} error:`, err.message);
        });
    });

    return {
        wss,
        close: () => {
            clients.forEach((state, ws) => {
                if (state.session) endSession(state.session);
                ws.close();
            });
            wss.close();
            console.log('\n🛑 Bridge server shut down');
        },
    };
}

// ─── Message Router ───────────────────────────────────────────

async function handleMessage(
    ws: WebSocket,
    state: ClientState,
    msg: BridgeMessage<ClientMessageType>,
) {
    const { type, id, payload } = msg;

    switch (type) {
        case 'ping':
            send(ws, 'pong', { timestamp: Date.now() }, id);
            break;

        case 'session/init':
            handleSessionInit(ws, state, payload as SessionInitRequest, id);
            break;

        case 'npc/approach':
            handleNPCApproach(ws, state, payload as NPCApproachRequest, id);
            break;

        case 'dialogue/start':
            handleDialogueStart(ws, state, payload as DialogueStartRequest, id);
            break;

        case 'dialogue/turn':
            handleDialogueTurn(ws, state, payload as DialogueTurnRequest, id);
            break;

        case 'dialogue/end':
            handleDialogueEnd(ws, state, payload as DialogueEndRequest, id);
            break;

        case 'navigate':
            handleNavigate(ws, state, payload as NavigateRequest, id);
            break;

        case 'get/npcs':
            handleGetNPCs(ws, state, id);
            break;

        case 'get/locations':
            handleGetLocations(ws, state, id);
            break;

        case 'scenario/start':
            handleScenarioStart(ws, state, payload as ScenarioStartRequest, id);
            break;

        case 'scenario/advance':
            handleScenarioAdvance(ws, state, payload as ScenarioAdvanceRequest, id);
            break;

        case 'scenario/status':
            handleScenarioStatus(ws, state, id);
            break;

        // ── Unity Agent Telemetry ────────────────────────────
        case 'agent/decision': {
            const decision = payload as { agentType: string; decisionType: string; message: string };
            console.log(`[Bridge] Agent decision: ${decision.agentType}/${decision.decisionType}: ${decision.message}`);
            if (state.session) {
                state.session.eventLog.push({
                    eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    type: 'AGENT_DECISION',
                    emittedAt: new Date().toISOString(),
                    source: `unity:${decision.agentType}` as any,
                    learnerId: state.session.learnerId,
                    sessionId: state.session.sessionId,
                    correlationId: id,
                    payload: decision,
                    schemaVersion: '1.0',
                });
            }
            send(ws, 'agent/ack', { received: true }, id);
            break;
        }

        case 'scenario/state': {
            const scenarioState = payload as { portId: string; status: string; phases: unknown };
            console.log(`[Bridge] Scenario state: ${scenarioState.portId} → ${scenarioState.status}`);
            if (state.session) {
                state.session.eventLog.push({
                    eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    type: 'SCENARIO_STATE_CHANGED',
                    emittedAt: new Date().toISOString(),
                    source: 'unity:scenario_director',
                    learnerId: state.session.learnerId,
                    sessionId: state.session.sessionId,
                    correlationId: id,
                    payload: scenarioState,
                    schemaVersion: '1.0',
                });
            }
            send(ws, 'agent/ack', { received: true }, id);
            break;
        }

        case 'evaluation/metrics': {
            const metrics = payload as { portId: string; cefrLevel: string; overallAccuracy: number };
            console.log(`[Bridge] Evaluation metrics: ${metrics.portId}, CEFR=${metrics.cefrLevel}, acc=${metrics.overallAccuracy}`);
            if (state.session) {
                state.session.eventLog.push({
                    eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    type: 'EVALUATION_METRICS_RECEIVED',
                    emittedAt: new Date().toISOString(),
                    source: 'unity:progression_agent',
                    learnerId: state.session.learnerId,
                    sessionId: state.session.sessionId,
                    correlationId: id,
                    payload: metrics,
                    schemaVersion: '1.0',
                });
            }
            send(ws, 'agent/ack', { received: true }, id);
            break;
        }

        default:
            sendError(ws, 'unknown_type', `Unknown message type: ${type}`, id);
    }
}

// ─── Handlers ─────────────────────────────────────────────────

function handleSessionInit(
    ws: WebSocket,
    state: ClientState,
    req: SessionInitRequest,
    msgId: string,
) {
    try {
        // Create a minimal schema environment for the session
        const environment = {
            id: 'unity-world',
            name: { en: 'Unity World', es: 'Mundo Unity' },
            description: 'Unity 3D environment connected via bridge',
            locations: [],
            npcs: [],
            time_of_day: 'morning',
        };

        state.session = initSession(
            req.schemaId,
            req.learnerId,
            environment as never, // The session orchestrator will handle schema loading
        );

        const visibleNPCs = getVisibleNPCs(state.session);
        const locations = getNavigableLocations(state.session);

        const response: SessionInitResponse = {
            sessionId: state.session.sessionId,
            worldState: {
                currentLocation: state.session.worldState.learnerLocation,
                timeOfDay: state.session.worldState.timeSystem.enabled ? 12 : 0,
                locations: locations.map((l: { id: string; name: Record<string, string>; description: string }) => ({
                    id: l.id,
                    name: l.name.en || l.name.es || l.id,
                    description: l.description,
                })),
            },
            availableNPCs: visibleNPCs.map((npc: { npcState: NPCWorldState; definition: NPCDialogueDefinition }) => ({
                id: npc.npcState.npcId,
                name: npc.definition.name,
                role: npc.definition.role,
                mood: npc.npcState.mood,
                moodValence: 0,
                reputation: npc.npcState.reputationWithLearner,
                locationId: npc.npcState.currentLocation,
                personality: npc.definition.personality,
                register: npc.definition.register,
            })),
        };

        console.log(`   ✅ Session ${state.session.sessionId} initialized for ${req.learnerId}`);
        send(ws, 'session/ready', response, msgId);
    } catch (err) {
        sendError(ws, 'session_init_failed', (err as Error).message, msgId);
    }
}

function handleNPCApproach(
    ws: WebSocket,
    state: ClientState,
    req: NPCApproachRequest,
    msgId: string,
) {
    if (!state.session) return sendError(ws, 'no_session', 'No active session', msgId);

    const visibleNPCs = getVisibleNPCs(state.session);
    const npc = visibleNPCs.find((n: { npcState: NPCWorldState }) => n.npcState.npcId === req.npcId);

    if (!npc) {
        return sendError(ws, 'npc_not_found', `NPC ${req.npcId} not visible`, msgId);
    }

    const info: NPCInfo = {
        id: npc.npcState.npcId,
        name: npc.definition.name,
        role: npc.definition.role,
        mood: npc.npcState.mood,
        moodValence: 0,
        reputation: npc.npcState.reputationWithLearner,
        locationId: npc.npcState.currentLocation,
        personality: npc.definition.personality,
        register: npc.definition.register,
    };

    console.log(`   👤 Player approached ${npc.definition.name} (${npc.definition.role})`);
    send(ws, 'npc/info', info, msgId);
}

function handleDialogueStart(
    ws: WebSocket,
    state: ClientState,
    req: DialogueStartRequest,
    msgId: string,
) {
    if (!state.session) return sendError(ws, 'no_session', 'No active session', msgId);

    const updated = startNPCDialogue(
        state.session,
        req.npcId,
        req.goal,
        req.injectionTargets,
    );

    if (!updated) {
        return sendError(ws, 'dialogue_failed', `Cannot start dialogue with ${req.npcId}`, msgId);
    }

    state.session = updated;

    const dialogue = state.session.activeDialogue!;
    const visibleNPCs = getVisibleNPCs(state.session);
    const npcDef = visibleNPCs.find((n: { npcState: NPCWorldState }) => n.npcState.npcId === req.npcId);

    const response: DialogueStartResponse = {
        dialogueId: dialogue.sessionId,
        npcId: req.npcId,
        npcName: npcDef?.definition.name || req.npcId,
        npcMood: state.session.worldState.npcStates[req.npcId]?.mood ?? 'neutral',
        npcGreeting: `[NPC ${req.npcId} greets the player]`, // In production: LLM generates this
        npcRegister: dialogue.npcBehavior.registerStrictness > 0.7 ? 'formal' : 'informal',
        goal: req.goal,
    };

    console.log(`   💬 Dialogue started with ${req.npcId}: "${req.goal}"`);
    send(ws, 'dialogue/started', response, msgId);
}

function handleDialogueTurn(
    ws: WebSocket,
    state: ClientState,
    req: DialogueTurnRequest,
    msgId: string,
) {
    if (!state.session) return sendError(ws, 'no_session', 'No active session', msgId);
    if (!state.session.activeDialogue) return sendError(ws, 'no_dialogue', 'No active dialogue', msgId);

    // Process the learner turn through the session orchestrator
    const updated = processLearnerTurn(state.session, req.text);

    if (!updated) {
        return sendError(ws, 'turn_failed', 'Failed to process turn', msgId);
    }

    state.session = updated;

    const dialogue = state.session.activeDialogue!;
    const lastTurn = dialogue.turns[dialogue.turns.length - 1];

    // Analyze for cultural violations
    const culturalAlert = analyzeCulturalViolations(
        req.text,
        dialogue.npcBehavior.registerStrictness > 0.7 ? 'formal' : 'informal',
    );

    const response: DialogueTurnResponse = {
        npcText: `[NPC responds to: "${req.text}"]`, // In production: LLM generates this
        npcMood: state.session.worldState.npcStates[dialogue.npcId]?.mood ?? 'neutral',
        frictionEvents: lastTurn?.frictionEvents?.map((e: FrictionEvent) => ({
            type: e.type,
            description: e.description,
            severity: e.severity,
            targetForm: e.targetForm,
            learnerProduction: e.learnerProduction,
        })) || [],
        culturalAlerts: culturalAlert ? [{
            violationType: culturalAlert.violationType,
            severity: culturalAlert.severity,
            suggestion: culturalAlert.suggestion,
        }] : [],
        refractions: [], // In production: refraction module generates these
        turnNumber: dialogue.turns.length,
    };

    console.log(`   🗣 Turn ${dialogue.turns.length}: "${req.text.slice(0, 40)}..."`);
    send(ws, 'dialogue/npc-turn', response, msgId);
}

function handleDialogueEnd(
    ws: WebSocket,
    state: ClientState,
    req: DialogueEndRequest,
    msgId: string,
) {
    if (!state.session) return sendError(ws, 'no_session', 'No active session', msgId);
    if (!state.session.activeDialogue) return sendError(ws, 'no_dialogue', 'No active dialogue', msgId);

    const result = finishDialogue(state.session, req.goalAchieved);
    if (!result) {
        return sendError(ws, 'end_failed', 'Failed to end dialogue', msgId);
    }

    state.session = result.session;
    const { outcome } = result;

    // Schedule retention items
    const retention = scheduleRetentionItems(outcome.frictionEvents);

    // Check tier progression
    const tierProg = evaluateTierProgression(
        1, // current tier — in production, from session state
        outcome.frictionEvents,
        outcome.goalAchieved,
    );

    const response: DialogueEndResponse = {
        outcome: {
            goalAchieved: outcome.goalAchieved,
            totalTurns: outcome.totalTurns,
            reputationDelta: outcome.reputationDelta,
            frictionCount: outcome.frictionEvents.length,
            registerAccuracy: outcome.registerAccuracy,
            finalMood: typeof outcome.finalMood === 'string' ? outcome.finalMood : 'neutral',
        },
        retentionItems: retention.newItems,
        tierProgression: tierProg ? {
            currentTier: 1,
            shouldTransition: tierProg.shouldTransition,
            targetTier: tierProg.targetTier,
            reason: tierProg.reason,
        } : null,
    };

    console.log(`   ✅ Dialogue ended — goal: ${req.goalAchieved ? 'achieved' : 'failed'}, reputation: ${outcome.reputationDelta > 0 ? '+' : ''}${outcome.reputationDelta}`);
    send(ws, 'dialogue/ended', response, msgId);
}

function handleNavigate(
    ws: WebSocket,
    state: ClientState,
    req: NavigateRequest,
    msgId: string,
) {
    if (!state.session) return sendError(ws, 'no_session', 'No active session', msgId);

    const updated = navigate(state.session, req.targetLocationId);
    if (!updated) {
        return sendError(ws, 'navigate_failed', `Cannot navigate to ${req.targetLocationId}`, msgId);
    }

    state.session = updated;

    const npcs = getVisibleNPCs(state.session);
    const locations = getNavigableLocations(state.session);

    const response: NavigateResponse = {
        success: true,
        newLocationId: state.session.worldState.learnerLocation,
        newLocationName: req.targetLocationId,
        availableNPCs: npcs.map((n: { npcState: NPCWorldState; definition: NPCDialogueDefinition }) => ({
            id: n.npcState.npcId,
            name: n.definition.name,
            role: n.definition.role,
            mood: n.npcState.mood,
            moodValence: 0,
            reputation: n.npcState.reputationWithLearner,
            locationId: n.npcState.currentLocation,
            personality: n.definition.personality,
            register: n.definition.register,
        })),
        navigableLocations: locations.map((l: { id: string; name: Record<string, string>; accessible: boolean }) => ({
            id: l.id,
            name: l.name.en || l.name.es || l.id,
            accessible: l.accessible,
        })),
    };

    console.log(`   🚶 Navigated to ${req.targetLocationId}`);
    send(ws, 'navigate/result', response, msgId);
}

function handleGetNPCs(ws: WebSocket, state: ClientState, msgId: string) {
    if (!state.session) return sendError(ws, 'no_session', 'No active session', msgId);

    const npcs = getVisibleNPCs(state.session);
    send(ws, 'npcs/list', {
        npcs: npcs.map((n: { npcState: NPCWorldState; definition: NPCDialogueDefinition }) => ({
            id: n.npcState.npcId,
            name: n.definition.name,
            role: n.definition.role,
            mood: n.npcState.mood,
            moodValence: 0,
            reputation: n.npcState.reputationWithLearner,
            locationId: n.npcState.currentLocation,
            personality: n.definition.personality,
            register: n.definition.register,
        })),
    }, msgId);
}

function handleGetLocations(ws: WebSocket, state: ClientState, msgId: string) {
    if (!state.session) return sendError(ws, 'no_session', 'No active session', msgId);

    const locations = getNavigableLocations(state.session);
    send(ws, 'locations/list', {
        locations: locations.map((l: { id: string; name: Record<string, string>; accessible: boolean; description: string }) => ({
            id: l.id,
            name: l.name.en || l.name.es || l.id,
            accessible: l.accessible,
            description: l.description,
        })),
    }, msgId);
}

// ─── Scenario Chain Handlers ──────────────────────────────────

function handleScenarioStart(
    ws: WebSocket,
    state: ClientState,
    req: ScenarioStartRequest,
    msgId: string,
) {
    if (!state.session) return sendError(ws, 'no_session', 'No active session', msgId);

    const chain: ScenarioChain = {
        cityName: req.cityName,
        locationId: req.locationId,
        steps: PORT_ARRIVAL_STEPS.map(s => ({ ...s })),
        currentStep: 0,
        completedSteps: [],
        active: true,
    };

    state.scenarioChain = chain;
    console.log('   \u2693 Scenario started: ' + req.cityName);

    sendScenarioResponse(ws, chain, msgId);
}

function handleScenarioAdvance(
    ws: WebSocket,
    state: ClientState,
    req: ScenarioAdvanceRequest,
    msgId: string,
) {
    const chain = state.scenarioChain;
    if (!chain || !chain.active) {
        return sendError(ws, 'no_scenario', 'No active scenario chain', msgId);
    }

    // Mark current step as completed
    const current = chain.steps[chain.currentStep];
    if (current && !chain.completedSteps.includes(current.id)) {
        chain.completedSteps.push(current.id);
    }

    // Find next step
    let next = chain.currentStep + 1;
    const skipOptional = req.skipOptional || false;
    while (next < chain.steps.length) {
        if (skipOptional && !chain.steps[next].required) {
            next++;
            continue;
        }
        break;
    }

    if (next >= chain.steps.length) {
        chain.active = false;
        chain.currentStep = chain.steps.length - 1;
        console.log('   \u2693 Scenario complete: ' + chain.cityName);
    } else {
        chain.currentStep = next;
        console.log('   \u2693 Scenario step ' + (next + 1) + ': ' + chain.steps[next].name.en);
    }

    sendScenarioResponse(ws, chain, msgId);
}

function handleScenarioStatus(
    ws: WebSocket,
    state: ClientState,
    msgId: string,
) {
    const chain = state.scenarioChain;
    if (!chain) {
        const emptyResponse: ScenarioChainResponse = {
            active: false,
            cityName: '',
            currentStep: null,
            completedSteps: [],
            totalSteps: 0,
            allRequiredComplete: false,
        };
        return send(ws, 'scenario/chain', emptyResponse, msgId);
    }
    sendScenarioResponse(ws, chain, msgId);
}

function sendScenarioResponse(ws: WebSocket, chain: ScenarioChain, msgId: string) {
    const step = chain.steps[chain.currentStep];
    const response: ScenarioChainResponse = {
        active: chain.active,
        cityName: chain.cityName,
        currentStep: step ? {
            id: step.id,
            step: step.step,
            name: step.name.en || step.id,
            npcRole: step.npcRole,
            register: step.register,
            goal: step.goal,
            required: step.required,
            phase: step.phase,
        } : null,
        completedSteps: chain.completedSteps,
        totalSteps: chain.steps.length,
        allRequiredComplete: chain.steps
            .filter(s => s.required)
            .every(s => chain.completedSteps.includes(s.id)),
    };
    send(ws, 'scenario/chain', response, msgId);
}

// ─── Helpers ──────────────────────────────────────────────────

function send(ws: WebSocket, type: string, payload: unknown, replyTo: string) {
    const msg: BridgeMessage = {
        type,
        id: randomUUID().slice(0, 8),
        payload,
        timestamp: Date.now(),
    };
    ws.send(JSON.stringify(msg));
}

function sendError(ws: WebSocket, code: string, message: string, replyTo: string) {
    const payload: ErrorResponse = { code, message };
    send(ws, 'error', payload, replyTo);
    console.log(`   ❌ Error [${code}]: ${message}`);
}

// ─── CLI Entry ────────────────────────────────────────────────

if (process.argv[1]?.includes('server')) {
    const port = parseInt(process.env.AAPM_BRIDGE_PORT || '8765', 10);
    startBridgeServer({ port });
}
