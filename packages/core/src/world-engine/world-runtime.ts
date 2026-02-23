/**
 * AAPM World Engine — Runtime
 *
 * Creates, navigates, and manages the WorldState from a parsed persona schema.
 * This is the bridge between the static schema YAML and the live simulation.
 *
 * @module world-engine/world-runtime
 * @patentCritical Claim 13 — World Engine Layer
 */

import type {
    WorldState,
    Location,
    TimeOfDay,
    TimeSlot,
    AmbientEvent,
    NPCWorldState,
} from './index';

// ─── Schema Parsing Types ─────────────────────────────────────────────────────

/** Raw NPC definition from the parsed persona schema YAML */
export interface SchemaNPCDefinition {
    role: string;
    id: string;
    name: string;
    count: number;
    register: string;
    personality: string;
    vocabulary_focus: string[];
    patience_level: number;
    big_five: BigFiveProfile;
    cultural_overlay: CulturalOverlay;
}

export interface BigFiveProfile {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
}

export interface CulturalOverlay {
    communicative_directness: number;
    formality_default: number;
    power_distance_sensitivity: number;
    emotional_expressiveness: number;
}

/** Raw location definition from the parsed persona schema YAML */
export interface SchemaLocationDefinition {
    id: string;
    name: Record<string, string>;
    description: string;
    type: 'public' | 'private' | 'commercial' | 'institutional';
    connections: string[];
    npcs: {
        resident: string[];
        transient: string[];
    };
    interactables: Array<{
        id: string;
        name: Record<string, string>;
        type: 'object' | 'sign' | 'menu' | 'document' | 'device';
        vocabulary_domain: string;
        interaction_prompt: string;
    }>;
    ambient_description: string;
    unlock_condition?: string;
}

/** Raw ambient event from the parsed schema YAML */
export interface SchemaAmbientEvent {
    id: string;
    name: string;
    trigger: 'time-based' | 'reputation-gated' | 'random' | 'quest-triggered';
    trigger_condition: string;
    description: string;
    npc_reactions: Record<string, string>;
    vocabulary_domain: string;
    duration: 'instant' | 'scene' | 'persistent';
    learner_can_ignore: boolean;
}

/** Parsed persona schema environment (Tier 2 section) */
export interface SchemaEnvironment {
    tier_2: {
        setting: string;
        locations: SchemaLocationDefinition[];
        npc_roster: SchemaNPCDefinition[];
        ambient_events?: SchemaAmbientEvent[];
    };
    time_system?: {
        enabled: boolean;
        day_length_minutes: number;
        time_affects_npcs: boolean;
        time_affects_locations: boolean;
        schedule: Array<{
            time_of_day: TimeOfDay;
            npc_availability: Record<string, boolean>;
            location_accessibility: Record<string, boolean>;
        }>;
    };
}

// ─── WorldState Creation ──────────────────────────────────────────────────────

/**
 * Create a WorldState from a parsed persona schema.
 *
 * @param schemaId - The persona schema identifier
 * @param environment - The parsed environment section from the schema
 * @param sessionId - Unique session identifier
 * @returns A fully initialized WorldState
 */
export function createWorldState(
    schemaId: string,
    environment: SchemaEnvironment,
    sessionId: string,
): WorldState {
    const locations = environment.tier_2.locations.map(loc => schemaLocationToLocation(loc));

    const npcStates: Record<string, NPCWorldState> = {};
    for (const npc of environment.tier_2.npc_roster) {
        // Find the NPC's initial location (first location where they're resident)
        const initialLocation = locations.find(
            loc => loc.npcs.resident.includes(npc.id)
        );
        npcStates[npc.id] = {
            npcId: npc.id,
            currentLocation: initialLocation?.id ?? locations[0].id,
            available: true,
            mood: 'neutral',
            reputationWithLearner: 0.0,
            injectionDirectives: [],
            lastInteractionTimestamp: 0,
        };
    }

    const ambientEvents: AmbientEvent[] = (environment.tier_2.ambient_events ?? []).map(
        evt => schemaEventToAmbientEvent(evt)
    );

    const timeSystem = environment.time_system
        ? {
            enabled: environment.time_system.enabled,
            dayLengthMinutes: environment.time_system.day_length_minutes,
            currentTimeOfDay: 'morning' as TimeOfDay,
            timeAffectsNPCs: environment.time_system.time_affects_npcs,
            timeAffectsLocations: environment.time_system.time_affects_locations,
            schedule: environment.time_system.schedule.map(slot => ({
                timeOfDay: slot.time_of_day,
                npcAvailability: slot.npc_availability,
                locationAccessibility: slot.location_accessibility,
                ambientEventProbability: {} as Record<string, number>,
            })),
        }
        : {
            enabled: false,
            dayLengthMinutes: 60,
            currentTimeOfDay: 'morning' as TimeOfDay,
            timeAffectsNPCs: false,
            timeAffectsLocations: false,
            schedule: [],
        };

    // Start in the first unlocked/public location, or staff-break-room
    const startLocation = locations.find(l => l.id === 'staff-break-room')
        ?? locations.find(l => l.type === 'public' || !l.unlockCondition)
        ?? locations[0];

    return {
        schemaId,
        locations,
        timeSystem,
        ambientEvents,
        activeEvents: [],
        learnerLocation: startLocation.id,
        npcStates,
        sessionId,
    };
}

// ─── Navigation ───────────────────────────────────────────────────────────────

/**
 * Move the learner to a connected location.
 *
 * @param state - Current world state
 * @param targetLocationId - ID of the location to navigate to
 * @returns Updated world state, or null if navigation is invalid
 */
export function navigateTo(
    state: WorldState,
    targetLocationId: string,
): WorldState | null {
    const currentLocation = state.locations.find(l => l.id === state.learnerLocation);
    if (!currentLocation) return null;

    // Check connection exists
    if (!currentLocation.connections.includes(targetLocationId)) return null;

    // Check target exists
    const targetLocation = state.locations.find(l => l.id === targetLocationId);
    if (!targetLocation) return null;

    // Check accessibility (time-gated)
    if (state.timeSystem.enabled && state.timeSystem.timeAffectsLocations) {
        const currentSlot = getCurrentTimeSlot(state);
        if (currentSlot && currentSlot.locationAccessibility[targetLocationId] === false) {
            return null; // Location closed at this time
        }
    }

    return {
        ...state,
        learnerLocation: targetLocationId,
    };
}

/**
 * Get NPCs currently present and available at a location.
 */
export function getNPCsAtLocation(
    state: WorldState,
    locationId: string,
): NPCWorldState[] {
    const location = state.locations.find(l => l.id === locationId);
    if (!location) return [];

    const allNpcIds = [...location.npcs.resident, ...location.npcs.transient];
    const currentSlot = state.timeSystem.enabled ? getCurrentTimeSlot(state) : null;

    return allNpcIds
        .map(id => state.npcStates[id])
        .filter((npc): npc is NPCWorldState => {
            if (!npc) return false;
            if (!npc.available) return false;
            // Check time-based availability
            if (currentSlot && currentSlot.npcAvailability[npc.npcId] === false) {
                return false;
            }
            return true;
        });
}

// ─── Time System ──────────────────────────────────────────────────────────────

const TIME_ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];

/**
 * Advance the time of day to the next period.
 */
export function advanceTime(state: WorldState): WorldState {
    if (!state.timeSystem.enabled) return state;

    const currentIndex = TIME_ORDER.indexOf(state.timeSystem.currentTimeOfDay);
    const nextIndex = (currentIndex + 1) % TIME_ORDER.length;

    return {
        ...state,
        timeSystem: {
            ...state.timeSystem,
            currentTimeOfDay: TIME_ORDER[nextIndex],
        },
    };
}

/**
 * Get the current time slot configuration.
 */
export function getCurrentTimeSlot(state: WorldState): TimeSlot | null {
    return state.timeSystem.schedule.find(
        s => s.timeOfDay === state.timeSystem.currentTimeOfDay
    ) ?? null;
}

// ─── Ambient Events ───────────────────────────────────────────────────────────

/**
 * Fire an ambient event, updating NPC moods and active events.
 */
export function fireAmbientEvent(
    state: WorldState,
    eventId: string,
): WorldState {
    const event = state.ambientEvents.find(e => e.id === eventId);
    if (!event) return state;
    if (state.activeEvents.includes(eventId)) return state;

    // Update NPC moods based on event reactions
    const updatedNpcStates = { ...state.npcStates };
    for (const [npcId, reaction] of Object.entries(event.npcReactions)) {
        if (updatedNpcStates[npcId]) {
            updatedNpcStates[npcId] = {
                ...updatedNpcStates[npcId],
                mood: reaction,
            };
        }
    }

    return {
        ...state,
        activeEvents:
            event.duration === 'instant'
                ? state.activeEvents
                : [...state.activeEvents, eventId],
        npcStates: updatedNpcStates,
    };
}

/**
 * Clear a resolved ambient event.
 */
export function clearAmbientEvent(
    state: WorldState,
    eventId: string,
): WorldState {
    return {
        ...state,
        activeEvents: state.activeEvents.filter(id => id !== eventId),
    };
}

// ─── Reputation ───────────────────────────────────────────────────────────────

/**
 * Update an NPC's reputation with the learner.
 * Clamps to [-1.0, 1.0] with a floor of -0.5 (NPCs never become hostile, only cold).
 *
 * @see ADR-005 Social Reputation Persistence
 */
export function updateReputation(
    state: WorldState,
    npcId: string,
    delta: number,
): WorldState {
    const npc = state.npcStates[npcId];
    if (!npc) return state;

    const newReputation = Math.max(-0.5, Math.min(1.0, npc.reputationWithLearner + delta));

    return {
        ...state,
        npcStates: {
            ...state.npcStates,
            [npcId]: {
                ...npc,
                reputationWithLearner: newReputation,
                lastInteractionTimestamp: Date.now(),
            },
        },
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function schemaLocationToLocation(loc: SchemaLocationDefinition): Location {
    return {
        id: loc.id,
        name: loc.name,
        description: loc.description,
        type: loc.type,
        connections: loc.connections,
        npcs: loc.npcs,
        interactables: loc.interactables.map(i => ({
            id: i.id,
            name: i.name,
            type: i.type,
            vocabularyDomain: i.vocabulary_domain,
            interactionPrompt: i.interaction_prompt,
        })),
        ambientDescription: loc.ambient_description,
        unlockCondition: loc.unlock_condition,
    };
}

function schemaEventToAmbientEvent(evt: SchemaAmbientEvent): AmbientEvent {
    return {
        id: evt.id,
        name: evt.name,
        trigger: evt.trigger,
        triggerCondition: evt.trigger_condition,
        description: evt.description,
        npcReactions: evt.npc_reactions,
        vocabularyDomain: evt.vocabulary_domain,
        duration: evt.duration,
        learnerCanIgnore: evt.learner_can_ignore,
    };
}
