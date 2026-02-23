/**
 * @module world-engine/world-runtime tests
 * Tests for WorldState creation, navigation, time system, ambient events,
 * and reputation management.
 */
import { describe, it, expect } from 'vitest';
import {
    createWorldState,
    navigateTo,
    advanceTime,
    getNPCsAtLocation,
    fireAmbientEvent,
    clearAmbientEvent,
    updateReputation,
} from './world-runtime';
import type { SchemaEnvironment } from './world-runtime';

// ─── Test Fixtures ────────────────────────────────────────────

const BIG_FIVE_DEFAULT = {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
};

const CULTURAL_DEFAULT = {
    communicative_directness: 0.5,
    formality_default: 0.5,
    power_distance_sensitivity: 0.5,
    emotional_expressiveness: 0.5,
};

const mockEnvironment: SchemaEnvironment = {
    tier_2: {
        setting: 'Test Hotel',
        locations: [
            {
                id: 'lobby',
                name: { en: 'Lobby', es: 'Vestíbulo' },
                description: 'The hotel lobby',
                type: 'public',
                connections: ['restaurant', 'room'],
                npcs: { resident: ['doorman'], transient: ['guest-a'] },
                interactables: [
                    {
                        id: 'bell',
                        name: { en: 'Bell', es: 'Campana' },
                        type: 'object',
                        vocabulary_domain: 'hospitality',
                        interaction_prompt: 'Ring the bell',
                    },
                ],
                ambient_description: 'Marble floors and soft music.',
            },
            {
                id: 'restaurant',
                name: { en: 'Restaurant', es: 'Restaurante' },
                description: 'Hotel restaurant',
                type: 'commercial',
                connections: ['lobby'],
                npcs: { resident: ['waiter'], transient: [] },
                interactables: [],
                ambient_description: 'Fine dining ambiance.',
            },
            {
                id: 'room',
                name: { en: 'VIP Room', es: 'Habitación VIP' },
                description: 'A locked VIP room',
                type: 'private',
                connections: ['lobby'],
                npcs: { resident: [], transient: ['vip'] },
                interactables: [],
                ambient_description: 'Quiet and luxurious.',
                unlock_condition: 'reputation >= 0.5',
            },
        ],
        npc_roster: [
            {
                id: 'doorman',
                role: 'doorman',
                name: 'Carlos',
                count: 1,
                register: 'warm-professional',
                personality: 'Friendly doorman',
                vocabulary_focus: ['greeting', 'hospitality'],
                patience_level: 0.8,
                big_five: BIG_FIVE_DEFAULT,
                cultural_overlay: CULTURAL_DEFAULT,
            },
            {
                id: 'waiter',
                role: 'waiter',
                name: 'Pierre',
                count: 1,
                register: 'formal',
                personality: 'Proper waiter',
                vocabulary_focus: ['food-service'],
                patience_level: 0.6,
                big_five: BIG_FIVE_DEFAULT,
                cultural_overlay: CULTURAL_DEFAULT,
            },
            {
                id: 'guest-a',
                role: 'guest',
                name: 'Anna',
                count: 1,
                register: 'casual',
                personality: 'Chatty guest',
                vocabulary_focus: ['small-talk'],
                patience_level: 0.9,
                big_five: BIG_FIVE_DEFAULT,
                cultural_overlay: CULTURAL_DEFAULT,
            },
        ],
        ambient_events: [
            {
                id: 'fire-alarm',
                name: 'Fire Alarm',
                trigger: 'random',
                trigger_condition: 'random < 0.1',
                description: 'The fire alarm rings.',
                npc_reactions: { doorman: 'panic mode' },
                vocabulary_domain: 'safety',
                duration: 'scene',
                learner_can_ignore: false,
            },
        ],
    },
    time_system: {
        enabled: true,
        day_length_minutes: 30,
        time_affects_npcs: true,
        time_affects_locations: true,
        schedule: [
            {
                time_of_day: 'morning',
                npc_availability: { doorman: true, waiter: true, 'guest-a': false },
                location_accessibility: { lobby: true, restaurant: true, room: true },
            },
            {
                time_of_day: 'afternoon',
                npc_availability: { doorman: true, waiter: true, 'guest-a': true },
                location_accessibility: { lobby: true, restaurant: true, room: true },
            },
            {
                time_of_day: 'evening',
                npc_availability: { doorman: false, waiter: true, 'guest-a': true },
                location_accessibility: { lobby: true, restaurant: true, room: false },
            },
            {
                time_of_day: 'night',
                npc_availability: { doorman: false, waiter: false, 'guest-a': false },
                location_accessibility: { lobby: true, restaurant: false, room: false },
            },
        ],
    },
};

// ─── createWorldState ─────────────────────────────────────────

describe('createWorldState', () => {
    it('should create a world state from schema', () => {
        const state = createWorldState('test-schema', mockEnvironment, 'session-1');

        expect(state.schemaId).toBe('test-schema');
        expect(state.sessionId).toBe('session-1');
        expect(state.locations).toHaveLength(3);
        expect(state.ambientEvents).toHaveLength(1);
        expect(Object.keys(state.npcStates)).toHaveLength(3);
    });

    it('should assign NPCs to their resident locations', () => {
        const state = createWorldState('test', mockEnvironment, 's1');

        expect(state.npcStates['doorman'].currentLocation).toBe('lobby');
        expect(state.npcStates['waiter'].currentLocation).toBe('restaurant');
    });

    it('should initialize all NPCs with neutral mood and 0.0 reputation', () => {
        const state = createWorldState('test', mockEnvironment, 's1');

        for (const npc of Object.values(state.npcStates)) {
            expect(npc.mood).toBe('neutral');
            expect(npc.reputationWithLearner).toBe(0.0);
            expect(npc.injectionDirectives).toEqual([]);
        }
    });

    it('should enable the time system', () => {
        const state = createWorldState('test', mockEnvironment, 's1');

        expect(state.timeSystem.enabled).toBe(true);
        expect(state.timeSystem.dayLengthMinutes).toBe(30);
        expect(state.timeSystem.currentTimeOfDay).toBe('morning');
        expect(state.timeSystem.schedule).toHaveLength(4);
    });

    it('should convert interactables from snake_case to camelCase', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const lobby = state.locations.find(l => l.id === 'lobby')!;

        expect(lobby.interactables[0].vocabularyDomain).toBe('hospitality');
        expect(lobby.interactables[0].interactionPrompt).toBe('Ring the bell');
    });
});

// ─── navigateTo ───────────────────────────────────────────────

describe('navigateTo', () => {
    it('should navigate to a connected location', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const result = navigateTo(state, 'restaurant');

        expect(result).not.toBeNull();
        expect(result!.learnerLocation).toBe('restaurant');
    });

    it('should return null for unconnected locations', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        // lobby connects to restaurant and room, not directly
        // restaurant connects only to lobby
        const atRestaurant = navigateTo(state, 'restaurant')!;
        const result = navigateTo(atRestaurant, 'room');

        expect(result).toBeNull();
    });

    it('should block navigation to time-locked locations', () => {
        let state = createWorldState('test', mockEnvironment, 's1');
        // Advance to evening — room is closed
        state = advanceTime(state); // afternoon
        state = advanceTime(state); // evening
        const result = navigateTo(state, 'room');

        expect(result).toBeNull();
    });

    it('should allow navigation when location is accessible', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        // Morning — restaurant is open
        const result = navigateTo(state, 'restaurant');

        expect(result).not.toBeNull();
    });
});

// ─── getNPCsAtLocation ────────────────────────────────────────

describe('getNPCsAtLocation', () => {
    it('should return resident NPCs', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const npcs = getNPCsAtLocation(state, 'lobby');

        // Morning: doorman is available, guest-a is not (per schedule)
        const ids = npcs.map(n => n.npcId);
        expect(ids).toContain('doorman');
    });

    it('should filter by time-based availability', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        // Morning: guest-a is NOT available
        const npcsM = getNPCsAtLocation(state, 'lobby');
        expect(npcsM.find(n => n.npcId === 'guest-a')).toBeUndefined();

        // Afternoon: guest-a IS available
        const afternoon = advanceTime(state);
        const npcsA = getNPCsAtLocation(afternoon, 'lobby');
        expect(npcsA.find(n => n.npcId === 'guest-a')).toBeDefined();
    });

    it('should return empty for locations with no present NPCs', () => {
        let state = createWorldState('test', mockEnvironment, 's1');
        state = advanceTime(state); // afternoon
        state = advanceTime(state); // evening
        state = advanceTime(state); // night
        const npcs = getNPCsAtLocation(state, 'restaurant');

        expect(npcs).toHaveLength(0);
    });
});

// ─── advanceTime ──────────────────────────────────────────────

describe('advanceTime', () => {
    it('should cycle through time periods', () => {
        let state = createWorldState('test', mockEnvironment, 's1');
        expect(state.timeSystem.currentTimeOfDay).toBe('morning');

        state = advanceTime(state);
        expect(state.timeSystem.currentTimeOfDay).toBe('afternoon');

        state = advanceTime(state);
        expect(state.timeSystem.currentTimeOfDay).toBe('evening');

        state = advanceTime(state);
        expect(state.timeSystem.currentTimeOfDay).toBe('night');

        state = advanceTime(state);
        expect(state.timeSystem.currentTimeOfDay).toBe('morning');
    });

    it('should not change state when time system is disabled', () => {
        const envNoTime = { ...mockEnvironment, time_system: undefined };
        const state = createWorldState('test', envNoTime, 's1');
        const result = advanceTime(state);

        expect(result.timeSystem.currentTimeOfDay).toBe('morning');
    });
});

// ─── fireAmbientEvent ─────────────────────────────────────────

describe('fireAmbientEvent', () => {
    it('should activate an event and update NPC moods', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const result = fireAmbientEvent(state, 'fire-alarm');

        expect(result.activeEvents).toContain('fire-alarm');
        expect(result.npcStates['doorman'].mood).toBe('panic mode');
    });

    it('should not double-activate an event', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const once = fireAmbientEvent(state, 'fire-alarm');
        const twice = fireAmbientEvent(once, 'fire-alarm');

        expect(twice.activeEvents.filter(e => e === 'fire-alarm')).toHaveLength(1);
    });

    it('should ignore unknown events', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const result = fireAmbientEvent(state, 'nonexistent');

        expect(result).toBe(state);
    });
});

// ─── clearAmbientEvent ────────────────────────────────────────

describe('clearAmbientEvent', () => {
    it('should remove an active event', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const active = fireAmbientEvent(state, 'fire-alarm');
        const cleared = clearAmbientEvent(active, 'fire-alarm');

        expect(cleared.activeEvents).not.toContain('fire-alarm');
    });
});

// ─── updateReputation ─────────────────────────────────────────

describe('updateReputation', () => {
    it('should increase reputation', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const result = updateReputation(state, 'doorman', 0.1);

        expect(result.npcStates['doorman'].reputationWithLearner).toBeCloseTo(0.1);
    });

    it('should clamp reputation to max 1.0', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const result = updateReputation(state, 'doorman', 5.0);

        expect(result.npcStates['doorman'].reputationWithLearner).toBe(1.0);
    });

    it('should clamp reputation floor to -0.5 (ADR-005)', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const result = updateReputation(state, 'doorman', -5.0);

        expect(result.npcStates['doorman'].reputationWithLearner).toBe(-0.5);
    });

    it('should update lastInteractionTimestamp', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const result = updateReputation(state, 'doorman', 0.1);

        expect(result.npcStates['doorman'].lastInteractionTimestamp).toBeGreaterThan(0);
    });

    it('should not change state for unknown NPC', () => {
        const state = createWorldState('test', mockEnvironment, 's1');
        const result = updateReputation(state, 'nobody', 0.1);

        expect(result).toBe(state);
    });
});
