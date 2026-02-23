<p align="center">
  <h1 align="center">🧠 AAPM Framework</h1>
  <p align="center"><strong>The Autonomous Adaptive Pedagogical Matrix</strong></p>
  <p align="center">A meta-framework for vibecoding infinite custom edtech lifesim solutions</p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#what-is-this">What Is This</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#persona-schemas">Persona Schemas</a> •
  <a href="#vibecoding">Vibecoding Guide</a> •
  <a href="docs/aapm-full.md">Full AAPM Document</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-BUSL--1.1-blue" alt="License: BUSL-1.1" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript" alt="TypeScript: strict" />
  <img src="https://img.shields.io/badge/version-0.1.0-green" alt="Version: 0.1.0" />
  <img src="https://img.shields.io/badge/PRs-CLA%20required-yellow" alt="PRs: CLA Required" />
</p>

---

## What Is This

The AAPM Framework is **not** a language learning app. It's the **DNA** from which any AI-powered educational lifesim can be generated.

It translates the [Autonomous Adaptive Pedagogical Matrix](docs/aapm-full.md) — a doctoral-level pedagogical framework — into actionable code architecture, reusable components, prompt engineering libraries, and schema-driven configuration so that AI coding tools can rapidly generate custom AAPM-powered simulations for **any domain**.

### The Problem It Solves

Current language learning tools (Duolingo, Babbel, Rosetta Stone) all share the same fundamental flaw: they treat language as **content to consume** rather than as **social behavior to practice**. The result is the **Fluency Paradox** — learners who score well on tests but cannot function in real communication.

### The AAPM Approach

Instead of lessons, the AAPM creates **living social worlds** where learners exist as participants. The framework is built on three pillars:

| Pillar | What It Means |
|--------|---------------|
| **Krashen's Affective Filter** | Anxiety blocks learning — the system must feel safe |
| **Vygotsky's Zone of Proximal Development** | Every interaction is calibrated to what the learner can *almost* do |
| **Sociolinguistic Competence** | It's not enough to be grammatically correct — you must be culturally appropriate |

### The Three-Tier Architecture

```
Tier 1: THE COMPANION     → Bilingual AI friend who builds your confidence
         ↓
Tier 2: THE IMMERSION      → Monolingual world where you must communicate to survive
         ↓
Tier 3: THE NEGOTIATION    → High-stakes professional encounters with power dynamics
```

→ **[ADR-001: Why three tiers?](docs/adr/001-three-tier-architecture.md)**

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 .cursorrules                     │
│         (AI Context — The AAPM Bible)            │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Persona  │  │  Prompt  │  │  Recipe  │      │
│  │  Schemas  │  │  Library │  │  Library │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │            │
│  ┌────▼──────────────▼──────────────▼────┐      │
│  │         @aapm/core packages            │      │
│  │  ┌─────────────┐  ┌────────────────┐  │      │
│  │  │   Agent      │  │  Feedback      │  │      │
│  │  │   Intelligence│  │  Engine        │  │      │
│  │  ├─────────────┤  ├────────────────┤  │      │
│  │  │  Persistence │  │  Phoneme       │  │      │
│  │  │  & Memory    │  │  Engine        │  │      │
│  │  ├─────────────┤  ├────────────────┤  │      │
│  │  │  Tier        │  │  Retention     │  │      │
│  │  │  Manager     │  │  Architecture  │  │      │
│  │  ├─────────────┤  ├────────────────┤  │      │
│  │  │  Refraction  │  │  Evaluation    │  │      │
│  │  │  Interface   │  │  Framework     │  │      │
│  │  ├─────────────┤  ├────────────────┤  │      │
│  │  │  Schema      │  │               │  │      │
│  │  │  Loader      │  │               │  │      │
│  │  └─────────────┘  └────────────────┘  │      │
│  └───────────────────────────────────────┘      │
│                      │                           │
│  ┌───────────────────▼───────────────────┐      │
│  │         @aapm/ui components            │      │
│  │  RefractionPanel · PhonemeHeatmap      │      │
│  │  CompanionChat · OutputScaffold        │      │
│  │  MicroCurriculum · TierProgress        │      │
│  └───────────────────────────────────────┘      │
│                                                  │
├─────────────────────────────────────────────────┤
│     examples/ — Complete reference apps          │
│     recipes/ — Step-by-step build guides         │
└─────────────────────────────────────────────────┘
```

---

## Persona Schemas

The **Persona Schema** is the unit of infinite scalability. Every new domain is just a new YAML config:

```yaml
# schemas/examples/premier-league.yaml
schema_version: "1.0.0"
persona:
  id: "premier-league-footballer"
  learner_profile:
    native_language: "es"
    target_languages: ["en"]
    domain: "professional-sports"
  companion:
    name: "Carlos"
    personality: "Warm, football-obsessed, bilingual since childhood"
    backstory: "Grew up in Barcelona, moved to London at 16"
  environment:
    tier_2:
      setting: "Premier League training ground"
      locations: [training-pitch, locker-room, press-facility]
    tier_3:
      scenarios:
        - type: contract-negotiation
          authority_npc_id: club-director
        - type: press-conference
          authority_npc_id: media-panel
```

### Available Schemas

| Schema | Languages | Domain |
|--------|-----------|--------|
| [`premier-league`](schemas/examples/premier-league.yaml) | ES → EN | Professional football |
| [`mediterranean-yacht`](schemas/examples/mediterranean-yacht.yaml) | Any → FR/IT/ES/GR/TR | Maritime hospitality |
| [`medical-migration`](schemas/examples/medical-migration.yaml) | Any → EN/DE | Healthcare professionals |

→ **[Persona Schema JSON Schema](schemas/persona.schema.json)** · **[ADR-003: Why schema-driven?](docs/adr/003-persona-schema-system.md)**

---

## The Recursive Feedback Engine

The core innovation: every interaction generates data that improves the next interaction.

```
Session → Friction Extraction → Pattern Classification → Micro-Curriculum → Forward Injection → Next Session
```

Three temporal loops:

- **Micro-Loop**: Real-time scaffolding during conversation
- **Macro-Loop**: Post-session curriculum generation (5-phase pipeline)
- **Persistence Loop**: Long-term social world evolution

→ **[ADR-002: Why recursive feedback?](docs/adr/002-recursive-feedback-engine.md)** · **[Interaction Loop (7 state machines)](docs/interaction-loop.md)**

---

## Key Innovations

| Innovation | Description | ADR |
|------------|-------------|-----|
| **Tri-Refraction Interface** | Every learner input refracted into Basic / Native / Formal with metalinguistic explanation | [ADR-004](docs/adr/004-tri-refraction-interface.md) |
| **Social Reputation System** | Invisible NPC reputation scores that govern behavior — learner reads social cues, not numbers | [ADR-005](docs/adr/005-social-reputation-persistence.md) |
| **Phoneme Alignment Engine** | 5-stage pronunciation pipeline producing comprehensibility scores + articulatory guidance | — |
| **Forward Injection** | Learning targets embedded into NPC behavior, invisible to the learner | [ADR-002](docs/adr/002-recursive-feedback-engine.md) |
| **Axis Z Retention** | 5 retention profiles that respect individual psychology — never defaulting to gamification | — |

---

## Vibecoding

This repo is designed for **AI-assisted rapid development**. The `.cursorrules` file gives any AI coding tool deep understanding of AAPM pedagogy.

### Example Workflow

> "Build me a lifesim for a Brazilian chef relocating to Tokyo"

1. AI reads `.cursorrules` → understands AAPM philosophy
2. AI studies existing schema examples → creates `tokyo-chef.yaml`
3. AI reads prompt templates → creates Japanese-Portuguese bilingual Companion
4. AI follows `recipes/new-tier2-environment.md` → builds Tsukiji fish market sim
5. AI assembles from `packages/ui/` → Refraction Panel with Japanese keigo levels

**Result**: A complete, pedagogically sound lifesim in hours.

### Key Files for AI Tools

| File | What AI Tools Learn From It |
|------|---------------------------|
| `.cursorrules` | AAPM philosophy, architecture patterns, design constraints |
| `docs/glossary.md` | Every AAPM-specific term |
| `schemas/*.schema.json` | Valid configuration shapes |
| `prompts/` | Prompt engineering patterns for every system |
| `recipes/` | Step-by-step build guides |
| `examples/` | Complete reference implementations |

---

## Repository Structure

```
aapm-framework/
├── .cursorrules                        # AI coding context — the AAPM Bible
├── docs/
│   ├── aapm-full.md                    # Complete AAPM specification
│   ├── architecture.md                 # System architecture overview
│   ├── glossary.md                     # AAPM terminology
│   ├── three-tiers.md                  # Tier architecture detail
│   ├── interaction-loop.md             # 7 state machines (NEW)
│   ├── session-lifecycle.md            # Typed session contracts (NEW)
│   ├── security-privacy.md             # GDPR/COPPA/CCPA compliance (NEW)
│   ├── evaluation-framework.md         # 8 metrics + A/B testing (NEW)
│   └── adr/                            # Architecture Decision Records (NEW)
│       ├── 001-three-tier-architecture.md
│       ├── 002-recursive-feedback-engine.md
│       ├── 003-persona-schema-system.md
│       ├── 004-tri-refraction-interface.md
│       └── 005-social-reputation-persistence.md
├── schemas/
│   ├── persona.schema.json             # JSON Schema (expanded)
│   └── examples/                       # Pre-built persona schemas
├── packages/
│   └── core/                           # @aapm/core engine
│       ├── tsconfig.json               # TypeScript strict mode (NEW)
│       └── src/
│           ├── feedback-engine/        # Recursive Feedback Engine
│           │   ├── types.ts            # Data models (NEW)
│           │   └── pipeline.ts         # 5-phase Macro-Loop (NEW)
│           ├── persistence/            # Memory & reputation
│           │   └── types.ts            # Data models (NEW)
│           ├── phoneme-engine/         # Pronunciation analysis
│           │   └── types.ts            # PAE pipeline types (NEW)
│           ├── tier-manager/           # Three-tier state machine
│           │   └── types.ts            # Tier types (NEW)
│           ├── retention/              # Axis Z engagement
│           │   └── types.ts            # 5 profiles (NEW)
│           ├── refraction/             # Tri-Refraction Interface
│           │   └── types.ts            # Refraction types (NEW)
│           ├── evaluation/             # Outcome measurement
│           │   ├── types.ts            # Metrics + A/B types (NEW)
│           │   └── metrics.ts          # Metric calculations (NEW)
│           └── schema-loader/          # Schema validation
│               ├── validator.ts        # Runtime validator (NEW)
│               └── migrations.ts       # Version migration (NEW)
├── prompts/                            # Prompt engineering library
│   ├── system/                         # NPC system prompts
│   │   ├── tier1-companion.md
│   │   ├── tier2-immersion-npc.md
│   │   └── tier3-authority.md
│   ├── curriculum/                     # Feedback pipeline prompts
│   │   ├── friction-analysis.md
│   │   └── micro-curriculum-generator.md  (NEW)
│   ├── refraction/
│   │   └── tri-refraction.md
│   ├── npc/
│   │   └── forward-injection-briefing.md  (NEW)
│   └── evaluation/
│       └── register-classifier.md         (NEW)
├── recipes/                            # Vibecoding step-by-step guides

└── examples/                           # Complete reference apps
```

---

## Theoretical Foundation

The AAPM is grounded in established SLA (Second Language Acquisition) research:

- **Krashen's Affective Filter Hypothesis** — emotional safety determines whether learning occurs
- **Vygotsky's Zone of Proximal Development** — instruction must be calibrated to the learner's edge
- **Hymes' Communicative Competence** — fluency requires sociolinguistic intelligence, not just grammar
- **Procedural Knowledge Theory** — fluency is habituated behavior built through authentic practice

→ **[Read the full AAPM document](docs/aapm-full.md)**

---

## Documentation

| Document | Description |
|----------|-------------|
| [Full AAPM Specification](docs/aapm-full.md) | The complete pedagogical framework |
| [Architecture Overview](docs/architecture.md) | System architecture and components |
| [Interaction Loop](docs/interaction-loop.md) | 7 state machines — onboarding through async engagement |
| [Session Lifecycle](docs/session-lifecycle.md) | Typed contracts for all session phases |
| [Evaluation Framework](docs/evaluation-framework.md) | 8 quantitative metrics and A/B testing methodology |
| [Security & Privacy](docs/security-privacy.md) | GDPR, COPPA, CCPA compliance architecture |
| [Glossary](docs/glossary.md) | AAPM-specific terminology |
| [Persona Schema Guide](docs/persona-schema-guide.md) | How to create your own schema |

### Architecture Decision Records

| ADR | Decision |
|-----|----------|
| [001](docs/adr/001-three-tier-architecture.md) | Three-Tier Architecture |
| [002](docs/adr/002-recursive-feedback-engine.md) | Recursive Feedback Engine |
| [003](docs/adr/003-persona-schema-system.md) | Persona Schema System |
| [004](docs/adr/004-tri-refraction-interface.md) | Tri-Refraction Interface |
| [005](docs/adr/005-social-reputation-persistence.md) | Social Reputation Persistence |

---

## Contributing

We welcome new Persona Schemas, prompt improvements, and recipe contributions. All contributions require a **Contributor License Agreement** (CLA). See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

For security vulnerabilities, see [SECURITY.md](SECURITY.md).

---

## License

**Business Source License 1.1** — See [LICENSE](LICENSE) for full text.

- **Allowed**: Research, education, non-production evaluation, personal learning
- **Restricted**: Production commercial use without a separate agreement
- **Change Date**: February 23, 2030 → converts to Apache 2.0

---

<p align="center">
  <em>"People don't pay for language lessons. They pay for outcomes."</em>
</p>
