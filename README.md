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
  <img src="https://img.shields.io/badge/version-0.4.0-green" alt="Version: 0.4.0" />
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
| [`heritage-recovery`](schemas/examples/heritage-recovery.yaml) | EN → KO | Heritage language recovery |
| [`tech-hub`](schemas/examples/tech-hub.yaml) | Any → EN | Tech industry professionals |
| [`university-admissions`](schemas/examples/university-admissions.yaml) | Any → EN | University admissions |
| [`historical-immersion`](schemas/examples/historical-immersion.yaml) | EN → IT | History through time travel |
| [`hospitality-professional`](schemas/examples/hospitality-professional.yaml) | ES → EN | Hotel / flight / yacht crew |

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
├── .github/workflows/ci.yml            # CI: typecheck + test + schema validation
├── docs/
│   ├── aapm-full.md                    # Complete AAPM specification
│   ├── architecture.md                 # System architecture overview
│   ├── glossary.md                     # AAPM terminology (35+ terms)
│   ├── three-tiers.md                  # Tier architecture detail
│   ├── feedback-engine.md              # Recursive Feedback Engine spec
│   ├── interaction-loop.md             # 7 state machines
│   ├── session-lifecycle.md            # Typed session contracts
│   ├── security-privacy.md             # GDPR/COPPA/CCPA compliance
│   ├── evaluation-framework.md         # 8 metrics + A/B testing
│   ├── patent-claims.md                # 12 provisional patent claims
│   ├── business-model.md               # Revenue streams + pricing
│   ├── investor-brief.md               # TAM, moat, funding ask
│   ├── persona-schema-guide.md         # How to create your own schema
│   ├── soft-landing-protocol.md        # Graceful recalibration protocol
│   ├── negotiation-collapse-recovery.md # Tier 3 failure recovery
│   ├── schema-marketplace.md           # Community schema ecosystem
│   ├── model-substitution.md           # LLM provider agnosticism
│   ├── language-expansion-checklist.md  # Adding new L1-L2 pairs
│   ├── pilot-study-protocol.md         # IRB-ready validation study
│   ├── transparency-layer.md           # Explainability architecture
│   └── adr/                            # 11 Architecture Decision Records
│       ├── 001 → 005                   # Foundation ADRs
│       ├── 006 → 010                   # Engine + IP ADRs
│       └── 011-l1-l2-transfer-format   # L1-L2 transfer spec
├── schemas/
│   ├── persona.schema.json             # JSON Schema v2.0.0
│   └── examples/                       # 8 pre-built persona schemas
├── packages/
│   ├── core/                           # @aapm/core — engine modules
│   │   └── src/                        # 12 modules with types + barrel exports
│   ├── ui/                             # @aapm/ui — component library
│   └── cli/                            # @aapm/cli — schema validation tool
├── prompts/                            # Prompt engineering library
│   ├── system/                         #   tier1, tier2, tier3 base prompts
│   ├── curriculum/                     #   friction analysis, curriculum gen
│   ├── refraction/                     #   tri-refraction generator
│   ├── npc/                            #   forward injection briefing
│   └── evaluation/                     #   register classifier
├── recipes/                            # Vibecoding step-by-step guides
├── ROADMAP.md                          # v0.4 → v1.0 milestones
├── CHANGELOG.md                        # Keep a Changelog format
├── CONTRIBUTING.md                     # CLA + contribution guide
└── SECURITY.md                         # Responsible disclosure policy
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

### Reference

| Document | Description |
|----------|-------------|
| [Full AAPM Specification](docs/aapm-full.md) | The complete pedagogical framework |
| [Architecture Overview](docs/architecture.md) | System architecture and components |
| [Three-Tier System](docs/three-tiers.md) | Tier architecture deep dive |
| [Feedback Engine](docs/feedback-engine.md) | Recursive Feedback Engine specification |
| [Interaction Loop](docs/interaction-loop.md) | 7 state machines — onboarding through async engagement |
| [Session Lifecycle](docs/session-lifecycle.md) | Typed contracts for all session phases |
| [Evaluation Framework](docs/evaluation-framework.md) | 8 quantitative metrics + A/B testing |
| [Security & Privacy](docs/security-privacy.md) | GDPR, COPPA, CCPA compliance architecture |
| [Glossary](docs/glossary.md) | AAPM-specific terminology (35+ terms) |
| [Persona Schema Guide](docs/persona-schema-guide.md) | How to create your own schema |

### IP & Business

| Document | Description |
|----------|-------------|
| [Patent Claims](docs/patent-claims.md) | 12 provisional patent claims with pseudocode |
| [Business Model](docs/business-model.md) | Revenue streams, pricing tiers, unit economics |
| [Investor Brief](docs/investor-brief.md) | TAM, competitive moat, funding ask |

### Protocols

| Document | Description |
|----------|-------------|
| [Soft Landing Protocol](docs/soft-landing-protocol.md) | Graceful proficiency recalibration |
| [Negotiation Collapse Recovery](docs/negotiation-collapse-recovery.md) | Tier 3 failure recovery sequences |
| [Pilot Study Protocol](docs/pilot-study-protocol.md) | IRB-ready mixed-methods validation study |

### Strategic

| Document | Description |
|----------|-------------|
| [Schema Marketplace](docs/schema-marketplace.md) | Community-driven persona schema ecosystem |
| [Model Substitution](docs/model-substitution.md) | LLM provider agnosticism + cost benchmarks |
| [Language Expansion](docs/language-expansion-checklist.md) | Checklist for adding new L1-L2 pairs |
| [Transparency Layer](docs/transparency-layer.md) | Explainability for learners, educators, auditors |

### Architecture Decision Records

| ADR | Decision |
|-----|----------|
| [001](docs/adr/001-three-tier-architecture.md) | Three-Tier Architecture |
| [002](docs/adr/002-recursive-feedback-engine.md) | Recursive Feedback Engine |
| [003](docs/adr/003-persona-schema-system.md) | Persona Schema System |
| [004](docs/adr/004-tri-refraction-interface.md) | Tri-Refraction Interface |
| [005](docs/adr/005-social-reputation-persistence.md) | Social Reputation Persistence |
| [006](docs/adr/006-interlanguage-hypothesis-engine.md) | Interlanguage Hypothesis Engine |
| [007](docs/adr/007-anti-fossilization-engine.md) | Anti-Fossilization Engine |
| [008](docs/adr/008-cultural-intelligence-model.md) | Cultural Intelligence Model |
| [009](docs/adr/009-affective-state-inference.md) | Affective State Inference |
| [010](docs/adr/010-npc-behavioral-authenticity.md) | NPC Behavioral Authenticity |
| [011](docs/adr/011-l1-l2-transfer-format.md) | L1-L2 Transfer Format |

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
