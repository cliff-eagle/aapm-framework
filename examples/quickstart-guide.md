# Code Examples & Quickstart Guide

> These examples show how to use the AAPM Framework for common tasks.

## Table of Contents

1. [Start a Learning Session (TypeScript)](#1-start-a-learning-session)
2. [Connect Unity to the Bridge Server](#2-connect-unity-to-the-bridge)
3. [Add a New Port to the Registry](#3-add-a-new-port)
4. [Create an NPC Persona](#4-create-an-npc-persona)
5. [Validate a Schema File](#5-validate-a-schema)
6. [Build a Custom Dialogue Template](#6-custom-dialogue-template)

---

## 1. Start a Learning Session

```typescript
import {
  createSessionOrchestrator,
  loadSchema,
  createEventBus,
} from '@aapm/core';

// 1. Load a persona schema
const schema = await loadSchema('./schemas/examples/mediterranean-yacht.yaml');

// 2. Create event bus for cross-module communication
const eventBus = createEventBus();

// 3. Start a session
const orchestrator = createSessionOrchestrator({
  schema,
  learnerId: 'captain-1',
  nativeLanguage: 'English',
  targetLanguage: 'Spanish',
  cefrLevel: 'A2',
  eventBus,
});

// 4. Send a learner message
const response = await orchestrator.sendMessage({
  text: 'Buenos días, quisiera atracar en el puerto',
  context: {
    location: 'Barcelona harbor',
    npcId: 'harbor-master',
  },
});

console.log(response.npcReply);    // NPC response in target language
console.log(response.feedback);     // Pronunciation/grammar feedback
console.log(response.vocabulary);   // New words encountered
```

## 2. Connect Unity to the Bridge

### Server Side (Terminal)

```bash
# Start the bridge server
npx tsx packages/bridge/src/server.ts

# Output: 🌉 AAPM Bridge Server listening on ws://localhost:8765
```

### Unity Side (C#)

```csharp
// AAPMBridge.cs is already included — just configure:
// 1. Create empty GameObject "AAPMBridge"
// 2. Attach AAPMBridge.cs
// 3. Set serverUrl to "ws://localhost:8765"

// Then in GameManager or any script:
AAPMBridge.Instance.InitSession(
    "yacht-captain-mediterranean",
    "captain-1",
    "English",
    "Spanish",
    "A2"
);

// Send NPC dialogue
AAPMBridge.Instance.SendNPCDialogue("harbor-master", "I need a berth for tonight");

// Listen for responses
AAPMBridge.Instance.OnMessageReceived += (msg) => {
    if (msg.type == "dialogue/response") {
        DialogueUI.Instance?.ShowResponse(msg.payload);
    }
};
```

## 3. Add a New Port

Create a new YAML entry in `schemas/ports-registry/`:

```yaml
# schemas/ports-registry/my-region.yaml
ports:
  - id: mykonos
    name: "Mykonos"
    country: "Greece"
    coordinates:
      lat: 37.4467
      lon: 25.3289
    marina: "Mykonos New Port"
    language: "Greek"
    difficulty: "B1"
    cultural_highlights:
      - "Windmills of Kato Myli"
      - "Little Venice waterfront"
      - "Paraportiani Church"
    npcs:
      - name: "Γιώργος"
        role: "harbor-master"
        personality: "Laid-back island style, speaks slowly"
        languages: ["Greek", "English"]
      - name: "Ελένη"
        role: "taverna-owner"
        personality: "Motherly, insists you try her moussaka"
        languages: ["Greek", "English", "French"]
```

The port is automatically available to:

- **Unity** via `PortRegistryLoader` (reads YAML at runtime)
- **Three.js** if coordinates are added to the schema adapter
- **MapLibre** if added to the cities data

## 4. Create an NPC Persona

Use the `forward-injection-briefing` prompt format:

```yaml
# In a port YAML or standalone file
npc:
  name: "Captain Stavros"
  role: "retired-fisherman"
  age: 72
  language: "Greek"
  personality: >
    Grizzled old fisherman who's been at this harbor for 50 years.
    Speaks slowly and clearly. Loves telling stories about the old
    days. Uses simple vocabulary. Will teach you the names of fish
    and the parts of his caïque (traditional fishing boat).

  behavioral_rules:
    - "Always starts with a weather observation"
    - "Refuses to speak English — pretends not to understand"
    - "Offers you coffee (which you should accept)"
    - "Gets emotional when talking about overfishing"

  vocabulary_focus:
    - fish names (σαρδέλα, μπαρμπούνι, χταπόδι)
    - boat parts (πλώρη, πρύμνη, πανί)
    - weather (αέρας, κύμα, θάλασσα)
    - time expressions (χτες, σήμερα, αύριο)

  dialogue_hooks:
    - trigger: "player asks about fishing"
      response_style: "Enthusiastic, launches into a 10-minute story"
    - trigger: "player uses formal Greek"
      response_style: "Laughs, tells them to relax, teaches informal version"
```

## 5. Validate a Schema

```bash
# Validate a persona YAML against the schema
npx tsx packages/cli/src/index.ts validate-schema schemas/examples/mediterranean-yacht.yaml

# Output:
# ✅ Schema valid!
# ├── persona: ✓ (6/6 required fields)
# ├── learner_profile: ✓ (3/3 required fields)
# ├── vocabulary_matrix: ✓ (3/3 tiers)
# ├── environment: ✓ (2/2 tiers)
# ├── companion: ✓
# ├── retention_profile: ✓
# └── evaluation: ✓
```

## 6. Custom Dialogue Template

Dialogue templates define structured conversation flows for service NPCs:

```yaml
# schemas/dialogue-templates/my-scenario.yaml
template:
  id: chandlery-shopping
  name: "Marine Supply Shopping"
  service_role: chandler
  difficulty_range: [A2, B2]

phases:
  - id: entering
    name: "Entering the Chandlery"
    npc_initiates: true
    prompts:
      A2: "Greet them and ask what they need for their boat"
      B1: "Ask about their boat type and upcoming voyage to recommend gear"

  - id: selecting
    name: "Choosing Equipment"
    npc_initiates: false
    prompts:
      A2: "Show them 3 options with clear prices"
      B1: "Compare brands, explain quality differences, recommend based on their route"
    vocabulary_targets:
      - rope / cuerda / cordage / corda
      - shackle / grillete / manille / grillo
      - fender / defensa / pare-battage / parabordo
      - chart / carta náutica / carte marine / carta nautica

  - id: paying
    name: "Payment"
    npc_initiates: true
    prompts:
      A2: "State total, ask cash or card"
      B1: "Offer a discount for buying multiple items, mention delivery to the marina"
```

---

## Architecture Quick Reference

```
@aapm/core          — AI brain: sessions, dialogue, agents, feedback
@aapm/ui            — React components: chat, scenes, settings
@aapm/world-renderer — Three.js: globe, cities, NPCs, characters
@aapm/bridge        — WebSocket server: Unity ↔ TypeScript
@aapm/cli           — Schema validation tools

schemas/            — YAML data: personas, ports, dialogues
templates/          — Starter persona templates
prompts/            — System/NPC/curriculum prompt templates
docs/               — Architecture, patents, specs, ADRs
```
