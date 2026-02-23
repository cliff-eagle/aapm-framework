/**
 * Agent Intelligence — Prompt Composer Tests
 *
 * Validates 4-layer prompt composition, PromptRegistry,
 * template substitution, and affective filter alerts.
 *
 * @patentCritical Prompt composition is the bridge between
 *   the Persona Schema and LLM inference.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    composePrompt,
    initPromptRegistry,
    InMemoryPromptRegistry,
} from './prompt-composer';

import type {
    PersonaSchema,
    SessionContext,
    RealTimeState,
    NPCConfig,
} from '../types';

// ── Fixtures ─────────────────────────────────────────────────

const FIXTURE_NPC: NPCConfig = {
    id: 'companion-001',
    name: 'Marco',
    role: 'companion',
    tier: 1,
    register: 'casual',
    personality: 'warm, curious, patient',
    vocabulary_focus: ['hospitality', 'food-service'],
};

const FIXTURE_SCHEMA: PersonaSchema = {
    persona: {
        id: 'test-schema',
        name: 'Test Persona',
        learner_profile: {
            native_language: 'English',
            target_languages: ['Italian'],
            proficiency_baseline: 'A2',
            domain: 'hospitality',
            objective: 'Navigate daily interactions',
        },
        environment: {
            tier_2: {
                setting: 'Small Italian coastal town',
                locations: ['market', 'cafe', 'beach'],
                cultural_parameters: {
                    greeting_norms: 'kiss on both cheeks',
                    formality_level: 'informal',
                    taboo_topics: ['politics'],
                },
            },
            tier_3: {
                scenarios: [],
            },
        },
        companion: {
            personality: 'warm and encouraging',
            shared_interests: ['cooking', 'travel'],
            cultural_bridge: 'grew up bilingual',
        },
        evaluation: {
            tier_2_success: 'Complete daily tasks independently',
            tier_3_success: 'N/A',
            primary_metric: 'taskCompletionRate',
        },
    },
};

const FIXTURE_SESSION_CONTEXT: SessionContext = {
    sessionId: 'session-001',
    learnerId: 'learner-001',
    npcRelationshipHistory: 'Met last week. Discussed cooking.',
    codeSwitchRatio: 0.65,
    socialReputation: 0.3,
    forwardInjectionDirectives: [],
    upcomingChallenges: ['order food at market'],
};

const FIXTURE_REALTIME_STATE: RealTimeState = {
    currentTurn: 5,
    lastUtterance: 'Vorrei comprare il pane',
    interlanguageAssessment: {
        systematicErrors: [
            { type: 'morphosyntactic', pattern: 'article agreement', frequency: 3 },
        ],
        currentConfidence: 0.7,
        recentFrictionCount: 1,
    },
    activeScaffoldingTriggers: ['recasting'],
    detectedEmotionalState: 'neutral',
};

// ── Tests ────────────────────────────────────────────────────

describe('InMemoryPromptRegistry', () => {
    it('registers and retrieves templates', () => {
        const registry = new InMemoryPromptRegistry();
        registry.register(1, 'companion', 'You are {{NPC_NAME}}.');
        expect(registry.getTemplate(1, 'companion')).toBe('You are {{NPC_NAME}}.');
    });

    it('returns fallback for unknown NPC type', () => {
        const registry = new InMemoryPromptRegistry();
        const template = registry.getTemplate(2, 'unknown-role');
        expect(template).toContain('Tier 2');
        expect(template).toContain('unknown-role');
    });

    it('uses tier-level default when specific NPC type not found', () => {
        const registry = new InMemoryPromptRegistry();
        registry.register(1, 'tier1-companion', 'Default tier 1 template');
        const template = registry.getTemplate(1, 'some-other-role');
        expect(template).toBe('Default tier 1 template');
    });
});

describe('composePrompt', () => {
    beforeEach(() => {
        const registry = new InMemoryPromptRegistry();
        registry.register(1, 'companion', 'You are {{NPC_NAME}}, a {{NPC_ROLE}}. Personality: {{NPC_PERSONALITY}}. Register: {{NPC_REGISTER}}. Focus: {{VOCABULARY_FOCUS}}.');
        initPromptRegistry(registry);
    });

    it('produces a ComposedPrompt with correct tier and npcId', () => {
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, FIXTURE_SESSION_CONTEXT, FIXTURE_REALTIME_STATE);
        expect(result.tier).toBe(1);
        expect(result.npcId).toBe('companion-001');
    });

    it('includes schema ID in metadata', () => {
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, FIXTURE_SESSION_CONTEXT, FIXTURE_REALTIME_STATE);
        expect(result.metadata.schemaId).toBe('test-schema');
    });

    it('includes L2 ratio in metadata', () => {
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, FIXTURE_SESSION_CONTEXT, FIXTURE_REALTIME_STATE);
        expect(result.metadata.l2Ratio).toBe(0.65);
    });

    it('substitutes NPC config values into template', () => {
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, FIXTURE_SESSION_CONTEXT, FIXTURE_REALTIME_STATE);
        expect(result.system).toContain('Marco');
        expect(result.system).toContain('companion');
        expect(result.system).toContain('warm, curious, patient');
    });

    it('includes domain context from schema', () => {
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, FIXTURE_SESSION_CONTEXT, FIXTURE_REALTIME_STATE);
        expect(result.system).toContain('hospitality');
        expect(result.system).toContain('Italian');
        expect(result.system).toContain('A2');
    });

    it('includes session context with code-switch ratio', () => {
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, FIXTURE_SESSION_CONTEXT, FIXTURE_REALTIME_STATE);
        expect(result.system).toContain('65%');
        expect(result.system).toContain('session-001');
    });

    it('includes real-time state with emotional detection', () => {
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, FIXTURE_SESSION_CONTEXT, FIXTURE_REALTIME_STATE);
        expect(result.system).toContain('neutral');
        expect(result.system).toContain('Turn 5');
    });

    it('includes interlanguage errors in prompt', () => {
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, FIXTURE_SESSION_CONTEXT, FIXTURE_REALTIME_STATE);
        expect(result.system).toContain('article agreement');
        expect(result.system).toContain('morphosyntactic');
    });

    it('includes scaffolding triggers', () => {
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, FIXTURE_SESSION_CONTEXT, FIXTURE_REALTIME_STATE);
        expect(result.system).toContain('recasting');
    });

    it('includes Tier 1 companion context', () => {
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, FIXTURE_SESSION_CONTEXT, FIXTURE_REALTIME_STATE);
        expect(result.system).toContain('cooking');
        expect(result.system).toContain('bilingual');
    });

    it('includes affective filter alert for frustrated learner', () => {
        const frustratedState: RealTimeState = {
            ...FIXTURE_REALTIME_STATE,
            detectedEmotionalState: 'frustrated',
        };
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, FIXTURE_SESSION_CONTEXT, frustratedState);
        expect(result.system).toContain('AFFECTIVE FILTER ALERT');
        expect(result.system).toContain('frustrated');
        expect(result.system).toContain('reduce pressure');
    });

    it('includes forward injection directives when present', () => {
        const contextWithInjection: SessionContext = {
            ...FIXTURE_SESSION_CONTEXT,
            forwardInjectionDirectives: [
                {
                    targetForm: 'subjunctive mood',
                    frictionType: 'morphosyntactic',
                    injectionMethod: 'Create hypothetical scenario',
                    constraint: 'Must feel natural',
                },
            ],
        };
        const result = composePrompt(1, FIXTURE_NPC, FIXTURE_SCHEMA, contextWithInjection, FIXTURE_REALTIME_STATE);
        expect(result.system).toContain('FORWARD INJECTION');
        expect(result.system).toContain('subjunctive mood');
    });
});
