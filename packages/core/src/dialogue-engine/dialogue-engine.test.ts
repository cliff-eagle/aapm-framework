/**
 * @module dialogue-engine tests
 * Tests for dialogue lifecycle management, reputation deltas,
 * injection tracking, and prompt context generation.
 */
import { describe, it, expect } from 'vitest';
import {
    startDialogue,
    recordLearnerTurn,
    recordNpcTurn,
    endDialogue,
    applyDialogueOutcome,
    buildNPCPromptContext,
} from './index';
import type { NPCDialogueDefinition } from './index';
import type { NPCWorldState, WorldState } from '../world-engine';

// ─── Test Fixtures ────────────────────────────────────────────

const mockNPCDef: NPCDialogueDefinition = {
    id: 'test-npc',
    name: 'Test NPC',
    role: 'waiter',
    register: 'formal',
    personality: 'Polite waiter who values proper service.',
    vocabulary_focus: ['food-service', 'greeting'],
    patience_level: 0.7,
    big_five: {
        openness: 0.5,
        conscientiousness: 0.7,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3,
    },
    cultural_overlay: {
        communicative_directness: 0.6,
        formality_default: 0.8,
        power_distance_sensitivity: 0.5,
        emotional_expressiveness: 0.4,
    },
};

const mockNPCState: NPCWorldState = {
    npcId: 'test-npc',
    currentLocation: 'restaurant',
    available: true,
    mood: 'neutral',
    reputationWithLearner: 0.2,
    injectionDirectives: ['tasting menu', 'wine pairing'],
    lastInteractionTimestamp: 0,
};

// ─── startDialogue ────────────────────────────────────────────

describe('startDialogue', () => {
    it('should create a dialogue session', () => {
        const session = startDialogue(
            mockNPCDef,
            mockNPCState,
            'restaurant',
            'Take the dinner order',
            ['tasting menu'],
        );

        expect(session.npcId).toBe('test-npc');
        expect(session.phase).toBe('opening');
        expect(session.goal).toBe('Take the dinner order');
        expect(session.turns).toHaveLength(0);
        expect(session.reputationDelta).toBe(0);
        expect(session.injectionTargets).toEqual(['tasting menu']);
    });

    it('should compute NPC behavior modifiers', () => {
        const session = startDialogue(mockNPCDef, mockNPCState, 'restaurant', 'Test');

        expect(session.npcBehavior.patience).toBeGreaterThan(0);
        expect(session.npcBehavior.registerStrictness).toBeGreaterThan(0);
        expect(session.npcBehavior.silenceToleranceSeconds).toBeGreaterThanOrEqual(3);
    });
});

// ─── recordLearnerTurn ────────────────────────────────────────

describe('recordLearnerTurn', () => {
    it('should add a learner turn', () => {
        const session = startDialogue(mockNPCDef, mockNPCState, 'r', 'Test');
        const updated = recordLearnerTurn(session, 'Hello, I would like to order.');

        expect(updated.turns).toHaveLength(1);
        expect(updated.turns[0].speaker).toBe('learner');
        expect(updated.phase).toBe('active');
    });

    it('should add positive reputation for friction-free turn', () => {
        const session = startDialogue(mockNPCDef, mockNPCState, 'r', 'Test');
        const updated = recordLearnerTurn(session, 'Good evening.');

        expect(updated.reputationDelta).toBeGreaterThan(0);
    });

    it('should subtract reputation for cultural friction', () => {
        const session = startDialogue(mockNPCDef, mockNPCState, 'r', 'Test');
        const updated = recordLearnerTurn(session, 'Hey dude!', [
            {
                id: 'f1',
                type: 'cultural',
                description: 'Too informal with authority',
                severity: 0.8,
            },
        ]);

        expect(updated.reputationDelta).toBeLessThan(0);
        expect(updated.frictionEvents).toHaveLength(1);
    });

    it('should add register alignment bonus', () => {
        const session = startDialogue(mockNPCDef, mockNPCState, 'r', 'Test');
        const aligned = recordLearnerTurn(session, 'Good evening, sir.', [], {
            expectedRegister: 'formal',
            detectedRegister: 'formal',
            aligned: true,
            score: 0.95,
        });

        expect(aligned.reputationDelta).toBeGreaterThan(0.05); // 0.05 (clean) + 0.05 (register)
    });

    it('should detect injection target hits', () => {
        const session = startDialogue(
            mockNPCDef, mockNPCState, 'r', 'Test',
            ['tasting menu', 'wine pairing'],
        );
        const updated = recordLearnerTurn(
            session,
            'Could you tell me about the tasting menu?',
        );

        expect(updated.injectionTargetsHit).toContain('tasting menu');
        expect(updated.injectionTargetsHit).not.toContain('wine pairing');
    });
});

// ─── recordNpcTurn ────────────────────────────────────────────

describe('recordNpcTurn', () => {
    it('should add an NPC turn', () => {
        const session = startDialogue(mockNPCDef, mockNPCState, 'r', 'Test');
        const updated = recordNpcTurn(session, 'Good evening, welcome.');

        expect(updated.turns).toHaveLength(1);
        expect(updated.turns[0].speaker).toBe('npc');
    });
});

// ─── endDialogue ──────────────────────────────────────────────

describe('endDialogue', () => {
    it('should produce an outcome with goal achieved bonus', () => {
        let session = startDialogue(mockNPCDef, mockNPCState, 'r', 'Test');
        session = recordLearnerTurn(session, 'Good evening.');
        session = recordNpcTurn(session, 'Welcome.');

        const outcome = endDialogue(session, true);

        expect(outcome.goalAchieved).toBe(true);
        expect(outcome.reputationDelta).toBeGreaterThan(session.reputationDelta);
        expect(outcome.totalTurns).toBe(2);
    });

    it('should calculate register accuracy', () => {
        let session = startDialogue(mockNPCDef, mockNPCState, 'r', 'Test');
        session = recordLearnerTurn(session, 'Hello', [], {
            expectedRegister: 'formal',
            detectedRegister: 'formal',
            aligned: true,
            score: 0.9,
        });
        session = recordLearnerTurn(session, 'Yo', [], {
            expectedRegister: 'formal',
            detectedRegister: 'casual',
            aligned: false,
            score: 0.3,
        });

        const outcome = endDialogue(session, false);

        expect(outcome.registerAccuracy).toBeCloseTo(0.6); // (0.9 + 0.3) / 2
    });
});

// ─── applyDialogueOutcome ─────────────────────────────────────

describe('applyDialogueOutcome', () => {
    it('should update world state reputation', () => {
        // Minimal world state for testing
        const worldState: WorldState = {
            schemaId: 'test',
            locations: [],
            timeSystem: {
                enabled: false,
                dayLengthMinutes: 60,
                currentTimeOfDay: 'morning',
                timeAffectsNPCs: false,
                timeAffectsLocations: false,
                schedule: [],
            },
            ambientEvents: [],
            activeEvents: [],
            learnerLocation: 'restaurant',
            npcStates: {
                'test-npc': { ...mockNPCState },
            },
            sessionId: 's1',
        };

        const outcome = {
            reputationDelta: 0.15,
            frictionEvents: [],
            goalAchieved: true,
            injectionTargetsHit: [],
            totalTurns: 4,
            finalMood: 'neutral' as const,
            registerAccuracy: 0.9,
        };

        const updated = applyDialogueOutcome(worldState, 'test-npc', outcome);
        expect(updated.npcStates['test-npc'].reputationWithLearner).toBeCloseTo(0.35);
    });
});

// ─── buildNPCPromptContext ────────────────────────────────────

describe('buildNPCPromptContext', () => {
    it('should produce template variable map', () => {
        const session = startDialogue(mockNPCDef, mockNPCState, 'restaurant', 'Take order');
        const ctx = buildNPCPromptContext(
            mockNPCDef,
            mockNPCState,
            session,
            'Fine dining restaurant',
        );

        expect(ctx['{{npc_name}}']).toBe('Test NPC');
        expect(ctx['{{npc_role}}']).toBe('waiter');
        expect(ctx['{{reputation_score}}']).toBe('0.20');
        expect(ctx['{{npc_personality}}']).toContain('BEHAVIORAL MODIFIERS');
        expect(ctx['{{dialogue_goal}}']).toBe('Take order');
        expect(ctx['{{forward_injection}}']).toContain('tasting menu');
    });
});
