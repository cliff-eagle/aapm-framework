# The Recursive Feedback Engine (RFE)

> Technical specification for the AAPM's core patent architecture.

---

## Overview

The RFE transforms every interaction from a one-time event into a node in a continuous learning network. Data from each conversation improves not just the next conversation but the entire long-term trajectory.

Three temporal loops operate simultaneously:

```
MICRO-LOOP    │ Seconds  │ Within conversation — real-time scaffolding
MACRO-LOOP    │ Minutes  │ Post-session — curriculum generation
PERSISTENCE   │ Days+    │ Cross-session — social world evolution
```

---

## The Micro-Loop: Real-Time Dynamic Scaffolding

Operates at the utterance level, within the conversation.

### 1. Interlanguage Monitoring

During dialogue, the system maintains a live **Interlanguage Model** — a probabilistic representation of the grammar rules the learner is currently applying.

Each utterance is compared against:

- The target grammar (what's correct)
- The learner's historical production (what they usually do)

Two classifications:

- **Systematic errors**: Consistent misapplication of a rule → extracted for post-session curriculum
- **Random errors**: One-off performance failures → ignored (don't overcorrect)

### 2. The Refraction Interface

Available at any point during dialogue. Provides three parallel formulations:

| Level | Name | Register | Use Case |
|-------|------|----------|----------|
| 🟢 | BASIC | Safe, simple | Immediate deployment, zero risk |
| 🔵 | NATIVE | Idiomatic, colloquial | Natural native speaker discourse |
| 🟣 | FORMAL | Professional, high-register | Tier 3 and professional contexts |

Each refraction includes:

- The formulation itself
- Why it's structured that way (grammar, lexical, pragmatic choice)
- What effect it produces
- Audio model for pronunciation practice
- Phoneme comparison against learner's recording

### 3. Flow State Preservation Protocol

**CONSTRAINT**: Interventions must NEVER disrupt communicative momentum.

Scaffolding is delivered through narrative means:

- ✅ A helpful NPC appears with relevant vocabulary
- ✅ An NPC asks a clarifying question that models correct usage
- ✅ An NPC makes a comment containing needed vocabulary
- ❌ A pop-up grammar explanation
- ❌ An interrupting correction
- ❌ A quiz overlay

Explicit grammar instruction is ALWAYS deferred to the Macro-Loop.

---

## The Macro-Loop: Post-Session Curriculum Generation

After each session, the complete data exhaust is processed through a 5-phase pipeline.

### Phase 1: Friction Point Extraction

Identifies every communicative friction moment:

- Hesitations above threshold duration (>2 seconds)
- Refraction Interface activations
- Systematic grammatical errors
- Pronunciation failures above severity threshold
- Register mismatches
- Pragmatic failures
- Vocabulary gaps (topic abandonment, L1 intrusion)

Each friction point is logged with **full conversational context** — three turns before and after.

### Phase 2: Pattern Classification

Two-dimensional classification:

**By type:**

| Type | What It Is |
|------|-----------|
| Lexical | Missing vocabulary |
| Morphosyntactic | Grammar rule misapplication |
| Phonemic | Pronunciation error |
| Register | Formality calibration error |
| Pragmatic | Wrong speech act or strategy |

**By recurrence:**

- **Recurrent**: Appeared in previous sessions → elevated priority
- **Novel**: First occurrence → single-session treatment
- **Clustered**: Multiple friction points in one semantic domain → reveals structural gap requiring systematic treatment

### Phase 3: Micro-Curriculum Generation

Input to the generation pipeline:

1. Full conversational context around each friction point
2. Learner's L1 and identified L1-transfer interference patterns
3. Active Persona Schema (ensures domain-relevant examples)
4. Historical curriculum engagement (avoid repetition, calibrate depth)
5. Axis Z retention profile (preferred instructional format)

Output formats:

| Format | Description | Best For |
|--------|-------------|----------|
| **Interactive Slideshow** | 3-7 slides per friction point + exercises | Visual learners |
| **AI Video Dialogue** | Re-enacted friction moment with correction | Immersive learners |
| **Spaced Repetition Cards** | Auto-generated vocab/phrase cards | Vocabulary building |
| **Audio Podcast** | Narrated session review | Passive/commute learning |
| **Conversational Debrief** | Dialogue with Tier 1 Companion about session | Social learners |
| **Notebook Summary** | Long-form journal entry with analysis | Analytical learners |

### Phase 4: Adaptive Lesson Feedback

Each curriculum element has its own embedded feedback loop:

- Learner can flag explanations as unclear
- Request additional examples
- Ask follow-up questions
- Skip content they already understand

The lesson adapts in real-time. Over time, the system learns the learner's instructional preferences:

- More examples → example-heavy formats in future
- Skips written explanations → routed to audio/video
- Always asks follow-ups → deeper initial coverage

### Phase 5: Forward Injection

The pipeline's final output: **Forward Injection Directives**.

These directives brief NPCs in the next session to naturally create communicative opportunities for the target material:

```
DIRECTIVE: Learner struggled with subjunctive mood in suggesting plans
INJECTION: Tier 2 café NPC initiates discussion about weekend plans,
           using and inviting subjunctive constructions
CONSTRAINT: Must feel natural, not staged
```

The learner never knows this is happening. Engineered spaced practice disguised as organic conversation.

---

## The Persistence Loop: The Lifestyle Simulator

Operates across days, weeks, months — transforms the app into a persistent social world.

### Vectorized Long-Term Memory

All NPCs share a vector database memory store containing:

- Semantically encoded interaction history
- Social facts and shared history
- Relationship states
- Consequences of past interactions

NPCs draw on this for relationship continuity:

- **Companion**: "You mentioned that job interview last week — how did it go?"
- **Shopkeeper** (Tier 2): Noticeably cooler after rude interaction until repair
- **CEO** (Tier 3): Remembers previous proposals and commitments

### Asynchronous Engagement Triggers

Extend beyond the app, calibrated to Axis Z profile:

| Profile | Trigger Style | Example |
|---------|--------------|---------|
| Organic Social | NPC text message | "Your meeting with the director is tomorrow — nervous?" |
| Gamified Coercion | Achievement alert | "3-day streak at risk! Marco is waiting" |
| Professional Urgency | Deadline reminder | "Contract review in 48 hours. 2 practice sessions recommended." |
| Intrinsic Mastery | Challenge unlock | "New pronunciation challenge available: French nasal vowels" |

### Social Reputation Persistence

The invisible reputation system evolves over time:

- Consistent good communication → ambient warmth increases
- Cultural sensitivity → access to information and opportunities
- Repair interactions → reputation recovery
- Longitudinal growth → NPCs remark on improvement ("Your French has gotten so good!")

---

## Friction Classification Reference

| Friction Type | Detection Method | Curriculum Response | Forward Injection |
|---------------|-----------------|-------------------|-------------------|
| Lexical Gap | Hesitation >2s, topic abandonment, L1 intrusion | Vocab cards + contextual examples | NPC creates target vocab opportunity |
| Morphosyntactic Error | Grammar comparison vs. Interlanguage model | Grammar explanation + L1 contrastive analysis | NPC produces correct form naturally |
| Phonemic Error | PAE cosine similarity below threshold | Heatmap + articulatory guidance + re-recording | Pronunciation drill in next interaction |
| Register Mismatch | Register classifier + cultural parameter check | Sociolinguistic explanation + register spectrum | Tier 3 NPC creates register-sensitive moment |
| Pragmatic Failure | Speech act classification vs. expected act | Pragmatics lesson + cross-cultural comparison | Repeat scenario with same speech act |
