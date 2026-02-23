# AAPM Technical Architecture

> System architecture overview for the Autonomous Adaptive Pedagogical Matrix.

---

## System Modules

| Module | Function | Key Technologies |
|--------|----------|-----------------|
| **Simulation Engine** | 3D environments, NPC movement, spatial audio | Unity URP / Three.js / Web |
| **Agent Intelligence Layer** | NPC persona management, dialogue, tier behavior | LLM (GPT-4o / Claude), LangChain, Prompt Stack |
| **Recursive Feedback Engine** | Friction extraction, curriculum generation, forward injection | Custom LLM pipeline, vector similarity |
| **Phoneme Alignment Engine** | Real-time ASR, phoneme comparison, heatmap, scoring | Wav2Vec 2.0 / Azure Speech SDK |
| **Persistence & Memory** | Long-term NPC memory, social reputation, cross-session state | Vector DB, PostgreSQL, Redis |
| **Interface Layer** | Comprehension UI, production UI, lessons, async engagement | React / React Native, WebRTC |

---

## Data Flow — The Five-Stage Cycle

```
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
│  └────────────────────┬──────────────────────┘              │
│                       ▼                                      │
│  Stage 2: ACTIVE SESSION PROCESSING                         │
│  ┌───────────────────────────────────────────┐              │
│  │ Real-time parallel processing:             │              │
│  │ • Audio → Phoneme Alignment Engine         │              │
│  │ • Text → Agent Intelligence Layer (NPC)    │              │
│  │ • All input → Friction Monitor (RFE)       │              │
│  │ • Friction events logged to Session Store  │              │
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
│  └───────────────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## NPC Prompt Architecture — 4-Layer Stack

```
┌─────────────────────────────────────────┐
│ Layer 4: REAL-TIME STATE                │
│ Current turn, interlanguage assessment, │
│ active scaffolding triggers             │
├─────────────────────────────────────────┤
│ Layer 3: SESSION CONTEXT                │
│ Relationship state, shared history,     │
│ Forward Injection directives, tier      │
│ objective parameters                    │
├─────────────────────────────────────────┤
│ Layer 2: PERSONA SCHEMA INJECTION       │
│ Domain vocabulary, cultural behaviors,  │
│ professional context from active schema │
├─────────────────────────────────────────┤
│ Layer 1: BASE SYSTEM PROMPT             │
│ NPC identity, language capabilities,    │
│ tier type, personality parameters       │
└─────────────────────────────────────────┘
```

### Tier-Specific Behavior Parameters

| Parameter | Tier 1 (Companion) | Tier 2 (Immersion) | Tier 3 (Negotiation) |
|-----------|-------------------|-------------------|---------------------|
| Patience | Infinite wait | Realistic timing | Normal + register tracking |
| Error Response | Recast naturally | Repeat once, then move on | Track violations, reduce openness |
| Scaffolding | Proactive, constant | Minimal, realistic | None — sink or swim |
| L1 Tolerance | Managed gradient | Zero | Zero |
| Failure State | None | Social Friction Event | Negotiation Collapse |

---

## Phoneme Alignment Engine — 5-Stage Pipeline

```
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
|---------------|-----------|-------------------|-------------------|
| **Lexical Gap** | Hesitation >2s, topic abandonment, L1 intrusion | Vocab cards + contextual examples | NPC creates target vocab opportunity |
| **Morphosyntactic Error** | Grammar rule vs. Interlanguage model | Grammar explanation + L1 contrastive analysis | NPC produces correct form naturally |
| **Phonemic Error** | PAE cosine similarity below threshold | Heatmap + articulatory guidance + re-recording | Pronunciation drill in next interaction |
| **Register Mismatch** | Register classifier + cultural params | Sociolinguistic explanation + register spectrum | Tier 3 NPC creates register-sensitive moment |
| **Pragmatic Failure** | Speech act classification vs. expected | Pragmatics lesson + cross-cultural comparison | Repeat scenario with same speech act |

---

## Persistence Layer Schema

### Learner State

```
learner_state {
  matrix_coordinates: { x: float, y: float, z: float }
  interlanguage_model: VectorEmbedding
  phoneme_profile: Map<Phoneme, AccuracyHistory>
  friction_history: FrictionPoint[]
  retention_profile: AxisZProfile
  active_persona: PersonaSchemaRef
}
```

### NPC Relationship

```
npc_relationship {
  npc_id: string
  learner_id: string
  relationship_score: float        // -1.0 to 1.0
  shared_history: VectorEmbedding  // Semantic encoding
  last_interaction: timestamp
  social_reputation: float         // Tier 2 only
  professional_history: Event[]    // Tier 3 only
}
```

### Session Record

```
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
}
```
