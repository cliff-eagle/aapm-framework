/**
 * Type-Contract Tests — Persistence, Retention, Tier Manager, Refraction
 */

import { describe, it, expect } from 'vitest';
import type {
    LearnerProfile, ThreeAxisCoordinates, CrossSchemaTransferRecord,
} from '../persistence';
import type {
    RetentionEngineState, ChurnRiskAssessment,
} from '../retention';
import type {
    TierType, TierSystemState, TierTransitionEvent,
} from '../tier-manager';
import type {
    RefractionRequest,
} from '../refraction';

// ── Persistence ───────────────────────────────────────────────

describe('Persistence types', () => {
    it('ThreeAxisCoordinates has x/y/z', () => {
        const coords: ThreeAxisCoordinates = { x: 0.7, y: 0.8, z: 0.6 };
        expect(coords.x).toBe(0.7);
    });

    it('LearnerProfile has identity fields', () => {
        const profile = {
            learnerId: 'learner-1',
            createdAt: new Date().toISOString(),
            currentCEFR: 'B1' as const,
            activePersonaId: 'persona-1',
        } satisfies Partial<LearnerProfile>;
        expect(profile.learnerId).toBeTruthy();
    });

    it('CrossSchemaTransferRecord has source/target schemas', () => {
        const transfer = {
            learnerId: 'learner-1',
            sourceSchemaId: 'market-schema',
            targetSchemaId: 'restaurant-schema',
        } satisfies Partial<CrossSchemaTransferRecord>;
        expect(transfer.sourceSchemaId).toBe('market-schema');
    });
});

// ── Retention ─────────────────────────────────────────────────

describe('Retention types', () => {
    it('RetentionEngineState tracks active profile', () => {
        const state = {
            learnerId: 'learner-1',
        } satisfies Partial<RetentionEngineState>;
        expect(state.learnerId).toBeTruthy();
    });

    it('ChurnRiskAssessment flags at-risk learners', () => {
        const risk = {
            level: 'medium' as const,
            score: 0.6,
            factors: ['low session frequency'],
        } satisfies Partial<ChurnRiskAssessment>;
        expect(risk.level).toBe('medium');
        expect(risk.score).toBeGreaterThan(0);
    });
});

// ── Tier Manager ──────────────────────────────────────────────

describe('Tier Manager types', () => {
    it('TierType covers 3 tiers', () => {
        const tiers: TierType[] = [1, 2, 3];
        expect(tiers.length).toBe(3);
    });

    it('TierSystemState has learner and tier', () => {
        const state = {
            learnerId: 'learner-1',
            recommendedTier: 2 as TierType,
        } satisfies Partial<TierSystemState>;
        expect(state.recommendedTier).toBe(2);
    });

    it('TierTransitionEvent records tier changes', () => {
        const event = {
            learnerId: 'learner-1',
            recommendedTier: 2 as TierType,
        } satisfies Partial<TierTransitionEvent>;
        expect(event.recommendedTier).toBe(2);
    });
});

// ── Refraction ────────────────────────────────────────────────

describe('Refraction types', () => {
    it('RefractionRequest captures learner input', () => {
        const request = {
            trigger: 'user-initiated' as const,
            learnerInput: 'Yo quiero que tú vas al mercado.',
            inputLanguage: 'es',
            targetLanguage: 'es',
            nativeLanguage: 'en',
            cefrLevel: 'B1',
            tierContext: 2 as const,
        } satisfies Partial<RefractionRequest>;
        expect(request.learnerInput).toContain('vas');
    });
});
