# AAPM Technical Architecture

> System architecture overview for the Autonomous Adaptive Pedagogical Matrix.

---

## System Modules

| Module | Function | Key Technologies |
| -------- | ---------- | -------------------- |
| **Simulation Engine** | 3D environments, NPC movement, spatial audio | Unity URP / Three.js / Web |
| **Agent Intelligence Layer** | NPC persona management, dialogue, tier behavior | LLM (GPT-4o / Claude), LangChain, Prompt Stack |
| **Recursive Feedback Engine** | Friction extraction, curriculum generation, forward injection | Custom LLM pipeline, vector similarity |
| **Phoneme Alignment Engine** | Real-time ASR, phoneme comparison, heatmap, scoring | Wav2Vec 2.0 / Azure Speech SDK |
| **Interlanguage Hypothesis Engine** | Probabilistic grammar model, developmental staging, L1 transfer, prediction | Custom rule engine, Bayesian updates |
| **Anti-Fossilization Engine** | Fossilization detection, multi-strategy intervention, defossilization tracking | IHE integration, NPC coordination |
| **Cultural Intelligence Model** | CQ assessment, norm enforcement, faux pas tracking, adaptation scoring | Schema-driven norms, reputation linkage |
| **Collaboration & Enterprise** | Instructor dashboards, cohorts, learning objectives, collaborative sessions | REST API, WebSocket, role-based access |
| **Persistence & Memory** | Long-term NPC memory, social reputation, cross-session state, schema transfer | Vector DB, PostgreSQL, Redis |
| **Interface Layer** | Comprehension UI, production UI, lessons, async engagement | React / React Native, WebRTC |

---

## Data Flow — The Five-Stage Cycle

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Stage 1: PRE-SESSION CONTEXT LOADING                       │
│  ┌───────────────────────────────────────────┐              │
│  │ Query Persistence Layer for:               │              │
│  │ • Three-axis matrix coordinates            │              │
│  │ • Social Reputation scores                 │              │
│  │ • Priority topics from last Macro-Loop     │              │
│  │ • NPC relationship states                  │              │
│  │ • Pending async engagement triggers        │              │
│  │ • Interlanguage Grammar snapshot (IHE)     │              │
│  │ • Fossilization profile (AFE)              │              │
│  │ • Cultural Intelligence profile (CQ)       │              │
│  │ • NPC personality × mood states            │              │
│  │ • Cross-schema transfer adjustments        │              │
│  └────────────────────┬──────────────────────┘              │
│                       ▼                                      │
│  Stage 2: ACTIVE SESSION PROCESSING                         │
│  ┌───────────────────────────────────────────┐              │
│  │ Real-time parallel processing:             │              │
│  │ • Audio → Phoneme Alignment Engine         │              │
│  │ • Text → Agent Intelligence Layer (NPC)    │              │
│  │ • All input → Friction Monitor (RFE)       │              │
│  │ • Friction events logged to Session Store  │              │
│  │ • Affective State Inference (6 signals)    │              │
│  │ • Communicative Pressure Calibration       │              │
│  │ • Conversational Repair Tracking           │              │
│  │ • Lexical Availability monitoring          │              │
│  │ • Cultural norm compliance checking        │              │
│  └────────────────────┬──────────────────────┘              │
│                       ▼                                      │
│  Stage 3: POST-SESSION EXTRACTION                           │
│  ┌───────────────────────────────────────────┐              │
│  │ Macro-Loop 5-Phase Pipeline:               │              │
│  │ Phase 1: Friction Point Extraction         │              │
│  │ Phase 2: Pattern Classification            │              │
│  │ Phase 3: Micro-Curriculum Generation       │              │
│  │ Phase 4: Adaptive Lesson Feedback          │              │
│  │ Phase 5: Forward Injection Directives      │              │
│  │                                            │              │
│  │ IHE Post-Session Processing:               │              │
│  │ • Update hypothesis rules from evidence    │              │
│  │ • Recompute developmental stage            │              │
│  │ • Generate next-session predictions        │              │
│  │ • Detect fossilization candidates          │              │
│  └────────────────────┬──────────────────────┘              │
│                       ▼                                      │
│  Stage 4: MICRO-CURRICULUM DELIVERY                         │
│  ┌───────────────────────────────────────────┐              │
│  │ Deliver in learner's preferred format:     │              │
│  │ • Interactive Slideshow                    │              │
│  │ • AI-Generated Video Dialogue              │              │
│  │ • Spaced Repetition Flashcards             │              │
│  │ • Audio Podcast Summary                    │              │
│  │ • Conversational Debrief (with Companion)  │              │
│  │ • Notebook-Style Summary                   │              │
│  └────────────────────┬──────────────────────┘              │
│                       ▼                                      │
│  Stage 5: PERSISTENCE LAYER UPDATE                          │
│  ┌───────────────────────────────────────────┐              │
│  │ Write to persistence:                      │              │
│  │ • Performance metrics                      │              │
│  │ • Friction point patterns                  │              │
│  │ • Lesson engagement data                   │              │
│  │ • Social Reputation deltas                 │              │
│  │ • Relationship state updates               │              │
│  │ • Matrix coordinate updates                │              │
│  │ • Async trigger scheduling                 │              │
│  │ • Interlanguage Grammar evolution events   │              │
│  │ • Fossilization profile updates            │              │
│  │ • CQ score updates + faux pas tracking     │              │
│  │ • NPC mood state persistence               │              │
│  │ • Repair competence profile updates        │              │
│  │ • Lexical availability index updates       │              │
│  │ • Affective calibration baseline updates   │              │
│  └───────────────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Interlanguage Hypothesis Engine — Processing Pipeline

```text
Learner Production (every turn)
        │
        ▼
┌──────────────────────┐
│ 1. RULE MATCHING     │  Compare production against hypothesized rules
│                      │  → Does this match a predicted pattern?
└─────────┬────────────┘
          ▼
┌──────────────────────┐
│ 2. EVIDENCE LOGGING  │  Record as confirmation, violation, or novel evidence
│                      │  → Log communicative pressure, tier, context
└─────────┬────────────┘
          ▼
┌──────────────────────┐
│ 3. CONFIDENCE UPDATE │  Bayesian update to rule confidence scores
│                      │  → ≥0.7 = systematic rule; <0.5 = random error
└─────────┬────────────┘
          ▼
┌──────────────────────┐
│ 4. TRAJECTORY CALC   │  Compute per-rule trajectory over session window
│                      │  → acquiring / stable-correct / stable-incorrect /
│                      │    regressing / fluctuating
└─────────┬────────────┘
          ▼
┌──────────────────────┐
│ 5. FRONTIER DETECT   │  Identify rules on the Learning Frontier
│                      │  → These are the highest-value teaching targets
└─────────┬────────────┘
          ▼
┌──────────────────────┐
│ 6. PREDICTION GEN    │  Generate predictions for next interaction
│                      │  → Feed to Forward Injection for proactive support
└──────────────────────┘
```

---

## Affective State Inference — Signal Processing

```text
Per-Turn Signal Extraction
        │
        ├── Response Latency (ms)
        ├── L1 Fallback Rate (0.0-1.0)
        ├── Hedging Frequency
        ├── Pause Duration (ms)
        ├── Topic Avoidance Rate
        └── Repair Attempt Rate
        │
        ▼
┌──────────────────────┐
│ BASELINE COMPARISON  │  Compare against per-learner calibrated baselines
│                      │  (Bayesian-updated from first 3-5 sessions)
└─────────┬────────────┘
          ▼
┌──────────────────────┐
│ STATE INFERENCE      │  Classify: confident / engaged / uncertain /
│                      │  frustrated / anxious / disengaged / amused /
│                      │  determined / overwhelmed
└─────────┬────────────┘
          ▼
┌──────────────────────┐
│ ESCALATION CHECK     │  Does this state require scaffolding escalation?
│                      │  → frustrated + high pressure → escalate
│                      │  → anxious + Tier 3 → activate companion
└──────────────────────┘
```

---

## NPC Prompt Architecture — 4-Layer Stack

```text
┌─────────────────────────────────────────┐
│ Layer 4: REAL-TIME STATE                │
│ Current turn, interlanguage assessment, │
│ active scaffolding triggers,            │
│ affective state, pressure level,        │
│ NPC mood state, cultural norm context   │
├─────────────────────────────────────────┤
│ Layer 3: SESSION CONTEXT                │
│ Relationship state, shared history,     │
│ Forward Injection directives, tier      │
│ objective parameters, CQ profile,       │
│ fossilization targets, repair history   │
├─────────────────────────────────────────┤
│ Layer 2: PERSONA SCHEMA INJECTION       │
│ Domain vocabulary, cultural behaviors,  │
│ professional context from active schema,│
│ NPC personality model, cultural norms   │
├─────────────────────────────────────────┤
│ Layer 1: BASE SYSTEM PROMPT             │
│ NPC identity, language capabilities,    │
│ tier type, Big Five personality traits,  │
│ consistency constraints, verbal tics    │
└─────────────────────────────────────────┘
```

### Tier-Specific Behavior Parameters

| Parameter | Tier 1 (Companion) | Tier 2 (Immersion) | Tier 3 (Negotiation) |
| ----------- | ------------------- | ------------------- | --------------------- |
| Patience | Infinite wait | Realistic timing | Normal + register tracking |
| Error Response | Recast naturally | Repeat once, then move on | Track violations, reduce openness |
| Scaffolding | Proactive, constant | Minimal, realistic | None — sink or swim |
| L1 Tolerance | Managed gradient | Zero | Zero |
| Failure State | None | Social Friction Event | Negotiation Collapse |
| Adaptive Pressure | Gradual | Responsive | Aggressive |
| CQ Evaluation | None | Minor weight | Major weight |
| NPC Mood Effect | Always warm | Varies by mood | Professional, strict |

---

## Cross-Module Integration Map

```text
┌──────────────┐
│     IHE      │──── predictions ────→ Forward Injection
│              │──── trajectory ─────→ AFE (fossilization detection)
│              │←─── repair data ────  Repair Tracking
└──────┬───────┘
       │ grammar events
       ▼
┌──────────────┐     strategies     ┌──────────────┐
│     AFE      │──── NPC targets ──→│ NPC Pipeline │
│              │                    │              │
└──────────────┘                    │  Personality │
                                    │  × Mood      │
┌──────────────┐     violations     │  × Reputation│
│  CQ Model    │──── rep deltas ──→│  = Behavior  │
│              │                    └──────────────┘
└──────────────┘
       ▲ norm context
       │
┌──────────────┐     pressure      ┌──────────────┐
│  Affective   │──── adjustment ──→│   Pressure   │
│  Inference   │                   │  Calibrator  │──→ Tier Manager
│              │                   └──────────────┘
└──────────────┘
                                    ┌──────────────┐
                                    │ Collaboration│
                                    │   API        │
                                    │              │
                                    │ objectives   │
                                    │   → Forward  │
                                    │   Injection  │
                                    └──────────────┘
```

---

## Phoneme Alignment Engine — 5-Stage Pipeline

```text
Audio Input
    │
    ▼
┌─────────────────────┐
│ 1. PREPROCESSING    │ Noise reduction, normalization, VAD
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ 2. FORCED ALIGNMENT │ Segment into phoneme intervals (Montreal Forced Aligner)
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ 3. NATIVE MODEL GEN │ Generate reference audio (ElevenLabs / Azure Neural TTS)
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ 4. FEATURE COMPARE  │ MFCC, formant, F0 extraction → cosine similarity per phoneme
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ 5. HEATMAP + REPORT │ Visual phoneme map + comprehensibility score + articulatory guidance
└─────────────────────┘
```

### Three Levels of Analysis

1. **Segment-Level**: Phoneme substitutions, omissions, insertions, distortions
2. **Suprasegmental**: Stress, intonation, rhythm, speech rate
3. **Comprehensibility**: Probability a native speaker would understand without difficulty

---

## Friction Point Classification

| Friction Type | Detection | Curriculum Response | Forward Injection |
| --------------- | ----------- | ------------------- | ------------------- |
| **Lexical Gap** | Hesitation >2s, topic abandonment, L1 intrusion | Vocab cards + contextual examples | NPC creates target vocab opportunity |
| **Morphosyntactic Error** | Grammar rule vs. Interlanguage model | Grammar explanation + L1 contrastive analysis | NPC produces correct form naturally |
| **Phonemic Error** | PAE cosine similarity below threshold | Heatmap + articulatory guidance + re-recording | Pronunciation drill in next interaction |
| **Register Mismatch** | Register classifier + cultural params | Sociolinguistic explanation + register spectrum | Tier 3 NPC creates register-sensitive moment |
| **Pragmatic Failure** | Speech act classification vs. expected | Pragmatics lesson + cross-cultural comparison | Repeat scenario with same speech act |
| **Cultural Violation** | CQ norm checking + context matching | Cultural intelligence lesson + faux pas repair | NPC creates cultural norm encounter |

---

## Persistence Layer Schema

### Learner State

```text
learner_state {
  matrix_coordinates: { x: float, y: float, z: float }
  interlanguage_grammar: InterlanguageGrammar
  phoneme_profile: Map<Phoneme, AccuracyHistory>
  friction_history: FrictionPoint[]
  retention_profile: AxisZProfile
  active_persona: PersonaSchemaRef
  fossilization_profile: FossilizationProfile
  cultural_intelligence: CulturalIntelligenceProfile
  repair_competence: RepairCompetenceProfile
  lexical_availability: LexicalAvailabilityIndex
  affective_calibration: AffectiveCalibrationProfile
  cross_schema_transfers: CrossSchemaTransferRecord[]
}
```

### NPC Relationship

```text
npc_relationship {
  npc_id: string
  learner_id: string
  relationship_score: float
  shared_history: VectorEmbedding
  last_interaction: timestamp
  social_reputation: float
  professional_history: Event[]
  personality_model: NPCPersonalityModel
  current_mood: NPCMoodState
  behavioral_variation: NPCBehavioralVariation
  consistency_constraints: NPCConsistencyConstraints
}
```

### Session Record

```text
session_record {
  session_id: string
  tier: 1 | 2 | 3
  persona_schema: PersonaSchemaRef
  transcript: Turn[]
  friction_points: ClassifiedFriction[]
  pronunciation_data: PhonemeAnalysis[]
  curriculum_generated: MicroCurriculum
  forward_injection_directives: Directive[]
  reputation_deltas: Map<NPC, float>
  grammar_evolution_events: GrammarEvolutionEvent[]
  repair_attempts: RepairAttempt[]
  pressure_log: PressureAdjustmentEvent[]
  affective_log: AffectiveInferenceResult[]
  cultural_violations: CulturalViolation[]
  lexical_retrieval_events: LexicalRetrievalEvent[]
}
```
