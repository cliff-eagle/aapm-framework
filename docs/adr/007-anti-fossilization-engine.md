# ADR-007: Anti-Fossilization Engine

- **Status**: Accepted
- **Date**: 2026-02-23
- **Authors**: Cliff Eagle

## Context

Fossilization is the single biggest obstacle to advanced language proficiency. A fossilized error is one that has become resistant to correction — the learner has internalized an incorrect form so deeply that standard instruction fails to dislodge it.

Existing applications have no mechanism for fossilization. They repeat the same exercise type for every error, regardless of whether the error is new, developing, or entrenched. This uniform approach fails for fossilized forms precisely because the learner has already been exposed to — and failed to internalize — the correct form multiple times.

SLA research identifies two requirements for defossilization:

1. The learner must **notice** the gap between their production and the target (Schmidt's Noticing Hypothesis)
2. The noticing must occur across **multiple contexts** to break context-dependent storage

## Decision

We implement a **three-strategy Anti-Fossilization Engine (AFE)** that detects fossilized forms and applies progressively intensive intervention.

### Detection Criteria

A form is classified as fossilized only when ALL of:

- Recurrence across **5+ sessions**
- **No improvement** trajectory (stable-incorrect or worsening)
- **High confidence** in the IHE rule (≥0.7 — it's systematic, not random)
- **Previous curriculum** has addressed it and failed

### Strategy 1: Varied Context Exposure

Present the target form in **5+ different NPC/location/scenario contexts**. This breaks context-dependent storage by forcing the learner to process the form independently of any single context.

### Strategy 2: Contrastive Minimal Pairs

Generate sentence pairs that are **identical except for the fossilized form**, using the learner's actual productions (not textbook sentences). This forces conscious attention to the specific contrast.

### Strategy 3: NPC-Driven Correction Sequences

NPCs are instructed to model the correct form using six SLA-validated correction techniques: recasts, clarification requests, metalinguistic feedback, elicitation, repetition, and explicit correction — calibrated to the learner's affective state.

## Rationale

### Why three strategies, not one?

Different fossilized forms respond to different interventions. A phonological fossilization may respond best to contrastive minimal pairs, while a morphosyntactic fossilization may require varied context exposure to break the overgeneralized rule. The three strategies provide coverage across all form types.

### Why NPC-driven correction over explicit exercises?

Explicit exercises create "classroom knowledge" — the learner can perform correctly in drill mode but reverts to the fossilized form in communicative situations. NPC-driven correction occurs within communicative interaction, creating procedural memory that transfers to real-world performance.

### Why require 5+ sessions before classification?

Premature fossilization classification leads to unnecessary intervention. A learner who produces an incorrect form for 3 sessions may still be in the natural acquisition process. 5 sessions provides sufficient evidence that the form has stabilized incorrectly.

## Consequences

### Positive

- Addresses the most intractable problem in advanced language learning
- Three strategies provide redundancy — if one fails, escalate to the next
- Detection is evidence-based, preventing premature intervention
- Success metrics are clear: sustained accuracy above 0.85 for 5 sessions

### Negative

- Defossilization is slow (typically 10-20 sessions per form)
- Multiple strategies require NPC coordination and scheduling
- Learner may become frustrated if they perceive repeated targeting

### Mitigations

- Maximum corrections per session capped to prevent overload
- Strategy selection considers affect state — no correction during high anxiety
- Success celebrations are embedded when improvement is detected

## Alternatives Considered

1. **Ignore fossilization**: Rejected — leaves the biggest learning obstacle unaddressed
2. **Single strategy (repetition)**: Rejected — research shows repeated drills are the least effective for fossilized forms
3. **Human tutor referral**: Rejected — doesn't scale, and the three strategies automate what effective tutors do manually
