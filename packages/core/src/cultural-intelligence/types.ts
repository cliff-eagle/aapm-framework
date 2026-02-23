/**
 * AAPM Cultural Intelligence Model — Type Definitions
 *
 * Formal model for tracking and developing Cultural Intelligence (CQ)
 * within language learning simulation.
 *
 * Based on Earley & Ang's four-factor CQ model, adapted for AI-driven
 * language learning: Metacognitive CQ (awareness of cultural patterns),
 * Cognitive CQ (knowledge of cultural norms), Motivational CQ (interest
 * in cultural engagement), and Behavioral CQ (ability to adapt behavior).
 *
 * In the AAPM, cultural intelligence is NOT supplementary — it is a
 * core competence dimension evaluated alongside linguistic accuracy.
 * A learner who speaks grammatically perfect French but offends every
 * NPC through cultural ignorance will score poorly.
 *
 * @module cultural-intelligence/types
 * @patentCritical The integration of formal CQ assessment into
 *   an AI language learning simulation, where cultural violations
 *   have persistent social consequences (via the reputation system),
 *   is a novel pedagogical mechanism.
 */

// ─── Cultural Intelligence Profile ───────────────────────────

/**
 * Complete Cultural Intelligence profile for a learner.
 */
export interface CulturalIntelligenceProfile {
    /** Learner identifier */
    learnerId: string;

    /** Active persona schema (CQ is persona-specific) */
    personaSchemaId: string;

    /** Assessment timestamp */
    assessedAt: string;

    /** Four-factor CQ scores */
    dimensions: CulturalDimensions;

    /** Overall composite CQ score (0.0 to 1.0) */
    compositeScore: number;

    /** Known cultural norms the learner has demonstrated mastery of */
    masteredNorms: string[];

    /** Cultural norms the learner has violated */
    violatedNorms: CulturalViolation[];

    /** Faux pas history — persistent cultural errors */
    fauxPasHistory: CulturalFauxPas[];

    /** Trajectory over time */
    trajectory: 'improving' | 'stable' | 'declining';
}

/**
 * The four CQ dimensions, each scored independently.
 */
export interface CulturalDimensions {
    /**
     * Metacognitive CQ: Awareness of cultural dynamics.
     * Can the learner DETECT that a cultural norm is in play?
     * Measured by: recognition of register shifts, awareness of
     * power dynamics, ability to anticipate NPC reactions.
     */
    metacognitive: CulturalDimensionScore;

    /**
     * Cognitive CQ: Knowledge of cultural norms.
     * Does the learner KNOW the norms of the target culture?
     * Measured by: correct application of greeting norms, gift-giving,
     * dining etiquette, professional protocol, taboo avoidance.
     */
    cognitive: CulturalDimensionScore;

    /**
     * Motivational CQ: Engagement with cultural learning.
     * Does the learner WANT to engage with cultural differences?
     * Measured by: willingness to attempt unfamiliar social situations,
     * curiosity about NPC cultural context, exploration behavior.
     */
    motivational: CulturalDimensionScore;

    /**
     * Behavioral CQ: Ability to adapt behavior.
     * Can the learner PERFORM culturally appropriate behavior?
     * Measured by: register selection accuracy, non-verbal cue
     * appropriateness (described in text), social ritual execution.
     */
    behavioral: CulturalDimensionScore;
}

/**
 * Score for a single CQ dimension.
 */
export interface CulturalDimensionScore {
    /** Score (0.0 to 1.0) */
    score: number;

    /** Confidence in this assessment */
    confidence: number;

    /** Number of observations contributing to this score */
    observationCount: number;

    /** Trajectory */
    trend: 'improving' | 'stable' | 'declining';

    /** Sub-skills within this dimension */
    subSkills: Array<{
        skill: string;
        score: number;
        observations: number;
    }>;
}

// ─── Cultural Norms System ───────────────────────────────────

/**
 * A cultural norm defined within a persona schema.
 *
 * @patentCritical Cultural norms are not just "facts to learn" — they
 *   are ENFORCED by NPC behavior. Violating a norm triggers a social
 *   friction event with reputation impact, creating consequential
 *   cultural learning.
 */
export interface CulturalNorm {
    /** Unique norm identifier */
    normId: string;

    /** Cultural domain */
    domain: CulturalDomain;

    /** Natural language description of the norm */
    description: string;

    /**
     * The appropriate behavior in this cultural context.
     *
     * Example: "In Italian business meetings, greet everyone individually
     * with a handshake. Using first names before being invited to is
     * considered presumptuous."
     */
    appropriateBehavior: string;

    /**
     * Common violations made by learners from different L1 cultures.
     * Used for predictive detection.
     */
    commonViolations: Array<{
        l1Culture: string;
        typicalViolation: string;
        severity: 'minor' | 'moderate' | 'serious' | 'offensive';
    }>;

    /** Tier where this norm is relevant */
    applicableTiers: Array<1 | 2 | 3>;

    /** Contexts where this norm is active */
    activeContexts: string[];

    /** Reputation impact of violating this norm */
    violationReputationImpact: number;
}

/**
 * Cultural domains for norm classification.
 */
export type CulturalDomain =
    | 'greeting-farewell'     // How to greet and say goodbye
    | 'address-forms'         // Tu/vous, du/Sie, honorifics
    | 'dining-etiquette'      // Table manners, toasting, bill splitting
    | 'gift-giving'           // When, what, how to give gifts
    | 'personal-space'        // Physical distance, touching norms
    | 'time-orientation'      // Punctuality expectations
    | 'conversation-topics'   // Taboo topics, small talk norms
    | 'business-protocol'     // Meeting structure, hierarchy, negotiation
    | 'hospitality'           // Guest/host expectations
    | 'religious-sensitivity' // Religious observance awareness
    | 'humor'                 // What's funny vs. offensive
    | 'conflict-resolution';  // How disagreements are expressed

// ─── Cultural Violations & Faux Pas ─────────────────────────

/**
 * A detected cultural norm violation within a session.
 */
export interface CulturalViolation {
    /** Norm that was violated */
    normId: string;

    /** Session where violation occurred */
    sessionId: string;

    /** What the learner did */
    learnerAction: string;

    /** What was expected */
    expectedAction: string;

    /** NPC who witnessed/experienced the violation */
    witnessNpcId: string;

    /** Severity of the violation */
    severity: 'minor' | 'moderate' | 'serious' | 'offensive';

    /** NPC's reaction */
    npcReaction: string;

    /** Reputation impact applied */
    reputationImpact: number;

    /** Whether the learner attempted to repair the faux pas */
    repairAttempted: boolean;

    /** Whether the repair was successful */
    repairSuccessful: boolean | null;

    /** Timestamp */
    timestamp: string;
}

/**
 * A persistent cultural faux pas — a violation that created
 * lasting social consequences.
 *
 * @patentCritical Persistent cultural consequences create authentic
 *   motivation for cultural learning. The learner can't just "reset"
 *   after a faux pas — they must navigate the social aftermath,
 *   just as they would in real life.
 */
export interface CulturalFauxPas {
    /** Unique faux pas identifier */
    fauxPasId: string;

    /** The original violation */
    violation: CulturalViolation;

    /** NPCs who are aware of this faux pas */
    awareNpcIds: string[];

    /** How this faux pas is affecting ongoing relationships */
    ongoingEffects: string[];

    /** Whether the learner has successfully repaired it */
    resolved: boolean;

    /** How it was resolved (if resolved) */
    resolution?: string;

    /** Cultural learning extracted from this event */
    learningOutcome?: string;
}

// ─── Cultural Adaptation Scoring ─────────────────────────────

/**
 * Per-session cultural adaptation assessment.
 */
export interface CulturalAdaptationScore {
    /** Session identifier */
    sessionId: string;

    /** Norms encountered in this session */
    normsEncountered: string[];

    /** Norms followed correctly */
    normsFollowed: string[];

    /** Norms violated */
    normsViolated: string[];

    /** Context-appropriate adaptations (not just following rules, but adapting) */
    adaptiveBehaviors: AdaptiveBehavior[];

    /** Composite score for this session */
    sessionScore: number;
}

/**
 * An instance where the learner demonstrated cultural adaptability.
 */
export interface AdaptiveBehavior {
    /** What the learner did */
    behavior: string;

    /** Cultural context that prompted it */
    context: string;

    /** Which CQ dimension this demonstrates */
    dimension: 'metacognitive' | 'cognitive' | 'motivational' | 'behavioral';

    /** Quality of the adaptation */
    quality: 'natural' | 'correct-but-stiff' | 'overcorrected' | 'inappropriate';
}
