# AAPM Deployment Architecture

> Infrastructure patterns, cloud service mapping, and deployment models
> for AAPM Framework applications.

---

## Deployment Models

### Model 1: Cloud SaaS (Recommended for B2C)

```
┌─────────────────────────────────────────────────┐
│                   CDN / Edge                      │
│              (Vercel / CloudFront)                 │
├─────────────────────────────────────────────────┤
│           Frontend (Next.js / React)              │
│              @aapm/ui components                  │
├─────────────────────────────────────────────────┤
│              API Gateway (REST)                   │
│         Authentication / Rate Limiting            │
├─────────┬───────────┬───────────┬───────────────┤
│ Session │  Pipeline │   NPC     │  Schema       │
│ Service │  Service  │ Dialogue  │  Marketplace  │
│         │ (Phases   │  Service  │  Service      │
│         │  1-5)     │           │               │
├─────────┼───────────┼───────────┼───────────────┤
│    PostgreSQL       │ Vector DB │  Object       │
│   (Sessions,        │ (Pinecone │  Storage      │
│    Profiles,        │  Weaviate │  (Audio,      │
│    Reputation)      │  Qdrant)  │  Schemas)     │
├─────────────────────┼───────────┼───────────────┤
│              LLM Provider API                     │
│      (OpenAI / Anthropic / Google / Mistral)      │
└─────────────────────────────────────────────────┘
```

### Model 2: Self-Hosted (B2B / Enterprise)

Docker Compose or Kubernetes deployment:

```yaml
# docker-compose.yml (simplified)
services:
  api:
    build: ./packages/core
    environment:
      - DATABASE_URL=postgresql://...
      - VECTOR_DB_URL=http://qdrant:6333
      - LLM_PROVIDER=openai
      - LLM_API_KEY=${OPENAI_API_KEY}
    ports: ["3000:3000"]

  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333"]
    volumes: ["qdrant_data:/qdrant/storage"]

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: aapm
    volumes: ["pg_data:/var/lib/postgresql/data"]
```

### Model 3: Serverless (Cost-Optimized)

| Component | Service |
|-----------|---------|
| API | AWS Lambda / Vercel Functions |
| Database | Neon (serverless Postgres) |
| Vector DB | Pinecone (managed) |
| File Storage | S3 / R2 |
| Auth | Clerk / Auth0 |
| CDN | CloudFront / Vercel Edge |

---

## API Key Provisioning

### SaaS Model (Default)

- Developer provisions LLM API keys as **environment variables**
- End users authenticate via JWT — they never see an API key
- Keys stored in cloud secret manager (AWS Secrets Manager, Vercel env)
- Per-user cost tracked via `learnerId` correlation

### BYO-Key Model (Self-Hosted / Power Users)

- User inputs their own API key in Settings
- Key stored encrypted in user profile (AES-256, per `security-privacy.md`)
- System uses user's key for their sessions, developer key as fallback
- User pays their own LLM costs

### Hybrid Model (Freemium)

- Default: developer key with rate limits (e.g., 5 sessions/day)
- Premium: user adds own key for unlimited sessions
- Enterprise: dedicated API key per organization

---

## Database Schema Overview

### PostgreSQL Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `learners` | Learner profiles | `id`, `cefr_level`, `matrix_coordinates`, `onboarding_state` |
| `sessions` | Session records | `id`, `learner_id`, `persona_id`, `started_at`, `ended_at` |
| `conversations` | Per-NPC conversation logs | `session_id`, `npc_id`, `tier`, `turns` (JSONB) |
| `friction_points` | Extracted friction | `session_id`, `type`, `severity`, `context` (JSONB) |
| `npc_relationships` | Social reputation state | `learner_id`, `npc_id`, `reputation_score`, `remembered_facts` |
| `curricula` | Generated micro-curricula | `session_id`, `units` (JSONB), `completion_rate` |
| `injection_directives` | Forward injection queue | `learner_id`, `npc_id`, `target_form`, `status`, `expires_at` |
| `async_engagement` | Notification queue | `learner_id`, `type`, `content`, `scheduled_at`, `delivered` |

### Vector Database Collections

| Collection | Purpose | Embedding Model |
|------------|---------|----------------|
| `npc_memories` | NPC semantic memory of relationships | text-embedding-3-small |
| `forward_injections` | Active injection briefings | text-embedding-3-small |
| `interlanguage_model` | Learner's interlanguage hypothesis history | text-embedding-3-small |
| `friction_patterns` | Historical friction for pattern matching | text-embedding-3-small |

---

## Cost Control Architecture

### Per-User Budget System

```
Session Request
  → Check user's daily/monthly budget remaining
    → If budget exceeded:
        → Return 429 with "Daily session limit reached"
        → Suggest upgrade (for SaaS)
    → If budget available:
        → Execute session
        → Deduct estimated cost from budget
        → Log actual cost after completion
```

### Circuit Breaker

- If LLM costs exceed 2× estimate for a session: terminate pipeline
- If provider latency > 10s: switch to fallback model
- If provider returns 5xx: 3 retries with exponential backoff, then fail gracefully

### Rate Limits

| Tier | Sessions/Day | Pipeline Runs/Day | NPC Turns/Session |
|------|-------------|-------------------|-------------------|
| Free | 2 | 2 | 20 |
| Standard | 5 | 5 | 40 |
| Premium | Unlimited | Unlimited | 60 |
| Enterprise | Custom | Custom | Custom |

---

## Error Handling Strategy

### Graceful Degradation

| Failure | Degradation |
|---------|-------------|
| LLM provider down | Switch to fallback provider; queue pipeline for retry |
| Vector DB unreachable | Use most recent cached NPC memories; skip injection writes |
| Database unreachable | Buffer session in-memory; write on reconnect |
| ASR service down | Text-only mode (disable voice input) |
| TTS service down | Text-only NPC responses |

### Error Codes

| Code | Category | Description |
|------|----------|-------------|
| `AAPM-1xx` | Session | Session creation, resumption, timeout errors |
| `AAPM-2xx` | Pipeline | Friction extraction, classification, curriculum generation errors |
| `AAPM-3xx` | NPC | Prompt composition, dialogue generation, memory errors |
| `AAPM-4xx` | Auth | Authentication, authorization, rate limit errors |
| `AAPM-5xx` | Infrastructure | Database, vector DB, LLM provider, storage errors |

---

## Monitoring & Observability

| Signal | Tool | Threshold |
|--------|------|-----------|
| Pipeline latency | OpenTelemetry traces | < 30s for full 5-phase |
| LLM cost per session | Custom metrics | < $1.50 (alert at $2.00) |
| Error rate | Prometheus / Datadog | < 1% (alert at 2%) |
| Session completion rate | Custom dashboard | > 80% |
| Vector DB query latency | Provider metrics | < 200ms p99 |
