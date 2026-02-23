/**
 * AAPM Feedback Engine — Type Definitions
 *
 * Complete data model for the Recursive Feedback Engine (RFE),
 * the core patent architecture of the AAPM Framework.
 *
 * The RFE converts every learner interaction into a node in a continuous
 * learning network through three temporal loops:
 * - Micro-Loop: Real-time scaffolding within conversation
 * - Macro-Loop: Post-session curriculum generation (5-phase pipeline)
 * - Persistence Loop: Cross-session social world evolution
 *
 * @module feedback-engine/types
 * @patentCritical This module defines the data structures for the
 *   Recursive Friction-to-Curriculum Pipeline — a novel method for
 *   extracting communicative friction, classifying patterns, and
 *   generating hyper-personalized micro-curricula with forward injection.
 */

// ─── Friction Point Model ────────────────────────────────────

/**
 * Classification of communicative friction by linguistic domain.
 *
 * Each type requires different extraction heuristics, curriculum
 * generation strategies, and forward injection mechanisms.
 *
 * @patentCritical The five-way friction classification is a novel
 *   contribution that extends beyond traditional error analysis by
 *   incorporating pragmatic and register dimensions.
 */
export type FrictionType =
    | 'lexical'           // Missing vocabulary — detected by hesitation, L1 intrusion, topic abandonment
    | 'morphosyntactic'   // Grammar rule misapplication — detected by interlanguage model comparison
    | 'phonemic'          // Pronunciation error — detected by PAE cosine similarity threshold
    | 'register'          // Formality calibration error — detected by register classifier
    | 'pragmatic';        // Wrong speech act or strategy — detected by speech act classifier

/**
 * Severity assessment of a friction point, governing curriculum priority.
 *
 * Severity is determined by the INTERSECTION of comprehensibility impact
 * and social impact — a grammatically minor error with major social
 * consequences (e.g., register violation with authority) is rated higher
 * than a grammatically major error with no social impact.
 */
export type FrictionSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * A single communicative friction event extracted from session data.
 *
 * Every friction point preserves full conversational context (3 turns before
 * and after) to enable the curriculum generator to produce contextually
 * grounded instructional content rather than decontextualized grammar drills.
 *
 * @patentCritical The contextual preservation of friction points and their
 *   multi-dimensional classification is the foundational data structure
 *   for the Recursive Feedback Engine.
 */
export interface FrictionPoint {
    /** Unique identifier for this friction point within the session */
    id: string;

    /** Linguistic domain classification */
    type: FrictionType;

    /** Severity assessment based on comprehensibility × social impact */
    severity: FrictionSeverity;

    /** ISO 8601 timestamp within the session */
    timestamp: string;

    /** Duration of the friction event in milliseconds (e.g., hesitation length) */
    durationMs: number;

    /** Full conversational context surrounding the friction event */
    context: FrictionContext;

    /** Multi-dimensional analysis of the friction event */
    analysis: FrictionAnalysis;

    /** Generated curriculum recommendation for this friction point */
    curriculumRecommendation: CurriculumRecommendation;

    /** Historical recurrence data across sessions */
    recurrence: RecurrenceData;

    /** Raw learner utterance that triggered the friction detection */
    rawUtterance: string;

    /** If phonemic, the specific phoneme(s) involved */
    phonemeData?: PhonemefrictionData;
}

/**
 * Conversational context surrounding a friction event.
 *
 * The 3-turn window is based on discourse analysis research showing
 * that communicative repair sequences typically resolve within 3 turns.
 * Preserving this context enables the curriculum generator to produce
 * instructional content that references the actual conversational
 * situation rather than abstract grammar rules.
 */
export interface FrictionContext {
    /** Three conversational turns preceding the friction event */
    turnsBefore: ConversationTurn[];

    /** The exact turn where friction occurred */
    frictionTurn: ConversationTurn;

    /** Three conversational turns following the friction event */
    turnsAfter: ConversationTurn[];

    /** What happened as a communicative consequence of the friction */
    communicativeConsequence: CommunicativeConsequence;

    /** The NPC involved in the interaction at the time of friction */
    npcId: string;

    /** The Tier context (1, 2, or 3) where friction occurred */
    tierAtFriction: 1 | 2 | 3;

    /** The physical/virtual location within the simulation */
    locationId: string;
}

/**
 * A single turn in a conversation, capturing both text and metadata.
 */
export interface ConversationTurn {
    /** Who spoke: learner or NPC */
    speaker: 'learner' | 'npc';

    /** The text content of the utterance */
    content: string;

    /** ISO 8601 timestamp */
    timestamp: string;

    /** Duration of the utterance in milliseconds */
    durationMs: number;

    /** URL to the audio recording, if available */
    audioUrl?: string;

    /** Detected emotional state during this turn */
    emotionalState?: EmotionalState;
}

/**
 * What happened as a result of the communicative friction.
 */
export type CommunicativeConsequence =
    | 'communication-succeeded-despite-friction'  // Message got through anyway
    | 'communication-partially-succeeded'         // Gist conveyed, nuance lost
    | 'communication-failed-npc-helped'           // NPC scaffolded recovery
    | 'communication-failed-topic-abandoned'      // Learner gave up on topic
    | 'communication-failed-interaction-ended'    // Interaction terminated
    | 'social-friction-event-created'             // Tier 2: persistent social consequence
    | 'negotiation-position-weakened'             // Tier 3: authority reduced openness
    | 'negotiation-collapsed';                    // Tier 3: interaction terminated by authority

/**
 * Detected emotional state of the learner.
 *
 * Used by the Micro-Loop to calibrate real-time scaffolding intensity.
 * When the learner is frustrated or anxious, the system increases
 * Companion availability and reduces L2 pressure.
 */
export type EmotionalState =
    | 'confident'
    | 'engaged'
    | 'neutral'
    | 'uncertain'
    | 'frustrated'
    | 'anxious'
    | 'withdrawn';

/**
 * Multi-dimensional analysis of a friction event.
 *
 * This analysis drives both the curriculum generation (what to teach)
 * and the forward injection planning (how to create practice opportunities).
 *
 * @patentCritical The L1 transfer hypothesis generation and interlanguage
 *   pattern detection are novel computational methods for identifying
 *   the root cause of communicative difficulty.
 */
export interface FrictionAnalysis {
    /** Precise description of what went wrong linguistically */
    whatWentWrong: string;

    /**
     * Hypothesis about L1 transfer causing this friction.
     * Example: "Spanish speaker applied SVO word order to German subordinate
     * clause, producing SVO instead of required SOV."
     */
    l1TransferHypothesis: string | null;

    /**
     * Whether this error reflects a systematic rule in the learner's
     * interlanguage (recurring pattern) or a random performance error.
     *
     * Only SYSTEMATIC errors receive curriculum priority.
     * Random errors are logged but not prioritized for instruction.
     */
    interlanguagePattern: 'systematic' | 'random';

    /**
     * Impact on whether a native speaker would understand the message.
     * This is weighted HIGHER than grammatical accuracy in priority scoring.
     */
    comprehensibilityImpact: FrictionSeverity;

    /** How the friction affected the social dynamics of the interaction */
    socialImpact: string;

    /**
     * The grammatical rule the learner appears to be applying
     * (their interlanguage hypothesis), if identifiable.
     */
    interlanguageRule?: string;

    /**
     * The target language rule that should have been applied.
     */
    targetRule?: string;
}

/**
 * Generated curriculum recommendation for a single friction point.
 *
 * @patentCritical The forward injection specification is a novel method
 *   for embedding learning targets into subsequent simulation sessions
 *   through environmentally natural prompts rather than explicit instruction.
 */
export interface CurriculumRecommendation {
    /** How urgently this should be addressed in the next micro-curriculum */
    priority: 'immediate' | 'soon' | 'reinforcement';

    /** The specific linguistic form, vocabulary item, or skill to teach */
    targetForm: string;

    /** Recommended instructional format based on Axis Z profile */
    recommendedFormat: CurriculumFormat;

    /**
     * Specification for how to create natural practice opportunities
     * for this target form in the next simulation session.
     *
     * @patentCritical Forward Injection Specification — the learner
     *   does not know this is happening. NPCs are "briefed" to create
     *   organic communicative situations that require the target form.
     */
    forwardInjectionSpec: ForwardInjectionSpec;

    /** Estimated time (in minutes) to address this friction point */
    estimatedDurationMinutes: number;
}

/**
 * Available micro-curriculum delivery formats.
 *
 * Format selection is driven by the learner's Axis Z retention profile
 * and can be overridden by learner preference.
 */
export type CurriculumFormat =
    | 'interactive-slideshow'    // 3-7 slides + exercises per friction point
    | 'ai-video-dialogue'       // Re-enacted friction moment with correction
    | 'spaced-repetition-cards' // Auto-generated vocab/phrase flashcards
    | 'audio-podcast'           // Narrated session review for passive learning
    | 'conversational-debrief'  // Dialogue with Tier 1 Companion about session
    | 'notebook-summary';       // Long-form journal with analysis

/**
 * Forward Injection specification.
 *
 * Defines how the target learning material should be embedded into
 * the next simulation session so that the learner encounters it
 * organically through NPC behavior, not through explicit instruction.
 *
 * @patentCritical This is the mechanism by which the AAPM converts
 *   identified learning needs into natural practice opportunities
 *   within the simulation — the key differentiator from traditional
 *   spaced repetition systems.
 */
export interface ForwardInjectionSpec {
    /** The linguistic target to create an opportunity for */
    targetForm: string;

    /** The type of friction this injection addresses */
    frictionType: FrictionType;

    /**
     * Natural language instruction for the NPC describing how to
     * create a communicative situation requiring the target form.
     *
     * Example: "Initiate a discussion about weekend plans that
     * requires subjunctive mood constructions. Use 'I suggest we...'
     * and 'Would you prefer if...' structures naturally."
     */
    injectionMethod: string;

    /**
     * Constraint on injection execution: the interaction must feel
     * natural and unforced. If the NPC cannot find a natural opening,
     * the injection should be deferred, not forced.
     */
    naturalityConstraint: string;

    /** Which NPC(s) should receive this injection directive */
    targetNpcIds: string[];

    /** Which Tier context is appropriate for this injection */
    targetTier: 1 | 2 | 3;

    /** Which location(s) are appropriate for this injection */
    targetLocationIds: string[];

    /** Expiry: how many sessions before this injection is abandoned */
    maxSessionAttempts: number;

    /** Whether this injection has been successfully executed */
    status: 'pending' | 'injected' | 'deferred' | 'expired';
}

/**
 * Phoneme-specific friction data, attached when the friction type is 'phonemic'.
 */
export interface PhonemefrictionData {
    /** The target phoneme(s) that were misproduced */
    targetPhonemes: string[];

    /** The phoneme(s) the learner actually produced */
    producedPhonemes: string[];

    /** Cosine similarity score between learner and native model */
    cosineSimilarity: number;

    /** Whether this phoneme is critical for comprehensibility */
    comprehensibilityCritical: boolean;
}

/**
 * Historical recurrence tracking for a friction pattern across sessions.
 *
 * Recurrence data is critical for distinguishing between developmental
 * errors (expected to resolve naturally) and fossilized patterns
 * (require targeted intervention to dislodge).
 */
export interface RecurrenceData {
    /** Whether this friction pattern has been seen in previous sessions */
    seenBefore: boolean;

    /** Session IDs where this pattern was previously detected */
    previousSessionIds: string[];

    /** Total number of occurrences across all sessions */
    totalOccurrences: number;

    /** Trajectory of this friction pattern over time */
    trajectory: 'improving' | 'stable' | 'worsening';

    /** If seen before, the date of first occurrence */
    firstOccurrence?: string;

    /** Average severity across occurrences */
    averageSeverity?: FrictionSeverity;
}

// ─── Macro-Loop Pipeline ─────────────────────────────────────

/**
 * The five phases of the Macro-Loop pipeline.
 *
 * @patentCritical The 5-phase pipeline is the core method claim:
 *   Friction Extraction → Pattern Classification → Curriculum Generation →
 *   Adaptive Lesson Feedback → Forward Injection
 */
export type MacroLoopPhase =
    | 'friction-extraction'      // Phase 1
    | 'pattern-classification'   // Phase 2
    | 'curriculum-generation'    // Phase 3
    | 'adaptive-lesson-feedback' // Phase 4
    | 'forward-injection';       // Phase 5

/**
 * State of the Macro-Loop pipeline for a single session.
 *
 * The pipeline is executed sequentially — each phase depends on the
 * output of the previous phase. If any phase fails, the pipeline
 * records the failure and the data is queued for retry.
 */
export interface MacroLoopPipelineState {
    /** Session this pipeline run is processing */
    sessionId: string;

    /** Current phase of execution */
    currentPhase: MacroLoopPhase;

    /** Overall pipeline status */
    status: 'running' | 'completed' | 'failed' | 'retrying';

    /** Timestamp when pipeline execution started */
    startedAt: string;

    /** Timestamp when pipeline execution completed (if finished) */
    completedAt?: string;

    /** Output of Phase 1 */
    frictionExtractionResult?: FrictionExtractionResult;

    /** Output of Phase 2 */
    patternClassificationResult?: PatternClassificationResult;

    /** Output of Phase 3 */
    curriculumGenerationResult?: CurriculumGenerationResult;

    /** Output of Phase 4 */
    adaptiveLessonResult?: AdaptiveLessonResult;

    /** Output of Phase 5 */
    forwardInjectionResult?: ForwardInjectionResult;

    /** Error information if pipeline failed */
    error?: PipelineError;
}

/**
 * Output of Phase 1: Friction Point Extraction.
 *
 * Processes the complete session transcript and identifies every
 * communicative friction moment using the detection criteria.
 */
export interface FrictionExtractionResult {
    /** All friction points detected in the session */
    frictionPoints: FrictionPoint[];

    /** Total count of friction points */
    totalCount: number;

    /** Counts broken down by friction type */
    countByType: Record<FrictionType, number>;

    /** Counts broken down by severity */
    countBySeverity: Record<FrictionSeverity, number>;

    /** Session-level fluency metrics */
    fluencyMetrics: SessionFluencyMetrics;
}

/**
 * Session-level fluency metrics computed during extraction.
 */
export interface SessionFluencyMetrics {
    /** Total words produced by learner */
    totalWordsProduced: number;

    /** Words per minute (speech rate) */
    wordsPerMinute: number;

    /** Percentage of turns with friction events */
    frictionRate: number;

    /** Average hesitation duration in milliseconds */
    averageHesitationMs: number;

    /** Number of L1 intrusions */
    l1IntrusionCount: number;

    /** Number of topic abandonments */
    topicAbandonmentCount: number;

    /** Number of successful communications despite friction */
    recoveryRate: number;
}

/**
 * Output of Phase 2: Pattern Classification.
 *
 * Clusters friction points by linguistic domain and checks for
 * recurrence patterns across previous sessions.
 */
export interface PatternClassificationResult {
    /** Friction points grouped by semantic/linguistic cluster */
    clusters: FrictionCluster[];

    /** Friction points flagged as recurring from previous sessions */
    recurringPatterns: RecurringPattern[];

    /** Novel friction patterns (first occurrence) */
    novelPatterns: FrictionPoint[];

    /** Overall interlanguage model update */
    interlanguageUpdate: InterlanguageModelDelta;
}

/**
 * A cluster of related friction points within the same semantic domain.
 *
 * Clusters indicate structural gaps — when a learner has multiple
 * friction points in one domain, the curriculum should address the
 * domain systematically rather than treating each point individually.
 */
export interface FrictionCluster {
    /** Descriptive label for the cluster */
    clusterLabel: string;

    /** Friction type that dominates this cluster */
    dominantType: FrictionType;

    /** Friction points belonging to this cluster */
    members: FrictionPoint[];

    /** Whether this cluster indicates a structural gap */
    isStructuralGap: boolean;

    /** Recommended curriculum approach for this cluster */
    treatmentApproach: 'individual' | 'systematic' | 'immersive';
}

/**
 * A friction pattern that has recurred across multiple sessions.
 */
export interface RecurringPattern {
    /** The friction pattern identifier */
    patternId: string;

    /** The target linguistic form involved */
    targetForm: string;

    /** Number of sessions where this pattern appeared */
    sessionCount: number;

    /** Trajectory: is the learner improving, stable, or worsening? */
    trajectory: 'improving' | 'stable' | 'worsening';

    /** Whether this may be a fossilized error requiring targeted intervention */
    fossilizationRisk: boolean;

    /** Priority escalation: recurring patterns are auto-promoted */
    escalatedPriority: 'immediate' | 'soon';
}

/**
 * Delta update to the learner's Interlanguage Model based on session data.
 */
export interface InterlanguageModelDelta {
    /** Grammatical rules the learner applied correctly this session */
    confirmedRules: string[];

    /** Rules the learner misapplied this session */
    violatedRules: string[];

    /** New rules detected in the learner's production (not seen before) */
    emergingRules: string[];

    /** Rules that appear to be fossilizing (repeated violation, no improvement) */
    fossilizingRules: string[];
}

/**
 * Output of Phase 3: Micro-Curriculum Generation.
 *
 * @patentCritical The generation of hyper-personalized micro-curricula
 *   from contextually-grounded friction data, delivered in the learner's
 *   preferred format (Axis Z), is a novel instructional method.
 */
export interface CurriculumGenerationResult {
    /** The generated micro-curriculum */
    curriculum: MicroCurriculum;

    /** Forward injection directives generated from the curriculum */
    forwardInjectionDirectives: ForwardInjectionSpec[];

    /** Estimated total delivery time in minutes */
    estimatedDeliveryMinutes: number;
}

/**
 * A complete micro-curriculum generated from session friction data.
 */
export interface MicroCurriculum {
    /** Unique identifier for this curriculum */
    id: string;

    /** Session that generated this curriculum */
    sourceSessionId: string;

    /** Friction points addressed by this curriculum */
    addressedFrictionPointIds: string[];

    /** Delivery format selected based on Axis Z profile */
    format: CurriculumFormat;

    /** Ordered instructional units within the curriculum */
    units: CurriculumUnit[];

    /** Schema version of the curriculum structure */
    schemaVersion: string;
}

/**
 * A single instructional unit within a micro-curriculum.
 */
export interface CurriculumUnit {
    /** Unit identifier */
    id: string;

    /** The friction point(s) this unit addresses */
    frictionPointIds: string[];

    /** The target linguistic form being taught */
    targetForm: string;

    /** Title for the unit (learner-facing) */
    title: string;

    /** Instructional content (format-specific) */
    content: CurriculumContent;

    /** Exercises for practice */
    exercises: Exercise[];

    /** The original conversational context used as reference */
    contextReference: string;
}

/**
 * Format-specific instructional content.
 */
export interface CurriculumContent {
    /** The explanation in the learner's L1 */
    explanationL1: string;

    /** Example usage in the target L2 */
    examplesL2: string[];

    /** L1 contrastive analysis (highlighting L1-L2 differences) */
    contrastiveAnalysis?: string;

    /** Audio URLs for pronunciation models */
    audioModels?: string[];

    /** Video URLs for AI-generated demonstrations */
    videoModels?: string[];
}

/**
 * A practice exercise within a curriculum unit.
 */
export interface Exercise {
    /** Exercise type */
    type: 'fill-blank' | 'reorder' | 'multiple-choice' | 'free-production' | 'pronunciation' | 'register-selection';

    /** Exercise prompt */
    prompt: string;

    /** Correct answer(s) */
    acceptedAnswers: string[];

    /** Feedback for incorrect answers */
    incorrectFeedback: string;

    /** Feedback for correct answers */
    correctFeedback: string;
}

/**
 * Output of Phase 4: Adaptive Lesson Feedback.
 *
 * Tracks learner engagement with the micro-curriculum and
 * adapts future curriculum generation based on preferences.
 */
export interface AdaptiveLessonResult {
    /** Curriculum that was delivered */
    curriculumId: string;

    /** How much of the curriculum the learner completed */
    completionRate: number;

    /** Time spent on the curriculum in minutes */
    timeSpentMinutes: number;

    /** Per-unit engagement data */
    unitEngagement: UnitEngagementData[];

    /** Learner preference signals for future curriculum adaptation */
    preferenceSignals: LearnerPreferenceSignals;
}

/**
 * Engagement data for a single curriculum unit.
 */
export interface UnitEngagementData {
    /** Unit identifier */
    unitId: string;

    /** Whether the learner completed this unit */
    completed: boolean;

    /** Whether the learner skipped this unit */
    skipped: boolean;

    /** Whether the learner flagged this as unclear */
    flaggedUnclear: boolean;

    /** Whether the learner requested more examples */
    requestedMoreExamples: boolean;

    /** Exercise accuracy rate (0.0 to 1.0) */
    exerciseAccuracy: number;

    /** Time spent in seconds */
    timeSpentSeconds: number;
}

/**
 * Signals about learner instructional preferences,
 * used to adapt future curriculum generation.
 */
export interface LearnerPreferenceSignals {
    /** Does the learner prefer more or fewer examples? */
    examplePreference: 'more' | 'standard' | 'fewer';

    /** Does the learner read written explanations? */
    readsExplanations: boolean;

    /** Does the learner engage with audio content? */
    engagesAudio: boolean;

    /** Does the learner engage with video content? */
    engagesVideo: boolean;

    /** Average completion time relative to estimated time */
    paceRelativeToEstimate: number;

    /** Does the learner ask follow-up questions? */
    asksFollowUps: boolean;
}

/**
 * Output of Phase 5: Forward Injection Planning.
 *
 * @patentCritical This phase converts curriculum targets into
 *   environmental prompts for the next simulation session.
 */
export interface ForwardInjectionResult {
    /** All injection directives generated */
    directives: ForwardInjectionSpec[];

    /** Which NPCs received new directives */
    briefedNpcIds: string[];

    /** Which locations will be primed for injection */
    primedLocationIds: string[];

    /** Estimated number of sessions for full injection execution */
    estimatedSessionsToComplete: number;
}

/**
 * Error information when the pipeline fails.
 */
export interface PipelineError {
    /** Which phase failed */
    failedAtPhase: MacroLoopPhase;

    /** Error message */
    message: string;

    /** Whether this can be retried */
    retryable: boolean;

    /** Number of retry attempts so far */
    retryCount: number;
}

// ─── Affective State Inference ───────────────────────────────

/**
 * Multi-signal input vector for affective state inference.
 *
 * The system infers the learner's emotional state from BEHAVIORAL
 * signals, not self-report. This is a computational method, not
 * a magic enum — every emotional state classification is derived
 * from measurable interaction signals.
 *
 * @patentCritical The six-signal affective inference method is a
 *   novel computational approach to detecting learner emotional
 *   state in a conversational AI system, enabling real-time
 *   pedagogical adaptation (Krashen's Affective Filter).
 */
export interface AffectiveSignalVector {
    /**
     * Response latency: ms between NPC utterance end and learner response start.
     * Above baseline → uncertainty or formulation difficulty.
     * Below baseline → confidence or rehearsed response.
     */
    responseLatencyMs: number;

    /**
     * L1 fallback rate over the last N turns (0.0 to 1.0).
     * Increasing L1 use signals cognitive overload or frustration.
     */
    l1FallbackRate: number;

    /**
     * Hedging frequency: rate of hedging markers ("maybe", "I think",
     * "I'm not sure", fillers) in recent turns.
     * High hedging signals uncertainty.
     */
    hedgingFrequency: number;

    /**
     * Pause duration: average intra-utterance pause length in ms.
     * Long pauses signal lexical retrieval difficulty.
     */
    averagePauseDurationMs: number;

    /**
     * Topic avoidance: rate at which the learner steers away from
     * NPC-introduced topics toward safer territory.
     * Signals anxiety about specific domains.
     */
    topicAvoidanceRate: number;

    /**
     * Repair attempt rate: how often the learner tries to fix
     * their own utterances (self-correction, restarts).
     * High rate can signal both learning AND frustration.
     */
    repairAttemptRate: number;

    /**
     * Utterance length trend: are learner utterances getting
     * shorter or longer over the session?
     * Shortening → withdrawal; lengthening → engagement.
     */
    utteranceLengthTrend: number;

    /**
     * Session engagement duration: how long into the session
     * the learner has been active.
     * Accuracy of affect inference improves with more data.
     */
    sessionDurationMinutes: number;
}

/**
 * Result of affective state inference computation.
 *
 * @patentCritical The inference is probabilistic — the system
 *   computes a confidence-weighted emotional state from the
 *   signal vector, calibrated against the learner's personal
 *   baseline (some learners are naturally hesitant).
 */
export interface AffectiveInferenceResult {
    /** Inferred emotional state (most likely) */
    primaryState: EmotionalState;

    /** Confidence in the primary state */
    confidence: number;

    /** Second most likely state (for ambiguous situations) */
    secondaryState?: EmotionalState;

    /** Confidence in the secondary state */
    secondaryConfidence?: number;

    /** The raw signal vector used for inference */
    signals: AffectiveSignalVector;

    /** Which signals contributed most to this classification */
    dominantSignals: Array<{
        signal: string;
        deviation: number;
        direction: 'above-baseline' | 'below-baseline';
    }>;

    /** Whether this state triggers a scaffolding escalation */
    triggersEscalation: boolean;

    /** Timestamp of inference */
    timestamp: string;
}

/**
 * Per-learner baseline calibration for affective inference.
 *
 * Some learners are naturally hesitant, some are naturally fast.
 * The baseline is computed from the first 3-5 sessions and
 * continuously updated with Bayesian updates.
 */
export interface AffectiveCalibrationProfile {
    /** Learner identifier */
    learnerId: string;

    /** Sessions used to compute baseline */
    baselineSessionCount: number;

    /** Baseline response latency (ms) — personal "normal" */
    baselineLatencyMs: number;

    /** Baseline L1 usage rate — personal "normal" */
    baselineL1Rate: number;

    /** Baseline hedging frequency */
    baselineHedgingFrequency: number;

    /** Baseline pause duration */
    baselinePauseDurationMs: number;

    /** Deviation thresholds for each signal */
    deviationThresholds: {
        /** How many standard deviations above baseline triggers concern */
        latencyThreshold: number;
        l1RateThreshold: number;
        hedgingThreshold: number;
        pauseThreshold: number;
    };

    /** Last updated timestamp */
    lastUpdatedAt: string;
}

/**
 * Scaffolding escalation protocol triggered by negative affect.
 *
 * @patentCritical The system automatically escalates scaffolding
 *   intensity when it detects learner distress, implementing
 *   Krashen's Affective Filter Hypothesis computationally.
 */
export interface ScaffoldingEscalation {
    /** Trigger: which affective state caused this */
    triggerState: EmotionalState;

    /** Escalation level (1 = subtle, 5 = maximum support) */
    level: 1 | 2 | 3 | 4 | 5;

    /** Actions taken */
    actions: ScaffoldingAction[];

    /** Whether Tier 1 Companion was made available */
    companionActivated: boolean;

    /** L2 pressure adjustment (negative = reduce) */
    l2PressureAdjustment: number;

    /** Session timestamp */
    timestamp: string;
}

/**
 * A specific scaffolding action taken in response to detected affect.
 */
export type ScaffoldingAction =
    | 'reduce-l2-ratio'              // Companion uses more L1 temporarily
    | 'offer-companion-check-in'     // Companion reaches out
    | 'simplify-npc-register'        // NPCs use simpler language
    | 'increase-npc-patience'        // NPCs wait longer before re-prompt
    | 'provide-vocabulary-hint'      // System provides word suggestions
    | 'reduce-topic-complexity'      // Steer toward simpler topics
    | 'offer-session-break'          // Suggest a break
    | 'activate-refraction-helper';  // Make refraction interface more visible

// ─── Conversational Repair Tracking ──────────────────────────

/**
 * Strategies learners use to repair communication breakdowns.
 *
 * @patentCritical Tracking repair strategy development over time
 *   is a novel competence dimension. Existing apps track what
 *   the learner says CORRECTLY — the AAPM also tracks how the
 *   learner HANDLES DIFFICULTY, which is equally important for
 *   real-world communicative competence.
 */
export type RepairStrategy =
    | 'clarification-request'   // "Could you repeat that?"
    | 'confirmation-check'      // "Do you mean X?"
    | 'comprehension-check'     // "Did you understand?"
    | 'circumlocution'          // Describing something you don't have the word for
    | 'paraphrase'              // Saying it differently
    | 'self-correction'         // Catching and fixing own error
    | 'appeal-to-npc'           // Asking NPC for help
    | 'code-switch'             // Falling back to L1
    | 'topic-shift'             // Changing the subject
    | 'abandonment';            // Giving up on the communicative goal

/**
 * A single repair attempt observed in a conversation.
 */
export interface RepairAttempt {
    /** Unique attempt identifier */
    attemptId: string;

    /** Session and turn where repair occurred */
    sessionId: string;
    turnIndex: number;

    /** Strategy used */
    strategy: RepairStrategy;

    /** What triggered the need for repair */
    triggerType: 'comprehension-failure' | 'production-failure' | 'npc-non-understanding';

    /** The learner's repair utterance */
    repairUtterance: string;

    /** Whether the repair succeeded */
    successful: boolean;

    /** How many repair attempts before success (or abandonment) */
    attemptsInSequence: number;

    /** Time spent on repair (ms from trigger to resolution) */
    repairDurationMs: number;

    /** NPC patience during repair (how the NPC responded) */
    npcResponse: 'supportive' | 'neutral' | 'impatient';

    /** Tier context */
    tierContext: 1 | 2 | 3;

    /** Timestamp */
    timestamp: string;
}

/**
 * Learner's overall repair competence profile.
 *
 * @patentCritical This profile enables the system to detect when a
 *   learner's repair repertoire is too narrow (e.g., always code-switches
 *   instead of circumlocuting) and to create Forward Injection scenarios
 *   that require specific repair strategies.
 */
export interface RepairCompetenceProfile {
    /** Learner identifier */
    learnerId: string;

    /** Assessment timestamp */
    assessedAt: string;

    /** Strategy repertoire: which strategies the learner uses, and how often */
    strategyRepertoire: StrategyUsage[];

    /** Overall repair success rate */
    overallSuccessRate: number;

    /** Average number of attempts before success */
    averageAttemptsToSuccess: number;

    /** Dominant strategy (most frequently used) */
    dominantStrategy: RepairStrategy;

    /** Strategies the learner NEVER uses (gap in repertoire) */
    unusedStrategies: RepairStrategy[];

    /**
     * Repair sophistication score (0.0 to 1.0).
     * Higher = uses varied, target-like strategies.
     * Lower = relies on L1 code-switch or abandonment.
     */
    sophisticationScore: number;

    /** Trajectory: is repair competence improving? */
    trajectory: 'improving' | 'stable' | 'declining';
}

/**
 * Usage statistics for a single repair strategy.
 */
export interface StrategyUsage {
    /** Strategy */
    strategy: RepairStrategy;

    /** Number of times used */
    usageCount: number;

    /** Success rate for this strategy */
    successRate: number;

    /** Average time to resolution when using this strategy */
    averageResolutionMs: number;

    /** Whether this is a "mature" strategy (target-like) or "immature" */
    maturity: 'target-like' | 'developing' | 'immature';
}
