# ADR-004: Tri-Refraction Interface

- **Status**: Accepted
- **Date**: 2025-02-23
- **Authors**: Cliff Eagle

## Context

When a learner doesn't know how to express something in the target language, traditional systems offer one of:

1. **Dictionary lookup**: Decontextualized word translation
2. **Chatbot hint**: Single suggested phrasing
3. **Grammar explanation**: Rule-based suggestion

None of these develop the learner's ability to CHOOSE between registers — arguably the most socially consequential linguistic skill.

## Decision

We implement a **Tri-Refraction Interface** that presents every learner input as three parallel formulations, each at a different register level:

| Level | Register | Use Case |
|-------|----------|----------|
| **Basic** | Simple, learnable | Tier 1 conversations, survival communication |
| **Native** | Natural, colloquial | Tier 2 social interactions, peer conversation |
| **Formal** | Precise, professional | Tier 3 negotiations, authority interactions |

Each formulation includes:

- The complete utterance in the target language
- **Why** it's structured that way (grammar explanation)
- **What** vocabulary was chosen and why
- **What** social effect it produces (pragmatic explanation)
- **When** to use it (context guidance)

## Rationale

### Why three levels, not two or five?

**Two levels** (informal/formal) loses the critical middle register — "native-like natural speech" — which is where most daily communication happens and where L2 speakers are most obviously non-native.

**Five levels** (ultra-casual/casual/neutral/formal/ultra-formal) creates distinctions that are linguistically real but pedagogically overwhelming. The learner would struggle to choose between levels without significant sociolinguistic training.

**Three levels** corresponds to universal pragmatic categories observed across languages:

- **Solidarity** register (Basic): Used with in-group, emotional closeness
- **Standard** register (Native): Default for strangers, acquaintances, service encounters
- **Deference** register (Formal): Used with authority, high-stakes situations

These three map directly to the three tiers, reinforcing the architectural consistency.

### Why include explanatory metadata, not just the formulation?

The goal is not to give the learner a phrase to parrot — it's to develop **metalinguistic awareness** of register selection. By explaining WHY each formulation is structured differently, the learner learns to:

1. Analyze social situations for register requirements
2. Select appropriate register independently
3. Monitor their own register during interaction
4. Repair register mismatches when they detect them

This is grounded in **register theory** (Halliday & Hasan, 1976) and **pragmatic competence** research (Kasper & Rose, 2002). Studies show that explicit metapragmatic instruction produces more durable pragmatic development than exposure alone.

### Why is it called "refraction"?

In optics, a prism refracts white light into its component wavelengths — the same light appears differently when separated. Similarly, the learner's communicative intent (the "white light") is refracted into its register components, revealing that the same meaning can be expressed in fundamentally different social textures.

The metaphor reinforces the AAPM's position that language is not about correctness but about choice.

## Consequences

### Positive

- Develops a skill (register awareness) that no major language app explicitly trains
- Creates natural connection between the three tiers and the three register levels
- Provides pronunciation practice material calibrated to context
- Enables the learner to gradually shift from always using Basic to selecting the appropriate level

### Negative

- High LLM cost: Each refraction request requires generating 3 formulations with explanations
- Latency: Refraction generation must feel instant during conversation flow (target: < 2s)
- Quality dependency: Incorrect register explanations could teach wrong social norms

### Mitigations

- Prompt engineering with few-shot examples (see `prompts/refraction/tri-refraction.md`)
- Response caching for common phrasings
- Domain-specific vocabulary injection from Persona Schema
- Cultural parameter injection for register calibration

## Alternatives Considered

1. **Single "best" suggestion**: Rejected — deprives learner of register choice
2. **Binary informal/formal**: Rejected — misses the native-natural middle
3. **Graduated scale (1-10 formality)**: Rejected — too granular, learners can't distinguish adjacent levels
4. **Post-hoc register analysis of learner output**: Complementary (used in Tier 3 evaluation), but does not help the learner in the moment of need
