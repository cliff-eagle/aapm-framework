/**
 * Type-Contract Tests — Collaboration, Cultural Intelligence, Integration
 */

import { describe, it, expect } from 'vitest';
import type { StudentCohort, InstructorDashboard } from '../collaboration';
import type { CulturalIntelligenceProfile, CulturalViolation } from '../cultural-intelligence';
import type {
    IHEForwardInjectionSpec, AffectivePressureSignal,
    CulturalReputationDelta, NPCBehaviorResolution, TransferResolution,
} from '../integration';

// ── Collaboration ─────────────────────────────────────────────

describe('Collaboration types', () => {
    it('StudentCohort aggregates students', () => {
        const cohort = {
            cohortId: 'cohort-1',
            name: 'Spanish 101',
            instructorIds: ['instructor-1'],
            personaSchemaId: 'schema-1',
            studentIds: ['student-1', 'student-2'],
            createdAt: new Date().toISOString(),
            active: true,
            targetCEFR: 'B1',
        } satisfies Partial<StudentCohort>;
        expect(cohort.studentIds.length).toBe(2);
    });

    it('InstructorDashboard has instructor and cohort', () => {
        const dash = {
            instructorId: 'instructor-1',
            cohortId: 'cohort-1',
        } satisfies Partial<InstructorDashboard>;
        expect(dash.instructorId).toBeTruthy();
    });
});

// ── Cultural Intelligence ─────────────────────────────────────

describe('Cultural Intelligence types', () => {
    it('CulturalIntelligenceProfile tracks trajectory', () => {
        const profile = {
            learnerId: 'learner-1',
            personaSchemaId: 'schema-1',
            assessedAt: new Date().toISOString(),
            compositeScore: 0.65,
            masteredNorms: ['greetings'],
            violatedNorms: [] as CulturalViolation[],
            fauxPasHistory: [],
            trajectory: 'improving' as const,
        } satisfies Partial<CulturalIntelligenceProfile>;
        expect(profile.trajectory).toBe('improving');
    });

    it('CulturalViolation has normId and learnerAction', () => {
        const violation = {
            normId: 'norm-1',
            sessionId: 'session-1',
            learnerAction: 'Used informal register with elder',
        } satisfies Partial<CulturalViolation>;
        expect(violation.learnerAction.length).toBeGreaterThan(0);
    });
});

// ── Integration ───────────────────────────────────────────────

describe('Integration types', () => {
    it('IHEForwardInjectionSpec has priority and target', () => {
        const spec = {
            ruleId: 'subj-1',
            predictedForm: 'indicative',
            targetForm: 'subjunctive',
            priority: 'high' as const,
        } satisfies Partial<IHEForwardInjectionSpec>;
        expect(spec.priority).toBe('high');
    });

    it('AffectivePressureSignal has state and confidence', () => {
        const signal = {
            state: 'frustrated',
            confidence: 0.8,
            targetComponent: 'pressure',
        } satisfies Partial<AffectivePressureSignal>;
        expect(signal.confidence).toBeGreaterThan(0);
    });

    it('CulturalReputationDelta has npcId and severity', () => {
        const delta = {
            npcId: 'vendor-1',
            normId: 'norm-1',
            severity: 'moderate' as const,
        } satisfies Partial<CulturalReputationDelta>;
        expect(delta.severity).toBe('moderate');
    });

    it('NPCBehaviorResolution has npcId and sessionId', () => {
        const resolution = {
            npcId: 'vendor-1',
            sessionId: 'session-1',
        } satisfies Partial<NPCBehaviorResolution>;
        expect(resolution.npcId).toBeTruthy();
    });

    it('TransferResolution tracks cross-schema transfer', () => {
        const transfer = {
            sourceSchemaId: 'market-schema',
            targetSchemaId: 'restaurant-schema',
        } satisfies Partial<TransferResolution>;
        expect(transfer.sourceSchemaId).toBe('market-schema');
    });
});
