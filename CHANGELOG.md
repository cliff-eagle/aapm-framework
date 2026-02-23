# Changelog

All notable changes to the AAPM Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `IMPLEMENTATION_MASTERCLASS.md` — 10-chapter production engineering standards (contract-first, event bus, DI, testing, observability, LLM standards, runtime customization)
- `packages/core/src/event-bus/types.ts` — Canonical event envelope with 14 event types + typed payloads
- `packages/core/src/event-bus/index.ts` — Concrete `AAPMEventBus` implementation with subscribe/emit/unsubscribe and test inspection
- `packages/core/src/test-utils/index.ts` — Shared test fixtures (sessions, friction, injection) + `buildMockDeps()` mock builder
- `docs/implementation-checklist.md` — Per-module binary quality gate (pre-impl, impl, test, docs)
- `VIBECODE_ENTRY.md` updated with Ch.10 Implementation Standards instruction block
- `persona.schema.json` bumped to v3.0.0 with multimodal input, world state, character control, curriculum delivery
- `docs/aam-charter.md` — AAM philosophy + event bus specification
- `docs/world-state-contract.md` — Tier 2 world state contract
- `docs/character-control-spec.md` — NPC character control taxonomy
- `docs/multimodal-prompt-guide.md` — Text/audio/visual prompt routing
- `docs/dependency-graph.md` — Build order enforcement
- `docs/patent-addendum.md` — Patent claims 13-16 (runtime, world state, multimodal, curriculum)
- 8 new core modules: `event-bus`, `test-utils`, `world-engine`, `multimodal-router`, `curriculum-delivery-router`, `runtime-customization`, `interlanguage-engine`, `anti-fossilization`

**Pedagogical Impact:** The event bus enforces module isolation, preventing direct coupling that could violate tier boundaries. The implementation standards ensure all new modules respect the Affective Filter and ZPD constraints by requiring precondition/postcondition blocks on every function.

## [0.4.0] — Documentation, Integration & Patent Specification (2026-02-23)

### Added in 0.4.0

- `architecture.md` expanded: 4 new module rows, IHE pipeline diagram, Affective State signal flow, Cross-Module Integration Map, expanded 5-Stage Data Flow, updated Persistence Layer schemas
- ADR-006: Interlanguage Hypothesis Engine
- ADR-007: Anti-Fossilization Engine
- ADR-008: Cultural Intelligence Model
- ADR-009: Affective State Inference
- ADR-010: NPC Behavioral Authenticity
- ADR-011: L1-L2 Transfer Format
- `integration/types.ts` — 10 cross-module contract types (IHE→FI, IHE→AFE, AFE→NPC, Affect→Pressure, CQ→Reputation, Repair→IHE, Pressure→Tier, Collab→FI, NPC Behavior Resolution, Transfer Resolution)
- `patent-claims.md` — 12 provisional patent claims covering all `@patentCritical` mechanisms
- `persona.schema.json` bumped to v2.0.0 with: NPC personality model, consistency constraints, cultural norms, adaptive pressure config, CQ weight, LAI tracking
- `persona-schema-guide.md` updated with v2.0.0 documentation and examples
- `negotiation-collapse-recovery.md` — Tier 3 failure handling protocol
- `soft-landing-protocol.md` — Graceful proficiency recalibration
- `schema-marketplace.md` — Community schema ecosystem architecture (S1)
- `model-substitution.md` — LLM provider agnosticism and cost benchmarks (S2)
- `language-expansion-checklist.md` — 4-phase process for new L1-L2 pairs (S3)
- `pilot-study-protocol.md` — IRB-ready mixed-methods validation study (S4)
- `transparency-layer.md` — Explainability for learners, educators, auditors (S5)
- `business-model.md` — Revenue streams, pricing tiers, unit economics
- `investor-brief.md` — TAM, competitive moat, funding ask
- `ROADMAP.md` — Product milestones from v0.4 to v1.0
- `.github/workflows/ci.yml` — CI pipeline (typecheck + test + schema validation)
- `vitest.config.ts` — Monorepo-aware test configuration
- 27 unit tests across CLI validator (10) and pipeline types (17)
- 5 new persona schemas: `heritage-recovery`, `tech-hub`, `university-admissions`, `historical-immersion`, `hospitality-professional`
- `@aapm/ui` package with 6 component stubs
- `@aapm/cli` package with `validate-schema` command
- Barrel exports (`index.ts`) for all 8 core modules
- `recipes/new-tier2-environment.md` build guide
- ADR cross-reference sections

## [0.3.0] — Patent-Grade Enhancement (2026-02-23)

### Added in 0.3.0

- **Interlanguage Hypothesis Engine** — Computational interlanguage model with probabilistic rules, developmental stage mapping, L1 transfer profiling, learning frontier identification, and predictive error detection
- **Anti-Fossilization Engine** — Three-strategy intervention system (Varied Context Exposure, Contrastive Minimal Pairs, NPC Correction Sequences) with fossilization detection and progress tracking
- **Cultural Intelligence Model** — Four-factor CQ assessment (Metacognitive, Cognitive, Motivational, Behavioral) with cultural norm enforcement, faux pas tracking, and persistent social consequences
- **Collaboration & Enterprise API** — Instructor dashboards, student cohorts, learning objectives auto-translated to Forward Injection directives, collaborative multi-learner sessions
- **Affective State Inference** — Six-signal computational method (response latency, L1 fallback, hedging, pause duration, topic avoidance, repair rate) with per-learner baseline calibration and scaffolding escalation protocol
- **Conversational Repair Tracking** — Ten repair strategies tracked with success rates, sophistication scoring, and repertoire gap detection
- **Lexical Availability Index** — Vocabulary retrieval speed metric by frequency tier, distinguishing vocabulary knowledge from retrieval under pressure
- **Communicative Pressure Calibrator** — Dynamic within-session pressure state with ZPD detection, multi-source pressure components, and real-time adjustment protocol
- **Cross-Schema Transfer Engine** — Skill portability across persona schemas with nine transfer categories and per-skill confidence scoring
- **NPC Behavioral Authenticity** — Big Five personality model with cultural overlays, dynamic mood states, behavioral variation matrix (personality × mood × reputation), and consistency constraints
- Adaptive Pressure Configuration added to `TierBehaviorParams`
- 12 new glossary terms
- Barrel exports for all 4 new modules

### Fixed in 0.3.0

- 2 missing metric calculations (`socialReputationTrajectory`, `negotiationSuccessRate`)
- 7 validator helper stubs implemented with real schema traversal
- `NPCDefinition.tier` corrected to `2 | 3` (companion is separate)
- README broken links to non-existent files
- Glossary expanded with 7 evaluation metric terms
- CHANGELOG updated for Phase E

## [0.2.0] — 2025-02-23

### Added in 0.2.0

- Patent-critical data models with JSDoc across all core modules
- Complete user interaction loop state machines (7 lifecycle flows)
- Session lifecycle typed contracts
- Architecture Decision Records (ADR-001 through ADR-005)
- Security & privacy compliance architecture
- Evaluation framework with quantitative metrics
- Schema versioning, validation, and migration system
- CONTRIBUTING.md with Contributor License Agreement
- SECURITY.md with responsible disclosure policy

### Changed in 0.2.0

- License changed from MIT to Business Source License 1.1
- Expanded `persona.schema.json` with strict validation and inter-field rules
- Expanded `packages/core/src/types.ts` with comprehensive JSDoc

## [0.1.0] — 2025-02-23

### Added in 0.1.0

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

[Unreleased]: https://github.com/cliff-eagle/aapm-framework/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/cliff-eagle/aapm-framework/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/cliff-eagle/aapm-framework/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/cliff-eagle/aapm-framework/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/cliff-eagle/aapm-framework/releases/tag/v0.1.0
