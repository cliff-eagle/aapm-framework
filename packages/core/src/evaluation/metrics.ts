/**
 * AAPM Evaluation Metrics — Calculation Interfaces
 *
 * Typed calculation functions for every core AAPM metric.
 * Each function includes the formula in JSDoc.
 *
 * @module evaluation/metrics
 */

import type {
    AAPMOutcomeMetrics,
    MetricValue,
    SessionEvaluationReport,
    LongitudinalProgressReport,
    MetricTrajectory,
} from './types';

import type { SessionRecord, SessionMetrics } from '../persistence/types';
import type { LearnerProfile } from '../persistence/types';
import type { FrictionPoint } from '../feedback-engine/types';

// ─── Metric Calculation Interfaces ───────────────────────────

/**
 * Calculate Task Completion Rate for a session.
 *
 * TCR = completedTasks / attemptedTasks
 *
 * A "task" is a communicative objective in Tier 2 (e.g., ordering food,
 * giving directions) or Tier 3 (achieving a negotiation objective).
 * A task is "completed" if the learner achieved the communicative goal,
 * regardless of linguistic accuracy.
 *
 * @param session - Session record containing task outcomes
 * @returns TCR as a value between 0.0 and 1.0
 */
export function calculateTaskCompletionRate(session: SessionRecord): number {
    const conversations = session.conversations.filter(
        c => c.tier === 2 || c.tier === 3,
    );

    if (conversations.length === 0) return 1.0; // No tasks attempted

    const completed = conversations.filter(
        c => c.outcome === 'completed-successfully',
    ).length;

    return completed / conversations.length;
}

/**
 * Calculate Friction Point Recurrence Rate.
 *
 * FPRR = recurringFriction / totalFriction
 *
 * A friction point is "recurring" if its target form has been
 * identified in a previous session. A decreasing FPRR indicates
 * that the feedback loop is successfully resolving friction patterns.
 *
 * @param currentFriction - Friction points from the current session
 * @param historicalFriction - Friction points from previous sessions
 * @returns FPRR as a value between 0.0 and 1.0
 */
export function calculateFrictionRecurrenceRate(
    currentFriction: FrictionPoint[],
    historicalFriction: FrictionPoint[],
): number {
    if (currentFriction.length === 0) return 0.0;

    const historicalForms = new Set(
        historicalFriction.map(f => f.analysis.targetRule || f.rawUtterance),
    );

    const recurring = currentFriction.filter(f => {
        const form = f.analysis.targetRule || f.rawUtterance;
        return historicalForms.has(form);
    });

    return recurring.length / currentFriction.length;
}

/**
 * Calculate Comprehensibility Score for a session.
 *
 * CS = mean(utteranceComprehensibilityScores)
 *
 * Comprehensibility is the probability that a native speaker would
 * understand the learner's utterance without difficulty. This is
 * distinct from accent — a learner can be highly comprehensible
 * with a strong accent.
 *
 * @param session - Session record containing pronunciation data
 * @returns Comprehensibility score between 0.0 and 1.0
 */
export function calculateComprehensibilityScore(session: SessionRecord): number {
    const data = session.pronunciationData;

    if (data.length === 0) return 0.0;

    const total = data.reduce((sum, d) => sum + d.comprehensibilityScore, 0);
    return total / data.length;
}

/**
 * Calculate Register Accuracy Score for a session.
 *
 * RAS = registerAppropriateTurns / totalTurns
 *
 * Each learner turn is classified by the LLM register classifier
 * as register-appropriate or register-inappropriate for the current
 * Tier and NPC context.
 *
 * @param session - Session record
 * @returns RAS between 0.0 and 1.0, or null if no Tier 3 activity
 */
export function calculateRegisterAccuracyScore(session: SessionRecord): number | null {
    if (!session.metrics.registerAccuracyScore) return null;
    return session.metrics.registerAccuracyScore;
}

/**
 * Calculate Code-Switch Reduction Rate.
 *
 * CSRR = 1 - (currentL1Ratio / baselineL1Ratio)
 *
 * Measures the learner's progress toward L2 independence.
 * A CSRR of 0.5 means the learner uses half as much L1
 * as they did at baseline.
 *
 * @param currentL1Ratio - Current session's L1/total word ratio
 * @param baselineL1Ratio - Initial assessment L1/total word ratio
 * @returns CSRR between 0.0 and 1.0
 */
export function calculateCodeSwitchReductionRate(
    currentL1Ratio: number,
    baselineL1Ratio: number,
): number {
    if (baselineL1Ratio === 0) return 1.0; // No baseline L1 usage
    return Math.max(0, 1 - (currentL1Ratio / baselineL1Ratio));
}

/**
 * Calculate Forward Injection Hit Rate.
 *
 * FIHR = successfulInjections / totalInjections
 *
 * An injection is "successful" when:
 * 1. The NPC created a natural communicative opportunity for the target form
 * 2. The learner used the target form (correctly or with improvement)
 *
 * @param injections - Forward injection specs with execution status
 * @returns FIHR between 0.0 and 1.0
 */
export function calculateForwardInjectionHitRate(
    injections: Array<{ status: string }>,
): number {
    const total = injections.length;
    if (total === 0) return 0.0;

    const successful = injections.filter(
        i => i.status === 'injected',
    ).length;

    return successful / total;
}

/**
 * Calculate Social Reputation Trajectory for a session.
 *
 * SRT = mean(reputationDeltas)
 *
 * Measures the net direction of the learner's social relationships.
 * Positive SRT indicates the learner is building social capital through
 * appropriate communicative behavior. Negative SRT indicates social
 * friction events and register violations are damaging relationships.
 *
 * @param session - Session record containing reputation deltas
 * @returns SRT as a value between -1.0 and 1.0, or null if no Tier 2 activity
 */
export function calculateSocialReputationTrajectory(session: SessionRecord): number | null {
    const deltas = session.reputationDeltas;

    if (deltas.length === 0) return null;

    const totalDelta = deltas.reduce((sum, d) => sum + d.delta, 0);
    return Math.max(-1, Math.min(1, totalDelta / deltas.length));
}

/**
 * Calculate Negotiation Success Rate for a session.
 *
 * NSR = successfulNegotiations / totalNegotiations
 *
 * A Tier 3 negotiation is "successful" when the learner achieves their
 * communicative objective (e.g., gets the contract terms they wanted,
 * answers press questions satisfactorily). Partial success counts as 0.5.
 *
 * This metric captures the ultimate goal of the AAPM: functional
 * communicative competence under real-world pressure.
 *
 * @param session - Session record containing Tier 3 conversations
 * @returns NSR between 0.0 and 1.0, or null if no Tier 3 activity
 */
export function calculateNegotiationSuccessRate(session: SessionRecord): number | null {
    const tier3Conversations = session.conversations.filter(c => c.tier === 3);

    if (tier3Conversations.length === 0) return null;

    const successful = tier3Conversations.filter(
        c => c.outcome === 'completed-successfully',
    ).length;

    return successful / tier3Conversations.length;
}

// ─── Report Generation ───────────────────────────────────────

/**
 * Generate a per-session evaluation report.
 *
 * Computes all applicable metrics for the session, compares
 * to the learner's rolling average, and produces observations
 * and recommendations.
 *
 * @param session - Completed session record
 * @param learnerProfile - Current learner profile
 * @param previousSessions - Recent sessions for comparison
 * @returns Complete session evaluation report
 */
export async function generateSessionReport(
    session: SessionRecord,
    learnerProfile: LearnerProfile,
    previousSessions: SessionRecord[],
): Promise<SessionEvaluationReport> {
    // Precondition: session must have been completed
    // Postcondition: report contains all applicable metrics with deltas

    // Compute per-metric values
    const tcr = calculateTaskCompletionRate(session);
    const fprr = calculateFrictionRecurrenceRate(
        session.frictionPoints,
        previousSessions.flatMap(s => s.frictionPoints),
    );
    const nsr = calculateNegotiationSuccessRate(session);

    // Build metrics object with only applicable metrics
    const metrics: Partial<AAPMOutcomeMetrics> = {};
    const now = new Date().toISOString();
    const period = { from: session.startedAt, to: session.endedAt };

    if (session.conversations.some(c => c.tier === 2 || c.tier === 3)) {
        metrics.taskCompletionRate = {
            value: tcr, min: 0, max: 1, target: 0.8,
            unit: 'ratio', trend: 'stable', sampleSize: 1, period,
        };
    }

    metrics.frictionRecurrenceRate = {
        value: fprr, min: 0, max: 1, target: 0.2,
        unit: 'ratio', trend: 'stable', sampleSize: session.frictionPoints.length, period,
    };

    metrics.comprehensibilityScore = {
        value: session.metrics.averageComprehensibility,
        min: 0, max: 1, target: 0.85,
        unit: 'score', trend: 'stable', sampleSize: 1, period,
    };

    if (session.conversations.some(c => c.tier === 3) && nsr !== null) {
        metrics.negotiationSuccessRate = {
            value: nsr, min: 0, max: 1, target: 0.7,
            unit: 'ratio', trend: 'stable', sampleSize: 1, period,
        };
    }

    // Compute rolling averages from previous sessions
    const rollingAvg: Record<string, number> = {};
    const deltaFromAverage: Record<string, number> = {};
    const deltaFromPrevious: Record<string, number> = {};

    if (previousSessions.length > 0) {
        const prevTcrs = previousSessions.map(s => calculateTaskCompletionRate(s));
        const avgTcr = prevTcrs.reduce((a, b) => a + b, 0) / prevTcrs.length;
        rollingAvg['taskCompletionRate'] = avgTcr;
        deltaFromAverage['taskCompletionRate'] = tcr - avgTcr;

        const prevComps = previousSessions.map(s => s.metrics.averageComprehensibility);
        const avgComp = prevComps.reduce((a, b) => a + b, 0) / prevComps.length;
        rollingAvg['comprehensibilityScore'] = avgComp;
        deltaFromAverage['comprehensibilityScore'] = session.metrics.averageComprehensibility - avgComp;

        // Compare to most recent session
        const lastSession = previousSessions[previousSessions.length - 1];
        deltaFromPrevious['taskCompletionRate'] = tcr - calculateTaskCompletionRate(lastSession);
        deltaFromPrevious['comprehensibilityScore'] =
            session.metrics.averageComprehensibility - lastSession.metrics.averageComprehensibility;
    }

    // Determine trend for each metric
    if (metrics.taskCompletionRate && previousSessions.length >= 3) {
        const recentTcrs = previousSessions.slice(-3).map(s => calculateTaskCompletionRate(s));
        metrics.taskCompletionRate.trend = determineTrend([...recentTcrs, tcr]);
    }

    // Generate observations
    const observations: string[] = [];
    if (tcr >= 0.9) observations.push('Excellent task completion rate — learner is performing above target.');
    if (tcr < 0.5) observations.push('Low task completion — consider reducing Tier difficulty or providing more scaffolding.');
    if (fprr > 0.5) observations.push('High friction recurrence — same patterns reappearing. Anti-fossilization intervention recommended.');
    if (fprr < 0.15 && previousSessions.length > 3) observations.push('Friction recurrence declining — feedback pipeline is effective.');
    if (session.frictionPoints.length === 0) observations.push('Zero friction points detected — consider advancing tier level.');

    // Generate recommendations
    const recommendations: string[] = [];
    if (fprr > 0.4) recommendations.push('Focus next session on recurring friction patterns: prioritize anti-fossilization strategies.');
    if (tcr < 0.6) recommendations.push('Simplify scenarios or increase Tier 1 companion support before next Tier 2 session.');
    if (session.metrics.averageComprehensibility < 0.7) recommendations.push('Prioritize pronunciation practice in next curriculum delivery.');

    return {
        sessionId: session.sessionId,
        learnerId: session.learnerId,
        timestamp: now,
        activeTiers: session.activeTiers,
        metrics,
        deltaFromPrevious,
        deltaFromAverage,
        observations,
        recommendations,
    };
}

/**
 * Generate a longitudinal progress report across multiple sessions.
 *
 * Analyzes trends in all metrics, CEFR progression, tier advancement,
 * friction pattern resolution, and produces a narrative summary.
 *
 * @param learnerId - Learner to generate report for
 * @param sessions - All sessions in the reporting period
 * @param learnerProfile - Current learner profile
 * @returns Comprehensive longitudinal progress report
 */
export async function generateLongitudinalReport(
    learnerId: string,
    sessions: SessionRecord[],
    learnerProfile: LearnerProfile,
): Promise<LongitudinalProgressReport> {
    // Precondition: sessions sorted chronologically
    // Postcondition: returns trajectory analysis across all sessions

    const now = new Date().toISOString();
    const period = {
        from: sessions.length > 0 ? sessions[0].startedAt : now,
        to: sessions.length > 0 ? sessions[sessions.length - 1].endedAt : now,
    };

    // Compute total learning time
    const totalHours = sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;

    // Build metric trajectories
    const tcrTrajectory: MetricTrajectory = {
        metricName: 'taskCompletionRate',
        dataPoints: sessions.map(s => ({
            timestamp: s.startedAt,
            sessionId: s.sessionId,
            value: calculateTaskCompletionRate(s),
        })),
        trend: 'stable',
        rateOfChange: 0,
        target: 0.8,
        targetAchieved: false,
    };

    const fprrTrajectory: MetricTrajectory = {
        metricName: 'frictionRecurrenceRate',
        dataPoints: sessions.map((s, i) => ({
            timestamp: s.startedAt,
            sessionId: s.sessionId,
            value: calculateFrictionRecurrenceRate(
                s.frictionPoints,
                sessions.slice(0, i).flatMap(prev => prev.frictionPoints),
            ),
        })),
        trend: 'stable',
        rateOfChange: 0,
        target: 0.2,
        targetAchieved: false,
    };

    const compTrajectory: MetricTrajectory = {
        metricName: 'comprehensibilityScore',
        dataPoints: sessions.map(s => ({
            timestamp: s.startedAt,
            sessionId: s.sessionId,
            value: s.metrics.averageComprehensibility,
        })),
        trend: 'stable',
        rateOfChange: 0,
        target: 0.85,
        targetAchieved: false,
    };

    // Compute trends for each trajectory
    const trajectories = [tcrTrajectory, fprrTrajectory, compTrajectory];
    for (const traj of trajectories) {
        if (traj.dataPoints.length >= 3) {
            const values = traj.dataPoints.map(d => d.value);
            traj.trend = determineTrend(values);
            const first = values[0];
            const last = values[values.length - 1];
            traj.rateOfChange = (last - first) / values.length;
        }
    }

    // Tier distribution
    const tierCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0 };
    for (const s of sessions) {
        for (const t of s.activeTiers) {
            tierCounts[String(t)] = (tierCounts[String(t)] || 0) + 1;
        }
    }
    const totalTierEntries = Object.values(tierCounts).reduce((a, b) => a + b, 0) || 1;
    const tierDistribution: Record<string, number> = {
        '1': tierCounts['1'] / totalTierEntries,
        '2': tierCounts['2'] / totalTierEntries,
        '3': tierCounts['3'] / totalTierEntries,
    };

    // Determine dominant tier
    const dominantTier = (Object.entries(tierCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '1') as unknown as 1 | 2 | 3;

    // Friction analysis
    const allFriction = sessions.flatMap(s => s.frictionPoints);
    const frictionForms = new Map<string, number[]>();
    for (let i = 0; i < sessions.length; i++) {
        for (const fp of sessions[i].frictionPoints) {
            const form = fp.analysis?.targetRule || fp.rawUtterance;
            if (!frictionForms.has(form)) frictionForms.set(form, []);
            frictionForms.get(form)!.push(i);
        }
    }

    const resolvedPatterns: string[] = [];
    const persistentPatterns: string[] = [];
    const emergingPatterns: string[] = [];
    const fossilizationRisks: string[] = [];

    for (const [form, sessionIndices] of frictionForms.entries()) {
        const lastSeen = Math.max(...sessionIndices);
        const firstSeen = Math.min(...sessionIndices);
        const recency = sessions.length - 1 - lastSeen;

        if (recency > 3 && sessionIndices.length > 1) {
            resolvedPatterns.push(form);
        } else if (sessionIndices.length >= 4) {
            fossilizationRisks.push(form);
        } else if (sessionIndices.length >= 2) {
            persistentPatterns.push(form);
        } else if (firstSeen >= sessions.length - 2) {
            emergingPatterns.push(form);
        }
    }

    // Summary
    const strengths: string[] = [];
    const improvements: string[] = [];
    const milestones: string[] = [];
    const nextObjectives: string[] = [];

    if (tcrTrajectory.trend === 'improving') strengths.push('Task completion rate is improving.');
    if (compTrajectory.trend === 'improving') strengths.push('Comprehensibility score is improving.');
    if (fprrTrajectory.trend === 'improving') strengths.push('Friction recurrence is declining — feedback loop effective.');

    if (fossilizationRisks.length > 0) improvements.push(`${fossilizationRisks.length} patterns at fossilization risk.`);
    if (compTrajectory.trend === 'declining') improvements.push('Comprehensibility score declining — pronunciation focus needed.');

    if (sessions.length >= 10) milestones.push('10+ sessions completed.');
    if (resolvedPatterns.length > 0) milestones.push(`${resolvedPatterns.length} friction patterns resolved.`);

    if (fossilizationRisks.length > 0) nextObjectives.push('Activate anti-fossilization engine for persistent patterns.');
    nextObjectives.push('Continue current tier progression.');

    return {
        learnerId,
        generatedAt: now,
        period,
        sessionCount: sessions.length,
        totalHours,
        metricTrajectories: trajectories,
        cefrProgression: {
            startLevel: learnerProfile.currentCEFR,
            currentLevel: learnerProfile.currentCEFR,
        },
        tierProgression: {
            dominantTier: Number(dominantTier) as 1 | 2 | 3,
            tierDistribution,
            tierReadinessChanges: {},
        },
        frictionAnalysis: {
            resolvedPatterns,
            persistentPatterns,
            emergingPatterns,
            fossilizationRisks,
        },
        summary: {
            strengths,
            improvements,
            milestones,
            nextObjectives,
        },
    };
}

// ─── Utility Functions ───────────────────────────────────────

/**
 * Determine trend direction from a series of numeric values.
 *
 * Uses linear regression slope to classify trend as
 * improving, stable, or declining.
 */
function determineTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 2) return 'stable';

    // Simple linear regression slope
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (values[i] - yMean);
        denominator += (i - xMean) * (i - xMean);
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;

    // Threshold: slope must be > 5% of the mean to count as a trend
    const threshold = Math.abs(yMean) * 0.05;
    if (slope > threshold) return 'improving';
    if (slope < -threshold) return 'declining';
    return 'stable';
}
