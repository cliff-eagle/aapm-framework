/**
 * @module world-engine
 * @description World State Contract Types for Tier 2 Immersive Environments
 *
 * Every Tier 2 environment is a world — a graph of locations populated by NPCs,
 * governed by time, and punctuated by ambient events.
 *
 * @see docs/world-state-contract.md
 * @patentCritical Claim 13 — World Engine Layer
 */

// ─── Runtime Re-exports ───────────────────────────────────────────────────────

export {
    createWorldState,
    navigateTo,
    advanceTime,
    getNPCsAtLocation,
    getCurrentTimeSlot,
    fireAmbientEvent,
    clearAmbientEvent,
    updateReputation,
} from './world-runtime';

export type {
    BigFiveProfile,
    CulturalOverlay,
    SchemaNPCDefinition,
    SchemaLocationDefinition,
    SchemaAmbientEvent,
    SchemaEnvironment,
} from './world-runtime';

export {
    computeNPCBehavior,
    computeMoodShift,
    shouldDecayMood,
    getReputationBehaviorDescriptor,
} from './npc-behavior';

export type {
    NPCMoodState,
    MoodModifier,
    NPCBehaviorModifiers,
    MoodTriggerEvent,
} from './npc-behavior';

// ─── Location Graph ───────────────────────────────────────────────────────────

export interface Location {
    id: string;
    /** Localized name: key = language code, value = name */
    name: Record<string, string>;
    /** Scene-setting narrative description */
    description: string;
    type: 'public' | 'private' | 'commercial' | 'institutional';
    /** IDs of directly reachable locations */
    connections: string[];
    npcs: {
        /** Always present at this location */
        resident: string[];
        /** Appear based on time, events, or reputation gates */
        transient: string[];
    };
    interactables: Interactable[];
    /** Background sensory detail for immersion prompts */
    ambientDescription: string;
    /** Prerequisite to access (reputation, tier, quest) */
    unlockCondition?: string;
}

export interface Interactable {
    id: string;
    name: Record<string, string>;
    type: 'object' | 'sign' | 'menu' | 'document' | 'device';
    /** Maps to vocabulary_matrix category */
    vocabularyDomain: string;
    /** What happens when learner interacts */
    interactionPrompt: string;
}

// ─── Time System ──────────────────────────────────────────────────────────────

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface TimeSystem {
    enabled: boolean;
    /** Real-time minutes per in-game day */
    dayLengthMinutes: number;
    currentTimeOfDay: TimeOfDay;
    /** NPCs change behavior by time of day */
    timeAffectsNPCs: boolean;
    /** Locations open/close by time of day */
    timeAffectsLocations: boolean;
    schedule: TimeSlot[];
}

export interface TimeSlot {
    timeOfDay: TimeOfDay;
    /** NPC ID → available during this time? */
    npcAvailability: Record<string, boolean>;
    /** Location ID → accessible during this time? */
    locationAccessibility: Record<string, boolean>;
    /** Ambient event ID → probability of firing [0.0, 1.0] */
    ambientEventProbability: Record<string, number>;
}

// ─── Ambient Events ───────────────────────────────────────────────────────────

export interface AmbientEvent {
    id: string;
    name: string;
    trigger: 'time-based' | 'reputation-gated' | 'random' | 'quest-triggered';
    /** Expression evaluated against world state */
    triggerCondition: string;
    description: string;
    /** NPC ID → behavioral change description */
    npcReactions: Record<string, string>;
    /** Friction opportunities this event creates */
    vocabularyDomain: string;
    duration: 'instant' | 'scene' | 'persistent';
    /** Whether the learner can choose not to engage */
    learnerCanIgnore: boolean;
}

// ─── NPC World State ──────────────────────────────────────────────────────────

export interface NPCWorldState {
    npcId: string;
    currentLocation: string;
    available: boolean;
    mood: string;
    /** Social reputation with the learner [0.0, 1.0] */
    reputationWithLearner: number;
    /** Active Forward Injection target forms */
    injectionDirectives: string[];
    lastInteractionTimestamp: number;
}

// ─── Canonical World State Object ─────────────────────────────────────────────

export interface WorldState {
    schemaId: string;
    locations: Location[];
    timeSystem: TimeSystem;
    ambientEvents: AmbientEvent[];
    /** Currently active event IDs */
    activeEvents: string[];
    /** Learner's current location ID */
    learnerLocation: string;
    /** NPC ID → runtime state */
    npcStates: Record<string, NPCWorldState>;
    sessionId: string;
}
