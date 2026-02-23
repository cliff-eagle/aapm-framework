# ADR-001: Three-Tier Interaction Architecture

- **Status**: Accepted
- **Date**: 2025-02-23
- **Authors**: Cliff Eagle

## Context

The AAPM needs to model the full spectrum of communicative situations a language learner encounters — from safe, beginner-friendly environments to high-stakes professional negotiations. Traditional language learning applications model this as a linear difficulty progression (beginner → intermediate → advanced). The AAPM rejects this approach.

## Decision

We adopt a **three-tier architecture** where each tier represents a qualitatively distinct social environment, not a difficulty level:

| Tier | Label | Key Feature |
|------|-------|-------------|
| **Tier 1** | Companion | Bilingual safe space with managed code-switching gradient |
| **Tier 2** | Immersion | Monolingual social world with persistent NPC relationships |
| **Tier 3** | Negotiation | High-stakes authority interactions with register demands |

All three tiers are accessible from the start. The system RECOMMENDS a progression trajectory but does not enforce gating.

## Rationale

### Why not linear difficulty levels?

Linear difficulty assumes learning is sequential — that a learner must master grammar before tackling pragmatics. Second Language Acquisition (SLA) research contradicts this:

- **Krashen's Input Hypothesis**: Learners acquire language when exposed to comprehensible input slightly above their current level (i+1). This requires varied exposure, not controlled progression.
- **Vygotsky's Zone of Proximal Development**: Learning happens at the boundary between what the learner can do alone and what they can do with support. The support mechanism (scaffolding) should vary by context, not disappear through difficulty progression.
- **Hymes' Communicative Competence**: Linguistic competence (grammar) is necessary but insufficient. Communicative competence requires pragmatic, sociolinguistic, and strategic sub-competences that can only be developed through social interaction.

### Why three tiers specifically?

The three tiers map to three empirically observable categories of language use situations:

1. **Identity-safe communication**: Speaking with someone who shares your linguistic background — code-switching is natural, face-threat is minimal. (Tier 1)
2. **Transactional communication**: Getting things done in the target language — ordering food, asking directions, socializing with colleagues. Register is informal to neutral. (Tier 2)
3. **High-consequence communication**: Situations where register, precision, and cultural alignment have measurable stakes — job interviews, medical consultations, contract negotiations. (Tier 3)

Two tiers would conflate transactional and high-consequence. Four or more tiers would create artificial distinctions without clear social-linguistic boundaries.

### Why allow concurrent access?

Gating creates a perverse incentive: learners must grind through content they find boring to reach content they find motivating. A footballer who needs English for press conferences (Tier 3) should not be forced to complete 50 Tier 1 sessions first. Instead, the system RECOMMENDS progression but allows the learner to go wherever motivation leads. The Friction Monitor and Micro-Loop adapt support intensity dynamically.

## Consequences

### Positive

- NPC behavior is parametrically controlled — the same NPC engine serves all three tiers with different behavior parameters (`TierBehaviorParams`)
- Learners can self-direct their learning trajectory
- Tier 1 remains available as a retreat when Tier 2/3 becomes overwhelming (Affective Filter management)

### Negative

- More complex session management (must track which tier is active and configure accordingly)
- Learners may repeatedly access Tier 3 before they're ready, leading to frustrating failure cascades
- Tier transition recommendations require careful calibration to avoid being perceived as gatekeeping

## Alternatives Considered

1. **Linear progression with unlocking**: Rejected — creates artificial barriers
2. **Open world without tiers**: Rejected — removes the qualitative distinction between social environments that makes each pedagogically valuable
3. **Competency-based gating**: Rejected — still enforces sequential mastery; communicative competence is not sequential
