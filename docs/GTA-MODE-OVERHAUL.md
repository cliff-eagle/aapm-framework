# AAPM Framework — GTA-Mode Language Simulation Overhaul

> A complete technical brief for transforming the AAPM framework from a
> chat-dashboard into a living, open-world language simulation where
> players navigate authentic social environments, earn trust from NPCs,
> and acquire fluency through consequence.

*For the full masterclass document, see the original brief.*
*This file anchors the overhaul in the repository.*

---

## North Star

> Every session should feel like arriving in a foreign city with just
> enough of the language to get by — and watching that city open up
> as you earn trust, make mistakes, repair them, and gradually become
> someone who belongs there.

## Phases

| Phase | What | Days |
| --- | --- | --- |
| 1 | Schema Enhancement (Big Five, cultural overlays, flight-attendant-primary) | 1–2 |
| 2 | World Engine Runtime + SceneRenderer | 3–5 |
| 3 | Dialogue Engine | 6–9 |
| 4 | Companion Layer | 10–12 |
| 5 | RFE Pipeline Connection | 13–16 |
| 6 | Ambient Life | 17–19 |
| 7 | Tier 3 Scenarios | 20–24 |
| 8 | Persistence Layer | 25–27 |
| 9 | Deployment | 28–30 |

## Key Reference Files

| File | Purpose |
| --- | --- |
| `.cursorrules` | AAPM philosophy |
| `docs/world-state-contract.md` | World rendering data contract |
| `docs/character-control-spec.md` | NPC control taxonomy |
| `docs/three-tiers.md` | Tier architecture spec |
| `docs/adr/010-npc-behavioral-authenticity.md` | Big Five personality model |
| `docs/adr/005-social-reputation-persistence.md` | Invisible reputation system |
| `schemas/examples/hospitality-professional.yaml` | Domain schema |
| `packages/core/src/world-engine/index.ts` | WorldState types |
| `packages/core/src/feedback-engine/pipeline.ts` | RFE (extend, never replace) |
| `prompts/system/tier2-immersion-npc.md` | NPC prompt template |

## Three Unbreakable Rules

1. **Never humiliate the learner** — friction is a new objective, not a failure state
2. **Stay in the ZPD** — cap curriculum at 5 units, scale NPC patience to tier
3. **Sociolinguistic > Grammatical** — register-wrong is still wrong
