/**
 * AAPM Persistence Layer — Type Definitions
 *
 * Data models for long-term storage: vector memory, session records,
 * social reputation, learner profiles, and async engagement.
 *
 * The Persistence Loop is the longest-temporal feedback mechanism
 * in the AAPM — it transforms the application from a series of
 * discrete sessions into a persistent social world.
 *
 * @module persistence/types
 * @patentCritical This module defines the data architecture for:
 *   - Vectorized NPC memory (semantic relationship continuity)
 *   - Social Reputation System (invisible, NPC-internal scoring)
 *   - Asynchronous Engagement Queue (out-of-app triggers)
 */

import type { FrictionPoint, ForwardInjectionSpec, CurriculumFormat, MicroCurriculum } from '../feedback-engine/types';

// ─── Learner Profile ─────────────────────────────────────────

/**
 * Complete learner state persisted across all sessions.
 *
 * This is the "player save file" — everything the system knows
 * about this learner, their progress, and their preferences.
 */
export interface LearnerProfile {
    /** Unique learner identifier */
    learnerId: string;

    /** Profile creation timestamp */
    createdAt: string;

    /** Last session timestamp */
    lastSessionAt: string;

    /** Total number of sessions completed */
    totalSessionCount: number;

    /**
     * Three-axis matrix coordinates representing the learner's
     * current position in the AAPM learning space.
     *
     * Axis X: Linguistic Granularity (0.0 = beginner → 1.0 = native-like)
     * Axis Y: Situational Agency (0.0 = Tier 1 only → 1.0 = Tier 3 mastery)
     * Axis Z: Retention fit score (0.0 = disengaged → 1.0 = highly engaged)
     */
    matrixCoordinates: ThreeAxisCoordinates;

    /** Current CEFR level assessment */
    currentCEFR: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

    /** Active persona schema ID */
    activePersonaId: string;

    /** The learner's phoneme accuracy profile */
    phonemeProfile: PhonemeProfile;

    /** Aggregated friction history for pattern analysis */
    frictionProfile: FrictionProfile;

    /** Axis Z retention configuration */
    retentionProfile: LearnerRetentionProfile;

    /** Instructional preferences learned from lesson engagement */
    instructionalPreferences: InstructionalPreferences;

    /** Code-switching state for Tier 1 interactions */
    codeSwitchingState: CodeSwitchingState;

    /** Onboarding completion state */
    onboardingState: OnboardingState;
}

/**
 * Three-axis coordinate system for learner positioning.
 */
export interface ThreeAxisCoordinates {
    /** Axis X: Linguistic Granularity (phoneme → morphosyntax → pragmatics) */
    x: number;
    /** Axis Y: Situational Agency (Companion → Immersion → Negotiation) */
    y: number;
    /** Axis Z: Retention engagement fit */
    z: number;
}

/**
 * Learner's phoneme accuracy across the target language inventory.
 */
export interface PhonemeProfile {
    /** Map of phoneme IPA symbol → accuracy history (0.0 to 1.0 per session) */
    accuracyMap: Record<string, number[]>;

    /** Phonemes flagged as comprehensibility-critical */
    criticalPhonemes: string[];

    /** Phonemes where the learner consistently scores high */
    masteredPhonemes: string[];

    /** Overall comprehensibility score (probability native would understand) */
    comprehensibilityScore: number;
}

/**
 * Aggregated friction tendencies across all sessions.
 */
export interface FrictionProfile {
    /** Most common friction types, ordered by frequency */
    dominantTypes: Array<{ type: string; frequency: number }>;

    /** Linguistic areas showing improvement */
    improvingAreas: string[];

    /** Linguistic areas showing stagnation (fossilization risk) */
    stagnantAreas: string[];

    /** Total friction points across all sessions */
    lifetimeFrictionCount: number;

    /** Overall friction rate trend */
    frictionRateTrend: 'decreasing' | 'stable' | 'increasing';
}

/**
 * Learner-specific retention configuration.
 */
export interface LearnerRetentionProfile {
    /** Selected Axis Z profile */
    style: 'gamified-coercion' | 'organic-social' | 'professional-urgency' | 'intrinsic-mastery' | 'social-accountability';

    /** Preferred session frequency */
    preferredFrequency: 'daily' | 'every-other-day' | 'weekly' | 'custom';

    /** Preferred session duration in minutes */
    preferredDurationMinutes: number;

    /** Whether async triggers are enabled */
    asyncTriggersEnabled: boolean;

    /** Preferred notification times (hours in 24h format) */
    preferredNotificationHours: number[];
}

/**
 * Learned instructional delivery preferences.
 */
export interface InstructionalPreferences {
    /** Preferred curriculum format */
    preferredFormat: CurriculumFormat;

    /** Prefers detailed or concise explanations */
    explanationDepth: 'detailed' | 'standard' | 'concise';

    /** Engages with audio content */
    engagesAudio: boolean;

    /** Engages with video content */
    engagesVideo: boolean;

    /** Completes exercises */
    completesExercises: boolean;

    /** Average lesson completion rate */
    averageCompletionRate: number;
}

/**
 * Code-switching gradient state for Tier 1 interactions.
 */
export interface CodeSwitchingState {
    /** Current target L2 ratio (0.0 to 1.0) */
    currentL2Ratio: number;

    /** L2 ratio history over time (per session) */
    ratioHistory: Array<{ sessionId: string; ratio: number }>;

    /** Whether the gradient is advancing, stalled, or regressing */
    trajectory: 'advancing' | 'stalled' | 'regressing';
}

/**
 * Onboarding completion state.
 */
export interface OnboardingState {
    /** Whether onboarding is complete */
    completed: boolean;

    /** Steps completed */
    stepsCompleted: string[];

    /** Initial proficiency assessment result */
    initialAssessment?: {
        assessedCEFR: string;
        assessmentMethod: 'self-report' | 'placement-test' | 'conversation-sample';
        confidence: number;
    };
}

// ─── NPC Relationship State ──────────────────────────────────

/**
 * Complete relationship state between a learner and an NPC.
 *
 * @patentCritical The Social Reputation System uses an invisible,
 *   multi-dimensional scoring model that governs NPC behavior.
 *   Unlike gamification scores, this is NPC-internal and never
 *   directly visible to the learner.
 */
export interface NPCRelationshipState {
    /** NPC identifier */
    npcId: string;

    /** Learner identifier */
    learnerId: string;

    /** NPC's role (e.g., "teammate", "shopkeeper", "consultant") */
    npcRole: string;

    /** Which tier this NPC belongs to */
    tier: 1 | 2 | 3;

    /**
     * Social Reputation Score: -1.0 (hostile) to 1.0 (trusted)
     *
     * This score is INVISIBLE to the learner. It governs NPC behavior:
     * - Below -0.5: Cool, minimal helpfulness, short responses
     * - -0.5 to 0.0: Neutral, standard service
     * - 0.0 to 0.5: Friendly, willing to help, offers information
     * - Above 0.5: Warm, goes out of way to help, offers deals/tips
     *
     * @patentCritical The use of an invisible social score to modulate
     *   NPC behavior in a language learning simulation is a novel
     *   mechanism for creating consequential communication.
     */
    reputationScore: number;

    /** History of reputation score changes with reasons */
    reputationHistory: ReputationDelta[];

    /**
     * Semantic embedding of the relationship's shared history.
     *
     * Stored as a vector in the vector database. Used for NPC
     * memory retrieval: "Remember when we talked about X?"
     */
    sharedHistoryEmbeddingId: string;

    /** Key facts and events the NPC remembers about the learner */
    rememberedFacts: RememberedFact[];

    /** Total number of interactions with this NPC */
    interactionCount: number;

    /** Timestamp of last interaction */
    lastInteractionAt: string;

    /** For Tier 2: unresolved social friction events */
    unresolvedFrictionEvents: SocialFrictionEvent[];

    /** For Tier 3: professional negotiation history */
    professionalHistory: ProfessionalEvent[];

    /**
     * Openness score for Tier 3 NPCs.
     *
     * Starts at 0.7 per session. Each register violation reduces it by 0.1.
     * Below 0.3: resistant, shorter answers, less cooperative.
     * Below 0.1: Negotiation Collapse — interaction terminated.
     */
    opennessScore?: number;
}

/**
 * A change in reputation score with the reason.
 */
export interface ReputationDelta {
    /** Timestamp of the change */
    timestamp: string;

    /** Session ID where the change occurred */
    sessionId: string;

    /** Change amount (+/- value) */
    delta: number;

    /** What caused the change */
    reason: string;

    /** New reputation score after this change */
    newScore: number;
}

/**
 * A fact that an NPC remembers about the learner.
 */
export interface RememberedFact {
    /** What the NPC remembers */
    fact: string;

    /** When this was first mentioned */
    learnedAt: string;

    /** How confidently the NPC remembers (decays over time without reinforcement) */
    confidence: number;

    /** Category of the fact */
    category: 'personal' | 'professional' | 'preference' | 'event' | 'commitment';
}

/**
 * A Social Friction Event from Tier 2 — a persistent consequence
 * of communicative failure that must be repaired.
 */
export interface SocialFrictionEvent {
    /** Unique event identifier */
    eventId: string;

    /** What happened */
    description: string;

    /** When it occurred */
    createdAt: string;

    /** Whether it has been resolved */
    resolved: boolean;

    /** If resolved, how it was resolved */
    resolution?: string;

    /** Impact on reputation score */
    reputationImpact: number;
}

/**
 * A professional event from Tier 3 — things the authority NPC
 * remembers about the learner's professional interactions.
 */
export interface ProfessionalEvent {
    /** Event type */
    type: 'proposal' | 'commitment' | 'negotiation-outcome' | 'register-violation';

    /** Description of the event */
    description: string;

    /** When it occurred */
    timestamp: string;

    /** Outcome of the event */
    outcome: 'positive' | 'neutral' | 'negative';
}

// ─── Vector Memory Store ─────────────────────────────────────

/**
 * Entry in the vector database for NPC semantic memory.
 *
 * @patentCritical Vectorized relationship memory enables NPCs to
 *   retrieve semantically similar past interactions, providing
 *   relationship continuity that goes beyond keyword matching.
 */
export interface VectorMemoryEntry {
    /** Unique entry identifier */
    entryId: string;

    /** The NPC this memory belongs to */
    npcId: string;

    /** The learner this memory is about */
    learnerId: string;

    /** Session where this memory was created */
    sessionId: string;

    /** Timestamp of the memory */
    timestamp: string;

    /** Natural language summary of the memory */
    content: string;

    /** Vector embedding of the content (dimensions depend on model) */
    embedding: number[];

    /** Metadata tags for filtering */
    tags: string[];

    /** Emotional valence of the memory (-1.0 negative to 1.0 positive) */
    emotionalValence: number;

    /** How important this memory is (affects retrieval priority) */
    importance: number;

    /** Whether this memory has decayed below retrieval threshold */
    decayed: boolean;
}

// ─── Session Store ───────────────────────────────────────────

/**
 * Complete record of a single session, stored for pipeline processing
 * and longitudinal analysis.
 */
export interface SessionRecord {
    /** Unique session identifier */
    sessionId: string;

    /** Learner who completed this session */
    learnerId: string;

    /** Persona schema active during this session */
    personaSchemaId: string;

    /** Tier(s) active during this session */
    activeTiers: Array<1 | 2 | 3>;

    /** Session start timestamp */
    startedAt: string;

    /** Session end timestamp */
    endedAt: string;

    /** Duration in minutes */
    durationMinutes: number;

    /** How the session ended */
    endReason: 'learner-ended' | 'time-limit' | 'natural-conclusion' | 'system-error' | 'inactivity-timeout';

    /** Complete transcript of all conversations */
    conversations: SessionConversation[];

    /** Friction points extracted by the Macro-Loop */
    frictionPoints: FrictionPoint[];

    /** Pronunciation analysis data from the PAE */
    pronunciationData: PronunciationSessionData[];

    /** Micro-curriculum generated from this session */
    generatedCurriculum?: MicroCurriculum;

    /** Forward injection directives produced */
    forwardInjectionDirectives: ForwardInjectionSpec[];

    /** Social reputation changes during this session */
    reputationDeltas: Array<{ npcId: string; delta: number; reason: string }>;

    /** Session-level metrics */
    metrics: SessionMetrics;
}

/**
 * A conversation within a session (learner may interact with multiple NPCs).
 */
export interface SessionConversation {
    /** NPC involved */
    npcId: string;

    /** Location of the conversation */
    locationId: string;

    /** Tier of the conversation */
    tier: 1 | 2 | 3;

    /** Ordered turns in the conversation */
    turns: Array<{
        speaker: 'learner' | 'npc';
        content: string;
        timestamp: string;
        durationMs: number;
        audioUrl?: string;
    }>;

    /** How the conversation ended */
    outcome: 'completed-successfully' | 'friction-event' | 'abandoned' | 'npc-ended';
}

/**
 * Pronunciation data collected during a session.
 */
export interface PronunciationSessionData {
    /** The word or phrase analyzed */
    targetPhrase: string;

    /** Phoneme-level breakdown */
    phonemeResults: Array<{
        phoneme: string;
        accuracy: number;
        cosineSimilarity: number;
    }>;

    /** Overall comprehensibility score for this utterance */
    comprehensibilityScore: number;
}

/**
 * Quantitative metrics computed for a single session.
 */
export interface SessionMetrics {
    /** Task completion rate (for Tier 2) */
    taskCompletionRate?: number;

    /** Friction points per minute */
    frictionRate: number;

    /** Code-switch ratio (for Tier 1) */
    codeSwitchRatio?: number;

    /** Register accuracy score (for Tier 3) */
    registerAccuracyScore?: number;

    /** Comprehensibility score (average across utterances) */
    averageComprehensibility: number;

    /** Words per minute */
    wordsPerMinute: number;

    /** Total learner speaking time in seconds */
    totalSpeakingTimeSeconds: number;
}

// ─── Async Engagement Queue ──────────────────────────────────

/**
 * An entry in the asynchronous engagement queue.
 *
 * These are out-of-app triggers designed to extend the simulation
 * world beyond session boundaries: NPC messages, reminders,
 * achievement alerts, deadline notifications.
 *
 * @patentCritical The async engagement system is calibrated to
 *   the learner's Axis Z retention profile, ensuring that
 *   engagement mechanisms match individual psychology.
 */
export interface AsyncEngagementEntry {
    /** Unique entry identifier */
    entryId: string;

    /** Learner to receive the engagement */
    learnerId: string;

    /** Type of engagement trigger */
    type: 'npc-message' | 'achievement-alert' | 'deadline-reminder' | 'challenge-unlock' | 'scenario-reminder' | 'streak-alert';

    /** Who the notification appears to be from */
    sender: string;

    /** Content of the notification */
    content: string;

    /** Scheduled delivery time */
    scheduledAt: string;

    /** Whether this has been delivered */
    delivered: boolean;

    /** Whether the learner engaged with it (opened, responded, etc.) */
    engaged?: boolean;

    /** The Axis Z profile that generated this trigger */
    retentionProfile: string;

    /** Priority: higher priority entries are delivered first */
    priority: number;

    /** Expiry: when this entry becomes stale */
    expiresAt: string;
}
