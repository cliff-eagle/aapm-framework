# Autonomous and Adaptive Matrix (AAM) — Philosophy Charter

> The AAM is not a single algorithm. It is a philosophy of recursive, self-correcting,
> multi-layer interaction that applies with equal force to curriculum generation,
> the playable world, controllable characters, and NPC behavior.

---

## Motto

**"Dynamically Efficient and Efficiently Dynamic"**

- **Dynamically Efficient**: The system operates efficiently in its default state — no module does work another module already did. Routing is automatic. Workarounds are pre-computed.
- **Efficiently Dynamic**: Every layer exposes runtime customization without session interruption. The full range of customization costs a single UI interaction.
- **Co-enforced**: Neither property is sacrificed for the other. They are architecturally co-enforced by event bus isolation and the runtime customization surface design.

---

## The Four Domains

| Domain | AAM Role | Customization Surface |
| --- | --- | --- |
| **Curriculum Generation** | Macro-Loop + Micro-Curriculum Pipeline | Persona schema, friction classifier, delivery format router |
| **World Engine** | Tier 2 immersive environment | World-state contract, location graph, ambient event scheduler |
| **Controllable Characters** | Player-facing social interaction surface | Control mode (full / choice-tree / voice), ZPD pressure level |
| **NPCs (Autonomous)** | Tier 2 + 3 social world inhabitants | Personality model, mood state, Forward Injection directives, reputation |

Each domain is **independently customizable** yet **semantically interoperable**. A change in one domain propagates through the event bus, not through direct state mutation.

---

## The Event Bus — Interoperability Guarantee

All cross-component communication flows through a typed event bus using a standardized event envelope. **No component may write directly to another component's state.** This ensures any layer can be replaced, upgraded, or domain-specialized without cascading failures.

### Event Types

| Event Type | Emitted By | Consumed By | Description |
| --- | --- | --- | --- |
| `FRICTION_DETECTED` | Feedback Engine | IHE, Curriculum Gen | Lexical, phonemic, morphosyntactic, pragmatic, cultural, or register friction found |
| `AFFECTIVE_STATE_CHANGED` | Affective Inference | Pressure Calibrator, Tier Manager | Learner signal crossed threshold — triggers pressure recalibration |
| `FORWARD_INJECTION_READY` | Macro-Loop Pipeline | NPC Behavior System | Generated directives — NPCs in next session receive briefing |
| `REPUTATION_DELTA` | Social Reputation | NPC Behavior System | Reputation score updated — governs NPC warmth and accessibility |
| `WORLD_STATE_CHANGED` | World Engine | NPC Behavior, UI | Location, time, ambient event, or NPC presence updated |
| `CURRICULUM_GENERATED` | Macro-Loop Pipeline | Delivery Router | Micro-curriculum payload ready — triggers format selection |
| `TIER_TRANSITION` | Tier Manager | All modules | Learner qualifies to advance or retreat — Soft Landing Protocol triggered |
| `NPC_MOOD_CHANGED` | NPC Personality | NPC Behavior System | Internal mood state updated — affects register and patience |
| `SCHEMA_ACTIVATED` | Schema Loader | All modules | New persona schema loaded — all modules reconfigure |
| `CONTROL_MODE_CHANGED` | Runtime Controls | Character Controller | Control mode switched mid-session (runtime customization) |

### Event Envelope Format

```typescript
interface AAMEvent<T extends AAMEventType = AAMEventType> {
  type: T;
  timestamp: number;
  sessionId: string;
  source: string;       // emitting module ID
  payload: AAMEventPayload[T];
  metadata?: {
    correlationId?: string;  // links related events
    tier?: 1 | 2 | 3;
    schemaId?: string;
  };
}
```

---

## Runtime Customization Controls

The AAM philosophy explicitly requires customization **during use**, not just at configuration time. The following controls must be exposed through the UI layer:

| Control | Effect | Default |
| --- | --- | --- |
| **Affective Pressure Slider** | Manual override of system pressure calibration | Auto (system-managed) |
| **Tier Unlock Toggle** | Educator or learner manually advances/retreats tier | Locked (system-gated) |
| **Refraction Panel Toggle** | Show/hide Tri-Refraction Interface on any turn | Visible |
| **NPC Personality Dial** | Adjust warmth/formality of current NPC in real time | Schema default |
| **Schema Hot-Swap** | Load new persona schema mid-session without losing state | n/a |
| **Delivery Format Selector** | Change micro-curriculum output format for current session | Auto (retention-profile) |
| **Forward Injection Override** | Manually add a target form to next session's directives | System-generated only |

### Implementation Constraint

Every runtime control change:

1. Emits the corresponding event through the bus
2. Takes effect **without session interruption**
3. Does **not** require reinitialization of dependent layers
4. Is **logged as a session event** for post-session analysis

---

## Related Documents

| Document | Purpose |
| --- | --- |
| [architecture.md](architecture.md) | System modules and data flow |
| [world-state-contract.md](world-state-contract.md) | World Engine formal spec |
| [character-control-spec.md](character-control-spec.md) | Character control taxonomy |
| [VIBECODE_ENTRY.md](../VIBECODE_ENTRY.md) | Master vibecoding prompt |

---

*"Dynamically Efficient and Efficiently Dynamic"*
