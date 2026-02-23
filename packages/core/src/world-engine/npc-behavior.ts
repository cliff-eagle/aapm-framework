/**
 * AAPM World Engine — NPC Behavioral Variation Matrix
 *
 * Implements the Big Five × Mood × Reputation × Cultural Overlay
 * behavioral variation system from ADR-010.
 *
 * Final NPC behavior = f(personality, mood, reputation, cultural overlay)
 *
 * @module world-engine/npc-behavior
 * @patentCritical NPC behavioral authenticity creates sociolinguistic
 *   reading skill development through emergent interaction dynamics
 */

import type { BigFiveProfile, CulturalOverlay } from './world-runtime';

// ─── Mood System ──────────────────────────────────────────────────────────────

/** NPC mood states with semantic meaning */
export type NPCMoodState =
    | 'neutral'
    | 'pleased'
    | 'busy'
    | 'irritated'
    | 'anxious'
    | 'amused'
    | 'impatient'
    | 'warm'
    | 'cold'
    | 'panicking';

/** Mood intensity modifiers [0.0, 1.0] — how strongly the mood is felt */
export interface MoodModifier {
    mood: NPCMoodState;
    intensity: number;
}

/** Map mood to a numeric modifier for behavior calculations */
const MOOD_VALENCE: Record<NPCMoodState, number> = {
    neutral: 0.0,
    pleased: 0.3,
    warm: 0.4,
    amused: 0.2,
    busy: -0.1,
    anxious: -0.2,
    impatient: -0.3,
    irritated: -0.4,
    cold: -0.5,
    panicking: -0.6,
};

// ─── Behavior Modifiers ───────────────────────────────────────────────────────

/**
 * Computed NPC behavior modifiers that drive scene rendering
 * and dialogue generation.
 */
export interface NPCBehaviorModifiers {
    /** How long the NPC's responses tend to be [0.0, 1.0] */
    responseLength: number;
    /** How patient the NPC is with learner errors/silence [0.0, 1.0] */
    patience: number;
    /** How willing the NPC is to offer unsolicited help [0.0, 1.0] */
    helpfulness: number;
    /** How strictly the NPC enforces register norms [0.0, 1.0] */
    registerStrictness: number;
    /** How likely the NPC is to initiate topics [0.0, 1.0] */
    topicInitiative: number;
    /** How emotionally expressive the NPC is [0.0, 1.0] */
    expressiveness: number;
    /** Seconds before NPC re-prompts on silence */
    silenceToleranceSeconds: number;
    /** Whether the NPC is likely to escalate friction */
    escalationTendency: number;
}

/**
 * Compute the behavioral modifiers for an NPC given their current state.
 *
 * This is the core Behavioral Variation Matrix from ADR-010:
 *   - Response length ← extraversion × mood × topic interest
 *   - Patience ← agreeableness × reputation × mood
 *   - Helpfulness ← agreeableness × openness × reputation
 *   - Register strictness ← conscientiousness × mood × formality
 *   - Topic initiative ← extraversion × openness × mood
 *
 * @param personality - Big Five personality profile
 * @param mood - Current mood state
 * @param reputation - Reputation with the learner [-0.5, 1.0]
 * @param culturalOverlay - Cultural behavior modifiers
 * @param patienceLevel - Base patience level from schema [0.0, 1.0]
 */
export function computeNPCBehavior(
    personality: BigFiveProfile,
    mood: NPCMoodState,
    reputation: number,
    culturalOverlay: CulturalOverlay,
    patienceLevel: number,
): NPCBehaviorModifiers {
    const moodVal = MOOD_VALENCE[mood] ?? 0;

    // Normalize reputation from [-0.5, 1.0] to [0, 1]
    const repNorm = (reputation + 0.5) / 1.5;

    // ── Behavioral Variation Matrix ─────────────────────────
    const responseLength = clamp(
        personality.extraversion * 0.5 +
        (0.5 + moodVal * 0.3) +
        culturalOverlay.emotional_expressiveness * 0.2
    );

    const patience = clamp(
        personality.agreeableness * 0.4 +
        repNorm * 0.3 +
        (0.5 + moodVal * 0.2) +
        patienceLevel * 0.1
    );

    const helpfulness = clamp(
        personality.agreeableness * 0.35 +
        personality.openness * 0.25 +
        repNorm * 0.4
    );

    const registerStrictness = clamp(
        personality.conscientiousness * 0.4 +
        (0.5 - moodVal * 0.2) +
        culturalOverlay.formality_default * 0.3
    );

    const topicInitiative = clamp(
        personality.extraversion * 0.4 +
        personality.openness * 0.3 +
        (0.5 + moodVal * 0.2) +
        repNorm * 0.1
    );

    const expressiveness = clamp(
        personality.extraversion * 0.3 +
        culturalOverlay.emotional_expressiveness * 0.5 +
        (0.5 + moodVal * 0.2)
    );

    // Patience directly maps to silence tolerance
    // 3 seconds (impatient) to 15 seconds (very patient)
    const silenceToleranceSeconds = Math.round(3 + patience * 12);

    // Escalation tendency: low agreeableness + high power distance + negative mood
    const escalationTendency = clamp(
        (1 - personality.agreeableness) * 0.4 +
        culturalOverlay.power_distance_sensitivity * 0.3 +
        Math.max(0, -moodVal) * 0.3
    );

    return {
        responseLength,
        patience,
        helpfulness,
        registerStrictness,
        topicInitiative,
        expressiveness,
        silenceToleranceSeconds,
        escalationTendency,
    };
}

// ─── Mood Dynamics ────────────────────────────────────────────────────────────

/** Mood decay rate per interaction turn (10% decay toward neutral) */
const MOOD_DECAY_RATE = 0.1;

/**
 * Compute a mood shift based on learner behavior.
 *
 * @param currentMood - Current mood state
 * @param event - The triggering event type
 * @param personality - NPC personality (neuroticism affects reactivity)
 * @returns New mood state
 */
export function computeMoodShift(
    currentMood: NPCMoodState,
    event: MoodTriggerEvent,
    personality: BigFiveProfile,
): NPCMoodState {
    // Neuroticism amplifies negative mood shifts
    const sensitivity = 0.5 + personality.neuroticism * 0.5;

    switch (event) {
        case 'successful-communication':
            return personality.agreeableness > 0.6 ? 'pleased' : 'neutral';
        case 'register-violation':
            return sensitivity > 0.7 ? 'irritated' : 'cold';
        case 'communication-failure':
            return personality.agreeableness > 0.5 ? 'neutral' : 'impatient';
        case 'cultural-insensitivity':
            return sensitivity > 0.5 ? 'cold' : 'irritated';
        case 'learner-hesitation':
            return personality.agreeableness > 0.7 ? 'neutral' : 'impatient';
        case 'repair-attempt':
            return personality.openness > 0.5 ? 'warm' : 'neutral';
        case 'ambient-event-negative':
            return sensitivity > 0.6 ? 'anxious' : 'busy';
        case 'ambient-event-positive':
            return 'amused';
        default:
            return currentMood;
    }
}

/**
 * Apply mood decay — pull mood back toward 'neutral' over time.
 *
 * @param currentMood - Current mood state
 * @param turnsElapsed - Number of turns since mood was set
 * @returns Whether the mood should reset to neutral
 */
export function shouldDecayMood(
    currentMood: NPCMoodState,
    turnsElapsed: number,
): boolean {
    if (currentMood === 'neutral') return false;
    // Mood decays at MOOD_DECAY_RATE per turn — after ~10 turns, strong moods normalize
    const decayProbability = Math.min(1.0, turnsElapsed * MOOD_DECAY_RATE);
    return decayProbability >= 1.0;
}

/** Events that can trigger NPC mood shifts */
export type MoodTriggerEvent =
    | 'successful-communication'
    | 'register-violation'
    | 'communication-failure'
    | 'cultural-insensitivity'
    | 'learner-hesitation'
    | 'repair-attempt'
    | 'ambient-event-negative'
    | 'ambient-event-positive';

// ─── Reputation → Behavior Descriptors ────────────────────────────────────────

/**
 * Get human-readable behavior descriptors for an NPC based on reputation.
 * These are injected into the NPC system prompt.
 *
 * @see ADR-005 — Reputation is invisible to the learner but governs NPC behavior
 */
export function getReputationBehaviorDescriptor(reputation: number): string {
    if (reputation >= 0.5) {
        return 'Warm and trusting. Uses first name after greeting. Offers unsolicited help, tips, and insider information. More forgiving of minor errors.';
    }
    if (reputation >= 0.0) {
        return 'Friendly and professional. Standard service interactions. Willing to help when asked but does not go out of their way.';
    }
    if (reputation >= -0.3) {
        return 'Neutral to cool. Standard service but no warmth. Shorter responses. Less patient with communication difficulties.';
    }
    return 'Cold and minimal. Does not offer help proactively. May reference previous negative interactions. Requires demonstrated improvement before warming up.';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0.0, max = 1.0): number {
    return Math.max(min, Math.min(max, value));
}
