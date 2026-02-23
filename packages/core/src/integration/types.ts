/**
 * Cross-Module Integration Types
 *
 * Defines the interfaces through which the AAPM's modules
 * connect to each other. Each integration point is a typed
 * contract between a SOURCE module and a TARGET module.
 *
 * @module integration
 *
 * @patentCritical The integration layer is what transforms
 *   individual mechanisms into a coherent learning system.
 *   No competitor has this level of cross-module coordination.
 */

// ─── IHE → Forward Injection ────────────────────────────────

/**
 * IHE predictions translated into Forward Injection directives.
 *
 * When the IHE predicts what the learner will produce next,
 * this interface tells Forward Injection what NPC scenarios
 * to create to test or support the predicted form.
 */
export interface IHEForwardInjectionSpec {
    /** The predicted rule being tested */
    ruleId: string;

    /** What we predict the learner will produce */
    predictedForm: string;

    /** The correct target form */
    targetForm: string;

    /** Communicative context that would naturally elicit this form */
    elicitationContext: string;

    /** NPC behavior that would create the opportunity */
    npcBehavior: string;

    /**
     * Priority: how valuable is testing this prediction?
     * Based on rule confidence and learning frontier status.
     */
    priority: 'critical' | 'high' | 'normal' | 'low';

    /** Prediction confidence */
    confidence: number;
}

// ─── IHE → AFE ──────────────────────────────────────────────

/**
 * IHE grammar trajectory data sent to AFE for fossilization detection.
 *
 * The AFE doesn't analyze raw productions — it receives
 * pre-processed trajectory information from the IHE.
 */
export interface IHEFossilizationSignal {
    /** Rule identifier from the IHE */
    ruleId: string;

    /** Grammar domain */
    domain: string;

    /** Target form */
    targetForm: string;

    /** Learner's current form */
    learnerForm: string;

    /** Rule confidence (≥0.7 = systematic) */
    confidence: number;

    /** Trajectory over the observation window */
    trajectory: 'acquiring' | 'stable-correct' | 'stable-incorrect'
    | 'regressing' | 'fluctuating';

    /** Number of sessions this rule has been observed */
    sessionCount: number;

    /** Whether previous curriculum has addressed this form */
    previouslyTargeted: boolean;

    /** Number of times curriculum targeted this form without improvement */
    failedInterventions: number;
}

// ─── AFE → NPC Pipeline ─────────────────────────────────────

/**
 * AFE defossilization strategy translated into NPC behavior instructions.
 *
 * When the AFE selects a strategy for a fossilized form,
 * this interface tells the NPC pipeline how to execute it.
 */
export interface AFENPCDirective {
    /** Strategy being executed */
    strategy: 'varied-context' | 'contrastive-pair' | 'npc-correction';

    /** Target form to address */
    targetForm: string;

    /** Correct form to model */
    correctForm: string;

    /** For varied-context: which context to use this session */
    contextVariation?: {
        /** Location where the interaction should occur */
        locationId: string;
        /** NPC to use */
        npcId: string;
        /** Communicative task that naturally uses the form */
        task: string;
        /** Which variation number (of minimum 5) */
        variationIndex: number;
    };

    /** For contrastive-pair: the sentence pair */
    contrastivePair?: {
        /** Sentence with the learner's fossilized form */
        learnerSentence: string;
        /** Sentence with the correct form */
        correctSentence: string;
        /** The specific contrast to highlight */
        contrastFocus: string;
    };

    /** For npc-correction: the correction technique */
    correctionTechnique?: 'recast' | 'clarification-request'
    | 'metalinguistic-feedback' | 'elicitation' | 'repetition'
    | 'explicit-correction';

    /** Priority level */
    priority: number;

    /** Maximum corrections per session for this form */
    maxCorrectionsPerSession: number;
}

// ─── Affective State → Pressure Calibrator ──────────────────

/**
 * Affective inference results fed to the Pressure Calibrator.
 *
 * When affect detection identifies a learner state,
 * this interface triggers pressure adjustment.
 */
export interface AffectivePressureSignal {
    /** Inferred affective state */
    state: string;

    /** Confidence in the inference */
    confidence: number;

    /** Which component of pressure to adjust */
    targetComponent: string;

    /** Recommended adjustment direction */
    recommendedDirection: 'increase' | 'decrease' | 'maintain';

    /** Recommended adjustment magnitude */
    recommendedMagnitude: number;

    /** Rationale for the recommendation */
    rationale: string;

    /** Whether scaffolding escalation is recommended */
    escalationRecommended: boolean;

    /** Escalation level if recommended (1-5) */
    escalationLevel?: number;
}

// ─── CQ → Reputation System ─────────────────────────────────

/**
 * Cultural violation events translated into reputation deltas.
 */
export interface CulturalReputationDelta {
    /** NPC who witnessed the violation */
    npcId: string;

    /** Norm that was violated */
    normId: string;

    /** Severity of the violation */
    severity: 'minor' | 'moderate' | 'major';

    /** Reputation delta to apply */
    reputationDelta: number;

    /** Whether other NPCs should be notified (cultural gossip) */
    propagateToRelated: boolean;

    /** Related NPC IDs who would hear about this */
    relatedNpcIds: string[];

    /** Whether a repair path is available */
    repairAvailable: boolean;

    /** Description of how to repair */
    repairPath?: string;
}

// ─── Repair Tracking → IHE ──────────────────────────────────

/**
 * Repair attempt data fed back into the IHE.
 *
 * How a learner repairs tells us about their grammar —
 * a self-correction reveals awareness; a circumlocution
 * reveals avoidance; a request for help reveals uncertainty.
 */
export interface RepairGrammarFeedback {
    /** Which rule the repair attempt relates to */
    ruleId?: string;

    /** The repair strategy used */
    strategy: string;

    /** Whether the repair was successful */
    success: boolean;

    /** The original (incorrect) form */
    originalForm: string;

    /** The repaired form (if successful) */
    repairedForm?: string;

    /** Whether the learner self-initiated the repair */
    selfInitiated: boolean;

    /**
     * Evidence type for the IHE:
     * - 'awareness': learner knows the rule but failed to access it
     * - 'avoidance': learner avoided the form entirely
     * - 'uncertainty': learner sought external confirmation
     * - 'acquisition': repair shows the correct form IS available
     */
    evidenceType: 'awareness' | 'avoidance' | 'uncertainty' | 'acquisition';
}

// ─── Pressure Calibrator → Tier Manager ─────────────────────

/**
 * Pressure state changes that should modify tier behavior.
 */
export interface PressureTierAdjustment {
    /** Current pressure level */
    currentPressure: number;

    /** Whether the learner is in ZPD */
    inZPD: boolean;

    /** If outside ZPD, which direction */
    zpdDeviation?: 'below' | 'above';

    /** Recommended behavior parameter changes */
    behaviorAdjustments: Array<{
        /** Which behavior parameter to adjust */
        parameter: string;
        /** Current value */
        currentValue: string | number;
        /** Recommended value */
        recommendedValue: string | number;
        /** Reason for adjustment */
        reason: string;
    }>;
}

// ─── Collaboration → Forward Injection ──────────────────────

/**
 * Instructor-defined learning objectives translated into
 * Forward Injection directives.
 */
export interface ObjectiveInjectionSpec {
    /** Learning objective ID */
    objectiveId: string;

    /** Instructor who set this objective */
    instructorId: string;

    /** Target grammar/vocabulary/pragmatic form */
    targetForm: string;

    /** Proficiency level required */
    targetProficiency: string;

    /** Deadline for the objective */
    deadline?: string;

    /** How to create the natural communicative opportunity */
    injectionStrategy: string;

    /** Which NPC(s) to involve */
    npcIds: string[];

    /** Which scenario(s) to embed into */
    scenarioIds: string[];

    /** Priority override from instructor */
    instructorPriority: 'critical' | 'high' | 'normal';
}

// ─── NPC Behavior Resolution ────────────────────────────────

/**
 * The final NPC behavior output after resolving personality,
 * mood, reputation, and cultural overlay.
 *
 * This is the contract between the NPC Authenticity system
 * and the Agent Intelligence Layer.
 */
export interface NPCBehaviorResolution {
    /** NPC identifier */
    npcId: string;

    /** Session in which this resolution was computed */
    sessionId: string;

    /** Resolved behavior modifiers (normalized 0.0 to 1.0) */
    modifiers: {
        /** How long to wait before re-prompting */
        patienceMultiplier: number;
        /** How verbose the NPC should be */
        responsivenessMultiplier: number;
        /** How much the NPC helps vs. challenges */
        helpfulnessMultiplier: number;
        /** How strict on register/formality */
        registerStrictnessMultiplier: number;
        /** How open to topic variety */
        topicOpennessMultiplier: number;
        /** How emotionally expressive */
        emotionalExpressivenessMultiplier: number;
    };

    /** Factors that contributed to this resolution */
    factors: {
        personalityContribution: number;
        moodContribution: number;
        reputationContribution: number;
        culturalOverlayContribution: number;
    };

    /** Any consistency constraints that were applied */
    appliedConstraints: string[];

    /** Active verbal tics and speech patterns */
    activeSpeechPatterns: string[];
}

// ─── Cross-Schema Transfer Resolution ───────────────────────

/**
 * The result of evaluating what skills transfer from one
 * persona schema to another.
 */
export interface TransferResolution {
    /** Source schema ID */
    sourceSchemaId: string;

    /** Target schema ID */
    targetSchemaId: string;

    /** Skills that successfully transfer */
    transferredSkills: Array<{
        skillId: string;
        category: string;
        /** Confidence that this skill genuinely transfers */
        transferConfidence: number;
        /** Adjustment: skill level may be modified by context difference */
        levelAdjustment: number;
    }>;

    /** Skills that do NOT transfer (context-dependent) */
    nonTransferableSkills: Array<{
        skillId: string;
        category: string;
        reason: string;
    }>;

    /** Net effect on the learner's starting position in the new schema */
    startingPositionAdjustment: {
        axisX: number;
        axisY: number;
        axisZ: number;
    };
}
