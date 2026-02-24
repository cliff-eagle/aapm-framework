# Rendering Tiers — Three Complementary Visualization Approaches

> **Principle**: *"Dynamically efficient and efficiently dynamic"* — each tier
> serves a different audience, device, and engagement depth.

## Overview

The AAPM Framework provides three distinct rendering approaches. They are
**complementary, not competing** — each serves a specific purpose:

```
┌───────────────────────────────────────────────────────────────┐
│                    RENDERING TIERS                             │
│                                                               │
│  Tier 1: MapLibre 2D (Web Demo)         ← aapm-mediterranean │
│  Tier 2: Three.js 3D (Rich Web App)     ← @aapm/world-renderer│
│  Tier 3: Unity 3D (Full Game)           ← @aapm/bridge C#     │
│                                                               │
│  All three connect to the same @aapm/core brain               │
│  via the Bridge Protocol (WebSocket)                          │
└───────────────────────────────────────────────────────────────┘
```

## Tier 1: MapLibre 2D Map — `aapm-mediterranean`

**Purpose**: Lightweight browser demo. Zero install. Works on any device.

| Aspect | Detail |
| ------ | ------ |
| Engine | MapLibre GL JS (WebGL 2D tiles) |
| Interaction | Click city markers → popup NPC panels → text chat |
| Rendering | CartoDB dark tiles, GeoJSON markers, CSS popups |
| Performance | Runs on phones, tablets, laptops |
| Data Source | Built-in `cities.ts`, `npcs.ts` (self-contained) |
| Bridge | `bridge-client.ts` → WebSocket to `@aapm/bridge` |

**Best For**: Investor demos, quick tryouts, mobile access, classrooms
without gaming hardware.

## Tier 2: Three.js 3D Globe + City — `@aapm/world-renderer`

**Purpose**: Rich web application with 3D exploration. No install needed
but benefits from a modern browser with WebGL 2.

| Aspect | Detail |
| ------ | ------ |
| Engine | Three.js (WebGL 3D) |
| Interaction | Rotating globe → fly to city → walk streets → talk to NPCs |
| Rendering | Procedural earth, star field, city generator, character controller |
| Performance | Desktop browsers, modern tablets |
| Data Source | `schema-adapter.ts` bridges `@aapm/core` schema data |
| Bridge | `WorldBridge.ts` connects session lifecycle |

**Best For**: The primary web-based learning experience. Interactive 3D
exploration that works in a browser without Unity.

### Modules

- **Globe**: `EarthSphere`, `StarField`, `CityPinSystem`, `TravelArc`, `GlobeControls`
- **City**: `CityGenerator`, `BuildingFactory`, `StreetSystem`, `PropSystem`
- **Character**: `PlayerCharacter`, `CharacterController`, `ThirdPersonCamera`
- **NPC**: `NPCEntity`, `NPCManager`, `npc-schema-adapter`
- **Scene**: `SceneManager` (globe↔city transition), `WorldBridge`

## Tier 3: Unity 3D — `@aapm/bridge` (C# Scripts)

**Purpose**: Full game experience. Realistic yacht sailing, docking at
ports, walking through real-world landmarks, immersive NPC conversations.

| Aspect | Detail |
| ------ | ------ |
| Engine | Unity (C# MonoBehaviours) |
| Interaction | Sail yacht → VHF radio → dock → walk port → talk NPCs |
| Rendering | Procedural meshes, physics-based sailing, weather system |
| Performance | Desktop/console (Unity player) |
| Data Source | `PortRegistryLoader.cs` + `PortScenarioLoader.cs` (YAML at runtime) |
| Bridge | `AAPMBridge.cs` → WebSocket to `@aapm/bridge` server |

**Best For**: The patent's flagship product. Full *Cielos del Mediterráneo*
game experience with realistic yacht physics and immersive environments.

### Systems (21 scripts, ~7,200 lines)

- **Yacht**: `YachtController`, `YachtInterior`, `SeaNavigator`
- **Port Generation**: `RealisticPortGenerator`, `PortServicesGenerator`, `PortEnvironmentGenerator`
- **NPCs**: `NPCSpawner`, `NPCController`, `NPCInteraction`
- **Scenarios**: `PortRegistryLoader`, `PortScenarioLoader`
- **UI**: `DialogueUI`, `ChartTableUI`, `VHFRadioUI`, `ScenarioChainUI`, `OnboardingUI`
- **Systems**: `GameManager`, `WeatherSystem`, `ProgressionManager`, `PlayerController`
- **Bridge**: `AAPMBridge`

## Data Flow

All three tiers consume the same underlying data and connect to the same
AI brain:

```
  schemas/ports-registry/*.yaml ──→ PortRegistryLoader (Unity)
  schemas/ports/*.yaml ───────────→ PortScenarioLoader (Unity)
  schemas/dialogue-templates/*.yaml→ DialogueUI (Unity) + NPC prompts
  schemas/persona.schema.json ────→ SchemaLoader (@aapm/core)
  schemas/examples/*.yaml ────────→ CLI validation + session init

  All Tiers:
    Player input → Bridge Protocol → @aapm/core Session Orchestrator
                                   → AI Provider (Google/OpenAI)
                                   → Response → Bridge → Render
```

## When to Use Which

| Scenario | Tier |
| -------- | ---- |
| "Show an investor in 30 seconds" | **Tier 1** (MapLibre) |
| "Student uses it in a browser" | **Tier 2** (Three.js) |
| "Full game demo / patent showcase" | **Tier 3** (Unity) |
| "I want to add a new port" | Add YAML to `schemas/ports-registry/` — all tiers benefit |
| "I want to add an NPC dialogue" | Add to `schemas/dialogue-templates/` — all tiers benefit |
