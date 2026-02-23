/**
 * @module test-utils
 * @description Shared test fixtures and mock builders for all AAPM modules.
 *
 * Every module's test file imports from here. One source of truth for
 * test data prevents drift between modules.
 *
 * @see IMPLEMENTATION_MASTERCLASS.md Chapter 4.3
 */

import type {
    SessionRecord,
    LearnerProfile,
    LearnerState,
    FrictionPoint,
    ForwardInjectionDirective,
    ConversationTurn,
    RetentionProfile,
} from '../types';

// ─── Conversation Turn Fixtures ───────────────────────────────────────────────

export const FIXTURE_TURNS: ConversationTurn[] = [
    {
        speaker: 'npc',
        content: 'How was training today?',
        timestamp: '2026-01-15T10:00:05Z',
    },
    {
        speaker: 'learner',
        content: 'It was... como se dice... difficult',
        timestamp: '2026-01-15T10:00:12Z',
    },
    {
        speaker: 'npc',
        content: 'Ah, you mean it was tough! What made it challenging?',
        timestamp: '2026-01-15T10:00:20Z',
    },
    {
        speaker: 'learner',
        content: 'The coach he speak very fast, I no understand the instructions',
        timestamp: '2026-01-15T10:00:30Z',
    },
];

// ─── Session Fixtures ─────────────────────────────────────────────────────────

export const FIXTURE_SESSION: SessionRecord = {
    sessionId: 'test-session-001',
    tier: 1,
    personaSchema: 'premier-league',
    transcript: FIXTURE_TURNS,
    frictionPoints: [],
    forwardInjectionDirectives: [],
    reputationDeltas: new Map<string, number>(),
};

// ─── Learner Fixtures ─────────────────────────────────────────────────────────

export const FIXTURE_LEARNER: LearnerProfile = {
    native_language: 'es',
    target_languages: ['en'],
    proficiency_baseline: 'B1',
    domain: 'professional-sports',
    objective: 'Navigate daily life and professional interactions in English at a Premier League club',
};

export const FIXTURE_RETENTION: RetentionProfile = {
    default_style: 'gamified-coercion',
    async_triggers: [],
};

export const FIXTURE_LEARNER_STATE: LearnerState = {
    learnerId: 'test-learner-001',
    matrixCoordinates: { x: 0.4, y: 0.5, z: 0.3 },
    phonemeProfile: new Map<string, number[]>(),
    frictionHistory: [],
    retentionProfile: FIXTURE_RETENTION,
    activePersona: 'premier-league',
};

// ─── Friction Fixtures ────────────────────────────────────────────────────────

export const FIXTURE_FRICTION_LEXICAL: FrictionPoint = {
    id: 'fp-test-001',
    type: 'lexical',
    severity: 'medium',
    timestamp: '2026-01-15T10:00:12Z',
    context: {
        turnsBefore: 'NPC: How was training today?',
        frictionTurn: 'Learner: It was... como se dice... difficult',
        turnsAfter: 'NPC: Ah, you mean it was tough!',
        communicativeConsequence: 'NPC understood intent but code-switch was noticeable',
    },
    analysis: {
        whatWentWrong: 'L1 transfer — learner used Spanish phrase instead of English',
        l1TransferHypothesis: 'Direct translation of ¿cómo se dice?',
        interlanguagePattern: 'systematic',
        comprehensibilityImpact: 'low',
        socialImpact: 'Minimal — common learner strategy, socially acceptable in casual context',
    },
    curriculumRecommendation: {
        priority: 'reinforcement',
        targetForm: 'how do you say',
        recommendedFormat: 'flashcard',
        forwardInjectionSpec: 'NPC should model "how do you say X" in upcoming conversation',
    },
    recurrence: {
        seenBefore: false,
        previousSessions: [],
        trajectory: 'stable',
    },
};

export const FIXTURE_FRICTION_MORPHO: FrictionPoint = {
    id: 'fp-test-002',
    type: 'morphosyntactic',
    severity: 'high',
    timestamp: '2026-01-15T10:00:30Z',
    context: {
        turnsBefore: 'NPC: What made it challenging?',
        frictionTurn: 'Learner: The coach he speak very fast',
        turnsAfter: '',
        communicativeConsequence: 'Message understood but register/grammar error was prominent',
    },
    analysis: {
        whatWentWrong: 'Subject pronoun doubling + missing 3rd person -s',
        l1TransferHypothesis: 'Spanish allows subject doubling; no 3rd person -s in Spanish present',
        interlanguagePattern: 'systematic',
        comprehensibilityImpact: 'medium',
        socialImpact: 'In professional context, repeated errors affect perceived competence',
    },
    curriculumRecommendation: {
        priority: 'immediate',
        targetForm: 'third-person singular present tense (-s)',
        recommendedFormat: 'slideshow',
        forwardInjectionSpec: 'NPC should describe daily routines using third-person',
    },
    recurrence: {
        seenBefore: true,
        previousSessions: ['session-prev-001'],
        trajectory: 'stable',
    },
};

// ─── Forward Injection Fixtures ───────────────────────────────────────────────

export const FIXTURE_INJECTION: ForwardInjectionDirective = {
    targetForm: 'third-person singular present tense (-s)',
    frictionType: 'morphosyntactic',
    injectionMethod: 'NPC models correct form in natural conversation',
    constraint: 'Max 3 attempts per session; must feel natural',
};

// ─── Mock Builder ─────────────────────────────────────────────────────────────

/**
 * Creates a simple mock function that returns a resolved promise by default.
 * Compatible with vitest's vi.fn() but works without vitest as a dependency.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function createMockFn(defaultValue?: any) {
    const calls: unknown[][] = [];
    let impl: (...args: any[]) => any = () => Promise.resolve(defaultValue);

    const fn = (...args: unknown[]) => {
        calls.push(args);
        return impl(...args);
    };
    fn.calls = calls;
    fn.mockResolvedValue = (val: any) => {
        impl = () => Promise.resolve(val);
        return fn;
    };
    fn.mockRejectedValue = (err: any) => {
        impl = () => Promise.reject(err);
        return fn;
    };
    fn.mockReturnValue = (val: any) => {
        impl = () => val;
        return fn;
    };
    return fn;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Build a complete set of mock dependencies for pipeline testing.
 *
 * All methods return sensible defaults. Override individual methods
 * for specific test cases.
 *
 * @example
 * ```typescript
 * const deps = buildMockDeps();
 * deps.llmProvider.generateStructured.mockResolvedValue({
 *   frictionPoints: [FIXTURE_FRICTION_LEXICAL]
 * });
 * ```
 */
export function buildMockDeps() {
    return {
        llmProvider: {
            generateStructured: createMockFn({ frictionPoints: [] }),
            generateText: createMockFn('mock response'),
            generateEmbedding: createMockFn(new Array(1536).fill(0)),
        },
        vectorStore: {
            upsert: createMockFn(),
            query: createMockFn([]),
            delete: createMockFn(),
        },
        sessionStore: {
            getSession: createMockFn(FIXTURE_SESSION),
            saveSession: createMockFn(),
            getLearnerProfile: createMockFn(FIXTURE_LEARNER),
            updateLearnerProfile: createMockFn(),
            getPreviousFrictionPoints: createMockFn([]),
        },
        notificationService: {
            schedule: createMockFn('notif-001'),
            cancel: createMockFn(),
        },
        logger: {
            info: createMockFn(),
            warn: createMockFn(),
            error: createMockFn(),
        },
    };
}
