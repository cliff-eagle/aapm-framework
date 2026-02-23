# AAPM Business Model

> Revenue architecture, pricing strategy, unit economics, and commercial licensing terms.

---

## Revenue Streams

### 1. Consumer Subscription (B2C)

| Tier | Price | Features |
| ---- | ----- | -------- |
| Standard | $22/month | 1 persona schema, Tier 1-2 access, standard pipeline |
| Premium | $39/month | All schemas, full Tier 1-3, priority pipeline, PAE pronunciation |
| Annual (Standard) | $180/year | 32% discount vs monthly |
| Annual (Premium) | $320/year | 32% discount vs monthly |

### 2. Institutional (B2B)

| Model | Price | Includes |
| ----- | ----- | -------- |
| Per-Seat | $35-50/seat/month | Instructor dashboard, cohort management, progress reporting |
| Annual Contract | $400-550/seat/year | Volume discount, SLA, onboarding support |
| Minimum Contract | 20 seats | Required for institutional pricing |

### 3. Enterprise Domain License

| Scale | Price | Includes |
| ----- | ----- | -------- |
| SME (< 100 users) | $800/month | Custom schema, white-glove onboarding, dedicated support |
| Enterprise (100-500) | $2,500/month | Custom schema, API access, custom reporting, SLA |
| Enterprise+ (500+) | Custom | Dedicated infrastructure, custom integrations, account team |

### 4. Schema Marketplace

| Role | Revenue Share |
| ---- | ------------- |
| Platform (AAPM) | 70% |
| Schema Creator | 30% |
| Quality Review Fee | $200 one-time submission |
| Exclusive Schema | Negotiated (higher creator share) |

### 5. API / White-Label

Usage-based pricing for EdTech companies building on AAPM:

| Component | Price |
| --------- | ----- |
| Pipeline API (per session) | $0.50-1.50 |
| NPC Dialogue (per turn) | $0.01-0.03 |
| PAE Analysis (per recording) | $0.05-0.10 |
| Schema Validation API | Free (developer ecosystem) |

---

## Unit Economics

### Cost Per Session (20-minute Tier 2 session)

| Component | Cost Estimate | Notes |
| --------- | ------------- | ----- |
| NPC Dialogue (GPT-4o) | $0.30-0.80 | ~30 turns × $0.01-0.027/turn |
| Macro-Loop Pipeline | $0.15-0.30 | 5-phase post-session analysis |
| ASR Transcription | $0.02-0.05 | ~5 min of learner speech |
| TTS Synthesis | $0.03-0.08 | NPC voice generation |
| PAE Phoneme Analysis | $0.02-0.05 | Per pronunciation attempt |
| Vector DB Operations | $0.01-0.02 | NPC memory reads/writes |
| Infrastructure | $0.02-0.05 | Compute, bandwidth, storage |
| **Total** | **$0.55-1.35** | |

### Path to Sustainability

| Phase | Model Strategy | Cost/Session | Margin at $22/mo |
| ----- | -------------- | ------------ | ----------------- |
| Launch | Frontier models for all | $1.00-1.35 | Negative (subsidized) |
| Year 1 | Hybrid (fine-tuned extraction, frontier dialogue) | $0.55-0.80 | Breakeven at 15 sessions/mo |
| Year 2 | AAPM-specific fine-tuned models | $0.20-0.40 | 60-70% gross margin |
| Year 3+ | Full model independence | $0.10-0.20 | 80%+ gross margin |

### Data Flywheel → Model Independence

The critical path to positive unit economics:

1. **Collect** — Every session generates annotated training data (friction labels, refraction pairs, phoneme scores)
2. **Fine-tune** — Train AAPM-specific models for each pipeline phase on accumulated data
3. **Replace** — Substitute fine-tuned models for frontier API calls in non-dialogue phases
4. **Retain** — Frontier models only for NPC dialogue generation (highest quality requirement)

Target: 100,000 annotated sessions before first fine-tuning cycle.

---

## Commercial Schema Licensing

### Three Developer Relationships

| Relationship | Terms | IP |
| ------------ | ----- | -- |
| **Open Contributor** | CLA assigns IP; attribution credit | Schema owned by AAPM |
| **Commercial Licensee** | Annual fee ($5,000-25,000); build on framework | Framework use licensed; custom schema owned by licensee |
| **White-Label Partner** | Revenue share (negotiated); co-branding | Deep integration; shared ownership |

### Commercial License Structure

- BSL-1.1 restricts production use without commercial license
- Commercial license grants production use rights for specific deployment
- License fee scales with deployment size (seats, revenue, or both)
- Includes SLA, priority support, and early access to new modules

---

## Key Metrics

| Metric | Target | Source |
| ------ | ------ | ------ |
| Monthly Active Learners (MAL) | 10,000 Year 1; 100,000 Year 3 | Consumer + institutional |
| Sessions Per Learner Per Month | 12-15 | Engagement target |
| Enterprise ARPU | $400-550/seat/year | Institutional contracts |
| Consumer ARPU | $264-468/year | Subscription revenue |
| Gross Margin | 60%+ by Year 2 | Model optimization |
| LTV:CAC Ratio | > 3:1 | Required for sustainable growth |
| Schema Marketplace GMV | $500K Year 2 | Third-party schema sales |
