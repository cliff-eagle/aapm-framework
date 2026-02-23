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
│     templates/ — Starter kits                    │
└─────────────────────────────────────────────────┘
```

---

## Persona Schemas

The **Persona Schema** is the unit of infinite scalability. Every new domain is just a new YAML config:

```yaml
# schemas/examples/premier-league.yaml
persona:
  id: "premier-league-footballer"
  learner_profile:
    native_language: "es"
    target_languages: ["en"]
    domain: "professional-sports"
  environment:
    tier_2:
      setting: "Premier League training ground"
      locations: [training-pitch, locker-room, press-facility]
    tier_3:
      scenarios:
        - type: contract-negotiation
          authority: club-director
        - type: press-conference
          authority: media-panel
```

### Available Schemas

| Schema | Languages | Domain |
|--------|-----------|--------|
| [`premier-league`](schemas/examples/premier-league.yaml) | ES → EN | Professional football |
| [`mediterranean-yacht`](schemas/examples/mediterranean-yacht.yaml) | Any → FR/IT/ES/GR/TR | Maritime hospitality |
| [`medical-migration`](schemas/examples/medical-migration.yaml) | Any → EN/DE | Healthcare professionals |
| [`university-admissions`](schemas/examples/university-admissions.yaml) | Any → EN/FR/DE | Academic preparation |
| [`tech-hub`](schemas/examples/tech-hub.yaml) | Any → EN/ZH/DE | Tech industry relocation |
| [`heritage-recovery`](schemas/examples/heritage-recovery.yaml) | Partial → Full L2 | Heritage language reconnection |

→ **[How to create your own schema](docs/persona-schema-guide.md)**

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
|------|----------------------------|
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
├── .cursorrules                    # AI coding context
├── docs/                           # AAPM specification & guides
├── schemas/                        # Persona Schema definitions
│   ├── persona.schema.json         # JSON Schema
│   └── examples/                   # Pre-built schemas
├── packages/
│   ├── core/                       # Engine packages
│   │   └── src/
│   │       ├── agent-intelligence/ # NPC system
│   │       ├── feedback-engine/    # Recursive Feedback Engine
│   │       ├── persistence/        # Memory & reputation
│   │       ├── phoneme-engine/     # Pronunciation analysis
│   │       ├── tier-manager/       # Three-tier state machine
│   │       └── retention/          # Axis Z engagement
│   ├── ui/                         # Interface components
│   └── cli/                        # CLI tools
├── prompts/                        # Prompt engineering library
├── recipes/                        # Vibecoding step-by-step guides
├── templates/                      # Starter app templates
└── examples/                       # Complete reference apps
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

## The Recursive Feedback Engine

The core innovation: every interaction generates data that improves the next interaction.

```
Session → Friction Extraction → Pattern Classification → Micro-Curriculum → Forward Injection → Next Session
```

Three temporal loops:

- **Micro-Loop**: Real-time scaffolding during conversation
- **Macro-Loop**: Post-session curriculum generation
- **Persistence Loop**: Long-term social world evolution

→ **[Technical specification](docs/feedback-engine.md)**

---

## Contributing

We welcome new Persona Schemas, prompt improvements, and recipe contributions. See the [issue templates](.github/ISSUE_TEMPLATE/) for structured proposals.

---

## License

MIT — Build freely, teach effectively.

---

<p align="center">
  <em>"People don't pay for language lessons. They pay for outcomes."</em>
</p>
