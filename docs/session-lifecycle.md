# Session Lifecycle — Typed Contracts

> Precise data shapes for every phase of a session: before, during, after, and between sessions.

---

## Pre-Session Context

Assembled by the Pre-Session Context Loader before any NPC interaction.

```typescript
/**
 * The complete context package injected into the simulation
 * at the start of every session.
 *
 * This is the bridge between the Persistence Loop and the
 * current session — it carries forward everything the system
 * knows about this learner into the active interaction.
 */
interface PreSessionContext {
  /** Learner state snapshot */
  learner: {
    id: string;
    cefr: string;
    matrixCoordinates: { x: number; y: number; z: number };
    codeSwitchState: { currentL2Ratio: number; trajectory: string };
    topFrictionAreas: string[];
    phonemePriorities: string[];
    sessionCount: number;
    daysSinceLastSession: number;
    retentionProfile: string;
    preferredCurriculumFormat: string;
  };

  /** Persona configuration */
  persona: {
    id: string;
    domain: string;
    targetLanguage: string;
    nativeLanguage: string;
    vocabularyDomains: Array<{
      name: string;
      priority: 'critical' | 'important' | 'supplementary';
    }>;
  };

  /** Per-NPC briefing packages */
  npcBriefings: Record<string, NPCBriefing>;

  /** Forward injection directives to execute this session */
  injections: Array<{
    targetForm: string;
    method: string;
    targetNpcIds: string[];
    naturalityConstraint: string;
  }>;

  /** Tier recommendation for this session */
  recommendedTier: 1 | 2 | 3;

  /** Session objectives */
  objectives: string[];
}

/**
 * Per-NPC briefing — what each NPC "knows" entering this session.
 */
interface NPCBriefing {
  npcId: string;
  role: string;
  tier: 1 | 2 | 3;
  personality: string;
  reputationScore: number;
  rememberedFacts: Array<{ fact: string; confidence: number }>;
  unresolvedEvents: Array<{ description: string; impact: number }>;
  recentVectorMemories: string[];
  injectionDirectives: string[];
  opennessScore?: number;
}
```

---

## Active Session State

Tracked in real-time during a session. Updated after every utterance.

```typescript
/**
 * Runtime state during an active session.
 * Maintained in memory, persisted on session end.
 */
interface ActiveSessionState {
  /** Session metadata */
  session: {
    id: string;
    learnerId: string;
    personaSchemaId: string;
    startedAt: string;
    currentTier: 1 | 2 | 3;
    currentLocationId: string;
    currentNpcId: string;
  };

  /** Conversation state */
  conversation: {
    turnCount: number;
    turns: ConversationTurn[];
    currentTopicId: string;
    topicsDiscussed: string[];
  };

  /** Real-time friction tracking (Micro-Loop) */
  frictionMonitor: {
    /** Friction events detected so far this session */
    detectedFrictions: Array<{
      turnIndex: number;
      type: string;
      severity: string;
      timestamp: string;
    }>;

    /** Running friction rate (frictions per minute) */
    currentFrictionRate: number;

    /** Whether the learner's affective state suggests intervention */
    interventionNeeded: boolean;

    /** Current emotional state assessment */
    currentAffectiveState: string;
  };

  /** Pronunciation tracking */
  pronunciation: {
    utterancesAnalyzed: number;
    averageComprehensibility: number;
    phonemeIssuesDetected: string[];
  };

  /** Injection tracking */
  injectionStatus: Array<{
    targetForm: string;
    status: 'pending' | 'opportunity-created' | 'learner-used' | 'deferred';
    npcId?: string;
  }>;

  /** Reputation deltas accumulated this session */
  reputationDeltas: Array<{
    npcId: string;
    delta: number;
    reason: string;
    turnIndex: number;
  }>;

  /** Refraction sessions opened during this session */
  refractionSessions: Array<{
    triggerTurnIndex: number;
    selectedLevel: string | null;
    pronunciationAttempted: boolean;
    usedInConversation: boolean;
  }>;

  /** Tier 3 specific: openness tracking per authority NPC */
  opennessTracking?: Record<string, {
    currentScore: number;
    violations: Array<{ description: string; penalty: number }>;
    collapsed: boolean;
  }>;
}
```

---

## Post-Session Exhaust

Complete data output of a session, written to persistence.

```typescript
/**
 * Everything produced by a session, ready for the Macro-Loop pipeline.
 */
interface PostSessionExhaust {
  /** The complete session record */
  sessionRecord: {
    sessionId: string;
    learnerId: string;
    personaSchemaId: string;
    activeTiers: number[];
    startedAt: string;
    endedAt: string;
    durationMinutes: number;
    endReason: string;
    conversations: SessionConversation[];
    pronunciationData: PronunciationSessionData[];
    metrics: SessionMetrics;
  };

  /** Raw friction detections from the Micro-Loop */
  rawFrictionDetections: Array<{
    turnIndex: number;
    type: string;
    severity: string;
    rawUtterance: string;
    contextWindow: ConversationTurn[];
  }>;

  /** Reputation changes to persist */
  reputationUpdates: Array<{
    npcId: string;
    newScore: number;
    deltas: Array<{ delta: number; reason: string }>;
  }>;

  /** New vector memories to store */
  newMemories: Array<{
    npcId: string;
    content: string;
    emotionalValence: number;
    importance: number;
  }>;

  /** Injection execution results */
  injectionResults: Array<{
    targetForm: string;
    executed: boolean;
    learnerUsedTargetForm: boolean;
  }>;

  /** Refraction interaction data */
  refractionData: Array<{
    selectedLevel: string | null;
    pronunciationAttempted: boolean;
    accuracy?: number;
    usedInConversation: boolean;
  }>;
}
```

---

## Inter-Session Persistence

What survives between sessions — the "save file" that makes each session aware of all previous sessions.

```typescript
/**
 * Data that persists between sessions, enabling
 * the Persistence Loop to function.
 */
interface InterSessionPersistence {
  /** Updated learner profile (always written) */
  learnerProfile: {
    currentCEFR: string;
    matrixCoordinates: { x: number; y: number; z: number };
    codeSwitchingState: { currentL2Ratio: number; trajectory: string };
    phonemeProfile: { accuracyMap: Record<string, number[]> };
    frictionProfile: { dominantTypes: string[]; trend: string };
    retentionProfile: { style: string; engagement: EngagementMetrics };
    instructionalPreferences: InstructionalPreferences;
    totalSessionCount: number;
    lastSessionAt: string;
  };

  /** Updated NPC relationships (written per NPC interacted with) */
  npcRelationships: Record<string, {
    reputationScore: number;
    rememberedFacts: Array<{ fact: string; confidence: number }>;
    unresolvedEvents: SocialFrictionEvent[];
    professionalHistory: ProfessionalEvent[];
    interactionCount: number;
    lastInteractionAt: string;
    opennessScore?: number;
  }>;

  /** Vector memory entries (written to vector DB) */
  vectorMemories: Array<{
    npcId: string;
    content: string;
    embedding: number[];
    emotionalValence: number;
    importance: number;
  }>;

  /** Pending forward injections (written to injection store) */
  pendingInjections: ForwardInjectionSpec[];

  /** Generated micro-curriculum (written to curriculum store) */
  pendingCurriculum?: MicroCurriculum;

  /** Scheduled async triggers (written to trigger queue) */
  scheduledTriggers: ScheduledTrigger[];

  /** Interlanguage model updates (written to profile) */
  interlanguageUpdate: {
    confirmedRules: string[];
    violatedRules: string[];
    emergingRules: string[];
    fossilizingRules: string[];
  };
}
```

---

## Session Metrics Computation

How each metric is calculated from raw session data.

| Metric | Formula | Data Source |
|--------|---------|-------------|
| **Friction Rate** | `frictionCount / sessionDurationMinutes` | `rawFrictionDetections` |
| **Code-Switch Ratio** | `l1Words / totalWords` (Tier 1 only) | Transcript word-level analysis |
| **Task Completion Rate** | `completedTasks / attemptedTasks` (Tier 2) | NPC interaction outcomes |
| **Register Accuracy** | `correctRegisterTurns / totalTurns` (Tier 3) | Register classifier |
| **Comprehensibility** | `mean(utteranceComprehensibilityScores)` | PAE pipeline |
| **Words Per Minute** | `totalWords / speakingTimeMinutes` | ASR timestamps |
| **Recovery Rate** | `recoveredFrictions / totalFrictions` | Friction outcome tracking |
| **Reputation Delta** | `sum(reputationDeltas)` per NPC | Micro-Loop reputation updates |
