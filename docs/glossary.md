# AAPM Glossary

> Every term specific to the Autonomous Adaptive Pedagogical Matrix, defined for both human readers and AI coding tools.

---

## A

### Affective Filter

**Krashen's Affective Filter Hypothesis.** An emotional gating mechanism that mediates adult language acquisition. When a learner is anxious, self-conscious, or under social threat, their affective filter is HIGH — input is blocked from deep processing. When they feel safe, the filter is LOW — acquisition accelerates. The AAPM treats this as a foundational architectural constraint, not a UX nice-to-have.

### Asynchronous Engagement Triggers

Push notifications or messages delivered outside the app, framed as organic communications from the learner's NPC social world. Format and frequency are determined by the learner's Axis Z retention profile. Example: the Companion texts "I heard you have that press conference coming up — want to practice?"

### Axis X — Linguistic Granularity

The learner's structural command of the target language, from phoneme-level precision through morphosyntax to pragmatic synthesis. Measured by the Interlanguage Model, not by test scores.

### Axis Y — Situational Agency

The sociolinguistic stakes of the interaction environment. Mapped to the Three-Tier Hierarchy (Companion → Immersion → Negotiation). Not merely difficulty — qualitatively different social dynamics.

### Axis Z — Psychological Retention

The learner's engagement architecture. Configurable per learner across five profiles: Gamified Coercion, Organic Social, Professional Urgency, Intrinsic Mastery, Social Accountability.

---

## C

### Code-Switching Gradient

The gradual, system-managed reduction of L1 (native language) usage in Tier 1 interactions over time. Early sessions may be mostly L1 with L2 words embedded; late sessions are mostly L2 with occasional L1 bridging.

### Communicative Competence

Dell Hymes' model extending beyond grammar to sociolinguistic competence — knowing not just what's grammatically possible but what's socially appropriate, pragmatically achievable, and actually performed by native speakers.

### Companion (Tier 1)

A persistent, bilingual AI agent whose primary function is Affective Filter reduction and foundational L2 identity construction. Knows the learner across sessions, normalizes imperfection, manages the Code-Switching Gradient.

### Comprehensibility Score

A probabilistic score modeling the likelihood that a native speaker would understand the learner's production without difficulty. Distinct from phonemic accuracy — good comprehensibility can coexist with accent; poor comprehensibility can occur despite few phonemic errors (due to prosodic issues).

### Code-Switch Reduction Rate (CSRR)

A quantitative metric measuring the learner's progress toward L2 independence. Formula: `CSRR = 1 - (currentL1Ratio / baselineL1Ratio)`. A value of 0.5 means the learner uses half as much L1 as at baseline. Primary progress indicator for Tier 1.

---

## D

### Dynamic Scaffolding Engine

The Tier 1 system that monitors real-time production and provides missing vocabulary through natural conversational means — recasting, clarifying questions, contextual descriptions. Never explicit grammar correction during conversation.

### Dual-Track Subtitles

Simultaneous L1 and L2 subtitles on AI-generated video content, independently toggleable by the learner.

---

## F

### Flow State Preservation Protocol

A design constraint on the Micro-Loop: interventions must NEVER disrupt communicative momentum. Scaffolding is delivered through narrative means (helpful NPCs, contextual cues) — never through pop-up grammar lessons.

### Fluency Paradox

The systematic divergence between measured linguistic competence (test scores) and functional communicative performance (real-world interaction). Caused by the absence of high-fidelity social simulation in training.

### Forward Injection

The process by which micro-curriculum learning targets are embedded into the next simulation session. NPCs are programmatically "briefed" to create natural communicative opportunities for target material. The learner doesn't know this is happening.

### Forward Injection Hit Rate (FIHR)

A system effectiveness metric. Formula: `FIHR = successfulInjections / totalInjections`. An injection is "successful" when the NPC created a natural opportunity AND the learner used the target form. Measures whether the Macro-Loop's output actually reaches the learner.

### Friction Point

Any moment of communicative difficulty during an interaction: hesitations, topic abandonment, L1 intrusions, grammar errors, pronunciation failures, register mismatches, pragmatic failures.

### Friction Point Recurrence Rate (FPRR)

A learning progress metric. Formula: `FPRR = recurringFriction / totalFriction`. A friction point is "recurring" if the same target form was identified in a previous session. Decreasing FPRR indicates the feedback loop is successfully resolving patterns.

---

## I

### Interlanguage

The evolving, rule-governed grammatical system every learner constructs as they move toward L2 proficiency. The AAPM identifies SYSTEMATIC patterns in the interlanguage (recurring errors revealing incorrect hypotheses) vs. RANDOM errors (one-off performance failures).

### Interlanguage Model

A probabilistic representation of the grammatical rules the learner is currently applying, maintained live during conversation and updated across sessions.

---

## L

### Linguistic Imposter Syndrome

The subjective experience that one's command of L2 is fundamentally fraudulent. Self-reinforcing: anxiety → elevated affective filter → degraded performance → confirmed belief. The three-tier architecture is designed as graduated desensitization for this syndrome.

---

## M

### Macro-Loop

The post-session feedback loop: processes complete session data through a 5-phase pipeline (Friction Extraction → Pattern Classification → Curriculum Generation → Adaptive Lesson Feedback → Forward Injection).

### Micro-Curriculum

A personalized instructional package generated by the Macro-Loop, delivered in the learner's preferred format: Interactive Slideshow, AI Video Dialogue, Spaced Repetition Flashcards, Audio Podcast Summary, Conversational Debrief, or Notebook Summary.

### Micro-Loop

The real-time feedback loop operating within a conversation. Monitors interlanguage, provides the Refraction Interface, and ensures Flow State Preservation.

---

## N

### Negotiation Success Rate (NSR)

The Tier 3 outcome metric. Formula: `NSR = successfulNegotiations / totalNegotiations`. A negotiation is "successful" when the learner achieves their communicative objective under real-world pressure (e.g., contract terms, press conference, dispute resolution).

### NPC (Non-Player Character)

AI agents that populate the simulation world. Behavior varies by tier: bilingual companion (Tier 1), monolingual daily-life characters (Tier 2), high-status authority figures (Tier 3).

---

## P

### Persona Schema

A structured configuration that defines a complete domain deployment: learner profile, environment assets, NPC roster, vocabulary matrix, tier-specific objectives, retention defaults, and evaluation rubrics. The unit of infinite scalability.

### Persona Vocabulary Matrix

Domain-specific vocabulary priorities derived from the learner's actual communicative objectives, not generic frequency lists. A footballer needs "offside" before "apple."

### Persistence Loop

The longest-temporal feedback loop: cross-session memory, social reputation evolution, relationship tracking, and asynchronous engagement triggers.

### Phoneme Alignment Engine (PAE)

The pronunciation analysis pipeline: Audio Preprocessing → Phoneme Forced Alignment → Native Model Generation → Feature Vector Comparison → Heatmap Generation.

### Phoneme Heatmap

A visual representation of the learner's phonemic accuracy across the target language's phonetic inventory, color-coded by accuracy with priority markers for comprehensibility-critical phonemes.

### Prompt Stack (4-Layer)

The NPC prompt composition architecture: Base System Prompt → Persona Schema Injection → Session Context Injection → Real-Time State Update.

---

## R

### Recasting

A linguistically supported intervention where the interlocutor naturally reformulates the learner's error within the conversational flow, without explicit correction. The primary scaffolding mechanism in Tier 1.

### Recursive Feedback Engine (RFE)

The core patent architecture. Converts every interaction into a node in a continuous learning network through three temporal loops (Micro, Macro, Persistence).

### Refraction Interface

Three simultaneous alternative formulations of a learner's intended message: BASIC (safe/simple), NATIVE (idiomatic/colloquial), FORMAL (high-register/professional). Each with explanatory metadata.

### Register

The level of formality/informality in language use, calibrated to social context, relationship dynamics, and cultural norms. Register accuracy is evaluated in Tier 2 and Tier 3.

### Register Accuracy Score (RAS)

The Tier 3 primary metric. Formula: `RAS = registerAppropriateTurns / totalTurns`. Each learner turn is classified by the LLM register classifier as appropriate or inappropriate for the current social context. Target: 85%+ for Tier 3 readiness.

### Retention Profile

See Axis Z — Psychological Retention.

---

## S

### Social Friction Event

A Tier 2 failure mode: a consequence of communicative breakdown that persists and must be repaired through subsequent L2 interaction (e.g., misunderstanding with landlord, botched pharmacy visit).

### Social Reputation System

A persistent, multi-dimensional scoring model tracking the learner's social standing within simulated environments. Not a gamification score — an invisible, NPC-internal metric governing responsiveness, warmth, and willingness to help.

### Social Reputation Trajectory (SRT)

A Tier 2 social competence metric. Formula: `SRT = mean(reputationDeltas)`. Measures the net direction of the learner's social relationships. Positive SRT indicates the learner is building social capital through appropriate communicative behavior.

---

## T

### Three-Tier Hierarchy

Tier 1 (Companion) → Tier 2 (Immersion) → Tier 3 (Negotiation). Each tier is a qualitatively distinct social environment, not merely a difficulty level.

### Task Completion Rate (TCR)

The Tier 2 primary metric. Formula: `TCR = completedTasks / attemptedTasks`. A "task" is a communicative objective (e.g., ordering food, giving directions). A task is "completed" if the learner achieved the communicative goal, regardless of linguistic accuracy.

---

## Z

### Zone of Proximal Development (ZPD)

Vygotsky's concept: the space between what a learner can do independently and what they can do with support. The AAPM dynamically locates each learner's ZPD in real time and calibrates every interaction to this zone.

### Zero-to-Hero

The AAPM's outcome framework: from complete beginner to functional communicative fluency in the learner's target domain. Measured by communicative achievement, not test scores.
