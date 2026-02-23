/**
 * AAPM Refraction Interface — Type Definitions
 *
 * Data model for the Tri-Refraction system: Basic / Native / Formal
 * parallel formulations with explanatory metadata.
 *
 * @module refraction/types
 * @patentCritical The Tri-Refraction Interface is a novel method
 *   for presenting learners with register-stratified alternative
 *   formulations that include metalinguistic explanation, enabling
 *   conscious register selection for different social contexts.
 */

// ─── Refraction System ───────────────────────────────────────

/**
 * Input to the Refraction Engine.
 *
 * Triggered when the learner needs help expressing something.
 * Can be user-initiated (pressing a "help" button) or system-initiated
 * (detected by the Micro-Loop when the learner stalls).
 */
export interface RefractionRequest {
    /** How the refraction was triggered */
    trigger: 'user-initiated' | 'system-detected';

    /** The learner's attempted or intended message */
    learnerInput: string;

    /** Language of the learner's input (may be L1 or rough L2) */
    inputLanguage: string;

    /** Target language for the refractions */
    targetLanguage: string;

    /** Learner's native language (for contrastive explanation) */
    nativeLanguage: string;

    /** Current CEFR level */
    cefrLevel: string;

    /** Current tier context */
    tierContext: 1 | 2 | 3;

    /** Current NPC and conversation context */
    conversationContext: {
        npcId: string;
        npcRole: string;
        npcRegister: string;
        recentTurns: Array<{ speaker: string; content: string }>;
    };

    /** Active domain from persona schema */
    domainContext: string;

    /** Active persona schema ID */
    personaSchemaId: string;

    /** Session ID for tracking */
    sessionId: string;
}

/**
 * Complete output of the Refraction Engine.
 *
 * @patentCritical The three-level parallel formulation with
 *   metalinguistic explanation is the core novel contribution.
 */
export interface RefractionResponse {
    /** Analysis of what the learner is trying to communicate */
    intentAnalysis: string;

    /** The three parallel formulations */
    refractions: {
        basic: Refraction;
        native: Refraction;
        formal: Refraction;
    };

    /** Contrastive notes explaining when to use each */
    contrastiveNotes: string;

    /** Pronunciation targets for key words across the refractions */
    pronunciationFocus: PronunciationTarget[];

    /** Processing metadata */
    metadata: RefractionMetadata;
}

/**
 * A single refraction — one register-level formulation.
 *
 * @patentCritical Each refraction includes not just the formulation
 *   but WHY it's structured that way, enabling the learner to develop
 *   metalinguistic awareness of register selection.
 */
export interface Refraction {
    /** The formulation in the target language */
    formulation: string;

    /** Register label */
    register: string;

    /** Detailed explanation of linguistic choices */
    explanation: RefractionExplanation;

    /** Sociolinguistic risk level of using this formulation */
    riskLevel: 'zero' | 'low' | 'context-dependent' | 'high';

    /** Which tiers/contexts this formulation is suitable for */
    suitableFor: string[];

    /** Audio model URL for pronunciation practice */
    audioModelUrl?: string;
}

/**
 * Metalinguistic explanation for a refraction.
 *
 * Explains WHY each linguistic choice was made, enabling
 * the learner to generalize the register distinction to
 * new situations rather than just memorizing this one.
 */
export interface RefractionExplanation {
    /** Why this grammar was chosen (tense, mood, voice) */
    grammar: string;

    /** Why these vocabulary items were selected */
    vocabulary: string;

    /** What social effect this formulation produces */
    pragmaticEffect: string;

    /** Cultural context that informs this formulation (Native/Formal) */
    culturalNotes?: string;

    /** How this navigates power dynamics (Formal only) */
    powerDynamics?: string;
}

/**
 * A pronunciation target highlighted from the refractions.
 */
export interface PronunciationTarget {
    /** The word or phrase to practice */
    word: string;

    /** Specific phoneme challenge for this learner's L1 */
    phonemeChallenge: string;

    /** Brief articulatory guidance */
    guidance: string;

    /** Audio URL for reference pronunciation */
    audioUrl?: string;
}

/**
 * Metadata about the refraction processing.
 */
export interface RefractionMetadata {
    /** Processing time in milliseconds */
    processingTimeMs: number;

    /** LLM model used for generation */
    modelUsed: string;

    /** Confidence in the refractions */
    confidence: number;

    /** Whether domain-specific vocabulary was used */
    domainVocabUsed: boolean;
}

// ─── Refraction Session State ────────────────────────────────

/**
 * State of a refraction interaction session.
 *
 * Tracks what the learner does with the refractions:
 * which they select, whether they practice pronunciation,
 * which formulation they actually use in conversation.
 */
export interface RefractionSession {
    /** Unique session identifier */
    refractionId: string;

    /** The request that initiated this refraction */
    request: RefractionRequest;

    /** The generated response */
    response: RefractionResponse;

    /** Which refraction the learner selected (if any) */
    selectedLevel?: 'basic' | 'native' | 'formal';

    /** Whether the learner recorded a pronunciation attempt */
    pronunciationAttempted: boolean;

    /** Pronunciation comparison result, if attempted */
    pronunciationResult?: PronunciationComparisonResult;

    /** Whether the learner used the selected refraction in conversation */
    usedInConversation: boolean;

    /** Whether the refraction was used correctly in context */
    usedAppropriately?: boolean;

    /** Duration the learner spent on the refraction interface */
    dwellTimeMs: number;

    /** Timestamp */
    timestamp: string;
}

/**
 * Result of comparing the learner's pronunciation recording
 * against the refraction's audio model.
 */
export interface PronunciationComparisonResult {
    /** Overall accuracy score */
    overallAccuracy: number;

    /** Per-word accuracy breakdown */
    wordAccuracy: Array<{
        word: string;
        accuracy: number;
        phonemesCorrect: number;
        phonemesTotal: number;
    }>;

    /** Comprehensibility score for this utterance */
    comprehensibilityScore: number;

    /** Specific feedback for improvement */
    feedback: string;
}
