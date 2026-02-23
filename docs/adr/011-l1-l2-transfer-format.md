# ADR-011: L1–L2 Transfer Format

> **Status:** Accepted
> **Date:** 2025-02-23
> **Deciders:** Cliff Eagle

## Context

The AAPM's Interlanguage Hypothesis Engine (IHE) and Cross-Schema Transfer Engine both need to represent the relationship between a learner's L1 (native language) and L2 (target language). Currently, L1 transfer data is scattered across multiple types (`L1TransferProfile`, `InterlanguageGrammar`, `FrictionPoint.analysis.l1TransferHypothesis`) without a unified serialization format.

This creates three problems:

1. **Inconsistent representation**: L1 transfer hypotheses use free text in friction analysis but structured enums in the IHE.
2. **Non-portable data**: Transfer profiles are coupled to specific L1-L2 pairs and don't generalize across schemas.
3. **No standard for negative transfer patterns**: Negative transfer (L1 interference) and positive transfer (helpful L1 patterns) are not symmetrically represented.

## Decision

Define a unified `L1L2TransferFormat` that standardizes how L1-L2 relationships are represented across all AAPM subsystems.

### Format Specification

```typescript
/**
 * Standardized representation of an L1-L2 transfer phenomenon.
 *
 * Used by: IHE, Cross-Schema Transfer Engine, Friction Extraction,
 *          Anti-Fossilization Engine, Curriculum Generator
 */
interface L1L2TransferRecord {
    /** Unique identifier for this transfer pattern */
    id: string;

    /** ISO 639-1 code for source language (L1) */
    sourceLanguage: string;

    /** ISO 639-1 code for target language (L2) */
    targetLanguage: string;

    /** Classification of transfer type */
    transferType: 'positive' | 'negative' | 'avoidance' | 'overproduction';

    /** Linguistic domain affected */
    domain: 'phonological' | 'morphological' | 'syntactic' | 'lexical' | 'pragmatic' | 'prosodic';

    /** The L1 pattern or rule that influences L2 production */
    sourcePattern: {
        /** Human-readable description */
        description: string;
        /** Formal rule notation (optional, for grammar rules) */
        formalRule?: string;
        /** Example in L1 */
        example: string;
    };

    /** The resulting L2 production (correct or incorrect) */
    targetProduction: {
        /** What the learner actually produces */
        produced: string;
        /** What a native speaker would produce */
        expected: string;
        /** Whether this transfer leads to correct L2 */
        isCorrect: boolean;
    };

    /** SLA research backing for this transfer pattern */
    evidenceBasis: {
        /** Whether this is a known transfer pattern from SLA literature */
        documented: boolean;
        /** Citation or description of the evidence */
        reference?: string;
        /** Confidence that this is actually L1 transfer (vs. developmental) */
        confidence: number;
    };

    /** Learner-specific evidence chain */
    learnerEvidence: {
        /** Number of occurrences in learner data */
        occurrences: number;
        /** Session IDs where this pattern was observed */
        sessionIds: string[];
        /** Whether this pattern is stable, improving, or worsening */
        trajectory: 'improving' | 'stable' | 'worsening';
    };
}
```

### Serialization Rules

1. **JSON is the canonical format.** All subsystems serialize transfer records as JSON arrays.
2. **ISO 639-1 for languages.** Always use 2-letter codes (`en`, `zh`, `ko`, `ar`).
3. **One record per phenomenon.** A single L1 pattern that affects multiple L2 domains produces multiple records.
4. **Evidence required.** Every transfer record must have at least one learner evidence occurrence before being persisted.

### Migration Path

| Current Type | Migration |
| ------------ | --------- |
| `L1TransferProfile.negativeTransferPatterns[]` | Each pattern → `L1L2TransferRecord` with `transferType: 'negative'` |
| `L1TransferProfile.positiveTransferPatterns[]` | Each pattern → `L1L2TransferRecord` with `transferType: 'positive'` |
| `FrictionPoint.analysis.l1TransferHypothesis` | Lookup or create `L1L2TransferRecord`, link by ID |
| `InterlanguageGrammar.rules[].l1Source` | Reference `L1L2TransferRecord.id` |

## Consequences

### Positive

- All subsystems share one representation for L1-L2 transfer
- Transfer records are portable across schemas (same L1-L2 pair → same patterns)
- Enables a **Transfer Pattern Library** — preloaded common patterns per L1-L2 pair
- Evidence chains are auditable

### Negative

- Migration effort for existing types
- Slightly more verbose than inline string hypotheses
- Requires maintaining language pair metadata

### Neutral

- Does not change the IHE's Bayesian update algorithm
- Does not affect the forward injection mechanism
