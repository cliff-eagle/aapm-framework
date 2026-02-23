# Recipe: Create a New Persona Schema from Scratch

> Step-by-step guide for building a complete AAPM deployment for a new learner domain.

---

## Prerequisites

- Familiarity with the [Persona Schema Guide](../docs/persona-schema-guide.md)
- Understanding of the [Three-Tier Architecture](../docs/three-tiers.md)
- Reference schema to study: [`schemas/examples/premier-league.yaml`](../schemas/examples/premier-league.yaml)

---

## Step 1: Define the Learner Profile

Create a new YAML file at `schemas/examples/{domain-name}.yaml`.

Start with the learner profile:

```yaml
persona:
  id: "{domain-kebab-case}"
  name: "{Human Readable Domain Name}"
  description: >
    One paragraph describing who this learner is, what they need,
    and what success looks like for them.

  learner_profile:
    native_language: "{iso-639-1-code}"     # e.g., "pt-BR", "ar", "zh"
    target_languages: ["{target-code}"]      # e.g., ["en"], ["fr", "it"]
    proficiency_baseline: "{A1-C2}"          # Starting CEFR level
    domain: "{domain-category}"              # e.g., "professional-sports"
    objective: >
      What does fluency mean for this person? Be specific.
      Not "speak English well" but "negotiate contracts and handle
      press conferences in English football culture."
```

**Questions to answer:**

- What language(s) do they speak now?
- What language(s) do they need?
- What is the most important thing they need to DO in the new language?

---

## Step 2: Build the Vocabulary Matrix

```yaml
  vocabulary_matrix:
    priority_domains:
      - {domain-1}    # Most urgent vocabulary category
      - {domain-2}    # Second priority
      - {domain-3}    # Third priority
      # ...
    cefr_annotations: true
    excluded_generic:
      - {category-to-deprioritize}  # e.g., "academic-vocabulary"
```

**Key principle**: This learner's Day 1 vocabulary is NOT the same as generic learner Day 1 vocabulary. A footballer needs "offside" before "apple." A chef needs "knife techniques" before "colors."

**Questions to answer:**

- What words would embarrass this learner to NOT know on Day 1?
- What topics will they discuss 80% of the time?
- What generic vocabulary can be deprioritized?

---

## Step 3: Design the Tier 2 World

This is the most creative step. Build the environment where the learner will practice functional communication.

```yaml
  environment:
    tier_2:
      setting: "{Description of the world}"
      locations:
        - name: {location-1}
          description: "{What happens here}"
          npcs: [{role-1}, {role-2}]
          typical_tasks:
            - {task-1}
            - {task-2}
        # ... more locations

      npc_roster:
        - role: {role-name}
          count: {number}
          register: {casual/formal/clinical/etc.}
          personality: "{Brief personality description}"
          vocabulary_focus: [{domain-1}, {domain-2}]
        # ... more NPCs

      cultural_parameters:
        greeting_norms: "{How people greet each other here}"
        formality_level: "{General formality expectations}"
        taboo_topics:
          - {taboo-1}
          - {taboo-2}
```

**Questions to answer:**

- Where does this person spend their day?
- Who do they talk to? At what register?
- What tasks REQUIRE communication in L2?
- What would a Social Friction Event look like?
- What cultural behaviors should NPCs model?

---

## Step 4: Design Tier 3 Scenarios

These are the high-stakes moments. The career-defining, make-or-break interactions.

```yaml
    tier_3:
      scenarios:
        - type: {scenario-name}
          description: >
            What the learner must accomplish, why it matters,
            and what makes it linguistically challenging.
          authority: {who-holds-power}
          stakes: {what-happens-if-they-fail}
          evaluation_weight:
            linguistic_accuracy: 0.XX
            pragmatic_appropriateness: 0.XX
            register_alignment: 0.XX
            cultural_intelligence: 0.XX
        # ... more scenarios (aim for 2-4)
```

**Questions to answer:**

- What is the HIGHEST stakes communication event in this domain?
- Who has power? (Boss, board, panel, reviewer, owner?)
- What register is required? What register mistake would be catastrophic?
- What does failure look like? (Not permanent — instructive)
- How should the four evaluation dimensions be weighted?

---

## Step 5: Design the Companion

The Tier 1 companion must be someone the learner would trust and relate to.

```yaml
  companion:
    personality: >
      Who is this person? Someone who went through a similar experience.
      Warm, encouraging, culturally bilingual. Has their own stories.
    shared_interests:
      - {interest-1}   # Topics for rapport building
      - {interest-2}
      - {interest-3}
    cultural_bridge: >
      How does the companion explain the cultural gap between L1 and L2 worlds?
      What unwritten rules do they help decode?
```

**Questions to answer:**

- Who would this learner WANT as a bilingual friend?
- What shared experience creates instant rapport?
- What cultural "translation" does the companion provide?

---

## Step 6: Configure Retention Profile

```yaml
  retention_profile:
    default_style: "{gamified-coercion|organic-social|professional-urgency|intrinsic-mastery|social-accountability}"
    async_triggers:
      - type: npc-message
        sender: companion
        frequency: daily
        trigger: "{What triggers the message}"
      # ... more triggers
```

Match to learner psychology — NOT all learners want gamification.

---

## Step 7: Define Evaluation Criteria

```yaml
  evaluation:
    tier_2_success: "{What mastery of this tier looks like}"
    tier_3_success: "{What mastery of this tier looks like}"
    primary_metric: "{comprehensibility-score|task-completion-rate|register-accuracy}"
```

---

## Step 8: Validate

```bash
npx @aapm/cli validate-schema schemas/examples/{your-schema}.yaml
```

---

## Step 9: Create NPC Prompts

For each unique NPC role in your schema, create a prompt file:

```
prompts/npc/{domain}-{role}.md
```

Use `prompts/npc/_template.md` as your starting point. Reference the base tier prompts (`prompts/system/tier{n}-*.md`) for the behavioral framework.

---

## Step 10: Test with the Companion

Start by testing Tier 1 only. Verify:

- [ ] Companion uses the right personality and shared interests
- [ ] Code-switching gradient works (starts with more L1)
- [ ] Domain vocabulary is naturally woven in
- [ ] Relationship continuity across sessions
- [ ] Cultural bridge explanations are accurate

Then expand to Tier 2, then Tier 3.

---

## Checklist

- [ ] Schema YAML passes validation
- [ ] Learner profile accurately describes the target user
- [ ] Vocabulary matrix reflects real-world priorities (not generic)
- [ ] Tier 2 locations cover the learner's daily life
- [ ] NPC roster has enough variety for rich social simulation
- [ ] Cultural parameters are authentic (researched, not guessed)
- [ ] Tier 3 scenarios represent genuine high-stakes moments
- [ ] Companion is relatable and has cultural bridge expertise
- [ ] Retention profile matches the likely learner psychology
- [ ] All NPC prompts created and tested
