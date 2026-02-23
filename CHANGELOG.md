# Changelog

All notable changes to the AAPM Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Patent-critical data models with JSDoc across all core modules
- Complete user interaction loop state machines (7 lifecycle flows)
- Session lifecycle typed contracts
- Architecture Decision Records (ADR-001 through ADR-005)
- Security & privacy compliance architecture
- Evaluation framework with quantitative metrics
- Schema versioning, validation, and migration system
- CONTRIBUTING.md with Contributor License Agreement
- SECURITY.md with responsible disclosure policy

### Changed

- License changed from MIT to Business Source License 1.1
- Expanded `persona.schema.json` with strict validation and inter-field rules
- Expanded `packages/core/src/types.ts` with comprehensive JSDoc

## [0.1.0] — 2025-02-23

### Added

- Initial repository structure with monorepo workspace configuration
- `.cursorrules` — AI coding context with full AAPM philosophy
- **Documentation layer:**
  - `docs/aapm-full.md` — AAPM specification entry point
  - `docs/architecture.md` — technical architecture (5-stage data flow, NPC prompt stack, PAE pipeline)
  - `docs/three-tiers.md` — three-tier system deep dive
  - `docs/feedback-engine.md` — Recursive Feedback Engine specification
  - `docs/glossary.md` — complete AAPM terminology
  - `docs/persona-schema-guide.md` — schema creation guide
- **Persona Schema system:**
  - `schemas/persona.schema.json` — JSON Schema definition
  - `schemas/examples/premier-league.yaml` — professional football domain
  - `schemas/examples/mediterranean-yacht.yaml` — maritime hospitality domain
  - `schemas/examples/medical-migration.yaml` — healthcare professional domain
- **Prompt engineering library:**
  - `prompts/system/tier1-companion.md` — bilingual companion base prompt
  - `prompts/system/tier2-immersion-npc.md` — monolingual immersion NPC base prompt
  - `prompts/system/tier3-authority.md` — authority figure base prompt
  - `prompts/refraction/tri-refraction.md` — Basic/Native/Formal generator
  - `prompts/curriculum/friction-analysis.md` — friction extraction and classification
- **Core TypeScript foundations:**
  - `packages/core/src/types.ts` — type definitions for the AAPM system
  - `packages/core/src/agent-intelligence/prompt-composer.ts` — 4-layer prompt stack compositor
- **Vibecoding infrastructure:**
  - `recipes/new-persona-from-scratch.md` — step-by-step schema creation guide
  - `.github/ISSUE_TEMPLATE/new-persona-schema.md` — persona proposal template
- `README.md` with project overview and architecture diagram
- `package.json` with monorepo workspace configuration

[Unreleased]: https://github.com/cliff-eagle/aapm-framework/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cliff-eagle/aapm-framework/releases/tag/v0.1.0
