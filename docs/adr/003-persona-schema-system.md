# ADR-003: Persona Schema System

- **Status**: Accepted
- **Date**: 2025-02-23
- **Authors**: Cliff Eagle

## Context

The AAPM framework must support deployment across infinite domains — professional football, maritime hospitality, medical migration, tech startups, diplomatic service — without requiring code changes for each domain. The core engine should remain constant while the domain-specific content is configurable.

## Decision

We adopt a **schema-driven configuration system** where each domain deployment is defined by a **Persona Schema** — a YAML configuration file validated against a JSON Schema definition.

The Persona Schema contains:

- **Learner profile**: Domain context, L1/L2, baseline level
- **Vocabulary matrix**: Prioritized vocabulary organized by domain, hierarchy, and emotional register
- **NPC roster**: Character definitions with personality, register, and relationship seeds
- **Location catalog**: Tier 2 environments with available NPCs and interaction opportunities
- **Tier 3 scenarios**: High-stakes scenarios with objectives, NPC configurations, and evaluation rubrics
- **Cultural parameters**: Culture-specific register rules, gesture appropriateness, naming conventions
- **Companion definition**: Tier 1 companion character with backstory and personality

## Rationale

### Why schema-driven rather than code-driven?

1. **Non-technical authoring**: Domain experts (football coaches, medical professionals, yacht captains) can define persona schemas without writing code. YAML is human-readable and LLM-generatable.
2. **Vibecoding compatibility**: AI coding tools can generate complete persona schemas from natural language descriptions. The JSON Schema definition provides validation constraints that prevent the AI from producing invalid configurations.
3. **Separation of concerns**: The core engine handles pedagogy (friction detection, curriculum generation, tier management). The schema handles domain content (vocabulary, NPCs, scenarios). This separation prevents domain-specific logic from leaking into the core.
4. **Rapid deployment**: A new domain can be stood up by creating a single YAML file — no code compilation, no deployment pipeline changes.

### Why YAML over JSON for configuration?

- YAML supports comments — critical for documenting vocabulary choices and cultural notes
- YAML is more compact for deeply nested structures (no closing braces)
- YAML supports multi-line strings naturally — essential for NPC personality descriptions and scenario narratives
- JSON Schema validates both YAML and JSON, so we get strict validation regardless

### Why vocabulary matrix instead of frequency lists?

Traditional language learning uses frequency-ranked word lists (most common 1000 words, etc.). The AAPM replaces this with a **domain-prioritized vocabulary matrix** because:

1. **Domain relevance**: A footballer needs "offside" before "mortgage." Frequency lists are domain-agnostic.
2. **Hierarchical structure**: The matrix organizes vocabulary by social context (tactical words used with coaches vs. fan interaction words vs. media terminology), mapping directly to Tier 2 locations and Tier 3 scenarios.
3. **Emotional register**: Some vocabulary carries emotional weight that affects HOW it should be taught (medical terms for patient diagnosis vs. casual chat). The matrix captures this dimension.

### Why include cultural parameters in the schema?

Register rules vary dramatically across cultures. "Formal" in a Spanish business context differs from "formal" in a Japanese business context. Encoding cultural parameters in the schema (rather than hardcoding them) enables:

- Accurate register evaluation in Tier 3 scenarios
- Culturally appropriate NPC behavior
- Correct pragmatic guidance in the Refraction Interface

## Consequences

### Positive

- Infinite domain scalability with zero code changes
- Personas are versionable (git-tracked YAML files)
- Community contributions can add new domains via pull requests
- AI tools can generate and validate schemas autonomously

### Negative

- Schema complexity: A complete Persona Schema is 200-300 lines of YAML — hard for beginners
- Validation gaps: JSON Schema can validate structure but not semantic correctness (e.g., vocabulary relevance)
- Schema evolution: Changes to the schema definition require migration of all existing schemas

### Mitigations

- Recipe guides (`recipes/new-persona-from-scratch.md`) walk through schema creation
- Semantic validation layer (`schema-loader/validator.ts`) checks inter-field consistency
- Schema versioning with migration contracts (`schema-loader/migrations.ts`)

## Alternatives Considered

1. **Code-based domain modules**: Rejected — requires developer for each domain, doesn't scale
2. **Database-driven configuration**: Rejected — harder to version control, harder for AI tools to generate
3. **Visual schema builder UI**: Complementary (future work), but YAML-first ensures AI generation compatibility
4. **Domain DSL**: Rejected — custom languages are harder for AI tools to generate and developers to learn
