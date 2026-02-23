# ADR-008: Cultural Intelligence Model

- **Status**: Accepted
- **Date**: 2026-02-23
- **Authors**: Cliff Eagle

## Context

A learner can speak grammatically perfect French and still destroy every social interaction through cultural ignorance. They can use tu/vous incorrectly, violate dining norms, misread power dynamics, or commit taboo topic violations — all while producing linguistically flawless sentences.

Existing language apps treat culture as supplementary content — fun facts, cultural notes, or quiz questions. The consequence of cultural ignorance is a wrong answer, not a damaged relationship. This fails to develop genuine Cultural Intelligence (CQ).

CQ is a well-researched construct (Earley & Ang, 2003) with four measurable dimensions. The AAPM must integrate CQ assessment into its core competence model, not as supplementary content.

## Decision

We implement a **four-factor Cultural Intelligence Model** where cultural norms are **enforced by NPC behavior** and violations have **persistent social consequences** through the reputation system.

### Four CQ Dimensions (Earley & Ang)

1. **Metacognitive CQ**: Can the learner *detect* that a cultural norm is in play?
2. **Cognitive CQ**: Does the learner *know* the relevant norms?
3. **Motivational CQ**: Does the learner *want* to engage with cultural differences?
4. **Behavioral CQ**: Can the learner *perform* culturally appropriate behavior?

### Norm Enforcement

Cultural norms are defined per persona schema. Each norm specifies:

- The appropriate behavior
- Common violations per L1 culture (for predictive detection)
- Applicable tiers and contexts
- Reputation impact of violation

### Persistent Consequences

When a learner violates a cultural norm:

1. The witnessing NPC's reputation score decreases
2. A `CulturalFauxPas` record is created
3. Aware NPCs modify their behavior accordingly
4. The learner must navigate the social aftermath
5. Repair is always possible but requires demonstration of learning

## Rationale

### Why core dimension, not supplementary?

A learner who speaks perfectly but behaves inappropriately WILL FAIL in real-world communication. CQ is at least as important as grammar for actual communicative success. Making it supplementary sends the message that it's optional — it is not.

### Why persistent consequences?

In real life, you can't "undo" a cultural faux pas by clicking a button. The social aftermath requires navigating repair, which is itself a high-value learning experience. If consequences are transient, the learner never develops genuine cultural awareness.

### Why four-factor model?

Single-factor models (e.g., "cultural knowledge score") conflate different competencies. A learner might have high Cognitive CQ (knows the norms) but low Behavioral CQ (can't perform them under pressure). The four-factor model enables targeted development.

## Consequences

### Positive

- Develops genuine cultural awareness, not just factual knowledge
- Social consequences create authentic motivation to learn cultural norms
- Per-L1 violation predictions enable proactive cultural coaching
- Repair mechanics create some of the deepest learning experiences

### Negative

- Cultural norms are context-dependent; schema authors must define them carefully
- Overly strict norm enforcement could frustrate beginners
- Cross-cultural norm differences are complex and nuanced

### Mitigations

- CQ evaluation weight is zero in Tier 1, minor in Tier 2, major in Tier 3
- Schema validation warns if norms are defined without repair paths
- Common L1 violations are pre-populated based on cross-cultural research

## Alternatives Considered

1. **Cultural quiz questions**: Rejected — tests knowledge without developing competence
2. **Cultural notes in lessons**: Rejected — passive learning with no practice opportunity
3. **No cultural assessment**: Rejected — leaves a critical competence gap unmeasured
4. **Hofstede's dimensions only**: Rejected — too abstract for actionable NPC behavior
