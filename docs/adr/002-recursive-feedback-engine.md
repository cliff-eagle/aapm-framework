# ADR-002: Recursive Feedback Engine

- **Status**: Accepted
- **Date**: 2025-02-23
- **Authors**: Cliff Eagle

## Context

The AAPM needs a mechanism to convert learner interaction data into adaptive instruction. Traditional language learning apps use one of two approaches:

1. **Pre-authored curriculum**: Fixed lesson sequences that don't adapt to individual errors
2. **Spaced repetition**: Item-level repetition scheduling (e.g., Anki) that doesn't address communicative context

Neither approach produces instruction from the learner's own communicative experience. The AAPM requires a system that treats every interaction as a potential source of instructional material.

## Decision

We implement a **Recursive Feedback Engine (RFE)** with three temporal loops:

| Loop | Timescale | Function |
|------|-----------|----------|
| **Micro-Loop** | Per-utterance (< 3 seconds) | Real-time scaffolding and friction detection |
| **Macro-Loop** | Per-session (5-phase pipeline) | Friction extraction → curriculum generation → forward injection |
| **Persistence Loop** | Cross-session | Social world evolution, interlanguage model tracking, retention |

The Macro-Loop is a 5-phase pipeline:

1. **Friction Extraction**: Identify communicative difficulty from session transcript
2. **Pattern Classification**: Cluster friction by linguistic domain, check recurrence
3. **Curriculum Generation**: Produce micro-curriculum from friction data
4. **Adaptive Lesson Delivery**: Present curriculum, track engagement
5. **Forward Injection**: Embed learning targets into next session's NPC behavior

## Rationale

### Why three temporal loops?

Different learning processes operate at different timescales:

- **Immediate repair** (Micro-Loop): When a learner stalls mid-conversation, they need help NOW — not in a post-session review. The Micro-Loop provides real-time scaffolding calibrated to the learner's emotional state.
- **Reflective learning** (Macro-Loop): Conscious analysis of errors and exposure to explicit instruction is most effective between sessions, when the learner is not under communicative pressure. This is when the 5-phase pipeline runs.
- **Developmental trajectory** (Persistence Loop): Language acquisition is a long-term process where the same error may recur across weeks before resolving. The Persistence Loop tracks interlanguage evolution and identifies fossilization risks.

### Why friction extraction from conversation, not from tests?

Traditional error analysis relies on controlled tasks (fill-in-the-blank, translation exercises) that produce decontextualized errors. The AAPM extracts friction from naturalistic conversation because:

1. **Ecological validity**: Errors in conversation reveal actual communicative needs, not just grammatical knowledge
2. **Contextual preservation**: By keeping the 3-turn conversational window around each friction point, the curriculum generator can produce instruction that references the learner's own experience
3. **Pragmatic coverage**: Tests rarely capture register errors, inappropriate speech acts, or topic abandonment — precisely the friction types that matter most for communicative competence

### Why forward injection instead of explicit review?

The 5th phase is the most novel element. Instead of telling the learner "you should practice the subjunctive," the system instructs NPCs in the next session to naturally create situations that require the subjunctive. The learner encounters the target form in a communicatively necessary context — the ideal condition for acquisition according to Krashen's Input Hypothesis.

Forward injection is disguised because:

- Explicit correction raises the Affective Filter (Krashen)
- Incidental learning (encountering forms in meaningful context) produces more durable acquisition than intentional learning (studying forms in isolation) — see N. Ellis (2005)
- The simulation paradigm enables organic embedding of learning targets in a way that textbooks and flashcards cannot

## Consequences

### Positive

- Every session produces personalized curriculum — no generic content
- Forward injection creates a self-improving system where instruction feeds into subsequent practice
- The recursive nature means the system never exhausts its curriculum — it generates it from the learner's own evolving interlanguage

### Negative

- Heavy LLM dependency: Friction extraction and curriculum generation require high-quality LLM calls
- Pipeline latency: The 5-phase pipeline must complete before the next session or the injection directives won't be ready
- Quality control: LLM-generated curriculum must be validated for linguistic accuracy — hallucinated grammar rules would be actively harmful

## Alternatives Considered

1. **Pre-authored adaptive curriculum** (e.g., Duolingo tree): Rejected — cannot account for domain-specific friction from a footballer's press conference
2. **Pure spaced repetition**: Rejected — SRS operates at the item level, not the communicative situation level
3. **Human tutor review**: Rejected as primary mechanism — doesn't scale. Retained as optional overlay
4. **Immediate error correction by NPC**: Rejected as primary mechanism — breaks immersion and raises Affective Filter. Retained only for Tier 1 Companion
