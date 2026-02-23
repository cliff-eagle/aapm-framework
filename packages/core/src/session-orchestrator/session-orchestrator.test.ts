/**
 * Session Orchestrator — Integration Tests
 *
 * Full end-to-end flow: schema → WorldState → navigate → dialogue → outcome → reputation
 * Verifies there are no dead ends in the runtime pipeline.
 */
import { describe, it, expect, vi } from 'vitest';
import {
    initSession,
    navigate,
    tick,
    startNPCDialogue,
    processLearnerTurn,
    processNpcTurn,
    finishDialogue,
    endSession,
    getVisibleNPCs,
    getNavigableLocations,
    getDialoguePromptContext,
} from './index';
import type { EventEmitter, SimulationSession } from './index';
import type { SchemaEnvironment } from '../world-engine';

// ─── Schema Fixture ───────────────────────────────────────────

const testEnvironment: SchemaEnvironment = {
    tier_2: {
        setting: 'Airport Terminal',
        locations: [
            {
                id: 'gate-area',
                name: { en: 'Gate Area', es: 'Área de Embarque' },
                description: 'A busy airport gate',
                type: 'public',
                connections: ['lounge', 'cafe'],
                npcs: { resident: ['traveler'], transient: ['attendant'] },
                interactables: [
                    {
                        id: 'departure-board',
                        name: { en: 'Departure Board', es: 'Tablón de Salidas' },
                        type: 'sign',
                        vocabulary_domain: 'travel',
                        interaction_prompt: 'Check the departure times',
                    },
                ],
                ambient_description: 'Announcements echo through the terminal.',
            },
            {
                id: 'lounge',
                name: { en: 'VIP Lounge', es: 'Sala VIP' },
                description: 'A quiet lounge',
                type: 'private',
                connections: ['gate-area'],
                npcs: { resident: ['host'], transient: [] },
                interactables: [],
                ambient_description: 'Soft music and dim lighting.',
            },
            {
                id: 'cafe',
                name: { en: 'Terminal Café', es: 'Cafetería' },
                description: 'A busy coffee shop',
                type: 'commercial',
                connections: ['gate-area'],
                npcs: { resident: ['barista'], transient: [] },
                interactables: [
                    {
                        id: 'menu',
                        name: { en: 'Menu', es: 'Menú' },
                        type: 'menu',
                        vocabulary_domain: 'food-beverage',
                        interaction_prompt: 'Browse the drinks menu',
                    },
                ],
                ambient_description: 'The aroma of espresso fills the air.',
            },
        ],
        npc_roster: [
            {
                id: 'traveler',
                role: 'nervous-flyer',
                name: 'Miguel Rodriguez',
                count: 1,
                register: 'casual',
                personality: 'Anxious about flying, talks fast when nervous.',
                vocabulary_focus: ['travel', 'emotions'],
                patience_level: 0.8,
                big_five: { openness: 0.6, conscientiousness: 0.3, extraversion: 0.4, agreeableness: 0.8, neuroticism: 0.9 },
                cultural_overlay: { communicative_directness: 0.7, formality_default: 0.3, power_distance_sensitivity: 0.2, emotional_expressiveness: 0.9 },
            },
            {
                id: 'attendant',
                role: 'flight-attendant',
                name: 'Sofia Garcia',
                count: 1,
                register: 'formal-professional',
                personality: 'Professional, efficient, warm but boundaries.',
                vocabulary_focus: ['service', 'safety'],
                patience_level: 0.6,
                big_five: { openness: 0.5, conscientiousness: 0.9, extraversion: 0.6, agreeableness: 0.7, neuroticism: 0.2 },
                cultural_overlay: { communicative_directness: 0.5, formality_default: 0.8, power_distance_sensitivity: 0.6, emotional_expressiveness: 0.4 },
            },
            {
                id: 'host',
                role: 'lounge-host',
                name: 'Antoine Dubois',
                count: 1,
                register: 'formal',
                personality: 'Elegant, speaks slowly and with precision.',
                vocabulary_focus: ['hospitality', 'luxury-service'],
                patience_level: 0.9,
                big_five: { openness: 0.4, conscientiousness: 0.8, extraversion: 0.3, agreeableness: 0.6, neuroticism: 0.1 },
                cultural_overlay: { communicative_directness: 0.3, formality_default: 0.9, power_distance_sensitivity: 0.8, emotional_expressiveness: 0.2 },
            },
            {
                id: 'barista',
                role: 'barista',
                name: 'Elena Martinez',
                count: 1,
                register: 'warm-casual',
                personality: 'Chatty, loves recommending drinks, quick humor.',
                vocabulary_focus: ['food-beverage', 'small-talk'],
                patience_level: 0.5,
                big_five: { openness: 0.8, conscientiousness: 0.5, extraversion: 0.9, agreeableness: 0.7, neuroticism: 0.3 },
                cultural_overlay: { communicative_directness: 0.8, formality_default: 0.2, power_distance_sensitivity: 0.1, emotional_expressiveness: 0.9 },
            },
        ],
        ambient_events: [
            {
                id: 'boarding-call',
                name: 'Boarding Announcement',
                trigger: 'random',
                trigger_condition: 'random < 0.5',
                description: 'A boarding call echoes through the terminal.',
                npc_reactions: { traveler: 'anxious' },
                vocabulary_domain: 'travel',
                duration: 'scene',
                learner_can_ignore: false,
            },
        ],
    },
    time_system: {
        enabled: true,
        day_length_minutes: 20,
        time_affects_npcs: true,
        time_affects_locations: true,
        schedule: [
            {
                time_of_day: 'morning',
                npc_availability: { traveler: true, attendant: true, host: true, barista: true },
                location_accessibility: { 'gate-area': true, lounge: true, cafe: true },
            },
            {
                time_of_day: 'afternoon',
                npc_availability: { traveler: true, attendant: false, host: true, barista: true },
                location_accessibility: { 'gate-area': true, lounge: true, cafe: true },
            },
            {
                time_of_day: 'evening',
                npc_availability: { traveler: false, attendant: false, host: true, barista: false },
                location_accessibility: { 'gate-area': true, lounge: true, cafe: false },
            },
            {
                time_of_day: 'night',
                npc_availability: { traveler: false, attendant: false, host: false, barista: false },
                location_accessibility: { 'gate-area': true, lounge: false, cafe: false },
            },
        ],
    },
};

// ─── Mock Event Emitter ───────────────────────────────────────

function createMockEmitter() {
    const events: Array<{ type: string; payload: unknown }> = [];
    return {
        emitter: {
            emit: vi.fn((event) => events.push({ type: event.type, payload: event.payload })),
        } as EventEmitter,
        events,
    };
}

// ─── E2E Tests ────────────────────────────────────────────────

describe('Session Orchestrator — E2E', () => {
    it('should initialize a complete session from schema', () => {
        const session = initSession('test-schema', 'learner-1', testEnvironment);

        expect(session.status).toBe('active');
        expect(session.worldState.locations).toHaveLength(3);
        expect(session.npcDefinitions.size).toBe(4);
        expect(session.worldState.learnerLocation).toBe('gate-area');
    });

    it('should emit SESSION_STARTED event on init', () => {
        const { emitter, events } = createMockEmitter();
        initSession('test', 'learner-1', testEnvironment, emitter);

        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('SESSION_STARTED');
    });

    it('should navigate between connected locations', () => {
        const session = initSession('test', 'learner-1', testEnvironment);

        const navigated = navigate(session, 'cafe');
        expect(navigated).not.toBeNull();
        expect(navigated!.worldState.learnerLocation).toBe('cafe');

        // Can't navigate to non-connected location
        const blocked = navigate(navigated!, 'lounge'); // cafe only connects to gate-area
        expect(blocked).toBeNull();
    });

    it('should block navigation during dialogue', () => {
        let session = initSession('test', 'learner-1', testEnvironment);
        session = startNPCDialogue(session, 'traveler', 'Ask about flight')!;

        const blocked = navigate(session, 'cafe');
        expect(blocked).toBeNull();
    });

    it('should list navigable locations with accessibility', () => {
        const session = initSession('test', 'learner-1', testEnvironment);
        const locations = getNavigableLocations(session);

        expect(locations).toHaveLength(2); // gate-area connects to lounge + cafe
        expect(locations.map(l => l.id)).toContain('lounge');
        expect(locations.map(l => l.id)).toContain('cafe');
        expect(locations.every(l => l.accessible)).toBe(true); // All open in morning
    });

    it('should show visible NPCs with behavioral modifiers', () => {
        const session = initSession('test', 'learner-1', testEnvironment);
        const npcs = getVisibleNPCs(session);

        // gate-area in the morning: traveler (resident) + attendant (transient)
        expect(npcs.length).toBeGreaterThanOrEqual(1);
        const traveler = npcs.find(n => n.npcState.npcId === 'traveler');
        expect(traveler).toBeDefined();
        expect(traveler!.behavior.patience).toBeGreaterThan(0);
        expect(traveler!.reputationDescriptor).toContain('Friendly');
    });

    it('should run full dialogue lifecycle with reputation change', () => {
        const { emitter, events } = createMockEmitter();
        let session = initSession('test', 'learner-1', testEnvironment, emitter);

        // Start dialogue with traveler
        session = startNPCDialogue(session, 'traveler', 'Calm the nervous flyer')!;
        expect(session.activeDialogue).not.toBeNull();
        expect(session.activeDialogue!.goal).toBe('Calm the nervous flyer');

        // Learner speaks (no friction → positive reputation)
        session = processLearnerTurn(session, 'Are you ok? Is this your first flight?', [], {
            expectedRegister: 'casual',
            detectedRegister: 'casual',
            aligned: true,
            score: 0.9,
        }, emitter)!;

        // NPC responds
        session = processNpcTurn(session, 'Sí, estoy muy nervioso... ¿tú vuelas mucho?')!;

        // Learner with vocabulary friction
        session = processLearnerTurn(session, 'Yo fly mucho.', [
            { id: 'f1', type: 'vocabulary', description: 'Used English "fly" instead of "vuelo"', severity: 0.3 },
        ], undefined, emitter)!;

        // Check friction event was emitted
        const frictionEvents = events.filter(e => e.type === 'FRICTION_DETECTED');
        expect(frictionEvents.length).toBeGreaterThan(0);

        // End dialogue
        const result = finishDialogue(session, true, emitter)!;
        expect(result).not.toBeNull();
        expect(result.outcome.goalAchieved).toBe(true);
        expect(result.outcome.frictionEvents).toHaveLength(1);
        expect(result.outcome.totalTurns).toBe(3);

        // Reputation should have changed
        const repEvents = events.filter(e => e.type === 'REPUTATION_DELTA');
        expect(repEvents.length).toBeGreaterThan(0);

        // Session should have no active dialogue
        expect(result.session.activeDialogue).toBeNull();
    });

    it('should generate prompt context during dialogue', () => {
        let session = initSession('test', 'learner-1', testEnvironment);
        session = startNPCDialogue(session, 'traveler', 'Ask about anxiety')!;

        const ctx = getDialoguePromptContext(session);
        expect(ctx).not.toBeNull();
        expect(ctx!['{{npc_name}}']).toBe('Miguel Rodriguez');
        expect(ctx!['{{npc_role}}']).toBe('nervous-flyer');
        expect(ctx!['{{npc_personality}}']).toContain('BEHAVIORAL MODIFIERS');
        expect(ctx!['{{dialogue_goal}}']).toBe('Ask about anxiety');
    });

    it('should advance time and decay moods', () => {
        let session = initSession('test', 'learner-1', testEnvironment);
        expect(session.worldState.timeSystem.currentTimeOfDay).toBe('morning');

        session = tick(session); // → afternoon
        expect(session.worldState.timeSystem.currentTimeOfDay).toBe('afternoon');

        // Attendant should now be unavailable (afternoon schedule)
        const npcs = getVisibleNPCs(session);
        expect(npcs.find(n => n.npcState.npcId === 'attendant')).toBeUndefined();
    });

    it('should block navigation to time-locked locations', () => {
        let session = initSession('test', 'learner-1', testEnvironment);
        session = tick(session); // afternoon
        session = tick(session); // evening

        // cafe is closed in evening
        const result = navigate(session, 'cafe');
        expect(result).toBeNull();
    });

    it('should handle complete session lifecycle with end event', () => {
        const { emitter, events } = createMockEmitter();
        let session = initSession('test', 'learner-1', testEnvironment, emitter);

        // Navigate, dialogue, end session
        session = navigate(session, 'cafe', emitter)!;
        const ended = endSession(session, emitter);

        expect(ended.status).toBe('ended');
        expect(events.some(e => e.type === 'SESSION_ENDED')).toBe(true);
    });

    it('should produce NPC mood changes from friction events', () => {
        const { emitter, events } = createMockEmitter();
        let session = initSession('test', 'learner-1', testEnvironment, emitter);

        session = startNPCDialogue(session, 'traveler', 'Test mood')!;
        session = processLearnerTurn(session, 'Hey dude whatever', [
            { id: 'f1', type: 'cultural', description: 'Dismissive tone', severity: 0.8 },
        ], undefined, emitter)!;

        // Should have emitted NPC_MOOD_CHANGED
        const moodEvents = events.filter(e => e.type === 'NPC_MOOD_CHANGED');
        expect(moodEvents.length).toBeGreaterThan(0);
    });

    it('should bridge FrictionEvent types to FrictionDetectedPayload', () => {
        const { emitter, events } = createMockEmitter();
        let session = initSession('test', 'learner-1', testEnvironment, emitter);

        session = startNPCDialogue(session, 'traveler', 'Test friction bridge')!;
        session = processLearnerTurn(session, 'Bad input', [
            { id: 'f1', type: 'phonetic', description: 'Mispronunciation', severity: 0.6 },
        ], undefined, emitter)!;

        const frictionEvt = events.find(e => e.type === 'FRICTION_DETECTED');
        expect(frictionEvt).toBeDefined();
        expect((frictionEvt!.payload as { frictionType: string }).frictionType).toBe('phonemic');
        expect((frictionEvt!.payload as { severity: string }).severity).toBe('high');
    });
});
