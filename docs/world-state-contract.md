# World State Contract

> Formal specification for the AAPM World Engine: the data structures and rules
> governing Tier 2 immersive environments.

---

## Overview

Every Tier 2 environment is a **world** — a graph of locations populated by NPCs, governed by time, and punctuated by ambient events. The World State Contract defines how these elements interact so that every vibecoded Tier 2 world is structurally consistent and interoperable with the AAPM framework.

---

## Location Graph

The world is a directed graph where nodes are locations and edges are traversal paths.

```typescript
interface Location {
  id: string;
  name: Record<string, string>;    // L2 name + L1 translation
  description: string;             // scene-setting narrative
  type: 'public' | 'private' | 'commercial' | 'institutional';
  connections: string[];           // IDs of reachable locations
  npcs: {
    resident: string[];            // always present
    transient: string[];           // appear based on time/events
  };
  interactables: Interactable[];   // objects the learner can interact with
  ambientDescription: string;      // background sensory detail for immersion
  unlockCondition?: string;        // prerequisite (reputation, tier, quest)
}

interface Interactable {
  id: string;
  name: Record<string, string>;
  type: 'object' | 'sign' | 'menu' | 'document' | 'device';
  vocabularyDomain: string;        // maps to vocabulary_matrix category
  interactionPrompt: string;       // what happens when learner interacts
}
```

### Location Graph Rules

1. Every world must have at least **2 locations** connected bidirectionally
2. At least one location must be `public` (no unlock condition)
3. Every location must have at least **1 resident NPC**
4. Connections must be symmetric: if A → B, then B → A (unless narratively justified)

---

## Time System

```typescript
interface TimeSystem {
  enabled: boolean;
  dayLengthMinutes: number;           // real-time minutes per in-game day
  currentTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  timeAffectsNPCs: boolean;           // NPCs change behavior by time
  timeAffectsLocations: boolean;      // locations open/close by time
  schedule: TimeSlot[];
}

interface TimeSlot {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  npcAvailability: Record<string, boolean>;   // NPC ID → available?
  locationAccessibility: Record<string, boolean>;
  ambientEventProbability: Record<string, number>;
}
```

---

## Ambient Events

Ambient events are world-level occurrences that create communicative opportunities.

```typescript
interface AmbientEvent {
  id: string;
  name: string;
  trigger: 'time-based' | 'reputation-gated' | 'random' | 'quest-triggered';
  triggerCondition: string;           // expression evaluated against world state
  description: string;
  npcReactions: Record<string, string>;  // NPC ID → behavioral change
  vocabularyDomain: string;              // friction opportunities
  duration: 'instant' | 'scene' | 'persistent';
  learnerCanIgnore: boolean;
}
```

### Ambient Event Rules

1. At least **1 ambient event per location** must exist in every world
2. Events must map to a `vocabularyDomain` so friction detection can categorize them
3. `reputation-gated` events use the Social Reputation System — the learner earns access
4. Events must never **force** the learner to respond — `learnerCanIgnore` governs this

---

## NPC Presence Rules

NPCs exist in the world graph according to these rules:

| Rule | Description |
| --- | --- |
| **Residency** | Resident NPCs are always at their assigned location during accessible time slots |
| **Transience** | Transient NPCs appear based on time, events, or reputation gates |
| **Mood Persistence** | NPC mood carries between interactions within a session |
| **Reputation Memory** | NPC remembers learner reputation across sessions (Persistence Loop) |
| **Forward Injection** | NPCs who received injection directives take priority in encounter scheduling |

---

## World State Object

The canonical runtime object combining all elements:

```typescript
interface WorldState {
  schemaId: string;
  locations: Location[];
  timeSystem: TimeSystem;
  ambientEvents: AmbientEvent[];
  activeEvents: string[];              // currently active event IDs
  learnerLocation: string;             // current location ID
  npcStates: Record<string, NPCWorldState>;
  sessionId: string;
}

interface NPCWorldState {
  npcId: string;
  currentLocation: string;
  available: boolean;
  mood: string;
  reputationWithLearner: number;       // [0.0, 1.0]
  injectionDirectives: string[];       // active Forward Injection targets
  lastInteractionTimestamp: number;
}
```

---

## Related Documents

| Document | Purpose |
| --- | --- |
| [character-control-spec.md](character-control-spec.md) | Character controllability taxonomy |
| [aam-charter.md](aam-charter.md) | AAM philosophy + event bus |
| [three-tiers.md](three-tiers.md) | Tier architecture — Tier 2 context |
| [ADR-010](adr/010-npc-behavioral-authenticity.md) | NPC behavioral authenticity |
