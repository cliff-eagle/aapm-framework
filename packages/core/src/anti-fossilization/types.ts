/**
 * AAPM Anti-Fossilization Engine — Type Definitions
 *
 * Mechanisms for detecting and dislodging fossilized interlanguage errors.
 *
 * In SLA, "fossilization" occurs when an incorrect form becomes resistant
 * to correction — the learner has internalized it so deeply that standard
 * instruction fails to dislodge it. This is the single biggest obstacle
 * to advanced proficiency.
 *
 * The AFE uses three novel intervention strategies:
 * 1. VARIED CONTEXT EXPOSURE: Present the target form in 5+ different
 *    NPC/location/scenario contexts to prevent context-dependent storage
 * 2. CONTRASTIVE MINIMAL PAIRS: Generate sentence pairs where only the
 *    fossilized form differs, forcing conscious attention to the contrast
 * 3. NPC-DRIVEN CORRECTION SEQUENCES: NPCs naturally model the correct
 *    form in ways the learner notices (recasts, clarification requests,
 *    negotiation of meaning)
 *
 * @module anti-fossilization/types
 * @patentCritical The three-strategy defossilization system is a novel
 *   computational approach to a problem that has no existing automated
 *   solution. Traditional apps repeat the same exercise; the AFE attacks
 *   fossilization from multiple angles simultaneously.
 */

import type { FrictionType } from '../feedback-engine/types';

// ─── Fossilization Detection ─────────────────────────────────

/**
 * Complete fossilization profile for a learner.
 *
 * @patentCritical The multi-factor fossilization detection algorithm
 *   goes beyond simple recurrence counting. A form is classified as
 *   fossilized only when ALL of:
 *   - Recurrence across 5+ sessions
 *   - No improvement trajectory
 *   - High confidence in the interlanguage rule
 *   - Previous curriculum has failed to correct it
 */
export interface FossilizationProfile {
    /** Learner identifier */
    learnerId: string;

    /** Assessment timestamp */
    assessedAt: string;

    /** Forms classified as fossilized */
    fossilizedForms: FossilizedForm[];

    /** Forms at risk of fossilization (early warning) */
    atRiskForms: AtRiskForm[];

    /** Forms that were previously fossilized but successfully dislodged */
    resolvedForms: ResolvedFossilization[];

    /** Overall fossilization burden (0.0 = none, 1.0 = severe) */
    fossilizationBurden: number;

    /** Average time to dislodge a fossilized form (in sessions) */
    averageResolutionTime: number | null;
}

/**
 * A linguistic form classified as fossilized.
 */
export interface FossilizedForm {
    /** Unique identifier */
    formId: string;

    /** The incorrect form the learner produces */
    incorrectForm: string;

    /** The target (correct) form */
    targetForm: string;

    /** Linguistic domain */
    frictionType: FrictionType;

    /** Interlanguage rule ID (from IHE) */
    interlanguageRuleId: string;

    /** First detected timestamp */
    firstDetectedAt: string;

    /** Number of sessions where this form has appeared */
    sessionCount: number;

    /** Number of curriculum interventions that failed */
    failedInterventions: number;

    /** Current accuracy rate (consistently low = fossilized) */
    accuracyRate: number;

    /** Comprehensibility impact of this fossilized form */
    comprehensibilityImpact: 'low' | 'medium' | 'high' | 'critical';

    /** Social impact when this form is produced */
    socialImpact: string;

    /** Active defossilization strategy, if one is being applied */
    activeStrategy?: DefossilizationStrategy;

    /** Status */
    status: 'detected' | 'intervention-active' | 'resolving' | 'resistant';
}

/**
 * A form at risk of fossilization — early warning.
 */
export interface AtRiskForm {
    /** The form being monitored */
    targetForm: string;

    /** Interlanguage rule ID */
    interlanguageRuleId: string;

    /** Session count (approaching threshold) */
    sessionCount: number;

    /** Trajectory (must be 'stable-incorrect' to be at risk) */
    trajectory: 'stable-incorrect' | 'worsening';

    /** Estimated sessions until fossilization if no intervention */
    estimatedSessionsToFossilization: number;

    /** Recommended preventive action */
    preventiveAction: 'increase-injection-frequency' | 'add-to-next-curriculum' | 'varied-context-exposure';
}

/**
 * A previously fossilized form that was successfully dislodged.
 */
export interface ResolvedFossilization {
    /** Form ID */
    formId: string;

    /** Target form */
    targetForm: string;

    /** Strategy that succeeded */
    successfulStrategy: DefossilizationStrategyType;

    /** Sessions required to dislodge */
    sessionsToResolve: number;

    /** Date resolved */
    resolvedAt: string;

    /** Current accuracy rate (must remain above 0.85 for 5 sessions) */
    sustainedAccuracy: number;
}

// ─── Defossilization Strategies ──────────────────────────────

/**
 * Type of defossilization strategy.
 */
export type DefossilizationStrategyType =
    | 'varied-context-exposure'    // Same form in 5+ different contexts
    | 'contrastive-minimal-pairs'  // Near-identical sentences highlighting the error
    | 'npc-correction-sequence'    // NPCs naturally model correct form
    | 'combined';                  // Multiple strategies simultaneously

/**
 * A complete defossilization strategy assignment for a fossilized form.
 *
 * @patentCritical The strategy assignment algorithm considers the
 *   form type, L1 transfer analysis, and previous intervention failures
 *   to select the optimal defossilization approach.
 */
export interface DefossilizationStrategy {
    /** Strategy identifier */
    strategyId: string;

    /** Fossilized form this strategy targets */
    fossilizedFormId: string;

    /** Strategy type */
    type: DefossilizationStrategyType;

    /** Strategy-specific plan */
    plan: VariedContextPlan | ContrastiveMinimalPairPlan | NPCCorrectionPlan;

    /** Start timestamp */
    startedAt: string;

    /** Expected duration in sessions */
    expectedDurationSessions: number;

    /** Current progress (sessions completed / expected) */
    progress: number;

    /** Whether the form shows signs of improvement */
    showingImprovement: boolean;

    /** Status */
    status: 'active' | 'completed-success' | 'completed-failure' | 'escalated';
}

// ─── Strategy 1: Varied Context Exposure ─────────────────────

/**
 * Plan for exposing the target form in varied contexts.
 *
 * @patentCritical By presenting the same form in 5+ distinct
 *   communicative contexts, the learner is forced to process
 *   the form independently of any single context, breaking
 *   the context-dependent storage that reinforces fossilization.
 */
export interface VariedContextPlan {
    /** The linguistic form to target */
    targetForm: string;

    /** Scheduled context exposures */
    scheduledContexts: ContextExposure[];

    /** Completed context exposures */
    completedContexts: CompletedExposure[];

    /** Minimum unique contexts required (default: 5) */
    minimumContexts: number;
}

/**
 * A planned context for form exposure.
 */
export interface ContextExposure {
    /** Target NPC */
    npcId: string;

    /** Target location */
    locationId: string;

    /** Tier context */
    tier: 1 | 2 | 3;

    /** Communicative situation description */
    situation: string;

    /** Forward injection spec for this exposure */
    injectionMethod: string;
}

/**
 * A completed context exposure with result.
 */
export interface CompletedExposure {
    /** The planned exposure */
    context: ContextExposure;

    /** Session where exposure occurred */
    sessionId: string;

    /** Whether the learner used the target form correctly */
    targetFormUsedCorrectly: boolean;

    /** Whether the learner noticed the contrast */
    contrastNoticed: boolean;
}

// ─── Strategy 2: Contrastive Minimal Pairs ───────────────────

/**
 * Plan for contrastive minimal pair exercises.
 *
 * @patentCritical Automatically generating minimal pairs from the
 *   learner's actual errors (not generic textbook pairs) ensures
 *   the contrast is maximally relevant to the specific fossilized form.
 */
export interface ContrastiveMinimalPairPlan {
    /** The fossilized form */
    incorrectForm: string;

    /** The target form */
    targetForm: string;

    /** Generated minimal pairs */
    pairs: MinimalPair[];

    /** Delivery method */
    deliveryMethod: 'curriculum-exercise' | 'npc-dialogue' | 'companion-debrief';
}

/**
 * A minimal pair: two sentences identical except for the target form.
 */
export interface MinimalPair {
    /** Sentence with incorrect (fossilized) form */
    incorrect: string;

    /** Sentence with correct (target) form */
    correct: string;

    /** Explanation of the contrast */
    explanation: string;

    /** Meaning difference (if any) caused by the form difference */
    meaningDifference: string;

    /** Social consequence difference */
    socialConsequence: string;
}

// ─── Strategy 3: NPC Correction Sequences ────────────────────

/**
 * Plan for NPC-driven natural correction.
 *
 * @patentCritical NPCs are instructed to use specific correction
 *   techniques from SLA research (recasts, clarification requests,
 *   metalinguistic feedback) calibrated to the learner's emotional
 *   state and the social context.
 */
export interface NPCCorrectionPlan {
    /** Target NPCs for correction duty */
    correctorNpcIds: string[];

    /** The form to correct */
    targetForm: string;

    /** Correction technique to use */
    technique: CorrectionTechnique;

    /** Maximum corrections per session (to avoid overload) */
    maxCorrectionsPerSession: number;

    /** Expected sessions for this plan */
    expectedSessions: number;
}

/**
 * Correction techniques from SLA research.
 */
export type CorrectionTechnique =
    | 'recast'                    // NPC repeats the utterance with correct form
    | 'clarification-request'     // NPC says "Sorry, what do you mean?"
    | 'metalinguistic-feedback'   // NPC explicitly notes the error
    | 'elicitation'               // NPC prompts learner to self-correct
    | 'repetition'                // NPC repeats the error with rising intonation
    | 'explicit-correction';      // NPC directly corrects (used sparingly)
