# ADR-006: Interlanguage Hypothesis Engine

- **Status**: Accepted
- **Date**: 2026-02-23
- **Authors**: Cliff Eagle

## Context

Existing language learning applications track errors — they count mistakes, categorize them, and drill the learner on corrections. This approach treats every error as an isolated event, ignoring the most important insight from Second Language Acquisition research: **errors are not random. They are evidence of a systematic rule system the learner is constructing.**

This internally consistent (but often incorrect) rule system is called the learner's "interlanguage" (Selinker, 1972). It represents active hypotheses about how the target language works, shaped by L1 transfer, instruction, and communicative experience.

No existing commercial system maintains a computational model of the learner's interlanguage. Without this model, the system cannot:

1. **Predict** what the learner will produce before they produce it
2. **Diagnose** the root cause of errors (not just what went wrong, but why)
3. **Distinguish** systematic rules from random performance errors
4. **Track** grammar evolution through SLA developmental sequences

## Decision

We implement an **Interlanguage Hypothesis Engine (IHE)** that maintains a probabilistic model of the learner's hypothesized grammar.

### Core Design

1. **Hypothesis Rules**: Each rule is a falsifiable hypothesis about what the learner believes is correct. Rules have confidence scores (≥0.7 = systematic, <0.5 = random), evidence chains, and trajectory analysis.

2. **Bayesian Updates**: Every learner production is evidence. If the production matches the predicted rule, confidence increases. If it violates the prediction, confidence decreases. This is not binary — communicative pressure, tier context, and recency are weighted.

3. **Developmental Stage Mapping**: Rules are mapped to Pienemann's Processability Theory stages (1-5). The system will NOT attempt to teach structures that are not yet acquirable at the learner's current processing stage.

4. **L1 Transfer Profile**: Systematic analysis of positive transfer (L1 helps), negative transfer (L1 hurts), avoidance patterns (learner avoids L2 structures without L1 equivalents), and overproduction patterns.

5. **Learning Frontier**: Rules where the learner alternates between correct and incorrect forms — the highest-value teaching targets because the learner is actively testing hypotheses.

6. **Predictive Capability**: The IHE generates predictions about what the learner will produce in future interactions, enabling the Forward Injection system to create proactive scenarios.

## Rationale

### Why probabilistic rules, not error categories?

Error categories (grammar, vocabulary, pronunciation) tell you WHAT went wrong. Hypothesis rules tell you WHY. A learner who consistently applies SVO word order in German subordinate clauses isn't making a "grammar error" — they're applying a specific, identifiable L1 English rule. The intervention for this is contrastive analysis of English vs. German word order, not generic grammar drilling.

### Why developmental stage filtering?

Teaching structures the learner can't yet process wastes instructional time and creates frustration. Pienemann's research demonstrates that certain structures follow fixed acquisition orders regardless of instruction. Teaching a Stage 2 learner a Stage 4 structure will fail — the learner's processing architecture literally cannot handle it yet.

### Why predictions, not just reactions?

Reactive correction teaches the learner to depend on external feedback. Predictive intervention (via Forward Injection) creates natural communicative circumstances that reveal the learner's hypothesis, allowing them to discover the correct form through meaningful communication rather than drill.

## Consequences

### Positive

- Root cause diagnosis enables targeted intervention instead of generic drilling
- Prediction capability feeds directly into Forward Injection for proactive pedagogy
- Developmental stage filtering prevents premature instruction
- L1 transfer analysis enables contrastive teaching strategies
- Learning frontier identification maximizes instructional ROI

### Negative

- Requires sufficient evidence before hypotheses stabilize (minimum 3-5 sessions)
- Each L1-L2 pair requires initial transfer profile knowledge
- Probabilistic model adds computational complexity to real-time processing

### Mitigations

- Bootstrap phase uses L1-L2 pair prior knowledge from SLA research
- Confidence thresholds prevent premature intervention on insufficient data
- Rule matching is O(n) per turn where n is number of active rules (typically <100)

## Alternatives Considered

1. **Error categorization only**: Rejected — loses root cause information
2. **Rule-based grammar checking**: Rejected — can't model individual variation
3. **Neural error classification**: Rejected — black box, not interpretable for curriculum generation
4. **Manual interlanguage assessment**: Rejected — doesn't scale, requires human linguist
