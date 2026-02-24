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

interface ClientState {
    session: SimulationSession | null;
    clientId: string;
    connectedAt: number;
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
