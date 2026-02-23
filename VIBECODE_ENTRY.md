# AAPM Vibecoding Entry Point

> **The single file any AI coding tool needs to build an AAPM-powered application.**
> Read this first. Follow it exactly. It references everything else.

---

## Prerequisite Reading Order

Before generating any code, internalize the AAPM repository in this exact order.
Each file builds on the last. **Skipping steps produces architecturally inconsistent output.**

| Step | File | Purpose |
| --- | --- | --- |
| 1 | `.cursorrules` | AAPM philosophy, three unbreakable rules, tier behavior parameters |
| 2 | `docs/glossary.md` | 40+ AAPM-specific terms — prevents hallucinated terminology |
| 3 | `docs/architecture.md` | System modules, data flow, NPC prompt stack, cross-module integration map |
| 4 | `docs/three-tiers.md` | Tier behavior, failure states, scaffolding rules |
| 5 | `docs/feedback-engine.md` | Recursive Feedback Engine specification — the core patent architecture |
| 6 | `docs/aam-charter.md` | Autonomous and Adaptive Matrix philosophy — the interoperability guarantee |
| 7 | `schemas/persona.schema.json` | The canonical configuration contract |
| 8 | `schemas/examples/premier-league.yaml` | Canonical example of a complete persona schema |
| 9 | `prompts/system/tier1-companion.md` | Base prompt: Tier 1 Companion persona |
| 10 | `prompts/system/tier2-immersion-npc.md` | Base prompt: Tier 2 Immersion NPC |
| 11 | `prompts/system/tier3-authority.md` | Base prompt: Tier 3 Authority NPC |
| 12 | `prompts/curriculum/micro-curriculum-generator.md` | Macro-Loop Phase 3 prompt |
| 13 | `prompts/npc/forward-injection-briefing.md` | Forward Injection directive prompt |
| 14 | `recipes/new-persona-from-scratch.md` | Step-by-step: new domain persona schema |
| 15 | `recipes/new-tier2-environment.md` | Step-by-step: immersive world environment |
| 16 | `packages/core/src/types.ts` | Canonical TypeScript types — never contradict these |
| 17 | `packages/core/src/feedback-engine/pipeline.ts` | RFE pipeline — extend, do not replace |
| 18 | `docs/dependency-graph.md` | Build order enforcement — what depends on what |

---

## The Master Vibecoding Prompt

Copy this prompt verbatim into Cursor, Lovable, Bolt, v0, Replit Agent, or any
agentic coding environment as the session-opening context.

```text
# AAPM VIBECODING SESSION — MASTER PROMPT

You are building inside the AAPM Framework (Autonomous Adaptive
Pedagogical Matrix). Before writing any code:

STEP 1: Read .cursorrules completely.
STEP 2: Read docs/glossary.md. Memorize AAPM terminology.
STEP 3: Read docs/architecture.md and docs/feedback-engine.md.
STEP 4: Read docs/aam-charter.md. Understand the four AAM domains.
STEP 5: Read schemas/persona.schema.json + one example schema.
STEP 6: Read all prompts/ files before writing any LLM prompts.
STEP 7: Read docs/dependency-graph.md before sequencing your build.

YOUR BUILD TASK: [INSERT DOMAIN HERE, e.g. "a lifesim for a
Brazilian chef relocating to Tokyo"]

FOLLOW THESE PHASES IN ORDER:

Phase 1:  Create persona YAML from schema template
Phase 2:  Implement RFE pipeline (extend pipeline.ts stub)
Phase 3:  Build Tier 1 Companion with session memory
Phase 4:  Build Tier 2 world (use recipes/new-tier2-environment.md)
Phase 5:  Implement Forward Injection NPC briefing
Phase 6:  Wire Tri-Refraction Interface (RefractionPanel component)
Phase 7:  Build Tier 3 authority scenario
Phase 8:  Connect Phoneme Alignment Engine (stub → real)
Phase 9:  Implement Persistence Layer (vector DB + relations)
Phase 10: Expose runtime customization controls (AAM charter)

THREE UNBREAKABLE RULES:
  1. NEVER break the ZPD — every interaction must be calibrated
  2. NEVER humiliate the learner — error is data, not failure
  3. NEVER bypass the affective filter — safety enables acquisition

QUALITY CHECK: Every feature must answer "which tier does this
belong to?" If it doesn't belong to a tier, it doesn't belong
in the product.

WHEN BLOCKED: Consult AAPM_ROUTER.md for the workaround library.
Every common failure mode has a pre-computed resolution.
```

---

## Quality Gates Between Phases

Do not proceed to the next phase until the gate condition is met.

| Transition | Gate Condition |
| --- | --- |
| Phase 1 → 2 | CLI validator passes: `npx aapm validate schemas/your-schema.yaml` |
| Phase 2 → 3 | Pipeline unit test passes: friction point → micro-curriculum, no runtime errors |
| Phase 3 → 4 | Tier 1 session completes: learner sends 5 messages, receives contextual Companion responses |
| Phase 4 → 5 | Tier 2 world renders 2+ locations with navigable NPCs; no world-state console errors |
| Phase 5 → 6 | Forward Injection directive verified in NPC system prompt for next session |
| Phase 6 → 7 | RefractionPanel renders all 3 registers with metalinguistic explanation |
| Phase 7 → 8 | Tier 3 scenario completes (both success and collapse paths) without runtime errors |
| Phase 8 → 9 | Phoneme Engine returns real score or graceful fallback (never crashes session) |
| Phase 9 → 10 | Session state survives page refresh: NPC memory, reputation, matrix coordinates restored |
| Phase 10 → Ship | All runtime controls function without breaking session state. Schema hot-swap tested. |

---

## The Infinite Solution Generator Loop

```text
┌─────────────────────────────────────────────────────────────┐
│                  AAPM GENERATOR LOOP                        │
│                                                             │
│  SEED ──→ COMPILE ──→ BUILD ──→ ITERATE ──→ SEED ...       │
│                                                             │
│  SEED:    Provide reference prompt(s) — written/visual/audio│
│  COMPILE: Router maps prompts → schema → world contract     │
│  BUILD:   Phases 1-10 against compiled schema               │
│  ITERATE: Runtime controls refine; session data feeds back  │
│                                                             │
│  Each iteration produces one complete, pedagogically sound, │
│  production-ready AAPM application.                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Multimodal Reference Points

The AAPM accepts three types of reference prompts as starting input:

| Input Type | What It Specifies | Output Generated |
| --- | --- | --- |
| **Written** | Domain, learner profile, L1-L2, scenarios, vocab | Persona YAML + system prompts + Forward Injection template |
| **Visual** | Scene layout, NPC appearance, environment, UI | World state contract + location graph + UI theme + ambient events |
| **Audio** | Target phonemes, prosody, accent, vocal register | PAE config + reference model + pronunciation curriculum priority |

→ See `docs/multimodal-prompt-guide.md` for full specification.

---

## Implementation Standards — Read Before Writing Any Code

> Source: [IMPLEMENTATION_MASTERCLASS.md](IMPLEMENTATION_MASTERCLASS.md) Chapter 10

**BEFORE IMPLEMENTING ANY MODULE, CONFIRM:**

1. You have read `.cursorrules`, the relevant ADR, and `IMPLEMENTATION.md` (if exists).
2. You understand which `AAPMEventType` this module emits and consumes.
3. You have identified all external dependencies and confirmed adapter packages exist.

**EVERY FUNCTION YOU WRITE MUST:**

- Begin with a **PRECONDITION BLOCK** that throws `PipelineError` on invalid input.
- End with a **POSTCONDITION BLOCK** that asserts structural invariants before returning.
- Thread `correlationId` through every log and every emitted event.
- Use **injected interfaces** for ALL external calls — never import SDKs directly.
- Implement a **Null Object** for every optional dependency.
- Export a `register(bus, deps) => () => void` function for bus integration.
- Classify all errors as `retryable: true` or `retryable: false`.

**EVERY MODULE YOU COMPLETE MUST INCLUDE:**

- `packages/core/src/[module]/IMPLEMENTATION.md` (9-section template)
- Test file: Section A fixtures / B preconditions / C logic / D bus / E failures
- Passing `vitest run` with zero failures before reporting complete.
- `CHANGELOG.md` entry with **Pedagogical Impact** field.
- JSDoc on every exported function following the masterclass template.

**PEDAGOGICAL INVARIANTS — NEVER VIOLATE:**

- The Affective Filter is real. Anxiety blocks acquisition. Never produce output
  that could humiliate, shame, or publicly expose learner error.
- Stay in the ZPD. Cap curriculum units at 5 per session. Never overload.
- Forward Injection is INVISIBLE. NPC briefings must feel natural. Max 5 active.
- Sociolinguistic > grammatical. Register and pragmatic errors rank higher than
  minor grammatical errors in curriculum priority.

**MOTTO:** Dynamically Efficient = correct on first execution.
Efficiently Dynamic = changeable without breaking neighbours.
If your implementation fails either condition, do not report it as complete.

---

## Related Documents

| Document | Purpose |
| --- | --- |
| [IMPLEMENTATION_MASTERCLASS.md](IMPLEMENTATION_MASTERCLASS.md) | Full engineering standards (10 chapters) |
| [AAPM_ROUTER.md](AAPM_ROUTER.md) | Framework routing + workaround library |
| [docs/aam-charter.md](docs/aam-charter.md) | AAM philosophy + runtime customization spec |
| [docs/dependency-graph.md](docs/dependency-graph.md) | Build order enforcement |
| [docs/implementation-checklist.md](docs/implementation-checklist.md) | Per-module quality gate |
| [docs/world-state-contract.md](docs/world-state-contract.md) | World state specification |
| [docs/character-control-spec.md](docs/character-control-spec.md) | Character control taxonomy |

---

> *"Dynamically Efficient and Efficiently Dynamic"*
