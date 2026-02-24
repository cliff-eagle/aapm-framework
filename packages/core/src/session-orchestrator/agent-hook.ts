/**
 * Agent Hook — Bridges the AgentOrchestrator into the SessionOrchestrator
 * lifecycle, making agents first-class participants in every session.
 *
 * This factory creates an AgentHook that:
 *   1. Spawns 4 agent types (NPC × N, Tutor, World, Evaluation) on session start
 *   2. Routes all lifecycle events → AgentOrchestrator.processEvent()
 *   3. Applies agent decisions back to the session (speak, inject, fire_event, etc.)
 *   4. Disposes agents on session end
 *
 * @module session-orchestrator/agent-hook
 * @patentCritical Claim 14 — Agent Integration Bridge
 */

import type { AgentHook, SessionLifecycleEvent, DialogueEvent, TurnEvent, TickEvent, LocationEvent } from './module-hooks';
import type { DialogueOutcome } from '../dialogue-engine';
import type { AgentOrchestratorInstance, AgentOrchestratorConfig } from '../agents/AgentOrchestrator';
import type { AgentToolkitInstance } from '../agents/AgentToolkit';
import type { NPCDialogueDefinition } from '../dialogue-engine';
import { createAgentOrchestrator } from '../agents/AgentOrchestrator';
import { createNPCAgent } from '../agents/npc/NPCAgent';
import { createTutorAgent } from '../agents/tutor/TutorAgent';
import { createWorldAgent } from '../agents/world/WorldAgent';
import { createEvaluationAgent } from '../agents/evaluation/EvaluationAgent';

// ─── Configuration ────────────────────────────────────────────

export interface AgentHookConfig {
    /** Shared agent toolkit (with registered tools) */
    toolkit: AgentToolkitInstance;
    /** Current learner tier */
    currentTier: 1 | 2 | 3;
    /** Learner's L1 language */
    learnerL1: string;
    /** Session learning objectives */
    sessionObjectives: string[];
    /** Max agent decisions per tick */
    maxDecisionsPerTick: number;
}

// ─── Factory ──────────────────────────────────────────────────

/**
 * Create an AgentHook that manages the full agent lifecycle.
 *
 * Usage:
 *   const hook = createAgentHook(config, npcDefinitions, locationIds);
 *   session.hookRegistry.register(hook);
 */
export function createAgentHook(
    config: AgentHookConfig,
    npcDefinitions: Map<string, NPCDialogueDefinition>,
    locationIds: string[],
): AgentHook & { orchestrator: AgentOrchestratorInstance } {
    const { toolkit, currentTier, learnerL1, sessionObjectives, maxDecisionsPerTick } = config;

    // Create the orchestrator
    const orchestrator = createAgentOrchestrator({
        toolkit,
        maxDecisionsPerTick,
        enableMessaging: true,
        conflictStrategy: 'priority',
    });

    // Spawn NPC agents — one per NPC in schema
    for (const [npcId, def] of npcDefinitions) {
        const npcAgent = createNPCAgent({
            npcId,
            npcName: def.name,
            role: def.role,
            register: def.register,
            personality: {
                openness: def.big_five.openness,
                conscientiousness: def.big_five.conscientiousness,
                extraversion: def.big_five.extraversion,
                agreeableness: def.big_five.agreeableness,
                neuroticism: def.big_five.neuroticism,
                directness: def.cultural_overlay?.communicative_directness ?? 0.5,
                formality: def.cultural_overlay?.formality_default ?? 0.5,
                emotionalExpressiveness: def.cultural_overlay?.emotional_expressiveness ?? 0.5,
            },
            vocabularyFocus: def.vocabulary_focus,
            patienceLevel: def.patience_level,
            initialMood: 'neutral',
            initialReputation: 0.5,
        }, toolkit);
        orchestrator.addAgent(npcAgent);
    }

    // Spawn Tutor agent
    const tutorAgent = createTutorAgent({
        currentTier,
        targetCompetencies: sessionObjectives,
        learnerL1,
        sessionObjectives,
        interventionThreshold: 0.3,
        enableForwardInjection: true,
    }, toolkit);
    orchestrator.addAgent(tutorAgent);

    // Spawn World agent
    const npcIds = Array.from(npcDefinitions.keys());
    const worldAgent = createWorldAgent({
        locationIds,
        npcIds,
        currentTier,
        eventTemplates: [],
        eventCheckInterval: 30,
    }, toolkit);
    orchestrator.addAgent(worldAgent);

    // Spawn Evaluation agent
    const evalAgent = createEvaluationAgent({
        currentTier,
        affectiveBaseline: {
            responseLatency: 2000,
            l1FallbackRate: 0.1,
            hedgingFrequency: 0.05,
            pauseDuration: 500,
            topicAvoidanceRate: 0.02,
            repairAttemptRate: 0.1,
        },
        escalationThreshold: 0.7,
        broadcastInterval: 5,
    }, toolkit);
    orchestrator.addAgent(evalAgent);

    // ── Build the AgentHook ──

    const hook: AgentHook & { orchestrator: AgentOrchestratorInstance } = {
        moduleId: 'agents' as const,
        orchestrator,

        async onSessionStart(event: SessionLifecycleEvent): Promise<void> {
            await orchestrator.processEvent({
                type: 'session_start',
                data: { sessionId: event.sessionId, schemaId: event.schemaId, timestamp: event.timestamp },
                timestamp: event.timestamp,
            });
        },

        async onSessionEnd(event: SessionLifecycleEvent): Promise<void> {
            await orchestrator.processEvent({
                type: 'session_end',
                data: { sessionId: event.sessionId, timestamp: event.timestamp },
                timestamp: event.timestamp,
            });
            orchestrator.dispose();
        },

        async onDialogueStart(event: DialogueEvent): Promise<void> {
            await orchestrator.processEvent({
                type: 'dialogue_start',
                data: { npcId: event.npcId, locationId: event.locationId, sessionId: event.sessionId, timestamp: event.timestamp },
                timestamp: event.timestamp,
            });
        },

        async onDialogueEnd(event: DialogueEvent, outcome: DialogueOutcome): Promise<void> {
            await orchestrator.processEvent({
                type: 'dialogue_end',
                data: { npcId: event.npcId, outcome: outcome.goalAchieved ? 'success' : 'incomplete', locationId: event.locationId, sessionId: event.sessionId, timestamp: event.timestamp },
                timestamp: event.timestamp,
            });
        },

        async onTurnComplete(event: TurnEvent): Promise<void> {
            await orchestrator.processEvent({
                type: 'turn_complete',
                data: {
                    speaker: 'learner',
                    text: event.text ?? '',
                    npcId: event.npcId,
                    frictionEvents: event.frictionEvents ?? [],
                    sessionId: event.sessionId,
                    timestamp: event.timestamp,
                },
                timestamp: event.timestamp,
            });
        },

        async onTick(event: TickEvent): Promise<void> {
            await orchestrator.processEvent({
                type: 'tick',
                data: { elapsedSeconds: event.elapsedSeconds ?? event.deltaTime / 1000, sessionId: event.sessionId, timestamp: event.timestamp },
                timestamp: event.timestamp,
            });
        },

        async onLocationEnter(event: LocationEvent): Promise<void> {
            await orchestrator.processEvent({
                type: 'location_enter',
                data: { locationId: event.locationId, sessionId: event.sessionId, timestamp: event.timestamp },
                timestamp: event.timestamp,
            });
        },

        async onLocationExit(event: LocationEvent): Promise<void> {
            await orchestrator.processEvent({
                type: 'location_exit',
                data: { locationId: event.locationId, sessionId: event.sessionId, timestamp: event.timestamp },
                timestamp: event.timestamp,
            });
        },
    };

    return hook;
}
