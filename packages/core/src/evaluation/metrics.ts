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
    // Implementation: compute each metric, compare to rolling average,
    // generate observations using LLM analysis of the delta patterns
    throw new Error('Implementation pending');
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
    // Implementation: compute metric trajectories, CEFR progression,
    // friction analysis, and generate summary using LLM
    throw new Error('Implementation pending');
}
