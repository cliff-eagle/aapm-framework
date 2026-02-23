/**
 * AAPM Evaluation Framework — Type Definitions
 *
 * Quantitative and qualitative outcome metrics for measuring
 * whether the AAPM system is achieving its pedagogical objectives.
 *
 * @module evaluation/types
 */

// ─── Outcome Metrics ─────────────────────────────────────────

/**
 * Core quantitative metrics for AAPM system evaluation.
 *
 * These metrics measure what the system is designed to achieve:
 * communicative competence, not test scores.
 */
export interface AAPMOutcomeMetrics {
    /** Task Completion Rate (TCR) — Tier 2 primary metric */
    taskCompletionRate: MetricValue;

    /** Friction Point Recurrence Rate (FPRR) — learning indicator */
    frictionRecurrenceRate: MetricValue;

    /** Comprehensibility Score — pronunciation metric */
    comprehensibilityScore: MetricValue;

    /** Register Accuracy Score (RAS) — Tier 3 primary metric */
    registerAccuracyScore: MetricValue;

    /** Code-Switch Reduction Rate (CSRR) — Tier 1 progress indicator */
    codeSwitchReductionRate: MetricValue;

    /** Social Reputation Trajectory — Tier 2 social competence */
    socialReputationTrajectory: MetricValue;

    /** Negotiation Success Rate — Tier 3 outcome metric */
    negotiationSuccessRate: MetricValue;

    /** Forward Injection Hit Rate — system effectiveness metric */
    forwardInjectionHitRate: MetricValue;
}

/**
 * A single metric value with context.
 */
export interface MetricValue {
    /** Current value */
    value: number;

    /** Minimum possible value */
    min: number;

    /** Maximum possible value */
    max: number;

    /** Target value for this metric */
    target: number;

    /** Unit of measurement */
    unit: string;

    /** Trend over the measurement period */
    trend: 'improving' | 'stable' | 'declining';

    /** Number of data points contributing to this value */
    sampleSize: number;

    /** Measurement period */
    period: { from: string; to: string };
}

/**
 * Per-session evaluation report.
 */
export interface SessionEvaluationReport {
    /** Session identifier */
    sessionId: string;

    /** Learner identifier */
    learnerId: string;

    /** Session timestamp */
    timestamp: string;

    /** Tier(s) active during the session */
    activeTiers: Array<1 | 2 | 3>;

    /** Per-metric values for this session */
    metrics: Partial<AAPMOutcomeMetrics>;

    /** Comparison to previous session */
    deltaFromPrevious: Record<string, number>;

    /** Comparison to learner's rolling average */
    deltaFromAverage: Record<string, number>;

    /** Key observations */
    observations: string[];

    /** Recommended focus areas for next session */
    recommendations: string[];
}

/**
 * Longitudinal progress report across multiple sessions.
 */
export interface LongitudinalProgressReport {
    /** Learner identifier */
    learnerId: string;

    /** Report generation timestamp */
    generatedAt: string;

    /** Reporting period */
    period: { from: string; to: string };

    /** Number of sessions in this period */
    sessionCount: number;

    /** Total learning time in hours */
    totalHours: number;

    /** Metric trajectories over the period */
    metricTrajectories: MetricTrajectory[];

    /** CEFR level changes */
    cefrProgression: {
        startLevel: string;
        currentLevel: string;
        estimatedTimeToNextLevel?: number;
    };

    /** Tier progression */
    tierProgression: {
        dominantTier: 1 | 2 | 3;
        tierDistribution: Record<string, number>;
        tierReadinessChanges: Record<string, number>;
    };

    /** Friction pattern analysis */
    frictionAnalysis: {
        resolvedPatterns: string[];
        persistentPatterns: string[];
        emergingPatterns: string[];
        fossilizationRisks: string[];
    };

    /** Strengths and areas for improvement */
    summary: {
        strengths: string[];
        improvements: string[];
        milestones: string[];
        nextObjectives: string[];
    };
}

/**
 * Time-series data for a single metric.
 */
export interface MetricTrajectory {
    /** Metric name */
    metricName: string;

    /** Data points over time */
    dataPoints: Array<{
        timestamp: string;
        sessionId: string;
        value: number;
    }>;

    /** Overall trend */
    trend: 'improving' | 'stable' | 'declining';

    /** Rate of change */
    rateOfChange: number;

    /** Target value */
    target: number;

    /** Whether target has been achieved */
    targetAchieved: boolean;
}

// ─── Evaluation Rubric ───────────────────────────────────────

/**
 * Configurable rubric for tier-specific evaluation.
 *
 * Different persona schemas may weight evaluation dimensions
 * differently based on domain requirements.
 */
export interface EvaluationRubric {
    /** Rubric identifier */
    id: string;

    /** Persona schema this rubric applies to */
    personaSchemaId: string;

    /** Tier this rubric evaluates */
    tier: 1 | 2 | 3;

    /** Scenario type (for Tier 3, which scenario) */
    scenarioType?: string;

    /** Dimension weights (must sum to 1.0) */
    weights: {
        linguisticAccuracy: number;
        pragmaticAppropriateness: number;
        registerAlignment: number;
        culturalIntelligence: number;
    };

    /** Per-dimension scoring criteria */
    criteria: {
        linguisticAccuracy: ScoringCriteria;
        pragmaticAppropriateness: ScoringCriteria;
        registerAlignment: ScoringCriteria;
        culturalIntelligence: ScoringCriteria;
    };

    /** Minimum composite score for "pass" */
    passThreshold: number;

    /** Minimum composite score for "distinction" */
    distinctionThreshold: number;
}

/**
 * Scoring criteria for a single evaluation dimension.
 */
export interface ScoringCriteria {
    /** What is being measured */
    description: string;

    /** Scoring bands */
    bands: Array<{
        label: string;
        minScore: number;
        maxScore: number;
        description: string;
    }>;
}

// ─── A/B Testing Framework ───────────────────────────────────

/**
 * Configuration for an A/B test on a pedagogical intervention.
 */
export interface ABTestConfig {
    /** Unique test identifier */
    testId: string;

    /** Human-readable test name */
    name: string;

    /** What is being tested */
    hypothesis: string;

    /** Primary metric being measured */
    primaryMetric: string;

    /** Secondary metrics of interest */
    secondaryMetrics: string[];

    /** Control group configuration */
    control: { description: string };

    /** Treatment group configuration */
    treatment: { description: string };

    /** Sample size requirements */
    requiredSampleSize: number;

    /** Statistical significance threshold */
    significanceLevel: number;

    /** Test status */
    status: 'planned' | 'running' | 'completed' | 'cancelled';

    /** Start timestamp */
    startedAt?: string;

    /** End timestamp */
    endedAt?: string;

    /** Results, if completed */
    results?: ABTestResults;
}

/**
 * Results of a completed A/B test.
 */
export interface ABTestResults {
    /** Control group metrics */
    controlMetrics: Record<string, number>;

    /** Treatment group metrics */
    treatmentMetrics: Record<string, number>;

    /** Difference between treatment and control */
    effectSize: number;

    /** Statistical significance (p-value) */
    pValue: number;

    /** Whether the result is statistically significant */
    isSignificant: boolean;

    /** Confidence interval */
    confidenceInterval: { lower: number; upper: number };

    /** Recommendation */
    recommendation: 'adopt-treatment' | 'keep-control' | 'inconclusive' | 'need-more-data';
}

// ─── Lexical Availability Index ──────────────────────────────

/**
 * Tracking vocabulary retrieval speed as a fluency metric.
 *
 * Knowing a word is NOT the same as being able to retrieve it
 * under communicative pressure. The Lexical Availability Index
 * measures how quickly the learner can access vocabulary in
 * real-time conversation.
 *
 * @patentCritical No existing language learning system tracks
 *   vocabulary RETRIEVAL SPEED as a distinct metric from vocabulary
 *   KNOWLEDGE. A learner may "know" 5,000 words but only be able
 *   to retrieve 1,000 of them fast enough for fluent conversation.
 */
export interface LexicalAvailabilityIndex {
    /** Learner identifier */
    learnerId: string;

    /** Assessment timestamp */
    assessedAt: string;

    /** Overall availability score (0.0 to 1.0) */
    overallScore: number;

    /** Vocabulary tiers: high-frequency, mid-frequency, domain-specific */
    tierScores: {
        highFrequency: number;    // Top 1000 words
        midFrequency: number;     // 1001-5000 words
        domainSpecific: number;   // Persona schema vocabulary
    };

    /**
     * Retrieval speed percentiles.
     * How fast can the learner retrieve words compared to a native speaker?
     */
    retrievalSpeedPercentile: number;

    /** Words with retrieval issues (known but slow) */
    slowRetrievalWords: LexicalRetrievalEvent[];

    /** Trajectory */
    trajectory: 'improving' | 'stable' | 'declining';
}

/**
 * A single lexical retrieval measurement.
 */
export interface LexicalRetrievalEvent {
    /** The word or phrase */
    lexicalItem: string;

    /** Retrieval time in milliseconds (from context trigger to production) */
    retrievalTimeMs: number;

    /**
     * Baseline retrieval time for this difficulty level (ms).
     * Derived from native speaker norms for this language.
     */
    baselineMs: number;

    /** Ratio: retrievalTimeMs / baselineMs (1.0 = native speed) */
    speedRatio: number;

    /**
     * Whether the learner used a compensatory strategy instead
     * of direct retrieval (e.g., circumlocution, code-switch).
     */
    usedCompensatoryStrategy: boolean;

    /** Session ID where this was measured */
    sessionId: string;

    /** Domain this word belongs to */
    domain: string;
}

// ─── Communicative Pressure State ────────────────────────────

/**
 * Dynamic communicative pressure level within a session.
 *
 * Pressure is not the same as difficulty — a simple conversation
 * with a strict Tier 3 authority figure can be higher pressure
 * than a complex conversation with a friendly Tier 2 shopkeeper.
 *
 * @patentCritical Dynamic pressure calibration enables the system
 *   to modulate challenge level in real-time based on learner
 *   performance and affective state, not just static tier parameters.
 *   This is the missing link between assessment and intervention.
 */
export interface CommunicativePressureState {
    /** Session identifier */
    sessionId: string;

    /** Current pressure level (0.0 minimal → 1.0 maximum) */
    currentLevel: number;

    /** Target pressure level (where the system is trying to get to) */
    targetLevel: number;

    /**
     * Pressure components contributing to the current level.
     * Each component contributes independently.
     */
    components: PressureComponent[];

    /** Recent adjustments made by the system */
    recentAdjustments: PressureAdjustmentEvent[];

    /** Whether the learner is currently in the "Zone of Proximal Development" */
    inZPD: boolean;

    /** If outside ZPD, which direction: too easy or too hard? */
    zpdDeviation?: 'below' | 'above';
}

/**
 * A component contributing to communicative pressure.
 */
export interface PressureComponent {
    /** Component name */
    component: string;

    /** Contribution to total pressure (0.0 to 1.0) */
    contribution: number;

    /** Source of this pressure */
    source: 'tier-context' | 'npc-mood' | 'topic-complexity'
    | 'register-requirement' | 'time-pressure' | 'social-stakes'
    | 'audience-size' | 'consequences-severity';
}

/**
 * A pressure adjustment event.
 */
export interface PressureAdjustmentEvent {
    /** Timestamp */
    timestamp: string;

    /** Direction of adjustment */
    direction: 'increase' | 'decrease';

    /** Magnitude of adjustment */
    magnitude: number;

    /** Reason for adjustment */
    reason: string;

    /** What mechanism was used to adjust */
    mechanism: 'npc-behavior-change' | 'topic-shift' | 'register-relaxation'
    | 'scaffolding-level-change' | 'companion-intervention' | 'timer-adjustment';

    /** New pressure level after adjustment */
    newLevel: number;
}
