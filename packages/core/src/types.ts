/**
 * AAPM Core Types
 *
 * Shared type definitions for the entire AAPM Framework.
 *
 * @module types
 */

// ─── Tier System ─────────────────────────────────────────────

export type TierType = 1 | 2 | 3;

export type TierLabel = 'companion' | 'immersion' | 'negotiation';

// ─── Persona Schema ──────────────────────────────────────────

export interface PersonaSchema {
    persona: {
        id: string;
        name: string;
        description?: string;
        learner_profile: LearnerProfile;
        vocabulary_matrix?: VocabularyMatrix;
        environment: Environment;
        companion?: CompanionConfig;
        retention_profile?: RetentionProfile;
        evaluation: EvaluationConfig;
    };
}

export interface LearnerProfile {
    native_language: string;
    target_languages: string[];
    proficiency_baseline: CEFRLevel;
    domain: string;
    objective: string;
}

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface VocabularyMatrix {
    priority_domains: string[];
    cefr_annotations?: boolean;
    excluded_generic?: string[];
}

export interface Environment {
    tier_2: Tier2Config;
    tier_3: Tier3Config;
}

export interface Tier2Config {
    setting: string;
    locations: (string | LocationConfig)[];
    npc_roster?: NPCRosterEntry[];
    cultural_parameters?: CulturalParameters;
}

export interface Tier3Config {
    scenarios: Tier3Scenario[];
}

export interface LocationConfig {
    name: string;
    description?: string;
    npcs?: string[];
    typical_tasks?: string[];
}

export interface NPCRosterEntry {
    role: string;
    count?: number;
    register: string;
    personality?: string;
    vocabulary_focus?: string[];
}

export interface CulturalParameters {
    greeting_norms?: string;
    formality_level?: string;
    taboo_topics?: string[];
}

export interface Tier3Scenario {
    type: string;
    description?: string;
    authority: string;
    stakes: string;
    evaluation_weight?: EvaluationWeights;
}

export interface EvaluationWeights {
    linguistic_accuracy: number;
    pragmatic_appropriateness: number;
    register_alignment: number;
    cultural_intelligence: number;
}

export interface CompanionConfig {
    personality: string;
    shared_interests: string[];
    cultural_bridge: string;
}

export interface RetentionProfile {
    default_style: RetentionStyle;
    async_triggers?: AsyncTrigger[];
}

export type RetentionStyle =
    | 'gamified-coercion'
    | 'organic-social'
    | 'professional-urgency'
    | 'intrinsic-mastery'
    | 'social-accountability';

export interface AsyncTrigger {
    type: string;
    sender?: string;
    frequency?: string;
    trigger?: string;
}

export interface EvaluationConfig {
    tier_2_success: string;
    tier_3_success: string;
    primary_metric: string;
}

// ─── NPC System ──────────────────────────────────────────────

export interface NPCConfig {
    id: string;
    name: string;
    role: string;
    tier: TierType;
    register: string;
    personality: string;
    vocabulary_focus: string[];
    /** Big Five personality profile [0.0, 1.0] per trait — drives NPC behavioral variation */
    big_five?: BigFiveTraits;
    /** Cultural communication defaults — drives register enforcement and directness */
    cultural_overlay?: CulturalOverlayTraits;
    /** Base patience level [0.0, 1.0] — time before NPC escalates or re-prompts */
    patience_level?: number;
}

/** Big Five personality model — each trait is [0.0, 1.0] */
export interface BigFiveTraits {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
}

/** Cultural overlay — modifies NPC communication defaults */
export interface CulturalOverlayTraits {
    communicative_directness: number;
    formality_default: number;
    power_distance_sensitivity: number;
    emotional_expressiveness: number;
}

// ─── Prompt System ───────────────────────────────────────────

export interface ComposedPrompt {
    system: string;
    tier: TierType;
    npcId: string;
    metadata: PromptMetadata;
}

export interface PromptMetadata {
    schemaId: string;
    l2Ratio?: number;
    reputationScore?: number;
    forwardInjection?: ForwardInjectionDirective[];
}

// ─── Session & Context ───────────────────────────────────────

export interface SessionContext {
    sessionId: string;
    learnerId: string;
    npcRelationshipHistory: string;
    codeSwitchRatio: number;
    socialReputation: number;
    forwardInjectionDirectives: ForwardInjectionDirective[];
    upcomingChallenges: string[];
}

export interface RealTimeState {
    currentTurn: number;
    lastUtterance: string;
    interlanguageAssessment: InterlanguageSnapshot;
    activeScaffoldingTriggers: string[];
    detectedEmotionalState: EmotionalState;
}

export interface InterlanguageSnapshot {
    systematicErrors: SystematicError[];
    currentConfidence: number;
    recentFrictionCount: number;
}

export interface SystematicError {
    type: FrictionType;
    pattern: string;
    frequency: number;
}

export type EmotionalState =
    | 'confident'
    | 'neutral'
    | 'uncertain'
    | 'frustrated'
    | 'anxious';

// ─── Feedback Engine ─────────────────────────────────────────

export type FrictionType =
    | 'lexical'
    | 'morphosyntactic'
    | 'phonemic'
    | 'register'
    | 'pragmatic';

export type FrictionSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface FrictionPoint {
    id: string;
    type: FrictionType;
    severity: FrictionSeverity;
    timestamp: string;
    context: FrictionContext;
    analysis: FrictionAnalysis;
    curriculumRecommendation: CurriculumRecommendation;
    recurrence: RecurrenceData;
}

export interface FrictionContext {
    turnsBefore: string;
    frictionTurn: string;
    turnsAfter: string;
    communicativeConsequence: string;
}

export interface FrictionAnalysis {
    whatWentWrong: string;
    l1TransferHypothesis?: string;
    interlanguagePattern: 'systematic' | 'random';
    comprehensibilityImpact: FrictionSeverity;
    socialImpact: string;
}

export interface CurriculumRecommendation {
    priority: 'immediate' | 'soon' | 'reinforcement';
    targetForm: string;
    recommendedFormat: CurriculumFormat;
    forwardInjectionSpec: string;
}

export type CurriculumFormat =
    | 'slideshow'
    | 'video'
    | 'flashcard'
    | 'podcast'
    | 'debrief'
    | 'notebook';

export interface RecurrenceData {
    seenBefore: boolean;
    previousSessions: string[];
    trajectory: 'improving' | 'stable' | 'worsening';
}

export interface ForwardInjectionDirective {
    targetForm: string;
    frictionType: FrictionType;
    injectionMethod: string;
    constraint: string;
}

// ─── Refraction Interface ────────────────────────────────────

export interface RefractionOutput {
    intentAnalysis: string;
    refractions: {
        basic: Refraction;
        native: Refraction;
        formal: Refraction;
    };
    contrastiveNotes: string;
    pronunciationFocus: PronunciationTarget[];
}

export interface Refraction {
    formulation: string;
    register: string;
    explanation: {
        grammar: string;
        vocabulary: string;
        pragmaticEffect: string;
        culturalNotes?: string;
        powerDynamics?: string;
    };
    riskLevel: string;
    suitableFor: string[];
}

export interface PronunciationTarget {
    word: string;
    phonemeChallenge: string;
    guidance: string;
}

// ─── Persistence ─────────────────────────────────────────────

export interface LearnerState {
    learnerId: string;
    matrixCoordinates: { x: number; y: number; z: number };
    phonemeProfile: Map<string, number[]>;
    frictionHistory: FrictionPoint[];
    retentionProfile: RetentionProfile;
    activePersona: string;
}

export interface NPCRelationship {
    npcId: string;
    learnerId: string;
    relationshipScore: number;
    sharedHistory: string;
    lastInteraction: Date;
    socialReputation: number;
    professionalHistory?: string[];
}

export interface SessionRecord {
    sessionId: string;
    tier: TierType;
    personaSchema: string;
    transcript: ConversationTurn[];
    frictionPoints: FrictionPoint[];
    curriculumGenerated?: MicroCurriculum;
    forwardInjectionDirectives: ForwardInjectionDirective[];
    reputationDeltas: Map<string, number>;
}

export interface ConversationTurn {
    speaker: 'learner' | 'npc';
    content: string;
    timestamp: string;
    audioUrl?: string;
}

export interface MicroCurriculum {
    sessionId: string;
    frictionPointIds: string[];
    format: CurriculumFormat;
    content: unknown; // Format-specific content structure
    forwardInjection: ForwardInjectionDirective[];
}
