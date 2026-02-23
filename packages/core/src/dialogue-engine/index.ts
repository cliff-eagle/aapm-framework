/**
 * AAPM Dialogue Engine — Orchestrator
 *
 * Manages the lifecycle of an NPC dialogue within the simulation world.
 * Coordinates between the world state, NPC behavior system, tier-specific
 * prompt generation, and consequence calculation.
 *
 * Lifecycle:
 *   1. Scene entry → NPC presents situation
 *   2. Learner turn → text/voice input
 *   3. Micro-loop → RFE monitors interlanguage
 *   4. NPC response → AI call with prompt template + personality + mood + reputation
 *   5. Consequence → WorldState update (reputation delta, mood shift, events)
 *   6. Macro-loop → post-scene friction extraction → curriculum generation
 *
 * @module dialogue-engine
 * @patentCritical Claim 7 — Dialogue Consequence Engine
 */

import type { NPCWorldState, WorldState } from '../world-engine';
import type {
    BigFiveProfile,
    CulturalOverlay,
    SchemaNPCDefinition,
    NPCMoodState,
    MoodTriggerEvent,
} from '../world-engine';

import {
    computeNPCBehavior,
    computeMoodShift,
    getReputationBehaviorDescriptor,
    updateReputation,
} from '../world-engine';

// ─── Dialogue Types ───────────────────────────────────────────

/** Current phase of the dialogue */
export type DialoguePhase =
    | 'opening'        // NPC presents the situation / greeting
    | 'active'         // Ongoing conversation
    | 'closing'        // Wrapping up
    | 'ended';         // Dialogue complete

/** A single turn in the dialogue */
export interface DialogueTurn {
    /** Turn sequence number */
    turnNumber: number;
    /** Who is speaking */
    speaker: 'learner' | 'npc' | 'system';
    /** The utterance content */
    content: string;
    /** Timestamp */
    timestamp: number;
    /** Friction events detected in this turn (from RFE micro-loop) */
    frictionEvents: FrictionEvent[];
    /** Register analysis for this turn */
    registerAnalysis?: RegisterAnalysis;
}

/** A communicative friction event detected by the RFE */
export interface FrictionEvent {
    /** Unique identifier */
    id: string;
    /** Type of friction */
    type: 'vocabulary' | 'register' | 'pragmatic' | 'cultural' | 'phonetic';
    /** Description of the friction */
    description: string;
    /** The target form the learner should have used */
    targetForm?: string;
    /** The learner's actual production */
    learnerProduction?: string;
    /** Vocabulary domain this friction belongs to */
    vocabularyDomain?: string;
    /** Severity [0.0, 1.0] */
    severity: number;
}

/** Register analysis for a learner turn */
export interface RegisterAnalysis {
    /** Expected register for this context */
    expectedRegister: string;
    /** Detected register in learner's production */
    detectedRegister: string;
    /** Whether they match */
    aligned: boolean;
    /** Score [0.0, 1.0] */
    score: number;
}

/** The outcome of a completed dialogue */
export interface DialogueOutcome {
    /** Total reputation change across the dialogue */
    reputationDelta: number;
    /** All friction events accumulated */
    frictionEvents: FrictionEvent[];
    /** Whether the communicative goal was achieved */
    goalAchieved: boolean;
    /** Forward injection target forms that were successfully produced */
    injectionTargetsHit: string[];
    /** Number of turns */
    totalTurns: number;
    /** Final NPC mood state */
    finalMood: NPCMoodState;
    /** Register accuracy across the dialogue */
    registerAccuracy: number;
}

/** Full dialogue session state */
export interface DialogueSession {
    /** Unique session ID */
    sessionId: string;
    /** NPC involved */
    npcId: string;
    /** Location where dialogue occurs */
    locationId: string;
    /** Current phase */
    phase: DialoguePhase;
    /** Communicative goal for this dialogue */
    goal: string;
    /** All turns so far */
    turns: DialogueTurn[];
    /** Accumulated reputation delta */
    reputationDelta: number;
    /** Accumulated friction events */
    frictionEvents: FrictionEvent[];
    /** Forward injection targets for this dialogue */
    injectionTargets: string[];
    /** Injection targets successfully hit */
    injectionTargetsHit: string[];
    /** NPC behavior modifiers computed at dialogue start */
    npcBehavior: {
        responseLength: number;
        patience: number;
        helpfulness: number;
        registerStrictness: number;
        topicInitiative: number;
        expressiveness: number;
        silenceToleranceSeconds: number;
        escalationTendency: number;
    };
    /** Start timestamp */
    startedAt: number;
}

// ─── NPC Definition for Dialogue ──────────────────────────────

/** Extended NPC definition needed for dialogue (from schema) */
export interface NPCDialogueDefinition {
    id: string;
    name: string;
    role: string;
    register: string;
    personality: string;
    vocabulary_focus: string[];
    patience_level: number;
    big_five: BigFiveProfile;
    cultural_overlay: CulturalOverlay;
}

// ─── Dialogue Session Management ──────────────────────────────

/**
 * Start a new dialogue session with an NPC.
 *
 * Computes initial NPC behavior modifiers based on personality × mood × reputation,
 * and determines the communicative goal.
 */
export function startDialogue(
    npcDef: NPCDialogueDefinition,
    npcState: NPCWorldState,
    locationId: string,
    goal: string,
    injectionTargets: string[] = [],
): DialogueSession {
    const behavior = computeNPCBehavior(
        npcDef.big_five,
        npcState.mood as NPCMoodState,
        npcState.reputationWithLearner,
        npcDef.cultural_overlay,
        npcDef.patience_level,
    );

    return {
        sessionId: `dlg-${Date.now()}-${npcDef.id}`,
        npcId: npcDef.id,
        locationId,
        phase: 'opening',
        goal,
        turns: [],
        reputationDelta: 0,
        frictionEvents: [],
        injectionTargets,
        injectionTargetsHit: [],
        npcBehavior: behavior,
        startedAt: Date.now(),
    };
}

/**
 * Record a learner turn.
 */
export function recordLearnerTurn(
    session: DialogueSession,
    content: string,
    frictionEvents: FrictionEvent[] = [],
    registerAnalysis?: RegisterAnalysis,
): DialogueSession {
    const turn: DialogueTurn = {
        turnNumber: session.turns.length + 1,
        speaker: 'learner',
        content,
        timestamp: Date.now(),
        frictionEvents,
        registerAnalysis,
    };

    // Calculate reputation impact from this turn
    let turnReputationDelta = 0;

    // Successful communication (no friction) = positive
    if (frictionEvents.length === 0) {
        turnReputationDelta += 0.05;
    }

    // Register alignment = positive
    if (registerAnalysis?.aligned) {
        turnReputationDelta += 0.05;
    }

    // Friction = negative, proportional to severity
    for (const friction of frictionEvents) {
        switch (friction.type) {
            case 'cultural':
                turnReputationDelta -= 0.15 * friction.severity;
                break;
            case 'register':
                turnReputationDelta -= 0.10 * friction.severity;
                break;
            case 'pragmatic':
                turnReputationDelta -= 0.08 * friction.severity;
                break;
            case 'vocabulary':
                turnReputationDelta -= 0.05 * friction.severity;
                break;
            case 'phonetic':
                turnReputationDelta -= 0.03 * friction.severity;
                break;
        }
    }

    // Check injection targets
    const newHits = session.injectionTargets.filter(
        target => content.toLowerCase().includes(target.toLowerCase())
            && !session.injectionTargetsHit.includes(target)
    );

    return {
        ...session,
        phase: 'active',
        turns: [...session.turns, turn],
        reputationDelta: session.reputationDelta + turnReputationDelta,
        frictionEvents: [...session.frictionEvents, ...frictionEvents],
        injectionTargetsHit: [...session.injectionTargetsHit, ...newHits],
    };
}

/**
 * Record an NPC turn.
 */
export function recordNpcTurn(
    session: DialogueSession,
    content: string,
): DialogueSession {
    const turn: DialogueTurn = {
        turnNumber: session.turns.length + 1,
        speaker: 'npc',
        content,
        timestamp: Date.now(),
        frictionEvents: [],
    };

    return {
        ...session,
        turns: [...session.turns, turn],
    };
}

/**
 * End the dialogue and produce the outcome.
 */
export function endDialogue(
    session: DialogueSession,
    goalAchieved: boolean,
): DialogueOutcome {
    // Calculate register accuracy across learner turns
    const learnerTurns = session.turns.filter(t => t.speaker === 'learner');
    const turnsWithRegister = learnerTurns.filter(t => t.registerAnalysis);
    const registerAccuracy = turnsWithRegister.length > 0
        ? turnsWithRegister.reduce((sum, t) => sum + (t.registerAnalysis?.score ?? 0), 0)
        / turnsWithRegister.length
        : 1.0;

    // Goal achievement bonus
    const finalDelta = goalAchieved
        ? session.reputationDelta + 0.10
        : session.reputationDelta;

    return {
        reputationDelta: finalDelta,
        frictionEvents: session.frictionEvents,
        goalAchieved,
        injectionTargetsHit: session.injectionTargetsHit,
        totalTurns: session.turns.length,
        finalMood: 'neutral', // Will be computed by mood system
        registerAccuracy,
    };
}

/**
 * Apply a dialogue outcome to the world state.
 */
export function applyDialogueOutcome(
    worldState: WorldState,
    npcId: string,
    outcome: DialogueOutcome,
): WorldState {
    return updateReputation(worldState, npcId, outcome.reputationDelta);
}

// ─── Prompt Generation Helpers ────────────────────────────────

/**
 * Build the NPC context block to inject into the tier-2 system prompt.
 *
 * This maps schema + runtime data to the template variables in
 * `prompts/system/tier2-immersion-npc.md`.
 */
export function buildNPCPromptContext(
    npcDef: NPCDialogueDefinition,
    npcState: NPCWorldState,
    session: DialogueSession,
    locationDescription: string,
): Record<string, string> {
    const behavior = session.npcBehavior;
    const reputationDesc = getReputationBehaviorDescriptor(npcState.reputationWithLearner);

    return {
        '{{npc_name}}': npcDef.name,
        '{{npc_role}}': npcDef.role,
        '{{npc_register}}': npcDef.register,
        '{{npc_personality}}': [
            npcDef.personality,
            '',
            `BEHAVIORAL MODIFIERS (from Big Five × mood × reputation):`,
            `  Response length tendency: ${(behavior.responseLength * 100).toFixed(0)}%`,
            `  Patience: ${(behavior.patience * 100).toFixed(0)}%`,
            `  Helpfulness: ${(behavior.helpfulness * 100).toFixed(0)}%`,
            `  Register strictness: ${(behavior.registerStrictness * 100).toFixed(0)}%`,
            `  Topic initiative: ${(behavior.topicInitiative * 100).toFixed(0)}%`,
            `  Expressiveness: ${(behavior.expressiveness * 100).toFixed(0)}%`,
            `  Silence tolerance: ${behavior.silenceToleranceSeconds}s`,
        ].join('\n'),
        '{{reputation_score}}': npcState.reputationWithLearner.toFixed(2),
        '{{reputation_behavior}}': reputationDesc,
        '{{npc_vocabulary_focus}}': npcDef.vocabulary_focus.join(', '),
        '{{current_location}}': locationDescription,
        '{{forward_injection}}': npcState.injectionDirectives.length > 0
            ? npcState.injectionDirectives.join('\n')
            : 'No active injection directives.',
        '{{current_mood}}': npcState.mood,
        '{{dialogue_goal}}': session.goal,
    };
}

/**
 * Calculate the NPC mood response to a dialogue event.
 * Used to update NPC mood mid-dialogue.
 */
export function computeDialogueMoodShift(
    npcDef: NPCDialogueDefinition,
    currentMood: NPCMoodState,
    event: MoodTriggerEvent,
): NPCMoodState {
    return computeMoodShift(currentMood, event, npcDef.big_five);
}

// ─── Re-export convenience ────────────────────────────────────

export type {
    BigFiveProfile,
    CulturalOverlay,
    NPCMoodState,
    MoodTriggerEvent,
} from '../world-engine';
