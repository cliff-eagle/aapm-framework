/**
 * AAPM Session Orchestrator
 *
 * The missing wiring layer that connects:
 *   Schema → WorldState → Dialogue → Events → Feedback Pipeline
 *
 * This is the runtime coordinator that:
 *   1. Initializes a simulation session from a loaded schema
 *   2. Manages world state transitions (navigation, time, events)
 *   3. Orchestrates dialogue lifecycle with NPC behavior
 *   4. Emits canonical events to the event bus
 *   5. Feeds dialogue outcomes into the macro-loop pipeline
 *   6. Handles ambient event evaluation and mood decay
 *
 * @module session-orchestrator
 * @patentCritical Claims 7, 13 — Session lifecycle wiring
 */

import type { WorldState, NPCWorldState, AmbientEvent } from '../world-engine';
import type {
    BigFiveProfile,
    CulturalOverlay,
    SchemaNPCDefinition,
    SchemaEnvironment,
    NPCMoodState,
    MoodTriggerEvent,
    NPCBehaviorModifiers,
} from '../world-engine';

import {
    createWorldState,
    navigateTo,
    advanceTime,
    getNPCsAtLocation,
    getCurrentTimeSlot,
    fireAmbientEvent,
    clearAmbientEvent,
    updateReputation,
    computeNPCBehavior,
    computeMoodShift,
    shouldDecayMood,
    getReputationBehaviorDescriptor,
} from '../world-engine';

import {
    startDialogue,
    recordLearnerTurn,
    recordNpcTurn,
    endDialogue,
    applyDialogueOutcome,
    buildNPCPromptContext,
    computeDialogueMoodShift,
} from '../dialogue-engine';
import type {
    DialogueSession,
    DialogueOutcome,
    FrictionEvent,
    RegisterAnalysis,
    NPCDialogueDefinition,
} from '../dialogue-engine';

import type {
    AAPMEventEnvelope,
    AAPMEventType,
    AAPMModuleId,
    FrictionDetectedPayload,
    ReputationDeltaPayload,
    SessionStartedPayload,
    SessionEndedPayload,
} from '../event-bus/types';

import { ModuleHookRegistry } from './module-hooks';
import type {
    SessionLifecycleEvent,
    TurnEvent,
    TickEvent,
    DialogueEvent,
    ModuleHook,
} from './module-hooks';

export { ModuleHookRegistry } from './module-hooks';
export type * from './module-hooks';

export { createAgentHook } from './agent-hook';
export type { AgentHookConfig } from './agent-hook';

// Module wiring — bridges all disconnected modules into the session lifecycle
export {
    routeByModality,
    selectDeliveryFormat,
    evaluateTierGate,
    evaluateTierProgression,
    scheduleRetentionItems,
    analyzeCulturalViolations,
    buildRefractionRequest,
    validatePersonaSchema,
    composePrompt,
    initPromptRegistry,
    InMemoryPromptRegistry,
    PROMPT_TO_SCHEMA_MAPPING,
    RETENTION_TO_FORMAT,
    FORMAT_CAPABILITIES,
} from './module-wiring';
export type {
    ModuleWiringConfig,
    LoadedPersonaSchema,
    InputModality,
    ModalityRoutingResult,
    DeliveryFormat,
    DeliveryContext,
    // TierType omitted — exported from root ./types to avoid collision
    TierSystemState,
    TierReadiness,
    RetentionEngineState,
    ChurnRiskAssessment,
    StudentCohort,
    InstructorDashboard,
    CulturalIntelligenceProfile,
    CulturalViolation,
    IHEForwardInjectionSpec,
    NPCBehaviorResolution,
    TransferResolution,
    RefractionRequest,
    Refraction,
    PromptRegistry,
} from './module-wiring';

// ─── Session State ────────────────────────────────────────────

export interface SimulationSession {
    /** Session ID */
    sessionId: string;
    /** Learner ID */
    learnerId: string;
    /** Schema ID */
    schemaId: string;
    /** Current world state */
    worldState: WorldState;
    /** NPC definitions from schema (for dialogue lookup) */
    npcDefinitions: Map<string, NPCDialogueDefinition>;
    /** Active dialogue session (null if not in dialogue) */
    activeDialogue: DialogueSession | null;
    /** Turn counter (interactions across all dialogues) */
    globalTurnCount: number;
    /** Mood turn counters per NPC (for decay) */
    npcMoodTurnCounters: Record<string, number>;
    /** Event log */
    eventLog: AAPMEventEnvelope[];
    /** Module hook registry — wires orphaned modules into lifecycle */
    hookRegistry: ModuleHookRegistry;
    /** Session start timestamp */
    startedAt: number;
    /** Session status */
    status: 'active' | 'paused' | 'ended';
}

// ─── Event Emitter Interface ──────────────────────────────────

export interface EventEmitter {
    emit(event: AAPMEventEnvelope): void;
}

// ─── Session Lifecycle ────────────────────────────────────────

/**
 * Initialize a simulation session from a parsed persona schema.
 */
export function initSession(
    schemaId: string,
    learnerId: string,
    environment: SchemaEnvironment,
    emitter?: EventEmitter,
): SimulationSession {
    const sessionId = `sim-${Date.now()}-${learnerId}`;

    const worldState = createWorldState(schemaId, environment, sessionId);

    // Build NPC definition map for quick dialogue lookups
    const npcDefs = new Map<string, NPCDialogueDefinition>();
    for (const npc of environment.tier_2.npc_roster) {
        npcDefs.set(npc.id, schemaNpcToDialogueDefinition(npc));
    }

    // Initialize mood turn counters
    const moodCounters: Record<string, number> = {};
    for (const npc of environment.tier_2.npc_roster) {
        moodCounters[npc.id] = 0;
    }

    const hookRegistry = new ModuleHookRegistry();

    const session: SimulationSession = {
        sessionId,
        learnerId,
        schemaId,
        worldState,
        npcDefinitions: npcDefs,
        activeDialogue: null,
        globalTurnCount: 0,
        npcMoodTurnCounters: moodCounters,
        eventLog: [],
        hookRegistry,
        startedAt: Date.now(),
        status: 'active',
    };

    // Emit session started event
    if (emitter) {
        emitter.emit(createEvent('SESSION_STARTED', 'world-engine', learnerId, sessionId, {
            tier: 2,
            personaSchemaId: schemaId,
            npcIds: Array.from(npcDefs.keys()),
        } as SessionStartedPayload));
    }

    return session;
}

// ─── World Navigation ─────────────────────────────────────────

/**
 * Navigate the learner to a connected location.
 * Returns updated session, or null if navigation blocked.
 */
export function navigate(
    session: SimulationSession,
    targetLocationId: string,
    emitter?: EventEmitter,
): SimulationSession | null {
    if (session.activeDialogue) return null; // Can't navigate mid-dialogue

    const newWorld = navigateTo(session.worldState, targetLocationId);
    if (!newWorld) return null;

    const updated = {
        ...session,
        worldState: newWorld,
    };

    if (emitter) {
        emitter.emit(createEvent('WORLD_STATE_CHANGED', 'world-engine', session.learnerId, session.sessionId, {
            change: 'navigation',
            from: session.worldState.learnerLocation,
            to: targetLocationId,
        }));
    }

    return updated;
}

// ─── Time Management ──────────────────────────────────────────

/**
 * Advance time, apply mood decay, check ambient event triggers.
 */
export function tick(
    session: SimulationSession,
    emitter?: EventEmitter,
): SimulationSession {
    let worldState = advanceTime(session.worldState);
    const moodCounters = { ...session.npcMoodTurnCounters };

    // Mood decay check for all NPCs
    for (const [npcId, npcState] of Object.entries(worldState.npcStates)) {
        moodCounters[npcId] = (moodCounters[npcId] ?? 0) + 1;

        if (shouldDecayMood(npcState.mood as NPCMoodState, moodCounters[npcId])) {
            worldState = {
                ...worldState,
                npcStates: {
                    ...worldState.npcStates,
                    [npcId]: {
                        ...npcState,
                        mood: 'neutral',
                    },
                },
            };
            moodCounters[npcId] = 0;

            if (emitter) {
                emitter.emit(createEvent('NPC_MOOD_CHANGED', 'world-engine', session.learnerId, session.sessionId, {
                    npcId,
                    previousMood: npcState.mood,
                    newMood: 'neutral',
                    reason: 'decay',
                }));
            }
        }
    }

    // Ambient event evaluation
    const timeSlot = getCurrentTimeSlot(worldState);
    if (timeSlot) {
        for (const event of worldState.ambientEvents) {
            if (worldState.activeEvents.includes(event.id)) continue;
            const probability = timeSlot.ambientEventProbability[event.id] ?? 0;
            if (probability > 0 && Math.random() < probability) {
                worldState = fireAmbientEvent(worldState, event.id);
                if (emitter) {
                    emitter.emit(createEvent('WORLD_STATE_CHANGED', 'world-engine', session.learnerId, session.sessionId, {
                        change: 'ambient_event_fired',
                        eventId: event.id,
                        eventName: event.name,
                    }));
                }
            }
        }
    }

    // ── Call module hooks on tick ──
    const tickEvt: TickEvent = {
        sessionId: session.sessionId,
        timestamp: Date.now(),
        schemaId: session.schemaId,
        deltaTime: 1,
        worldState,
        elapsedSeconds: (Date.now() - session.startedAt) / 1000,
    };
    for (const hook of session.hookRegistry.getAll()) {
        if ('onTick' in hook && typeof hook.onTick === 'function') {
            hook.onTick(tickEvt);
        }
    }

    return {
        ...session,
        worldState,
        npcMoodTurnCounters: moodCounters,
    };
}

// ─── Dialogue Orchestration ───────────────────────────────────

/**
 * Start a dialogue with an NPC at the current location.
 */
export function startNPCDialogue(
    session: SimulationSession,
    npcId: string,
    goal: string,
    injectionTargets: string[] = [],
): SimulationSession | null {
    if (session.activeDialogue) return null; // Already in dialogue

    const npcDef = session.npcDefinitions.get(npcId);
    if (!npcDef) return null;

    const npcState = session.worldState.npcStates[npcId];
    if (!npcState || !npcState.available) return null;

    // Check NPC is at current location
    const npcsHere = getNPCsAtLocation(session.worldState, session.worldState.learnerLocation);
    if (!npcsHere.find(n => n.npcId === npcId)) return null;

    const dialogue = startDialogue(
        npcDef,
        npcState,
        session.worldState.learnerLocation,
        goal,
        injectionTargets.length > 0 ? injectionTargets : npcState.injectionDirectives,
    );

    return {
        ...session,
        activeDialogue: dialogue,
    };
}

/**
 * Process a learner turn in the active dialogue.
 */
export function processLearnerTurn(
    session: SimulationSession,
    content: string,
    frictionEvents: FrictionEvent[] = [],
    registerAnalysis?: RegisterAnalysis,
    emitter?: EventEmitter,
): SimulationSession | null {
    if (!session.activeDialogue) return null;

    // Record the turn
    const updatedDialogue = recordLearnerTurn(
        session.activeDialogue,
        content,
        frictionEvents,
        registerAnalysis,
    );

    // Emit friction events to the event bus
    if (emitter) {
        for (const friction of frictionEvents) {
            emitter.emit(createEvent('FRICTION_DETECTED', 'world-engine', session.learnerId, session.sessionId, {
                frictionType: mapFrictionType(friction.type),
                learnerUtterance: content,
                detectedPattern: friction.description,
                severity: mapFrictionSeverity(friction.severity),
            } as FrictionDetectedPayload));
        }
    }

    // Compute mood shift from learner behavior
    const npcDef = session.npcDefinitions.get(session.activeDialogue.npcId)!;
    const npcState = session.worldState.npcStates[session.activeDialogue.npcId];
    let moodEvent: MoodTriggerEvent = 'successful-communication';

    if (frictionEvents.some(f => f.type === 'cultural')) {
        moodEvent = 'cultural-insensitivity';
    } else if (frictionEvents.some(f => f.type === 'register')) {
        moodEvent = 'register-violation';
    } else if (frictionEvents.some(f => f.type === 'vocabulary' || f.type === 'pragmatic')) {
        moodEvent = 'communication-failure';
    } else if (registerAnalysis?.aligned === false) {
        moodEvent = 'register-violation';
    }

    const newMood = computeDialogueMoodShift(npcDef, npcState.mood as NPCMoodState, moodEvent);

    // Update NPC mood in world state
    let worldState = session.worldState;
    if (newMood !== npcState.mood) {
        worldState = {
            ...worldState,
            npcStates: {
                ...worldState.npcStates,
                [npcDef.id]: {
                    ...npcState,
                    mood: newMood,
                },
            },
        };

        if (emitter) {
            emitter.emit(createEvent('NPC_MOOD_CHANGED', 'npc-agent', session.learnerId, session.sessionId, {
                npcId: npcDef.id,
                previousMood: npcState.mood,
                newMood: newMood,
                trigger: moodEvent,
            }));
        }
    }

    // ── Call module hooks on turn complete ──
    const turnEvt: TurnEvent = {
        sessionId: session.sessionId,
        timestamp: Date.now(),
        schemaId: session.schemaId,
        npcId: session.activeDialogue.npcId,
        locationId: session.activeDialogue.locationId,
        turnIndex: session.globalTurnCount,
        speaker: 'learner',
        text: content,
        frictionEvents,
    };
    for (const hook of session.hookRegistry.getAll()) {
        if ('onTurnComplete' in hook && typeof hook.onTurnComplete === 'function') {
            hook.onTurnComplete(turnEvt);
        }
    }

    return {
        ...session,
        worldState,
        activeDialogue: updatedDialogue,
        globalTurnCount: session.globalTurnCount + 1,
    };
}

/**
 * Process an NPC response turn.
 */
export function processNpcTurn(
    session: SimulationSession,
    content: string,
): SimulationSession | null {
    if (!session.activeDialogue) return null;

    return {
        ...session,
        activeDialogue: recordNpcTurn(session.activeDialogue, content),
        globalTurnCount: session.globalTurnCount + 1,
    };
}

/**
 * End the current dialogue and apply outcomes to the world.
 */
export function finishDialogue(
    session: SimulationSession,
    goalAchieved: boolean,
    emitter?: EventEmitter,
): { session: SimulationSession; outcome: DialogueOutcome } | null {
    if (!session.activeDialogue) return null;

    const outcome = endDialogue(session.activeDialogue, goalAchieved);
    const npcId = session.activeDialogue.npcId;
    const previousRep = session.worldState.npcStates[npcId]?.reputationWithLearner ?? 0;

    // Apply reputation delta to world state
    const worldState = applyDialogueOutcome(session.worldState, npcId, outcome);

    // Emit reputation delta event
    if (emitter) {
        emitter.emit(createEvent('REPUTATION_DELTA', 'world-engine', session.learnerId, session.sessionId, {
            npcId,
            previousScore: previousRep,
            newScore: worldState.npcStates[npcId].reputationWithLearner,
            reason: goalAchieved ? 'dialogue_completed_successfully' : 'dialogue_ended',
        } as ReputationDeltaPayload));
    }

    // ── Call module hooks on dialogue end ──
    const dialogueEvt: DialogueEvent = {
        sessionId: session.sessionId,
        timestamp: Date.now(),
        schemaId: session.schemaId,
        npcId,
        locationId: session.activeDialogue.locationId,
    };
    for (const hook of session.hookRegistry.getAll()) {
        if ('onDialogueEnd' in hook && typeof hook.onDialogueEnd === 'function') {
            hook.onDialogueEnd(dialogueEvt, outcome);
        }
    }

    return {
        session: {
            ...session,
            worldState,
            activeDialogue: null,
        },
        outcome,
    };
}

/**
 * End the entire simulation session.
 */
export function endSession(
    session: SimulationSession,
    emitter?: EventEmitter,
): SimulationSession {
    if (emitter) {
        emitter.emit(createEvent('SESSION_ENDED', 'world-engine', session.learnerId, session.sessionId, {
            tier: 2,
            durationMs: Date.now() - session.startedAt,
            turnCount: session.globalTurnCount,
            frictionCount: session.eventLog.filter(e => e.type === 'FRICTION_DETECTED').length,
        } as SessionEndedPayload));
    }

    // ── Call module hooks on session end ──
    const sessionEvt: SessionLifecycleEvent = {
        sessionId: session.sessionId,
        timestamp: Date.now(),
        schemaId: session.schemaId,
    };
    for (const hook of session.hookRegistry.getAll()) {
        if ('onSessionEnd' in hook && typeof hook.onSessionEnd === 'function') {
            hook.onSessionEnd(sessionEvt, session.worldState);
        }
    }

    return {
        ...session,
        status: 'ended',
    };
}

// ─── Query Helpers ────────────────────────────────────────────

/**
 * Get the NPCs visible at the learner's current location.
 */
export function getVisibleNPCs(session: SimulationSession): Array<{
    npcState: NPCWorldState;
    definition: NPCDialogueDefinition;
    behavior: NPCBehaviorModifiers;
    reputationDescriptor: string;
}> {
    const npcs = getNPCsAtLocation(session.worldState, session.worldState.learnerLocation);

    return npcs.map(npcState => {
        const def = session.npcDefinitions.get(npcState.npcId);
        if (!def) {
            return {
                npcState,
                definition: { id: npcState.npcId, name: npcState.npcId, role: 'unknown', register: 'neutral', personality: '', vocabulary_focus: [], patience_level: 0.5, big_five: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 }, cultural_overlay: { communicative_directness: 0.5, formality_default: 0.5, power_distance_sensitivity: 0.5, emotional_expressiveness: 0.5 } },
                behavior: computeNPCBehavior({ openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 }, npcState.mood as NPCMoodState, npcState.reputationWithLearner, { communicative_directness: 0.5, formality_default: 0.5, power_distance_sensitivity: 0.5, emotional_expressiveness: 0.5 }, 0.5),
                reputationDescriptor: getReputationBehaviorDescriptor(npcState.reputationWithLearner),
            };
        }
        return {
            npcState,
            definition: def,
            behavior: computeNPCBehavior(def.big_five, npcState.mood as NPCMoodState, npcState.reputationWithLearner, def.cultural_overlay, def.patience_level),
            reputationDescriptor: getReputationBehaviorDescriptor(npcState.reputationWithLearner),
        };
    });
}

/**
 * Get the current NPC prompt context for the active dialogue.
 * Used by the prompt-composer to generate LLM prompts.
 */
export function getDialoguePromptContext(
    session: SimulationSession,
): Record<string, string> | null {
    if (!session.activeDialogue) return null;

    const npcDef = session.npcDefinitions.get(session.activeDialogue.npcId);
    const npcState = session.worldState.npcStates[session.activeDialogue.npcId];

    if (!npcDef || !npcState) return null;

    const location = session.worldState.locations.find(
        l => l.id === session.activeDialogue!.locationId
    );

    return buildNPCPromptContext(
        npcDef,
        npcState,
        session.activeDialogue,
        location?.ambientDescription ?? '',
    );
}

/**
 * Get navigable locations from the learner's current position.
 */
export function getNavigableLocations(session: SimulationSession): Array<{
    id: string;
    name: Record<string, string>;
    accessible: boolean;
    description: string;
}> {
    const current = session.worldState.locations.find(
        l => l.id === session.worldState.learnerLocation
    );
    if (!current) return [];

    const timeSlot = session.worldState.timeSystem.enabled
        ? getCurrentTimeSlot(session.worldState)
        : null;

    return current.connections.map(connId => {
        const loc = session.worldState.locations.find(l => l.id === connId);
        const accessible = timeSlot
            ? timeSlot.locationAccessibility[connId] !== false
            : true;
        return {
            id: connId,
            name: loc?.name ?? { en: connId },
            accessible,
            description: loc?.description ?? '',
        };
    });
}

// ─── Internal Helpers ─────────────────────────────────────────

function schemaNpcToDialogueDefinition(npc: SchemaNPCDefinition): NPCDialogueDefinition {
    return {
        id: npc.id,
        name: npc.name,
        role: npc.role,
        register: npc.register,
        personality: npc.personality,
        vocabulary_focus: npc.vocabulary_focus,
        patience_level: npc.patience_level,
        big_five: npc.big_five,
        cultural_overlay: npc.cultural_overlay,
    };
}

function mapFrictionType(type: FrictionEvent['type']): FrictionDetectedPayload['frictionType'] {
    switch (type) {
        case 'vocabulary': return 'lexical';
        case 'register': return 'register';
        case 'pragmatic': return 'pragmatic';
        case 'cultural': return 'cultural';
        case 'phonetic': return 'phonemic';
        default: return 'lexical';
    }
}

function mapFrictionSeverity(severity: number): FrictionDetectedPayload['severity'] {
    if (severity >= 0.75) return 'critical';
    if (severity >= 0.5) return 'high';
    if (severity >= 0.25) return 'medium';
    return 'low';
}

let eventCounter = 0;

function createEvent<T>(
    type: AAPMEventType,
    source: AAPMModuleId,
    learnerId: string,
    sessionId: string,
    payload: T,
): AAPMEventEnvelope<T> {
    return {
        eventId: `evt-${Date.now()}-${++eventCounter}`,
        type,
        emittedAt: new Date().toISOString(),
        source,
        learnerId,
        sessionId,
        correlationId: sessionId,
        payload,
        schemaVersion: '1.0',
    };
}
