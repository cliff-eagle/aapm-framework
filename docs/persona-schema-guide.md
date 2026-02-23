# Persona Schema Guide

> How to create, validate, and deploy new Persona Schemas for the AAPM Framework.

---

## What Is a Persona Schema?

A Persona Schema is a structured configuration file that defines a complete AAPM deployment for a specific learner domain. It's the unit of infinite scalability — every new use case (footballer, doctor, maritime, diplomat) is just a new schema.

A schema configures:

- **Who** the learner is (profile, languages, domain)
- **Where** they learn (Tier 2 environments, Tier 3 scenarios)
- **What** they learn (domain-specific vocabulary priorities)
- **How** they're engaged (Axis Z retention profile)
- **How** they're evaluated (success criteria per tier)

---

## Schema Structure

```yaml
persona:
  id: string              # Unique identifier (kebab-case)
  name: string            # Human-readable name
  description: string     # Brief description of the domain

  learner_profile:
    native_language: string         # ISO 639-1 code
    target_languages: string[]      # ISO 639-1 codes
    proficiency_baseline: string    # CEFR level (A1-C2)
    domain: string                  # Domain category
    objective: string               # What success looks like

  vocabulary_matrix:
    priority_domains: string[]      # Domain-specific vocab categories
    cefr_annotations: boolean       # Whether to include CEFR levels
    excluded_generic: string[]      # Generic vocab to deprioritize

  environment:
    tier_2:
      setting: string               # Description of the world
      locations: Location[]          # Named locations in the environment
      npc_roster: NPC[]              # NPCs with roles and registers
      cultural_parameters:           # Culture-specific behaviors
        greeting_norms: string
        formality_level: string
        taboo_topics: string[]

    tier_3:
      scenarios: Scenario[]          # High-stakes interaction scenarios

  companion:
    personality: string              # Companion character traits
    shared_interests: string[]       # Topics for rapport building
    cultural_bridge: string          # How companion bridges L1/L2 cultures

  retention_profile:
    default_style: string            # Default Axis Z profile
    async_triggers: Trigger[]        # Out-of-app engagement configuration

  evaluation:
    tier_2_success: string           # Tier 2 mastery criteria
    tier_3_success: string           # Tier 3 mastery criteria
    primary_metric: string           # Main outcome metric
```

### Location Object

```yaml
- name: string            # Location identifier
  description: string     # What happens here
  npcs: string[]          # Which NPCs appear here
  typical_tasks: string[] # Communicative objectives
```

### NPC Object

```yaml
- role: string            # NPC role (teammate, shopkeeper, etc.)
  count: number           # How many of this type
  register: string        # Speech register (casual, professional, etc.)
  personality: string     # Brief personality description
  vocabulary_focus: string[] # Vocab domains this NPC uses most
```

### Scenario Object

```yaml
- type: string            # Scenario identifier
  description: string     # What the learner must accomplish
  authority: string       # Who the authority figure is
  stakes: string          # What's at risk
  evaluation_weight:      # Relative weight of each dimension
    linguistic_accuracy: float
    pragmatic_appropriateness: float
    register_alignment: float
    cultural_intelligence: float
```

---

## Creating a New Schema

### Step 1: Define the Learner

Ask:

- Who is this person? (profession, life situation)
- What language(s) do they need?
- What is their starting level?
- What does success look like for them?

### Step 2: Build the Vocabulary Matrix

Don't use generic frequency lists. Ask:

- What words does this person need on DAY ONE?
- What topics will they discuss most?
- What vocabulary would embarrass them to not know?
- What professional/technical terms are essential?

### Step 3: Design the Tier 2 World

Ask:

- Where does this person spend their day?
- Who do they interact with?
- What tasks must they accomplish through communication?
- What culturally specific behaviors should NPCs model?
- What would a Social Friction Event look like here?

### Step 4: Design Tier 3 Scenarios

Ask:

- What is the highest-stakes communication event in this domain?
- Who holds power in that interaction?
- What register is required?
- What cultural landmines exist?
- What does failure look like? (Not catastrophic — instructive)

### Step 5: Configure the Companion

Ask:

- What kind of person would this learner trust?
- What shared interests create rapport?
- How does the companion bridge the two cultures?

### Step 6: Choose Retention Profile

Match to learner psychology:

- Competitive? → Gamified Coercion
- Relationship-driven? → Organic Social
- Deadline-motivated? → Professional Urgency
- Achievement-oriented? → Intrinsic Mastery
- Collaborative? → Social Accountability

### Step 7: Validate

Run the schema validator:

```bash
npx @aapm/cli validate-schema path/to/schema.yaml
```

---

## Example Schemas

See `schemas/examples/` for complete references:

- [`premier-league.yaml`](../schemas/examples/premier-league.yaml) — Professional football
- [`mediterranean-yacht.yaml`](../schemas/examples/mediterranean-yacht.yaml) — Maritime hospitality
- [`medical-migration.yaml`](../schemas/examples/medical-migration.yaml) — Healthcare professionals

---

## Schema-Driven Components

These framework components automatically configure themselves from the active schema:

| Component | Schema Fields Used |
|-----------|-------------------|
| Prompt Composer | `learner_profile`, `vocabulary_matrix`, `environment.npc_roster` |
| Tier Manager | `environment.tier_2`, `environment.tier_3`, `evaluation`, `environment.adaptive_pressure` |
| Vocabulary Engine | `vocabulary_matrix` |
| Retention System | `retention_profile` |
| Forward Injector | `vocabulary_matrix.priority_domains` |
| Companion Agent | `companion`, `learner_profile` |
| CQ Model | `environment.tier_2.cultural_norms`, `evaluation.cultural_intelligence_weight` |
| NPC Authenticity Engine | `npc_roster[].personality_model`, `npc_roster[].consistency_constraints` |
| Pressure Calibrator | `environment.adaptive_pressure` |
| Evaluation Engine | `evaluation.lexical_availability_tracking`, `evaluation.cultural_intelligence_weight` |

---

## v2.0.0 Additions

Schema version `2.0.0` adds the following optional sections:

### NPC Personality Model

Each NPC can now define Big Five personality traits and cultural overlays:

```yaml
npc_roster:
  - id: cafe-owner
    personality_model:
      openness: 0.7
      conscientiousness: 0.5
      extraversion: 0.9
      agreeableness: 0.8
      neuroticism: 0.3
      cultural_overlay:
        communicative_directness: 0.8
        formality_default: 0.3
        power_distance_sensitivity: 0.2
        emotional_expressiveness: 0.9
    consistency_constraints:
      verbal_tics: ["Allora...", "Eh, senti..."]
      prohibited_behaviors: ["refuse to serve a customer"]
      mandatory_behaviors: ["greet every visitor"]
```

### Cultural Norms

Cultural norms are enforced by NPCs and feed the CQ model:

```yaml
cultural_norms:
  - id: greeting-kiss
    domain: greeting
    appropriate_behavior: "Cheek kiss (left-right) for acquaintances; handshake for first meeting"
    common_violations:
      - l1_culture: en-US
        violation: "Handshake for all occasions"
        frequency: common
    reputation_impact: -0.05
    applicable_tiers: [2, 3]
```

### Adaptive Pressure Configuration

Per-tier pressure calibration:

```yaml
adaptive_pressure:
  tier_1:
    enabled: true
    target_range: { min: 0.1, max: 0.3 }
    adjustment_speed: gradual
    use_affective_data: true
  tier_2:
    enabled: true
    target_range: { min: 0.3, max: 0.6 }
    adjustment_speed: responsive
    use_affective_data: true
  tier_3:
    enabled: true
    target_range: { min: 0.6, max: 0.85 }
    adjustment_speed: aggressive
    use_affective_data: true
```

### Evaluation Enhancements

```yaml
evaluation:
  cultural_intelligence_weight: 0.15    # CQ contribution to overall score
  lexical_availability_tracking: true   # Track vocabulary retrieval speed
```
