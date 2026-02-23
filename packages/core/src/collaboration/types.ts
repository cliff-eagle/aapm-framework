/**
 * AAPM Collaboration & Enterprise — Type Definitions
 *
 * Data models for multi-learner environments, instructor oversight,
 * and enterprise deployment features.
 *
 * These types enable the AAPM to serve three market segments:
 * 1. Individual learners (direct-to-consumer)
 * 2. Educational institutions (instructor-led cohorts)
 * 3. Enterprise (workforce language training programs)
 *
 * @module collaboration/types
 * @patentCritical The integration of instructor oversight into an
 *   AI-driven simulation — where the instructor can set objectives
 *   that are translated into Forward Injection directives — is a
 *   novel mechanism for hybrid human-AI pedagogy.
 */

// ─── Instructor Dashboard ────────────────────────────────────

/**
 * Instructor's aggregated view of a student cohort.
 */
export interface InstructorDashboard {
    /** Instructor identifier */
    instructorId: string;

    /** Cohort being viewed */
    cohortId: string;

    /** Cohort metadata */
    cohort: StudentCohort;

    /** Per-student progress summaries */
    studentSummaries: StudentProgressSummary[];

    /** Cohort-wide analytics */
    cohortAnalytics: CohortAnalytics;

    /** Active learning objectives set by the instructor */
    activeObjectives: LearningObjective[];

    /** Pending instructor interventions */
    pendingInterventions: InstructorIntervention[];

    /** Dashboard last updated timestamp */
    updatedAt: string;
}

/**
 * A student cohort sharing the same persona schema and instructor.
 */
export interface StudentCohort {
    /** Unique cohort identifier */
    cohortId: string;

    /** Display name for the cohort */
    name: string;

    /** Instructor(s) assigned to this cohort */
    instructorIds: string[];

    /** Persona schema this cohort uses */
    personaSchemaId: string;

    /** Student learner IDs */
    studentIds: string[];

    /** Cohort creation date */
    createdAt: string;

    /** Whether the cohort is currently active */
    active: boolean;

    /** Target CEFR level for the cohort */
    targetCEFR: string;

    /** Cohort schedule (class times, deadlines) */
    schedule?: CohortSchedule;
}

/**
 * Cohort schedule configuration.
 */
export interface CohortSchedule {
    /** Start date */
    startDate: string;

    /** End date */
    endDate: string;

    /** Target sessions per week per student */
    sessionsPerWeek: number;

    /** Milestone dates */
    milestones: Array<{
        date: string;
        description: string;
        targetMetrics: Record<string, number>;
    }>;
}

/**
 * Summarized progress for a single student.
 */
export interface StudentProgressSummary {
    /** Student learner ID */
    learnerId: string;

    /** Student display name */
    displayName: string;

    /** Current CEFR level */
    currentCEFR: string;

    /** Sessions completed */
    totalSessions: number;

    /** Sessions this week */
    sessionsThisWeek: number;

    /** Total hours of practice */
    totalHours: number;

    /** Key metrics snapshot */
    metrics: {
        taskCompletionRate: number | null;
        frictionRecurrenceRate: number | null;
        codeSwitchRatio: number | null;
        registerAccuracyScore: number | null;
        culturalIntelligenceScore: number | null;
    };

    /** Active friction patterns */
    activeFrictionPatterns: number;

    /** Fossilization risks */
    fossilizationRisks: number;

    /** Churn risk level */
    churnRisk: 'low' | 'medium' | 'high' | 'critical';

    /** Overall progress trajectory */
    trajectory: 'ahead' | 'on-track' | 'behind' | 'at-risk';

    /** Flags requiring instructor attention */
    attentionFlags: AttentionFlag[];
}

/**
 * A flag indicating something requires instructor attention.
 */
export interface AttentionFlag {
    /** Flag type */
    type: 'disengagement' | 'fossilization' | 'frustration' | 'plateau' | 'regression' | 'milestone-achieved';

    /** Description */
    description: string;

    /** Severity */
    severity: 'info' | 'warning' | 'critical';

    /** Suggested action */
    suggestedAction: string;

    /** Timestamp */
    detectedAt: string;
}

// ─── Cohort Analytics ────────────────────────────────────────

/**
 * Analytics across the entire cohort.
 */
export interface CohortAnalytics {
    /** Total sessions across all students */
    totalSessions: number;

    /** Average sessions per student per week */
    averageSessionsPerWeek: number;

    /** Common friction patterns across the cohort */
    commonFrictionPatterns: Array<{
        pattern: string;
        affectedStudents: number;
        percentAffected: number;
    }>;

    /** CEFR distribution */
    cefrDistribution: Record<string, number>;

    /** Average metrics across cohort */
    averageMetrics: Record<string, number>;

    /** Students needing attention */
    studentsNeedingAttention: number;

    /** Cohort progress toward objectives */
    objectiveProgress: Array<{
        objectiveId: string;
        percentComplete: number;
        onTrack: boolean;
    }>;
}

// ─── Learning Objectives ─────────────────────────────────────

/**
 * An instructor-defined learning objective.
 *
 * @patentCritical Instructor objectives are translated into AAPM
 *   metrics and Forward Injection directives. The instructor says
 *   "focus on past tense this week" and the system automatically
 *   creates NPC scenarios that require past tense production.
 */
export interface LearningObjective {
    /** Unique objective identifier */
    objectiveId: string;

    /** Instructor who created this objective */
    instructorId: string;

    /** Cohort this objective applies to */
    cohortId: string;

    /** Specific students (empty = entire cohort) */
    targetStudentIds: string[];

    /** Human-readable objective description */
    description: string;

    /** Linguistic target(s) */
    linguisticTargets: string[];

    /** AAPM metric(s) used to measure progress */
    measuredBy: string[];

    /** Target metric values */
    targetValues: Record<string, number>;

    /** Deadline */
    dueDate: string;

    /** Auto-generated Forward Injection directives for this objective */
    generatedInjections: Array<{
        targetForm: string;
        injectionMethod: string;
        targetTier: 1 | 2 | 3;
    }>;

    /** Current progress (0.0 to 1.0) */
    progress: number;

    /** Status */
    status: 'active' | 'completed' | 'overdue' | 'cancelled';
}

// ─── Instructor Interventions ────────────────────────────────

/**
 * An action taken by the instructor through the dashboard.
 */
export interface InstructorIntervention {
    /** Unique intervention identifier */
    interventionId: string;

    /** Instructor who performed the intervention */
    instructorId: string;

    /** Target student(s) */
    targetStudentIds: string[];

    /** Type of intervention */
    type: InterventionType;

    /** Details of the intervention */
    details: string;

    /** Timestamp */
    performedAt: string;

    /** Whether the intervention has been executed by the system */
    executed: boolean;
}

/**
 * Types of instructor interventions.
 */
export type InterventionType =
    | 'assign-scenario'        // Assign a specific Tier 2/3 scenario
    | 'set-objective'          // Set a learning objective
    | 'send-message'           // Send a message through the companion
    | 'adjust-difficulty'      // Override tier recommendation
    | 'schedule-assessment'    // Schedule a formal assessment session
    | 'unlock-tier'            // Manually unlock a tier
    | 'flag-for-review'        // Flag a student for 1:1 attention
    | 'modify-injection';      // Manually add/remove Forward Injection targets

// ─── Collaborative Sessions ──────────────────────────────────

/**
 * A multi-learner session where students interact with each other
 * and NPCs in the same simulation world.
 *
 * @patentCritical Collaborative sessions within an AI simulation,
 *   where peer interactions are evaluated against the same rubric
 *   as NPC interactions, create authentic audience effects that
 *   single-user simulations cannot replicate.
 */
export interface CollaborativeSession {
    /** Session identifier */
    sessionId: string;

    /** Participating learner IDs */
    participantIds: string[];

    /** Persona schema */
    personaSchemaId: string;

    /** Session scenario */
    scenario: string;

    /** Tier */
    tier: 2 | 3;

    /** Active NPCs */
    npcIds: string[];

    /** Learner-to-learner interactions */
    peerInteractions: PeerInteraction[];

    /** Per-participant evaluation */
    participantEvaluations: Record<string, CollaborativeEvaluation>;

    /** Session metadata */
    startedAt: string;
    endedAt?: string;

    /** Session type */
    sessionType: 'peer-practice' | 'role-play' | 'group-scenario' | 'peer-assessment';
}

/**
 * A recorded interaction between two learners.
 */
export interface PeerInteraction {
    /** Speaker learner ID */
    speakerId: string;

    /** Listener learner ID */
    listenerId: string;

    /** Content */
    content: string;

    /** Timestamp */
    timestamp: string;

    /** Detected friction (if any) */
    frictionDetected: boolean;

    /** Register appropriateness to the peer context */
    registerAppropriateness: number;
}

/**
 * Evaluation of a learner's performance in a collaborative session.
 */
export interface CollaborativeEvaluation {
    /** Learner ID */
    learnerId: string;

    /** Individual metrics */
    metrics: {
        registerAccuracy: number;
        culturalAppropriateness: number;
        communicativeEffectiveness: number;
        collaborativeContribution: number;
    };

    /** Peer feedback received */
    peerFeedback: Array<{
        fromLearnerId: string;
        rating: number;
        comment?: string;
    }>;

    /** Instructor notes (if observed) */
    instructorNotes?: string;
}
