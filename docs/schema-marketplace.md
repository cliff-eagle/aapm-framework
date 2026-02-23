# Schema Marketplace

> Architecture for a community-driven persona schema ecosystem.

---

## Vision

AAPM persona schemas are the framework's greatest competitive moat — each one represents domain expertise crystallized into a reusable configuration. A schema marketplace enables educators, linguists, and domain experts to create, share, and monetize persona schemas without writing code.

---

## Marketplace Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Schema Marketplace                   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Author   │  │  Review  │  │  Distribution    │  │
│  │  Portal   │→ │  Queue   │→ │  Registry        │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│       ↑                              ↓              │
│  ┌──────────┐              ┌──────────────────┐     │
│  │ Validator │              │  Consumer API     │    │
│  │ (@aapm/   │              │  (npm-like        │    │
│  │   cli)    │              │   install)        │    │
│  └──────────┘              └──────────────────┘     │
└─────────────────────────────────────────────────────┘
```

---

## Schema Lifecycle

### 1. Authoring

Authors create schemas using a guided wizard or YAML editor:

| Tool | Description |
| ---- | ----------- |
| Web wizard | Step-by-step form generating YAML |
| VS Code extension | Autocomplete + real-time validation |
| CLI validator | `aapm validate-schema` pre-submission check |
| Template library | Start from existing schemas |

### 2. Validation (Automated)

Every submitted schema passes through automated validation:

- **Structural**: All required keys present, types correct
- **Completeness**: All 3 tiers defined, vocabulary matrices populated
- **Pedagogy audit**: CEFR alignment, tier progression logic
- **Cultural review flag**: Schemas touching sensitive cultural content flagged for human review

### 3. Peer Review

Schemas are reviewed by qualified reviewers:

| Reviewer Type | Qualifications | Focus |
| ------------- | -------------- | ----- |
| Linguistic reviewer | MA+ in applied linguistics or SLA | CEFR accuracy, error typology |
| Cultural reviewer | Native speaker + cultural expertise | Cultural norm accuracy, sensitivity |
| Technical reviewer | AAPM contributor | Schema structure, integration |

Review criteria:

- ✅ Does the schema produce meaningful learning experiences?
- ✅ Are cultural norms accurately represented?
- ✅ Is the vocabulary matrix appropriate for the stated CEFR level?
- ✅ Are Tier 3 negotiation scenarios realistic?

### 4. Distribution

Approved schemas are published to the registry:

```bash
# Install a persona schema
aapm schema install @marketplace/tokyo-finance-analyst

# List available schemas
aapm schema search --language japanese --domain finance

# Inspect a schema before installing
aapm schema info @marketplace/tokyo-finance-analyst
```

---

## Revenue Model

### Free Tier

- Access to all open-source schemas (included with framework)
- Community-contributed schemas with CC-BY-SA license

### Premium Schemas ($5-25/schema)

- Author receives 70% of revenue
- Cliff Eagle receives 30% platform fee
- Includes professionally reviewed schemas
- Guaranteed CEFR alignment and cultural accuracy

### Enterprise Custom Schemas

- Bespoke schema development for institutional clients
- Includes learner cohort analysis and vocabulary audit
- Pricing: $2,000-10,000 per schema depending on complexity

### Subscription Model

- **Learner**: $9.99/mo — unlimited access to all marketplace schemas
- **Educator**: $29.99/mo — access + analytics + cohort management
- **Enterprise**: Custom pricing — API access + custom schemas + SLA

---

## Author Incentives

| Incentive | Description |
| --------- | ----------- |
| Revenue share | 70% of premium schema sales |
| Usage analytics | Real-time dashboard of schema adoption |
| Impact metrics | Learner outcome improvements attributed to schema |
| Author badges | "Verified Linguist", "Cultural Expert", "Top Creator" |
| Advancement fund | $500 grants for underrepresented language pairs |

---

## Quality Standards

### Schema Rating System

| Rating | Criteria |
| ------ | -------- |
| ⭐ Unrated | Submitted but not yet reviewed |
| ⭐⭐ Community | Community-validated, passes automated checks |
| ⭐⭐⭐ Reviewed | Peer-reviewed by qualified reviewers |
| ⭐⭐⭐⭐ Certified | Reviewed + pilot-tested with learners |
| ⭐⭐⭐⭐⭐ Research-backed | Published evidence of learning outcomes |

### Content Moderation

- Automated bias detection in NPC dialogue prompts
- Cultural sensitivity review for heritage language schemas
- Prohibition of stereotyping in persona configurations
- Annual re-review of top-100 schemas for currency
