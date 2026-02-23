/**
 * AAPM Retention Engine — Type Definitions
 *
 * Data model for Axis Z (Psychological Retention) management.
 * Governs how the system maintains learner engagement based on
 * individual psychology — never defaulting to gamification.
 *
 * @module retention/types
 * @patentCritical The five-profile retention system is a novel
 *   approach that respects individual learner psychology rather
 *   than applying universal gamification mechanics.
 */

// ─── Retention Profiles ──────────────────────────────────────

/**
 * The five Axis Z retention profiles.
 *
 * @patentCritical Each profile uses fundamentally different
 *   engagement mechanics. The system NEVER defaults to gamification
 *   — it assesses which profile fits the learner and applies
 *   that profile's specific mechanisms.
 */
export type RetentionStyle =
    | 'gamified-coercion'       // Streaks, XP, leaderboards — for competitive types
    | 'organic-social'          // NPC messages, relationship narrative — for heritage learners
    | 'professional-urgency'    // Countdown timers, benchmarks — for exam/relocation prep
    | 'intrinsic-mastery'       // Difficulty unlocks, precision scoring — for perfectionists
    | 'social-accountability';  // Peer cohorts, instructor oversight — for group learners

/**
 * Complete retention engine configuration for a learner.
 */
export interface RetentionEngineState {
    /** Learner identifier */
    learnerId: string;

    /** Active retention profile */
    activeProfile: RetentionStyle;

    /** Profile-specific state */
    profileState: RetentionProfileState;

    /** Engagement metrics */
    engagementMetrics: EngagementMetrics;

    /** Scheduled async triggers */
    pendingTriggers: ScheduledTrigger[];

    /** Whether the learner is at risk of disengagement */
    churnRisk: ChurnRiskAssessment;
}

/**
 * Profile-specific state data.
 * Only the fields relevant to the active profile are populated.
 */
export interface RetentionProfileState {
    /** Gamified Coercion state */
    gamified?: {
        currentStreak: number;
        longestStreak: number;
        totalXP: number;
        currentLevel: number;
        leaderboardPosition?: number;
        badgesEarned: string[];
        dailyGoalCompleted: boolean;
    };

    /** Organic Social state */
    organicSocial?: {
        activeRelationshipNpcIds: string[];
        pendingNpcMessages: number;
        narrativeArcPhase: string;
        lastNpcInteraction: string;
        relationshipDepthScores: Record<string, number>;
    };

    /** Professional Urgency state */
    professionalUrgency?: {
        targetDate: string;
        daysRemaining: number;
        benchmarksMet: number;
        benchmarksTotal: number;
        currentPace: 'ahead' | 'on-track' | 'behind' | 'critical';
        weeklySessionTarget: number;
        weeklySessionsCompleted: number;
    };

    /** Intrinsic Mastery state */
    intrinsicMastery?: {
        currentDifficultyTier: number;
        precisionScores: Record<string, number>;
        unlockedChallenges: string[];
        masteredSkills: string[];
        currentFocusArea: string;
        perfectSessionCount: number;
    };

    /** Social Accountability state */
    socialAccountability?: {
        cohortId: string;
        cohortMembers: string[];
        instructorId?: string;
        weeklyCommitment: number;
        weeklyCompletionRate: number;
        peerComparisonPosition: number;
        lastInstructorCheckIn: string;
    };
}

/**
 * Engagement metrics tracked for all retention profiles.
 */
export interface EngagementMetrics {
    /** Days since first session */
    daysSinceStart: number;

    /** Total sessions completed */
    totalSessions: number;

    /** Sessions in the last 7 days */
    sessionsLast7Days: number;

    /** Sessions in the last 30 days */
    sessionsLast30Days: number;

    /** Average session duration in minutes */
    averageSessionMinutes: number;

    /** Days since last session */
    daysSinceLastSession: number;

    /** Weekly session frequency (rolling average) */
    weeklyFrequency: number;

    /** Lesson completion rate */
    lessonCompletionRate: number;

    /** Async trigger engagement rate (opened / delivered) */
    asyncTriggerEngagementRate: number;

    /** Trend in session frequency */
    frequencyTrend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Assessment of the learner's risk of disengagement.
 */
export interface ChurnRiskAssessment {
    /** Risk level */
    level: 'low' | 'medium' | 'high' | 'critical';

    /** Risk score (0.0 safe to 1.0 imminent churn) */
    score: number;

    /** Factors contributing to the risk */
    factors: string[];

    /** Recommended interventions */
    recommendedInterventions: string[];

    /** Last assessment timestamp */
    assessedAt: string;
}

// ─── Async Trigger System ────────────────────────────────────

/**
 * A scheduled asynchronous engagement trigger.
 *
 * These extend the simulation world beyond session boundaries.
 * The trigger TYPE and CONTENT are determined by the learner's
 * active retention profile.
 */
export interface ScheduledTrigger {
    /** Unique trigger identifier */
    triggerId: string;

    /** Learner to receive the trigger */
    learnerId: string;

    /** Type of trigger */
    type: TriggerType;

    /** Who the trigger appears to be from */
    sender: TriggerSender;

    /** Content of the trigger */
    content: TriggerContent;

    /** Scheduled delivery timestamp */
    scheduledAt: string;

    /** Delivery status */
    status: 'pending' | 'delivered' | 'engaged' | 'dismissed' | 'expired';

    /** Priority (higher = delivered first) */
    priority: number;

    /** Expiry timestamp */
    expiresAt: string;

    /** Which retention profile generated this trigger */
    sourceProfile: RetentionStyle;

    /** Whether this trigger is in response to a learner action */
    isReactive: boolean;
}

/**
 * Types of async triggers.
 */
export type TriggerType =
    | 'npc-message'          // In-character message from an NPC
    | 'companion-check-in'   // Tier 1 companion reaching out
    | 'scenario-preview'     // Preview of upcoming Tier 2/3 scenario
    | 'achievement-alert'    // Achievement or milestone notification
    | 'streak-reminder'      // Streak at risk notification
    | 'deadline-countdown'   // Professional urgency countdown
    | 'challenge-unlock'     // New difficulty tier available
    | 'peer-update'          // Cohort activity update
    | 'curriculum-ready'     // New micro-curriculum available
    | 'pronunciation-drill'; // Phoneme practice prompt

/**
 * Who the trigger appears to be from.
 */
export interface TriggerSender {
    /** Display name */
    name: string;

    /** NPC ID if from an NPC */
    npcId?: string;

    /** Whether this is from the system or from an NPC character */
    type: 'npc' | 'system' | 'peer' | 'instructor';
}

/**
 * Content of an async trigger.
 */
export interface TriggerContent {
    /** Title/subject line */
    title: string;

    /** Message body */
    body: string;

    /** Call to action text */
    ctaText: string;

    /** Deep link URL within the app */
    deepLink: string;

    /** Optional media attachment URL */
    mediaUrl?: string;

    /** Language of the content (may be L1, L2, or mixed) */
    language: string;
}
