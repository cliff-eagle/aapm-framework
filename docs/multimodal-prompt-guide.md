# Multimodal Prompt Guide

> How to use written, visual, and audio prompts as reference points for generating
> AAPM-powered solutions.

---

## Overview

The AAPM accepts three types of reference prompts as starting input. Each type maps to specific schema fields and produces a specific class of output. Prompts can be combined — a complete vibecoding session typically uses all three.

---

## Written Prompts

Written prompts specify the **domain, learner profile, and communicative scenarios**.

### What to Include

| Field | Example |
| --- | --- |
| Target domain | "Brazilian chef relocating to Tokyo" |
| L1 → L2 pair | Portuguese → Japanese |
| Learner age and background | 32, professional chef, limited travel experience |
| Key scenarios | Fish market negotiation, kitchen team coordination, menu creation |
| Vocabulary priorities | Culinary terminology, keigo (honorific speech), counter words |
| Cultural challenges | Japanese hierarchy norms, indirect communication, gift-giving customs |

### Output Generated

- Full `persona.yaml` with all required sections
- System prompts for Tier 1 Companion, Tier 2 NPCs, Tier 3 authority figures
- Forward Injection template with domain-specific target forms
- Vocabulary matrix organized by communicative domain

### Schema Fields Mapped

```text
Written Prompt → persona.learner_profile
              → persona.vocabulary_matrix
              → persona.environment (scenarios)
              → persona.companion (personality, L1/L2 config)
              → persona.evaluation (domain-specific metrics)
```

---

## Visual Prompts

Visual prompts specify **scene layout, NPC appearance, environment aesthetics**, and location topology.

### Visual Prompt Contents

| Field | Example |
| --- | --- |
| Location layout | Sketch/description of fish market with stall grid and office area |
| NPC appearance cues | "Old fishmonger in rubber boots", "young receptionist in uniform" |
| Environment aesthetic | Wet concrete floors, fluorescent lighting, steam from ice |
| UI color scheme | Ocean blues, warm market oranges, clean whites |
| Location graph | Market → Restaurant → Apartment → Train station (connected) |

### Visual Output Generated

- World state contract with location graph, connections, and interactables
- Tier 2 location descriptions with ambient sensory detail
- UI theme tokens (color palette, typography, spacing)
- Ambient event schedule tied to locations

### Visual Schema Fields Mapped

```text
Visual Prompt → world_state.location_graph
             → world_state.ambient_events
             → persona.environment.locations
             → (UI theme — outside schema, applied to @aapm/ui components)
```

---

## Audio Prompts

Audio prompts specify **target phonemes, prosody patterns, accent references**, and cultural vocal register norms.

### Audio Prompt Contents

| Field | Example |
| --- | --- |
| Target phoneme set | Japanese pitch accent, mora-timed rhythm, /ɾ/ flap |
| Prosody style | Polite rising intonation, business-flat declaratives |
| Accent reference | Standard Tokyo dialect (NHK broadcast style) |
| Cultural vocal norms | Lower pitch = more formal (Japanese keigo register) |
| Pronunciation priorities | Long vowels (おう vs おお distinction), geminate consonants |

### Audio Output Generated

- Phoneme Alignment Engine configuration
- PAE reference model selection (Wav2Vec2 / Azure Speech)
- Pronunciation-specific curriculum priority list
- Comprehensibility scoring weights

### Audio Schema Fields Mapped

```text
Audio Prompt → input_modalities.audio
            → (PAE config — separate from persona schema)
            → retention_profile (pronunciation-weighted retention)
```

---

## Combining Prompts

The most effective vibecoding sessions combine all three prompt types:

```text
┌─────────────────────────────────────────────────────┐
│  WRITTEN:  "Brazilian chef in Tokyo"                │
│  VISUAL:   [sketch of Tsukiji market layout]        │
│  AUDIO:    [clip of Tokyo-dialect keigo speech]      │
│                                                     │
│         ↓ AAPM Router processes all three ↓          │
│                                                     │
│  → Persona YAML (from written)                      │
│  → World state contract (from visual)               │
│  → PAE config (from audio)                          │
│  → System prompts (merged from all three)           │
│  → Forward Injection template (merged)              │
│  → UI theme (from visual)                           │
│  → Pronunciation curriculum (from audio)            │
└─────────────────────────────────────────────────────┘
```

---

## Prompt-to-Schema Field Mapping (Complete)

| Prompt Type | Schema Section | Precedence |
| --- | --- | --- |
| Written | `persona`, `learner_profile`, `vocabulary_matrix`, `companion`, `evaluation` | Primary |
| Visual | `world_state`, `environment`, `character_control` (NPC appearance) | Primary |
| Audio | `input_modalities.audio` | Primary |
| Written + Visual overlap | `environment.locations` | Written provides names; visual provides layout |
| Written + Audio overlap | `vocabulary_matrix` (pronunciation items) | Audio priorities override written frequency ordering |

---

## Related Documents

| Document | Purpose |
| --- | --- |
| [VIBECODE_ENTRY.md](../VIBECODE_ENTRY.md) | Master vibecoding prompt |
| [persona-schema-guide.md](persona-schema-guide.md) | How to create persona schemas |
| [world-state-contract.md](world-state-contract.md) | World state specification |
| [character-control-spec.md](character-control-spec.md) | Character control taxonomy |
