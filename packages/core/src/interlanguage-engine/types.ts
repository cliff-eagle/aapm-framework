/**
 * AAPM Interlanguage Hypothesis Engine — Type Definitions
 *
 * Computational model of the learner's evolving internal grammar system.
 *
 * In Second Language Acquisition (SLA), "interlanguage" refers to the
 * systematic rule system a learner constructs between their L1 and the
 * target L2. This system is not random — it reflects active hypotheses
 * about how the language works, informed by L1 transfer, instruction,
 * and communicative experience.
 *
 * The IHE maintains a probabilistic model of these hypotheses, enabling
 * the system to:
 * 1. PREDICT what the learner will produce before they produce it
 * 2. DIAGNOSE the root cause of errors (not just what went wrong, but WHY)
 * 3. TRACK grammar evolution over time (developmental sequence mapping)
 * 4. DISTINGUISH systematic interlanguage rules from random performance errors
 * 5. DETECT fossilization before it takes hold
 *
 * @module interlanguage-engine/types
 * @patentCritical The computational interlanguage model is the single most
 *   defensible patent claim in the AAPM framework. No existing language
 *   learning application maintains a formal model of the learner's
 *   hypothesized grammar — they track error counts, not rule systems.
 *   This module converts SLA theory into a computational specification.
 */

// ─── Interlanguage Grammar Model ─────────────────────────────

/**
 * The learner's complete interlanguage grammar at a point in time.
 *
 * This is not a description of the TARGET language grammar — it is a
 * model of what the LEARNER believes the grammar to be. The gap
 * between this model and the target grammar is the learning frontier.
 *
 * @patentCritical The formal representation of a learner's hypothesized
 *   grammar as a probabilistic rule system is a novel computational
 *   method for diagnosing and predicting L2 production.
 */
export interface InterlanguageGrammar {
    /** Learner this grammar belongs to */
    learnerId: string;

    /** ISO 639-1 code of the learner's native language */
    l1Code: string;

    /** ISO 639-1 code of the target language */
    l2Code: string;

    /** Snapshot timestamp */
    snapshotAt: string;

    /**
     * Total number of grammatical rules in this model.
     * Grows as the learner encounters new structures.
     */
    totalRules: number;

    /**
     * The set of hypothesized grammatical rules.
     * Each rule represents what the learner BELIEVES to be correct,
     * which may or may not match the target grammar.
     */
    rules: HypothesisRule[];

    /**
     * Developmental stage mapping.
     * Maps the learner's current rules to known SLA developmental
     * sequences (e.g., Pienemann's Processability Theory stages).
     */
    developmentalStage: DevelopmentalStage;

    /**
     * L1 transfer analysis: which L1 rules are being applied
     * to L2 production, and whether each transfer is positive
     * (L1 rule works in L2) or negative (L1 rule fails in L2).
     */
    l1TransferProfile: L1TransferProfile;

    /**
     * The "learning frontier" — rules that are currently unstable,
     * where the learner sometimes applies the correct L2 rule and
     * sometimes falls back to the L1 rule or an incorrect hypothesis.
     */
    learningFrontier: LearningFrontierRule[];

    /**
     * Overall grammar confidence score (0.0 to 1.0).
     * Weighted average of individual rule confidences.
     */
    overallConfidence: number;
}

/**
 * A single hypothesized grammatical rule in the learner's interlanguage.
 *
 * @patentCritical Each rule is a falsifiable hypothesis: the system
 *   predicts that the learner will apply this rule in future production,
 *   and updates confidence when the prediction is confirmed or violated.
 */
export interface HypothesisRule {
    /** Unique rule identifier */
    ruleId: string;

    /**
     * Linguistic domain this rule governs.
     *
     * Examples:
     * - 'morphosyntax.verb-conjugation.present-tense'
     * - 'morphosyntax.word-order.subordinate-clause'
     * - 'morphosyntax.article-usage.definite'
     * - 'pragmatics.request-strategy.directness'
     * - 'phonology.vowel-reduction.unstressed'
     */
    domain: string;

    /**
     * Natural language description of the rule the learner appears
     * to be applying.
     *
     * Example: "Applies SVO word order in German subordinate clauses
     * (L1 English transfer), instead of required SOV."
     */
    ruleDescription: string;

    /**
     * The corresponding TARGET language rule that should be applied.
     *
     * Example: "German subordinate clauses require SOV word order
     * after subordinating conjunctions (dass, weil, obwohl, etc.)."
     */
    targetRuleDescription: string;

    /** Whether this rule matches the target language grammar */
    isTargetLike: boolean;

    /**
     * Whether this rule originates from L1 transfer.
     *
     * Positive transfer: L1 rule happens to work in L2
     * Negative transfer: L1 rule fails in L2
     */
    l1TransferSource: L1TransferType | null;

    /**
     * Confidence that this rule is actually part of the learner's
     * interlanguage (vs. a random performance error).
     *
     * Starts at 0.5 after first observation, increases with consistent
     * application, decreases with inconsistent application.
     *
     * Threshold: ≥ 0.7 = systematic rule, < 0.5 = likely random
     */
    confidence: number;

    /**
     * Evidence supporting this hypothesis.
     * Each application or violation is logged.
     */
    evidence: RuleEvidence[];

    /**
     * Trajectory: is this rule getting more target-like,
     * remaining stable, or becoming fossilized?
     */
    trajectory: RuleTrajectory;

    /**
     * Number of sessions where this rule has been observed.
     * High session count + non-target-like + stable trajectory = fossilization risk.
     */
    sessionCount: number;

    /** First observed timestamp */
    firstObservedAt: string;

    /** Last observed timestamp */
    lastObservedAt: string;

    /**
     * The developmental stage this rule belongs to.
     * Some structures follow predictable acquisition orders
     * regardless of instruction.
     */
    developmentalStageId?: string;

    /**
     * Priority for intervention.
     * Computed from: comprehensibility impact × confidence × trajectory × recency.
     */
    interventionPriority: InterventionPriority;
}

/**
 * Type of L1 transfer.
 */
export type L1TransferType =
    | 'positive-transfer'   // L1 rule works correctly in L2
    | 'negative-transfer'   // L1 rule produces errors in L2
    | 'avoidance'           // Learner avoids L2 structures that differ from L1
    | 'overproduction';     // Learner overuses L2 structures similar to L1

/**
 * Evidence for a hypothesized rule — a single observed instance.
 */
export interface RuleEvidence {
    /** Session where this evidence was observed */
    sessionId: string;

    /** Timestamp within the session */
    timestamp: string;

    /** The learner's actual production */
    production: string;

    /** What the target grammar predicts */
    targetProduction: string;

    /** Whether the learner's production matched the rule prediction */
    ruleApplied: boolean;

    /** Whether the production was target-like */
    targetLike: boolean;

    /**
     * Communicative context: was the learner under pressure?
     * Under pressure, learners often regress to earlier stages,
     * which is expected and not a sign of lost knowledge.
     */
    communicativePressure: 'low' | 'medium' | 'high';

    /** Tier context where this was observed */
    tierContext: 1 | 2 | 3;
}

/**
 * Trajectory analysis for a hypothesized rule.
 */
export interface RuleTrajectory {
    /** Direction of change */
    direction: 'acquiring'    // Moving toward target
    | 'stable-correct'    // Consistently target-like
    | 'stable-incorrect'  // Fossilization risk
    | 'regressing'        // Moving away from target
    | 'fluctuating';      // Learning frontier — actively reorganizing

    /**
     * Rate of change over the last N sessions.
     * Positive = improving, negative = worsening, ~0 = stable.
     */
    rateOfChange: number;

    /** Number of sessions used to compute trajectory */
    windowSize: number;

    /** Confidence accuracy by session (for trend analysis) */
    sessionTrend: Array<{ sessionId: string; accuracy: number }>;
}

/**
 * Intervention priority computed for a rule.
 */
export type InterventionPriority =
    | 'critical'        // Fossilizing, high comprehensibility impact
    | 'high'            // Non-target-like, medium-high impact
    | 'medium'          // Learning frontier, active acquisition
    | 'low'             // Low impact or already improving
    | 'monitor-only';   // Target-like but not yet stable

// ─── Developmental Stage Mapping ─────────────────────────────

/**
 * Mapping to SLA developmental sequences.
 *
 * Some grammatical structures follow predictable acquisition orders
 * regardless of L1 or instruction. This mapping positions the learner
 * within these sequences so the system doesn't try to teach structures
 * that are NOT YET ACQUIRABLE at the learner's current stage.
 *
 * @patentCritical Using processability theory to filter curriculum
 *   targets is a novel application of SLA research in an AI system.
 *   The system will not waste effort on structures the learner's
 *   processing capacity cannot yet handle.
 */
export interface DevelopmentalStage {
    /**
     * Overall stage identifier.
     * Based on Pienemann's Processability Theory:
     * 1 = Lemma access (words)
     * 2 = Category procedure (lexical morphology)
     * 3 = Phrasal procedure (agreement within phrases)
     * 4 = Sentence procedure (agreement between phrases)
     * 5 = Subordinate clause procedure (embedded clause operations)
     */
    currentStage: 1 | 2 | 3 | 4 | 5;

    /** Per-domain stage assessment */
    domainStages: DomainStageAssessment[];

    /** Structures that ARE acquirable at current stage */
    acquirableStructures: string[];

    /** Structures that are NOT YET acquirable (don't teach these) */
    prematureStructures: string[];

    /** Estimated time to next stage (in sessions) */
    estimatedSessionsToNextStage: number | null;
}

/**
 * Stage assessment for a specific linguistic domain.
 */
export interface DomainStageAssessment {
    /** Linguistic domain */
    domain: string;

    /** Current stage (1-5) */
    stage: number;

    /** Confidence in this assessment */
    confidence: number;

    /** Evidence count supporting this assessment */
    evidenceCount: number;
}

// ─── L1 Transfer Profile ─────────────────────────────────────

/**
 * Comprehensive analysis of L1 influence on L2 production.
 *
 * @patentCritical Systematic L1 transfer analysis enables the system
 *   to predict errors BEFORE they occur and design preventive
 *   curriculum, not just reactive correction.
 */
export interface L1TransferProfile {
    /** L1 language code */
    l1Code: string;

    /** L2 language code */
    l2Code: string;

    /** Positive transfers (L1 helps) */
    positiveTransfers: TransferAnalysis[];

    /** Negative transfers (L1 hurts) */
    negativeTransfers: TransferAnalysis[];

    /** Avoidance patterns (structures the learner avoids because L1 lacks them) */
    avoidancePatterns: AvoidancePattern[];

    /** Overproduction patterns (L1-like structures used excessively) */
    overproductionPatterns: OverproductionPattern[];

    /**
     * Overall L1 interference score (0.0 to 1.0).
     * Higher = more L1 interference in production.
     */
    interferenceScore: number;
}

/**
 * Analysis of a specific L1 transfer phenomenon.
 */
export interface TransferAnalysis {
    /** Linguistic domain affected */
    domain: string;

    /** The L1 rule being transferred */
    l1Rule: string;

    /** How it manifests in L2 production */
    l2Manifestation: string;

    /** Frequency of occurrence */
    frequency: number;

    /** Whether this has been addressed by curriculum */
    addressed: boolean;
}

/**
 * A pattern where the learner avoids L2 structures
 * that have no equivalent in L1.
 */
export interface AvoidancePattern {
    /** The L2 structure being avoided */
    avoidedStructure: string;

    /** What the learner uses instead */
    substitution: string;

    /** Confidence that this is avoidance (vs. not yet acquired) */
    confidence: number;
}

/**
 * A pattern where the learner overuses L2 structures
 * that are similar to L1.
 */
export interface OverproductionPattern {
    /** The L2 structure being overused */
    overusedStructure: string;

    /** Expected frequency in native production */
    nativeFrequency: number;

    /** Learner's actual frequency */
    learnerFrequency: number;

    /** Ratio of overproduction */
    overproductionRatio: number;
}

// ─── Learning Frontier ───────────────────────────────────────

/**
 * A rule on the learning frontier — actively being acquired.
 *
 * Learning frontier rules are the HIGHEST VALUE instructional targets
 * because they represent structures where the learner is in a state
 * of active hypothesis testing.
 *
 * @patentCritical Identifying and prioritizing learning frontier
 *   rules ensures instructional effort targets structures that are
 *   ready to be acquired, maximizing learning efficiency.
 */
export interface LearningFrontierRule {
    /** Reference to the rule in the grammar model */
    ruleId: string;

    /** How often the learner applies the target-like form (0.0 to 1.0) */
    targetLikeRate: number;

    /** Number of alternations between L1-like and target-like forms */
    alternationCount: number;

    /**
     * Estimated stability: how many more sessions until this rule
     * is consistently target-like (≥ 0.85 accuracy).
     */
    estimatedSessionsToStability: number | null;

    /**
     * Whether this is a RESPONSIVE rule — i.e., the learner uses it
     * correctly in low-pressure contexts but regresses under pressure.
     * This is a NORMAL and expected acquisition pattern.
     */
    pressureSensitive: boolean;

    /**
     * Recommended intervention: should the system push this rule
     * with Forward Injection, or let it develop naturally?
     */
    recommendedAction: 'inject-actively' | 'monitor-passively' | 'address-in-curriculum';
}

// ─── Prediction System ───────────────────────────────────────

/**
 * A prediction generated by the IHE about what the learner will produce.
 *
 * @patentCritical The predictive capability is what makes the IHE
 *   fundamentally different from error tracking. The system doesn't just
 *   react to errors — it ANTICIPATES them, enabling proactive intervention
 *   through Forward Injection.
 */
export interface RulePrediction {
    /** ID of the rule generating this prediction */
    sourceRuleId: string;

    /**
     * The communicative context that will trigger this rule.
     *
     * Example: "When the learner attempts to express a hypothetical
     * condition in German, they will use indicative mood instead of
     * Konjunktiv II, based on L1 English transfer."
     */
    triggerContext: string;

    /** Predicted learner production */
    predictedProduction: string;

    /** Target-like production */
    targetProduction: string;

    /** Confidence in this prediction */
    confidence: number;

    /** Whether a Forward Injection directive should be created */
    shouldInject: boolean;
}

/**
 * The outcome of a prediction — what actually happened.
 */
export interface PredictionOutcome {
    /** The prediction that was tested */
    predictionId: string;

    /** What the learner actually produced */
    actualProduction: string;

    /** Whether the prediction was correct */
    predictionCorrect: boolean;

    /** Whether the production was target-like */
    productionTargetLike: boolean;

    /**
     * What this outcome means for the interlanguage model:
     * - 'confirmation': Rule is confirmed, increase confidence
     * - 'violation': Rule was not applied, decrease confidence
     * - 'novel-evidence': New rule discovered, add to grammar
     * - 'restructuring': Learner appears to be reorganizing rules
     */
    modelImplication: 'confirmation' | 'violation' | 'novel-evidence' | 'restructuring';
}

// ─── Grammar Evolution ───────────────────────────────────────

/**
 * Event recording a change in the interlanguage grammar.
 * These form a timeline of the learner's grammar development.
 */
export interface GrammarEvolutionEvent {
    /** Timestamp */
    timestamp: string;

    /** Session that triggered this evolution */
    sessionId: string;

    /** Type of evolution */
    type: GrammarEvolutionType;

    /** Rule(s) affected */
    affectedRuleIds: string[];

    /** Description of what changed */
    description: string;

    /** Confidence delta (how much did overall grammar confidence change) */
    confidenceDelta: number;
}

/**
 * Types of grammar evolution events.
 */
export type GrammarEvolutionType =
    | 'rule-acquired'        // New rule added, already target-like
    | 'rule-hypothesized'    // New rule added, not yet target-like
    | 'rule-confirmed'       // Existing rule gained confidence
    | 'rule-revised'         // Learner revised their hypothesis
    | 'rule-abandoned'       // Learner stopped applying a rule
    | 'rule-fossilized'      // Rule classified as fossilized
    | 'stage-transition'     // Learner moved to next developmental stage
    | 'restructuring-event'  // Multiple rules reorganized simultaneously
    | 'l1-transfer-resolved' // Negative L1 transfer overcome
    | 'regression-event';    // Learner regressed on a previously acquired rule
