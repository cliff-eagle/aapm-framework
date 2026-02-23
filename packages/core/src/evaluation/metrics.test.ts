/**
 * Evaluation Metrics Tests
 *
 * Validates metric calculations, report generation,
 * and trend analysis.
 */

import { describe, it, expect } from 'vitest';
import {
    calculateTaskCompletionRate,
    calculateFrictionRecurrenceRate,
    generateSessionReport,
    generateLongitudinalReport,
} from './metrics';

import type { SessionRecord } from '../persistence/types';
import type { LearnerProfile } from '../persistence/types';

// ── Fixtures ─────────────────────────────────────────────────

function createSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
    return {
        sessionId: 'session-001',
        learnerId: 'learner-001',
        personaId: 'persona-001',
        startedAt: '2026-01-01T10:00:00Z',
        endedAt: '2026-01-01T10:30:00Z',
        durationMinutes: 30,
        activeTiers: [1, 2],
        conversations: [
            {
                npcId: 'npc-001',
                tier: 2,
                turnCount: 10,
                outcome: 'completed-successfully',
                frictionCount: 2,
            },
        ],
        frictionPoints: [],
        metrics: {
            averageComprehensibility: 0.8,
            codeSwitchRatio: 0.6,
            totalTurns: 10,
        },
        ...overrides,
    } as unknown as SessionRecord;
}

function createLearnerProfile(overrides = {}): LearnerProfile {
    return {
        learnerId: 'learner-001',
        currentCEFR: 'A2',
        ...overrides,
    } as unknown as LearnerProfile;
}

// ── Metric Calculation Tests ─────────────────────────────────

describe('calculateTaskCompletionRate', () => {
    it('returns 1.0 when all tasks completed', () => {
        const session = createSession({
            conversations: [
                { npcId: 'a', tier: 2, turnCount: 5, outcome: 'completed-successfully', frictionCount: 0 },
                { npcId: 'b', tier: 3, turnCount: 8, outcome: 'completed-successfully', frictionCount: 1 },
            ],
        } as any);
        expect(calculateTaskCompletionRate(session)).toBe(1.0);
    });

    it('returns 0.5 when half the tasks completed', () => {
        const session = createSession({
            conversations: [
                { npcId: 'a', tier: 2, turnCount: 5, outcome: 'completed-successfully', frictionCount: 0 },
                { npcId: 'b', tier: 2, turnCount: 5, outcome: 'abandoned', frictionCount: 3 },
            ],
        } as any);
        expect(calculateTaskCompletionRate(session)).toBe(0.5);
    });

    it('returns 1.0 for sessions with no Tier 2/3 conversations', () => {
        const session = createSession({
            conversations: [
                { npcId: 'a', tier: 1, turnCount: 5, outcome: 'completed-successfully', frictionCount: 0 },
            ],
        } as any);
        expect(calculateTaskCompletionRate(session)).toBe(1.0);
    });
});

describe('calculateFrictionRecurrenceRate', () => {
    it('returns 0.0 for zero current friction', () => {
        expect(calculateFrictionRecurrenceRate([], [])).toBe(0.0);
    });

    it('returns 0.0 when no friction recurs', () => {
        const current = [
            { rawUtterance: 'new error', analysis: { targetRule: 'rule-X' } },
        ] as any[];
        const historical = [
            { rawUtterance: 'old error', analysis: { targetRule: 'rule-Y' } },
        ] as any[];
        expect(calculateFrictionRecurrenceRate(current, historical)).toBe(0.0);
    });

    it('returns 1.0 when all friction recurs', () => {
        const current = [
            { rawUtterance: 'error', analysis: { targetRule: 'rule-A' } },
        ] as any[];
        const historical = [
            { rawUtterance: 'error', analysis: { targetRule: 'rule-A' } },
        ] as any[];
        expect(calculateFrictionRecurrenceRate(current, historical)).toBe(1.0);
    });
});

// ── Report Generation Tests ──────────────────────────────────

describe('generateSessionReport', () => {
    it('produces a report with session metadata', async () => {
        const session = createSession();
        const learnerProfile = createLearnerProfile();
        const report = await generateSessionReport(session, learnerProfile, []);
        expect(report.sessionId).toBe('session-001');
        expect(report.learnerId).toBe('learner-001');
        expect(report.activeTiers).toEqual([1, 2]);
    });

    it('includes metrics in the report', async () => {
        const session = createSession();
        const report = await generateSessionReport(session, createLearnerProfile(), []);
        expect(report.metrics).toBeDefined();
        expect(report.metrics.frictionRecurrenceRate).toBeDefined();
        expect(report.metrics.comprehensibilityScore).toBeDefined();
    });

    it('generates observations', async () => {
        const session = createSession();
        const report = await generateSessionReport(session, createLearnerProfile(), []);
        expect(Array.isArray(report.observations)).toBe(true);
    });

    it('generates recommendations', async () => {
        const session = createSession();
        const report = await generateSessionReport(session, createLearnerProfile(), []);
        expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('computes deltas when previous sessions exist', async () => {
        const session = createSession();
        const prevSession = createSession({ sessionId: 'prev' });
        const report = await generateSessionReport(session, createLearnerProfile(), [prevSession]);
        expect(report.deltaFromPrevious).toBeDefined();
        expect(report.deltaFromAverage).toBeDefined();
    });
});

describe('generateLongitudinalReport', () => {
    it('produces a report for zero sessions', async () => {
        const report = await generateLongitudinalReport('learner-001', [], createLearnerProfile());
        expect(report.learnerId).toBe('learner-001');
        expect(report.sessionCount).toBe(0);
        expect(report.totalHours).toBe(0);
    });

    it('computes trajectory data across sessions', async () => {
        const sessions = [
            createSession({ sessionId: 's1', durationMinutes: 30 }),
            createSession({ sessionId: 's2', durationMinutes: 30 }),
            createSession({ sessionId: 's3', durationMinutes: 30 }),
        ];
        const report = await generateLongitudinalReport('learner-001', sessions, createLearnerProfile());
        expect(report.sessionCount).toBe(3);
        expect(report.totalHours).toBe(1.5);
        expect(report.metricTrajectories.length).toBeGreaterThan(0);
    });

    it('includes friction analysis', async () => {
        const sessions = [createSession()];
        const report = await generateLongitudinalReport('learner-001', sessions, createLearnerProfile());
        expect(report.frictionAnalysis).toBeDefined();
        expect(Array.isArray(report.frictionAnalysis.resolvedPatterns)).toBe(true);
        expect(Array.isArray(report.frictionAnalysis.fossilizationRisks)).toBe(true);
    });

    it('includes summary with strengths and improvements', async () => {
        const sessions = [createSession()];
        const report = await generateLongitudinalReport('learner-001', sessions, createLearnerProfile());
        expect(report.summary).toBeDefined();
        expect(Array.isArray(report.summary.strengths)).toBe(true);
        expect(Array.isArray(report.summary.nextObjectives)).toBe(true);
    });
});
