# ADR-010: NPC Behavioral Authenticity

- **Status**: Accepted
- **Date**: 2026-02-23
- **Authors**: Cliff Eagle

## Context

NPCs in the AAPM are not chat interfaces wearing character masks. They are the learner's social world — the people whose reactions the learner must learn to read, predict, and adapt to. If NPCs feel predictable, scripted, or inconsistent, the simulation fails to develop the social reading skills that are critical for real-world communication.

The original NPC system defined personality as a string description injected into the prompt. This created two problems:

1. **Inconsistency**: The same NPC could behave dramatically differently across sessions because personality was underspecified
2. **Flatness**: NPCs had no mood variation — they were always in the same emotional state, removing the need to read social cues

Real people have consistent personality traits that modulate HOW they react, overlaid with temporary mood states that modulate WHAT they react to. The NPC system must model both.

## Decision

We implement **Big Five personality traits + cultural overlays + dynamic mood states** for every NPC, creating a behavioral variation matrix where NPC behavior is deterministic (given inputs) but unpredictable (to the learner).

### Big Five Personality Model

Each NPC has five trait scores (0.0 to 1.0):

- **Openness**: Curiosity, willingness to engage unusual topics
- **Conscientiousness**: Reliability, attention to detail, follow-through
- **Extraversion**: Talkativeness, social energy, initiative
- **Agreeableness**: Patience, helpfulness, tolerance of errors
- **Neuroticism**: Emotional reactivity, sensitivity to social friction

### Cultural Overlay

Personality traits manifest differently across cultures. Four cultural parameters modify how Big Five traits are expressed:

- Communicative directness
- Formality default
- Power distance sensitivity
- Emotional expressiveness

### Dynamic Mood States

NPCs have a current mood that:

- Starts at a baseline (defined by personality)
- Changes in response to session events (learner behavior, context)
- Decays back toward baseline over time
- Influences behavior modifiers (patience, helpfulness, register strictness)

### Behavioral Variation Matrix

Final NPC behavior = f(personality, mood, reputation, cultural overlay):

- Response length ← extraversion × mood × topic interest
- Patience ← agreeableness × reputation × mood
- Helpfulness ← agreeableness × openness × reputation
- Register strictness ← conscientiousness × mood × formality
- Topic initiative ← extraversion × openness × mood

## Rationale

### Why Big Five?

The Big Five model is the most empirically validated personality framework in psychology. It provides:

1. Standardized, interpretable trait dimensions
2. Predictable behavioral correlates
3. Cross-cultural validity
4. Sufficient dimensionality for distinctive characters without combinatorial explosion

### Why mood with decay?

Static NPCs can be memorized. Dynamic NPCs force the learner to read the room. When the café owner is in a rush (mood: busy), the learner must adapt their communication style — shorter, more direct, no small talk. This is exactly the skill needed in real life.

Mood decay ensures NPCs don't get stuck in extreme states. A 10% per-turn decay means a strong mood lasts ~10 turns before normalizing.

### Why personality × mood × reputation?

The multiplication of these factors creates emergent interaction dynamics:

- A high-agreeableness NPC (patient) with mood:irritated (less patient) and high reputation (more patient) produces a complex, authentic social signal
- Neither personality nor mood alone determines behavior — their interaction does, which is how real people work

## Consequences

### Positive

- NPCs feel like real people with consistent characters
- Mood variation forces genuine social reading skill development
- Reputation × personality creates narrative depth (NPCs you've earned trust with behave differently)
- Behavioral variation matrix is transparent and debuggable

### Negative

- 5 personality traits × 10 mood states × reputation range = complex parameter space
- Schema authors must define personality traits for each NPC
- Extreme personality combinations could produce unhelpful NPCs

### Mitigations

- Default personality profiles ("friendly shopkeeper", "strict professor") for rapid schema authoring
- Personality constraints prevent extreme combinations (min agreeableness floor)
- Consistency constraints define behaviors that NEVER change regardless of mood
- Verbal tics and speech patterns maintain character identity even during mood shifts

## Alternatives Considered

1. **Free-text personality descriptions**: Rejected — inconsistent, not parameterized
2. **MBTI types**: Rejected — lacks empirical validation, binary dimensions
3. **No personality model (random variation)**: Rejected — creates inconsistent, unrealistic NPCs
4. **Fixed mood per NPC**: Rejected — removes need to read social cues
5. **Player-visible mood indicators**: Rejected — removes need for social inference
