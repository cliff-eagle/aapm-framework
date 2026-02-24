/**
 * Type-Contract Tests — Anti-Fossilization, Phoneme Engine, Interlanguage Engine
 */

import { describe, it, expect } from 'vitest';
import type {
    FossilizationProfile, FossilizedForm, AtRiskForm,
} from '../anti-fossilization';
import type {
    PAEInput, AlignedPhoneme, AlignedWord,
} from '../phoneme-engine';
import type {
    InterlanguageGrammar, HypothesisRule, GrammarEvolutionEvent,
} from '../interlanguage-engine';

// ── Anti-Fossilization ────────────────────────────────────────

describe('Anti-Fossilization types', () => {
    it('FossilizedForm has formId and diagnostic fields', () => {
        const form: FossilizedForm = {
            formId: 'f1',
            incorrectForm: 'es',
            targetForm: 'sea',
            frictionType: 'morphosyntactic',
            interlanguageRuleId: 'rule-1',
            firstDetectedAt: '2025-01-01',
            sessionCount: 15,
            failedInterventions: 2,
            accuracyRate: 0.1,
            comprehensibilityImpact: 'high',
            socialImpact: 'moderate mismatch',
            status: 'intervention-active',
        };
        expect(form.targetForm).toBe('sea');
        expect(form.sessionCount).toBeGreaterThan(0);
    });

    it('FossilizationProfile aggregates forms', () => {
        const profile: FossilizationProfile = {
            learnerId: 'learner-1',
            assessedAt: new Date().toISOString(),
            fossilizedForms: [],
            atRiskForms: [],
            resolvedForms: [],
            fossilizationBurden: 0.3,
            averageResolutionTime: null,
        };
        expect(profile.learnerId).toBeTruthy();
        expect(Array.isArray(profile.fossilizedForms)).toBe(true);
    });

    it('AtRiskForm tracks worsening trajectory', () => {
        const risk: AtRiskForm = {
            targetForm: 'subjunctive',
            interlanguageRuleId: 'rule-2',
            sessionCount: 5,
            trajectory: 'worsening',
            estimatedSessionsToFossilization: 8,
            preventiveAction: 'varied-context-exposure',
        };
        expect(risk.trajectory).toBe('worsening');
    });
});

// ── Phoneme Engine ────────────────────────────────────────────

describe('Phoneme Engine types', () => {
    it('PAEInput requires audio and metadata', () => {
        const input: PAEInput = {
            audioBuffer: new ArrayBuffer(100),
            targetText: 'Hola',
            targetLanguage: 'es',
            nativeLanguage: 'en',
            sampleRate: 16000,
            sessionId: 'sess-1',
            learnerId: 'learn-1',
        };
        expect(input.sampleRate).toBe(16000);
    });

    it('AlignedPhoneme has ms timing', () => {
        const phoneme: AlignedPhoneme = {
            phoneme: '/o/',
            startMs: 100,
            endMs: 150,
            durationMs: 50,
            confidence: 0.85,
            wordIndex: 0,
        };
        expect(phoneme.endMs).toBeGreaterThan(phoneme.startMs);
    });

    it('AlignedWord groups phonemes by index', () => {
        const word: AlignedWord = {
            word: 'hola',
            wordIndex: 0,
            startMs: 100,
            endMs: 300,
            phonemeIndices: [0, 1, 2, 3],
        };
        expect(word.phonemeIndices.length).toBe(4);
    });
});

// ── Interlanguage Engine ──────────────────────────────────────

describe('Interlanguage Engine types', () => {
    it('InterlanguageGrammar holds rules snapshot', () => {
        const grammar = {
            learnerId: 'learner-1',
            l1Code: 'en',
            l2Code: 'es',
            snapshotAt: new Date().toISOString(),
            totalRules: 0,
            rules: [] as HypothesisRule[],
            overallConfidence: 0.7,
        } satisfies Partial<InterlanguageGrammar>;
        expect(grammar.l2Code).toBe('es');
    });

    it('HypothesisRule has trajectory and evidence', () => {
        const rule = {
            ruleId: 'subj-1',
            domain: 'morphosyntax',
            ruleDescription: 'Uses indicative after quiero que',
            targetRuleDescription: 'Present subjunctive',
            isTargetLike: false,
            l1TransferSource: null,
            confidence: 0.6,
            evidence: [],
            trajectory: { direction: 'acquiring' as const, rateOfChange: 0.3, windowSize: 5, sessionTrend: [] },
            sessionCount: 5,
            firstObservedAt: new Date().toISOString(),
            lastObservedAt: new Date().toISOString(),
            interventionPriority: 'high' as const,
        } satisfies Partial<HypothesisRule>;
        expect(rule.isTargetLike).toBe(false);
    });

    it('GrammarEvolutionEvent records changes', () => {
        const event = {
            timestamp: new Date().toISOString(),
            sessionId: 'session-1',
        } satisfies Partial<GrammarEvolutionEvent>;
        expect(event.sessionId).toBeTruthy();
    });
});
