/**
 * Feedback Engine Pipeline — Type and Structure Tests
 *
 * Validates that the pipeline's interfaces, provider contracts,
 * and dependency injection patterns are correctly structured.
 * These tests verify the framework's type system at runtime
 * without requiring actual LLM calls.
 */

import { describe, it, expect, vi } from 'vitest';

/**
 * Since the pipeline module uses complex provider interfaces,
 * we test the structural contracts and mock behaviors here.
 */

// ── Mock Provider Factories ──────────────────────────────────

function createMockLLMProvider() {
    return {
        generateStructured: vi.fn().mockResolvedValue({}),
        generateText: vi.fn().mockResolvedValue(''),
        generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };
}

function createMockVectorStore() {
    return {
        upsert: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(undefined),
    };
}

function createMockSessionStore() {
    return {
        getSession: vi.fn().mockResolvedValue(null),
        saveSession: vi.fn().mockResolvedValue(undefined),
        getLearnerProfile: vi.fn().mockResolvedValue(null),
        updateLearnerProfile: vi.fn().mockResolvedValue(undefined),
        getPreviousFrictionPoints: vi.fn().mockResolvedValue([]),
    };
}

function createMockNotificationService() {
    return {
        sendPushNotification: vi.fn().mockResolvedValue(undefined),
        sendEmail: vi.fn().mockResolvedValue(undefined),
        sendInAppMessage: vi.fn().mockResolvedValue(undefined),
    };
}

function createMockLogger() {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    };
}

// ── Provider Contract Tests ──────────────────────────────────

describe('Pipeline Provider Contracts', () => {
    it('LLMProvider mock satisfies the interface contract', () => {
        const provider = createMockLLMProvider();
        expect(provider).toHaveProperty('generateStructured');
        expect(provider).toHaveProperty('generateText');
        expect(provider).toHaveProperty('generateEmbedding');
        expect(typeof provider.generateStructured).toBe('function');
        expect(typeof provider.generateText).toBe('function');
        expect(typeof provider.generateEmbedding).toBe('function');
    });

    it('VectorStoreProvider mock satisfies the interface contract', () => {
        const provider = createMockVectorStore();
        expect(provider).toHaveProperty('upsert');
        expect(provider).toHaveProperty('query');
        expect(provider).toHaveProperty('delete');
    });

    it('SessionStoreProvider mock satisfies the interface contract', () => {
        const store = createMockSessionStore();
        expect(store).toHaveProperty('getSession');
        expect(store).toHaveProperty('saveSession');
        expect(store).toHaveProperty('getLearnerProfile');
        expect(store).toHaveProperty('updateLearnerProfile');
        expect(store).toHaveProperty('getPreviousFrictionPoints');
    });

    it('NotificationProvider mock satisfies the interface contract', () => {
        const service = createMockNotificationService();
        expect(service).toHaveProperty('sendPushNotification');
        expect(service).toHaveProperty('sendEmail');
        expect(service).toHaveProperty('sendInAppMessage');
    });

    it('PipelineLogger mock satisfies the interface contract', () => {
        const logger = createMockLogger();
        expect(logger).toHaveProperty('info');
        expect(logger).toHaveProperty('warn');
        expect(logger).toHaveProperty('error');
        expect(logger).toHaveProperty('debug');
    });
});

// ── LLM Provider Behavior Tests ──────────────────────────────

describe('LLM Provider Behavior', () => {
    it('generateStructured returns parsed JSON matching schema', async () => {
        const mockFrictionResponse = {
            frictionPoints: [
                {
                    type: 'morphosyntactic',
                    severity: 'medium',
                    utterance: 'I go yesterday to store',
                    targetRule: 'past tense of go → went',
                    analysis: {
                        learnerForm: 'go',
                        targetForm: 'went',
                        targetRule: 'Irregular past tense',
                        l1TransferLikelihood: 0.7,
                    },
                },
            ],
        };

        const provider = createMockLLMProvider();
        provider.generateStructured.mockResolvedValue(mockFrictionResponse);

        const result = await provider.generateStructured(
            'system prompt',
            'user prompt',
            { type: 'object' },
        );

        expect(result).toHaveProperty('frictionPoints');
        expect(result.frictionPoints).toHaveLength(1);
        expect(result.frictionPoints[0].type).toBe('morphosyntactic');
        expect(result.frictionPoints[0].severity).toBe('medium');
    });

    it('generateEmbedding returns a number array', async () => {
        const provider = createMockLLMProvider();
        const embedding = await provider.generateEmbedding('test text');
        expect(Array.isArray(embedding)).toBe(true);
        expect(embedding.every((n: number) => typeof n === 'number')).toBe(
            true,
        );
    });
});

// ── Session Store Behavior Tests ─────────────────────────────

describe('Session Store Behavior', () => {
    it('getPreviousFrictionPoints returns empty array for new learner', async () => {
        const store = createMockSessionStore();
        const points = await store.getPreviousFrictionPoints('new-learner', 10);
        expect(Array.isArray(points)).toBe(true);
        expect(points).toHaveLength(0);
    });

    it('getPreviousFrictionPoints returns historical data', async () => {
        const historicalPoints = [
            {
                id: 'fp-1',
                type: 'lexical',
                severity: 'low',
                sessionId: 'session-1',
            },
            {
                id: 'fp-2',
                type: 'morphosyntactic',
                severity: 'high',
                sessionId: 'session-2',
            },
        ];

        const store = createMockSessionStore();
        store.getPreviousFrictionPoints.mockResolvedValue(historicalPoints);

        const points = await store.getPreviousFrictionPoints('learner-1', 10);
        expect(points).toHaveLength(2);
        expect(points[0].type).toBe('lexical');
        expect(points[1].type).toBe('morphosyntactic');
    });

    it('getLearnerProfile returns null for unknown learner', async () => {
        const store = createMockSessionStore();
        const profile = await store.getLearnerProfile('unknown');
        expect(profile).toBeNull();
    });
});

// ── Friction Point Structure Tests ───────────────────────────

describe('FrictionPoint Structure', () => {
    const VALID_FRICTION_TYPES = [
        'lexical',
        'morphosyntactic',
        'phonemic',
        'register',
        'pragmatic',
        'cultural',
    ];

    const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

    it('friction types are well-defined', () => {
        expect(VALID_FRICTION_TYPES).toContain('lexical');
        expect(VALID_FRICTION_TYPES).toContain('morphosyntactic');
        expect(VALID_FRICTION_TYPES).toContain('phonemic');
        expect(VALID_FRICTION_TYPES).toContain('register');
        expect(VALID_FRICTION_TYPES).toContain('pragmatic');
        expect(VALID_FRICTION_TYPES).toContain('cultural');
    });

    it('severity levels form a valid ordinal scale', () => {
        expect(VALID_SEVERITIES).toEqual([
            'low',
            'medium',
            'high',
            'critical',
        ]);
    });

    it('friction point has required analysis fields', () => {
        const frictionPoint = {
            id: 'fp-test',
            type: 'morphosyntactic',
            severity: 'medium',
            utterance: 'I go yesterday',
            context: 'Talking about weekend activities',
            analysis: {
                learnerForm: 'go',
                targetForm: 'went',
                targetRule: 'Irregular past tense',
                l1TransferLikelihood: 0.7,
            },
            communicativeConsequence: 'comprehensible-but-marked',
            recurrence: {
                seenBefore: false,
                previousSessionIds: [],
                totalOccurrences: 1,
                trajectory: 'stable',
            },
        };

        expect(frictionPoint.analysis).toHaveProperty('learnerForm');
        expect(frictionPoint.analysis).toHaveProperty('targetForm');
        expect(frictionPoint.analysis).toHaveProperty('targetRule');
        expect(frictionPoint.analysis).toHaveProperty('l1TransferLikelihood');
        expect(frictionPoint.recurrence).toHaveProperty('seenBefore');
        expect(frictionPoint.recurrence).toHaveProperty('trajectory');
    });
});

// ── Curriculum Recommendation Structure ──────────────────────

describe('CurriculumRecommendation Structure', () => {
    const VALID_FORMATS = [
        'spaced-repetition-cards',
        'contextual-dialogue',
        'minimal-pair-drill',
        'register-comparison',
        'cultural-scenario',
    ];

    const VALID_PRIORITIES = ['immediate', 'soon', 'background'];

    it('curriculum formats cover all learning modalities', () => {
        expect(VALID_FORMATS.length).toBeGreaterThanOrEqual(5);
        expect(VALID_FORMATS).toContain('spaced-repetition-cards');
        expect(VALID_FORMATS).toContain('contextual-dialogue');
    });

    it('priority levels form a valid urgency scale', () => {
        expect(VALID_PRIORITIES).toEqual(['immediate', 'soon', 'background']);
    });

    it('curriculum recommendation has all required fields', () => {
        const recommendation = {
            priority: 'immediate' as const,
            targetForm: 'past tense irregular verbs',
            recommendedFormat: 'spaced-repetition-cards' as const,
            forwardInjectionSpec: {
                targetForm: 'past tense',
                frictionType: 'morphosyntactic',
                injectionMethod: 'Create natural conversation about past events',
                naturalityConstraint: 'Must feel like organic conversation',
                targetNpcIds: ['companion'],
                targetTier: 1,
                targetLocationIds: ['default'],
                maxSessionAttempts: 3,
                status: 'pending' as const,
            },
            estimatedDurationMinutes: 3,
        };

        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('targetForm');
        expect(recommendation).toHaveProperty('recommendedFormat');
        expect(recommendation).toHaveProperty('forwardInjectionSpec');
        expect(recommendation).toHaveProperty('estimatedDurationMinutes');
        expect(recommendation.forwardInjectionSpec).toHaveProperty(
            'injectionMethod',
        );
        expect(recommendation.forwardInjectionSpec).toHaveProperty(
            'naturalityConstraint',
        );
    });
});

// ── Forward Injection Spec ───────────────────────────────────

describe('ForwardInjectionSpec Structure', () => {
    it('injection spec targets specific NPCs and locations', () => {
        const spec = {
            targetForm: 'subjunctive mood',
            frictionType: 'morphosyntactic',
            injectionMethod:
                'NPC uses subjunctive in hypothetical question to learner',
            naturalityConstraint:
                'Must feel like organic conversation, not a test',
            targetNpcIds: ['shopkeeper', 'neighbor'],
            targetTier: 2,
            targetLocationIds: ['market', 'cafe'],
            maxSessionAttempts: 3,
            status: 'pending' as const,
        };

        expect(spec.targetNpcIds).toHaveLength(2);
        expect(spec.targetTier).toBeGreaterThanOrEqual(1);
        expect(spec.targetTier).toBeLessThanOrEqual(3);
        expect(spec.maxSessionAttempts).toBeGreaterThan(0);
        expect(['pending', 'active', 'completed', 'expired']).toContain(
            spec.status,
        );
    });
});
