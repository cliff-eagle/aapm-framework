# AAPM Implementation Masterclass

> Bridging Architectural Stubs to Production-Grade Reality
>
> The industry-standard protocol stack for vibecoded AI applications.

---

## Motto Check

- **Dynamically Efficient** = correct behaviour on first execution
- **Efficiently Dynamic** = behaviour that can be changed without rewriting its neighbours

---

## Chapter 1: Contract-First Development

Every AAPM interface is a bilateral contract. The type on the left side of a function
signature is a promise about what the caller will provide. The return type is a promise
about what the implementer will deliver.

### 1.1 Preconditions — Assert Before You Execute

Every module that implements an interface must begin by asserting its inputs satisfy the contract.

```typescript
// Pattern: ASSERT → EXECUTE → RETURN

export async function extractFriction(
  session: SessionRecord,
  learnerProfile: LearnerProfile,
  deps: MacroLoopDependencies
): Promise<FrictionExtractionResult> {

  // ── PRECONDITION BLOCK ──
  if (!session.sessionId || session.sessionId.trim() === '')
    throw new PipelineError('friction-extraction', 'session.sessionId is required', false);

  if (!session.conversations || session.conversations.length === 0)
    throw new PipelineError('friction-extraction', 'session has no conversations', false);

  const validCEFR = ['A1','A2','B1','B2','C1','C2'];
  if (!validCEFR.includes(learnerProfile.currentCEFR))
    throw new PipelineError('friction-extraction',
      `Invalid CEFR level: ${learnerProfile.currentCEFR}`, false);

  // ── IMPLEMENTATION follows precondition block ──
  // ...
}
```

### 1.2 Postconditions — Assert After You Return

```typescript
// ── POSTCONDITION BLOCK ──
if (result.curriculum.units.length === 0 && extractedFrictions > 0)
  throw new PipelineError('curriculum-generation',
    'Curriculum generated no units despite having friction points', true);

if (result.forwardInjectionDirectives.length > 5)
  throw new PipelineError('curriculum-generation',
    'Forward Injection cap exceeded: max 5 directives per session', false);

return result;
```

### 1.3 Null Object Pattern for Optional Dependencies

Never check for null inline throughout business logic. Provide a Null Object implementation
that satisfies the contract while doing nothing harmful.

```typescript
export class NullPhonemeEngine implements PhonemeEngine {
  async analyze(): Promise<PhonemeAnalysisResult> {
    return {
      available: false, cosineSimilarity: null, phonemeMap: [],
      comprehensibilityScore: null, articulatoryGuidance: [],
      fallbackReason: 'phoneme-engine-not-configured',
    };
  }
  get isAvailable() { return false; }
}

// Registration — vibecoding tool picks the right implementation
const phonemeEngine: PhonemeEngine = audioEnabled
  ? new Wav2VecPhonemeEngine(config.wav2vecEndpoint)
  : new NullPhonemeEngine();
```

---

## Chapter 2: The Event Bus

The AAM event bus is the nervous system of the framework. Every module communicates
through it. No module may call another directly.

→ See `packages/core/src/event-bus/` for the canonical implementation.

### 2.1 Event Envelope

Every event is wrapped in an `AAPMEventEnvelope` containing: `eventId`, `type`,
`emittedAt`, `source`, `learnerId`, `sessionId`, `correlationId`, `payload`, and
`schemaVersion`. No bare payloads.

### 2.2 Module Registration Pattern

Every module exports a `register(bus, deps)` function that returns a cleanup function.
This enables runtime module swap.

```typescript
export function registerAffectiveInferenceModule(
  bus: AAPMEventBus,
  deps: AffectiveInferenceDependencies
): () => void {
  const unsubFriction = bus.on('FRICTION_DETECTED', async (event) => {
    const inference = await inferAffectiveState(event.payload, deps);
    if (inference.triggersEscalation) {
      await bus.emit({
        type: 'AFFECTIVE_STATE_CHANGED',
        source: 'affective-inference',
        learnerId: event.learnerId,
        sessionId: event.sessionId,
        correlationId: event.correlationId,
        payload: { inference },
      });
    }
  });
  return () => { unsubFriction(); };
}
```

---

## Chapter 3: Dependency Injection

No AAPM module may import a concrete implementation of an external service.
All external services are passed in as interface-typed dependencies.

### Dependency Map

| Module | Dependencies to Inject |
| --- | --- |
| feedback-engine | LLMProvider, VectorStoreProvider, SessionStoreProvider, NotificationProvider, PipelineLogger |
| interlanguage-engine | LLMProvider, SessionStoreProvider |
| affective-inference | SignalExtractor, CalibrationStore, EscalationRouter |
| phoneme-engine | ASRProvider, TTSProvider, AlignmentProvider |
| cultural-intelligence | NormDatabase, ReputationStore, SessionStoreProvider |
| anti-fossilization | IHEProvider, NPCBriefingService, CurriculumStore |
| tier-manager | LearnerProfileStore, EventBus, SoftLandingProtocol |
| persistence | DatabaseClient, VectorStore, CacheClient |

### Application Container

One file assembles all dependencies at startup. Everything else works through interfaces.

### Adapter Packages

Each external service gets its own adapter package:

| Package | Implements |
| --- | --- |
| `packages/adapters/openai` | LLMProvider |
| `packages/adapters/anthropic` | LLMProvider (alternative) |
| `packages/adapters/pinecone` | VectorStoreProvider |
| `packages/adapters/postgres` | SessionStoreProvider |
| `packages/adapters/wav2vec` | ASRProvider, AlignmentProvider |
| `packages/adapters/azure-speech` | ASRProvider, TTSProvider |

---

## Chapter 4: Testing Protocol

### The AAPM Test Pyramid

| Layer | What It Tests | Coverage Target |
| --- | --- | --- |
| Unit (Type) | Preconditions reject invalid input, postconditions catch invalid output | 100% public methods |
| Unit (Logic) | Business logic: friction classification, reputation delta, tier transitions | 100% decision branches |
| Integration (Bus) | Module correctly emits/handles bus events | All register() functions |
| Integration (Pipeline) | Full Macro-Loop end-to-end with recorded fixture | One per phase + one E2E |
| Contract (Schema) | CLI validator passes/fails correctly | 8 pass + 5 fail scenarios |
| E2E (Smoke) | Complete tier session start to finish | One per tier |

### Module Test File Structure

```text
SECTION A: Fixtures — reusable test data (from test-utils)
SECTION B: Precondition tests — invalid input rejected
SECTION C: Logic tests — correct output for known input
SECTION D: Bus integration — correct event emission
SECTION E: Failure modes — error handling
```

→ See `packages/core/src/test-utils/` for shared fixtures and mock builders.

---

## Chapter 5: Observability

### 5.1 Structured Logging

Every log line must be structured JSON with: `level`, `timestamp`, `module`,
`learnerId`, `sessionId`, `correlationId`, `message`, `data`, `error`, `durationMs`.

### 5.2 Metric Set

| Metric | Type | Module |
| --- | --- | --- |
| `aapm.session.duration_ms` | Histogram | tier-manager |
| `aapm.friction.count_per_session` | Histogram | feedback-engine |
| `aapm.friction.type` | Counter (labeled) | feedback-engine |
| `aapm.injection.execution_rate` | Gauge | forward-injection |
| `aapm.affective.escalation_rate` | Counter | affective-inference |
| `aapm.reputation.delta_per_session` | Histogram | cultural-intelligence |
| `aapm.tier.transition_count` | Counter (labeled) | tier-manager |
| `aapm.pipeline.phase_duration_ms` | Histogram (labeled) | feedback-engine |
| `aapm.llm.latency_ms` | Histogram (labeled) | all modules |

### 5.3 Distributed Tracing

Thread `correlationId` through every async call chain. One ID per pipeline run.

---

## Chapter 6: LLM Implementation Standards

### 6.1 Structured Output Only

Every LLM call producing data for application logic must use structured output
(JSON mode / function calling). No plain text parsing.

### 6.2 Retry with Exponential Backoff

```typescript
private async withRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!this.isRetryable(err) || attempt >= this.maxRetries) throw err;
    const delay = this.baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
    await new Promise(r => setTimeout(r, delay));
    return this.withRetry(fn, attempt + 1);
  }
}
```

Retryable: 429, 502, 503. Not retryable: 400, 401, 422.

### 6.3 Output Validation and Repair

Post-process all LLM output: verify utterances exist in transcript (reject hallucinations),
reclassify mistyped frictions, downgrade inflated severity.

---

## Chapter 7: Documentation Standards

### JSDoc Template

```typescript
/**
 * [One-sentence business value description.]
 *
 * AAPM CONTEXT: [Tier, module, pipeline phase.]
 *
 * PEDAGOGICAL INVARIANTS:
 * - [Rules this function must not violate]
 *
 * @param paramName - [What, where from, invariants]
 * @returns [Precise description + invariants]
 * @throws {PipelineError} [When, why, retryable?]
 * @see {@link docs/feedback-engine.md}
 * @patentCritical [Claim reference if applicable]
 */
```

### IMPLEMENTATION.md Per Module

Every `@aapm/core` module directory must contain an `IMPLEMENTATION.md` with:

1. What This Module Does
2. How It Maps to the AAPM Spec
3. Key Decisions and Tradeoffs
4. Dependencies
5. Events Emitted
6. Events Consumed
7. Known Limitations
8. Test Coverage Summary
9. Extending This Module

### CHANGELOG Protocol

Every entry includes a **Pedagogical Impact** field.

---

## Chapter 8: Per-Module Quality Gate

→ See `docs/implementation-checklist.md` for the full standalone checklist.

---

## Chapter 9: Runtime Customization Implementation

### SessionRuntimeConfig

All runtime customization is channeled through a single mutable config per session.
Modules subscribe to `CONTROL_MODE_CHANGED` events and react.

Fields: `affectivePressureOverride`, `currentTier`, `tierLocked`,
`refractionPanelVisible`, `npcWarmthOverrides`, `activeSchemaId`,
`pendingSchemaId`, `curriculumFormatOverride`, `manualInjectionTargets`.

### Schema Hot-Swap Protocol

Three steps: **CHECKPOINT** (save schema-independent state) → **MIGRATE** (cross-schema
transfer) → **ACTIVATE** (load new schema, emit `SCHEMA_ACTIVATED`).

---

## Chapter 10: Vibecoding Tool Instruction Block

Append to the master prompt in `VIBECODE_ENTRY.md` before any code generation:

→ See the Implementation Standards block at the end of `VIBECODE_ENTRY.md`.

---

## Related Documents

| Document | Purpose |
| --- | --- |
| [VIBECODE_ENTRY.md](VIBECODE_ENTRY.md) | Master vibecoding prompt |
| [AAPM_ROUTER.md](AAPM_ROUTER.md) | Framework routing + workarounds |
| [docs/implementation-checklist.md](docs/implementation-checklist.md) | Per-module quality gate |
| [docs/aam-charter.md](docs/aam-charter.md) | AAM philosophy + event bus spec |

---

> *"Dynamically Efficient and Efficiently Dynamic"*
