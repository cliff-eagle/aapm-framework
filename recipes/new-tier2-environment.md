# Recipe: Building a New Tier 2 Environment

> Step-by-step guide for creating a complete Tier 2 immersion world
> for any domain Persona Schema.

---

## Prerequisites

- A completed `learner_profile` section in your Persona Schema
- At least 3 vocabulary domains defined in `vocabulary_matrix`
- Understanding of the target culture's social norms

---

## Step 1: Define the Setting

Write a 2-3 sentence description of the Tier 2 world. This is the
social universe the learner inhabits — it should feel like a real place.

```yaml
tier_2:
  setting: >
    A coastal Italian town where the learner has recently moved.
    They need to navigate daily life: shopping, banking, medical
    appointments, socializing at the local bar.
```

**Key principle:** The setting must create NATURAL communicative needs.
The learner should HAVE to speak L2 to accomplish real goals.

---

## Step 2: Design Locations (minimum 3)

Each location should:

- Serve a distinct communicative function
- Have its own vocabulary focus
- Create different register requirements

```yaml
locations:
  - id: mercato-centrale
    name: "Mercato Centrale"
    description: "Bustling indoor market with vendors, regulars, and tourists"
    npc_ids: [vendor-marco, fishmonger-rosa]
    typical_tasks:
      - "Buy ingredients for a specific recipe"
      - "Ask about seasonal products"
      - "Negotiate prices for bulk purchases"
    vocabulary_focus: [food-vocabulary, numbers-and-prices]

  - id: banca-popolare
    name: "Banca Popolare"
    description: "Local bank branch — the most formal Tier 2 location"
    npc_ids: [teller-giuseppe]
    typical_tasks:
      - "Open a bank account"
      - "Explain a transaction issue"
      - "Request a new card"
    vocabulary_focus: [financial-vocabulary, formal-requests]

  - id: bar-stella
    name: "Bar Stella"
    description: "Neighborhood café where locals gather for espresso and conversation"
    npc_ids: [barista-luca, regular-anna]
    typical_tasks:
      - "Order drinks and snacks"
      - "Join a conversation about local events"
      - "Make plans with acquaintances"
    vocabulary_focus: [social-vocabulary, food-and-drink]
```

---

## Step 3: Create the NPC Roster (minimum 5)

NPCs must feel like real people with:

- A defined social role
- A default register (informal/neutral/formal)
- A personality that creates distinct interaction dynamics
- Location affiliations

```yaml
npc_roster:
  - id: vendor-marco
    name: "Marco"
    role: "Market vendor, sells vegetables"
    register: "informal"
    personality: "Boisterous, talks fast, gives unsolicited cooking advice"
    location_ids: [mercato-centrale]
    vocabulary_focus: [food-vocabulary]

  - id: teller-giuseppe
    name: "Giuseppe"
    role: "Bank teller"
    register: "formal"
    personality: "Patient but precise, expects proper documentation"
    location_ids: [banca-popolare]
    vocabulary_focus: [financial-vocabulary]
```

**Critical rule:** Every vocabulary domain should be covered by at
least one NPC. Check this by running the schema validator.

---

## Step 4: Set Cultural Parameters

```yaml
cultural_parameters:
  greeting_norms: "Kiss on both cheeks for friends, handshake for formal"
  formality_system: "tu/Lei distinction — Lei for strangers, service workers, elders"
  register_markers:
    - register: informal
      markers: ["ciao", "tu", "dai", "allora"]
    - register: formal
      markers: ["buongiorno", "Lei", "mi scusi", "vorrei"]
  taboo_topics: ["politics at the bar", "salary"]
  naming_conventions: "First names between peers, Signore/Signora for formal"
```

---

## Step 5: Validate Cross-References

Run the persona schema validator to check:

1. ✅ Every NPC referenced in a location exists in `npc_roster`
2. ✅ Every `location_id` in an NPC exists in `locations`
3. ✅ Every vocabulary domain referenced by an NPC exists in `vocabulary_matrix`
4. ✅ At least 3 locations, 5 NPCs, 3 vocabulary domains

```bash
npx ts-node packages/core/src/schema-loader/validate-cli.ts schemas/examples/your-persona.yaml
```

---

## Step 6: Write NPC System Prompts

For each NPC, the Prompt Composer will inject your schema data
into the base `prompts/system/tier2-immersion-npc.md` template.

Customize NPC behavior by ensuring the schema contains:

- **Personality traits** that the LLM can embody
- **Register level** that determines linguistic formality
- **Vocabulary focus** that constrains topic expertise

---

## Checklist

- [ ] Setting creates natural communicative needs
- [ ] At least 3 locations with distinct functions
- [ ] At least 5 NPCs covering all vocabulary domains
- [ ] Register variation across NPCs (at least one formal, one informal)
- [ ] Cultural parameters defined for the target culture
- [ ] Schema validator passes with zero errors
- [ ] Each location has at least 2 typical tasks
