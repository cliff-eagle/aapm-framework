/**
 * AAPM Tier Manager — Type Definitions
 *
 * State machine definitions for the three-tier architecture.
 * Manages tier state, transitions, and per-tier evaluation.
 *
 * @module tier-manager/types
 * @patentCritical The three-tier progression system is a novel
 *   pedagogical architecture that treats tiers as qualitatively
 *   distinct social environments, not difficulty levels.
 */

// ─── Tier State Machine ──────────────────────────────────────

/**
 * Tier identifier.
 */
export type TierType = 1 | 2 | 3;

/**
 * Human-readable tier labels.
 */
export type TierLabel = 'companion' | 'immersion' | 'negotiation';

/**
 * The current state of the tier system for a learner.
 *
 * All three tiers are accessible from the start, but the system
 * recommends engagement patterns based on the learner's progression.
 */
export interface TierSystemState {
    /** Learner identifier */
    learnerId: string;

    /** Current recommended tier (where the system suggests they spend time) */
    recommendedTier: TierType;

    /** Per-tier readiness assessment */
    tierReadiness: {
        tier1: TierReadiness;
        tier2: TierReadiness;
        tier3: TierReadiness;
    };

    /** Session history distribution across tiers */
    sessionDistribution: {
        tier1Sessions: number;
        tier2Sessions: number;
        tier3Sessions: number;
    };

    /** Current active session tier, if in a session */
    activeSessionTier?: TierType;

    /** Progression phase */
    progressionPhase: ProgressionPhase;
}

/**
 * Readiness assessment for a specific tier.
 */
export interface TierReadiness {
    /** Whether the learner has ever entered this tier */
    visited: boolean;

    /** Confidence score for this tier (0.0 to 1.0) */
    confidenceScore: number;

    /** Success rate in this tier */
    successRate: number;

    /** Number of sessions completed in this tier */
    sessionsCompleted: number;

    /** Average friction rate in this tier */
    averageFrictionRate: number;

    /** Tier-specific evaluation scores */
    evaluationScores: TierEvaluationScores;
}

/**
 * Tier-specific evaluation scores.
 */
export interface TierEvaluationScores {
    /**
     * Tier 1 metrics:
     * - Code-switch reduction rate
     * - Companion relationship depth
     * - Vocabulary activation rate
     */
    codeSwitchReductionRate?: number;
    companionRelationshipDepth?: number;
    vocabularyActivationRate?: number;

    /**
     * Tier 2 metrics:
     * - Task completion rate (target: 80% across 10 sessions)
     * - Social reputation average
     * - Friction recovery rate
     */
    taskCompletionRate?: number;
    socialReputationAverage?: number;
    frictionRecoveryRate?: number;

    /**
     * Tier 3 metrics:
     * - Objective achievement rate
     * - Register accuracy score (target: 85%+)
     * - Cultural intelligence score
     * - Pragmatic appropriateness score
     */
    objectiveAchievementRate?: number;
    registerAccuracyScore?: number;
    culturalIntelligenceScore?: number;
    pragmaticAppropriatenessScore?: number;
}

/**
 * Recommended progression phase.
 *
 * Based on research on graduated exposure therapy applied
 * to linguistic anxiety (Affective Filter reduction).
 */
export type ProgressionPhase =
    | 'foundation'     // Week 1-4: Primarily Tier 1, occasional Tier 2
    | 'exploration'    // Week 5-8: Balanced Tier 1 + Tier 2
    | 'immersion'      // Week 9-12: Primarily Tier 2, Tier 3 introduction
    | 'integration'    // Week 13-20: Primarily Tier 2 + Tier 3
    | 'mastery';       // Week 21+: Tier 3 focus, Tier 1 for complex concepts

/**
 * Event that triggers a tier transition recommendation.
 */
export interface TierTransitionEvent {
    /** Learner identifier */
    learnerId: string;

    /** Recommended tier to move to */
    recommendedTier: TierType;

    /** Reason for the recommendation */
    reason: TierTransitionReason;

    /** Confidence in this recommendation */
    confidence: number;

    /** Metrics that triggered this recommendation */
    triggeringMetrics: Record<string, number>;

    /** Timestamp */
    timestamp: string;
}

/**
 * Reasons for tier transition recommendations.
 */
export type TierTransitionReason =
    | 'tier1-mastery-threshold-reached'
    | 'tier2-readiness-demonstrated'
    | 'tier3-readiness-demonstrated'
    | 'regression-detected-recommend-lower-tier'
    | 'learner-requested'
    | 'session-count-milestone'
    | 'affective-filter-reduction-sufficient';

/**
 * Runtime configuration for a session in a specific tier.
 */
export interface TierSessionConfig {
    /** Active tier */
    tier: TierType;

    /** Active persona schema */
    personaSchemaId: string;

    /** Available locations for this session */
    availableLocations: string[];

    /** NPCs available in this session */
    availableNpcIds: string[];

    /** Session objectives (what the learner should accomplish) */
    sessionObjectives: string[];

    /** Forward injection directives active for this session */
    activeInjections: Array<{
        targetForm: string;
        injectionMethod: string;
        targetNpcIds: string[];
    }>;

    /** Tier-specific behavior parameters */
    behaviorParams: TierBehaviorParams;
}

/**
 * Tier-specific NPC behavior parameters.
 *
 * @patentCritical The parametric differentiation of NPC behavior
 *   across tiers creates qualitatively distinct interaction
 *   environments from the same base NPC system.
 */
export interface TierBehaviorParams {
    /** NPC patience level (seconds before re-prompt or timeout) */
    patienceSeconds: number;

    /** How NPC responds to errors */
    errorResponse: 'recast-naturally' | 'repeat-once' | 'track-and-reduce-openness';

    /** Scaffolding intensity */
    scaffoldingLevel: 'proactive' | 'minimal' | 'none';

    /** L1 tolerance */
    l1Tolerance: 'managed-gradient' | 'zero' | 'zero-with-register';

    /** What failure looks like */
    failureMode: 'none' | 'social-friction-event' | 'negotiation-collapse';

    /** Whether comprehension checks are enabled */
    comprehensionChecks: boolean;

    /** Whether register is evaluated */
    registerEvaluation: boolean;
}
