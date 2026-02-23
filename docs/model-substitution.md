# Model Substitution Testing

> Ensuring the AAPM framework is LLM-agnostic — it must work across providers.

---

## Principle

The AAPM's `LLMProvider` interface abstracts over all LLM interactions. Every subsystem that calls an LLM does so through this interface, meaning the framework should produce equivalent pedagogical outcomes regardless of which model powers it.

---

## Provider Compatibility Matrix

| Provider | Model | Structured Output | Embedding | Status |
| -------- | ----- | ----------------- | --------- | ------ |
| OpenAI | GPT-4o | ✅ JSON mode | ✅ text-embedding-3 | Primary target |
| OpenAI | GPT-4o-mini | ✅ JSON mode | ✅ text-embedding-3 | Cost-optimized |
| Anthropic | Claude 3.5 Sonnet | ✅ Tool use | ❌ External needed | Supported |
| Anthropic | Claude 3 Haiku | ✅ Tool use | ❌ External needed | Cost-optimized |
| Google | Gemini 1.5 Pro | ✅ JSON mode | ✅ Built-in | Supported |
| Google | Gemini 1.5 Flash | ✅ JSON mode | ✅ Built-in | Cost-optimized |
| Meta | Llama 3.1 70B | ⚠️ Via vLLM | ❌ External needed | Self-hosted |
| Mistral | Mistral Large | ✅ JSON mode | ✅ Built-in | Supported |

---

## Substitution Test Protocol

### Test Suite Structure

Each AAPM subsystem that uses LLM calls has dedicated substitution tests:

```
tests/model-substitution/
├── friction-extraction.test.ts     # Phase 1 output quality
├── pattern-classification.test.ts  # Phase 2 clustering accuracy
├── curriculum-generation.test.ts   # Phase 3 content quality
├── npc-dialogue.test.ts            # NPC behavioral consistency
├── affective-inference.test.ts     # Emotional state detection
├── register-classification.test.ts # Register accuracy
└── refraction-generation.test.ts   # Tri-Refraction quality
```

### Test Methodology

For each subsystem, the test:

1. **Prepares a fixed input** (recorded session transcript, learner profile, etc.)
2. **Runs the subsystem** with each LLM provider
3. **Evaluates output quality** against rubric criteria
4. **Compares cross-provider consistency**

### Evaluation Rubrics

#### Friction Extraction (Phase 1)

| Criterion | Weight | Evaluation Method |
| --------- | ------ | ----------------- |
| Detection recall | 30% | % of gold-standard friction points detected |
| Classification accuracy | 25% | Friction type matches gold standard |
| Severity calibration | 15% | Severity ±1 level of gold standard |
| Context preservation | 15% | Relevant context included |
| False positive rate | 15% | Spurious friction points detected |

#### Curriculum Generation (Phase 3)

| Criterion | Weight | Evaluation Method |
| --------- | ------ | ----------------- |
| Pedagogical accuracy | 30% | Explanation addresses actual friction cause |
| CEFR calibration | 20% | Content difficulty matches learner's level |
| Exercise quality | 20% | Exercises test the target form |
| L1 contrastive analysis | 15% | Accurate L1-L2 comparison |
| Engagement quality | 15% | Content is interesting, not sterile |

#### NPC Dialogue

| Criterion | Weight | Evaluation Method |
| --------- | ------ | ----------------- |
| Character consistency | 25% | Personality traits reflected in dialogue |
| Register accuracy | 25% | Language matches NPC's social role |
| Injection execution | 25% | Forward injection targets naturally embedded |
| Cultural authenticity | 25% | Cultural norms accurately reflected |

---

## Minimum Provider Requirements

A provider must meet ALL of the following to be "AAPM Supported":

1. **Structured output**: Must reliably return valid JSON matching provided schemas
2. **Instruction following**: Must respect system prompts consistently
3. **Multilingual**: Must handle L1-L2 code-switching in learner transcript
4. **Context window**: ≥32K tokens (full session transcript + system prompt)
5. **Latency**: <3s for structured output (friction extraction), <1s for dialogue

---

## Cost Benchmarks

Target unit economics per session (30-minute session, 40 learner turns):

| Provider | Phase 1 | Phase 2-3 | NPC Dialogue | Total/Session |
| -------- | ------- | --------- | ------------ | ------------- |
| GPT-4o | $0.08 | $0.12 | $0.30 | $0.50 |
| GPT-4o-mini | $0.01 | $0.02 | $0.05 | $0.08 |
| Claude Sonnet | $0.09 | $0.15 | $0.35 | $0.59 |
| Claude Haiku | $0.01 | $0.02 | $0.04 | $0.07 |
| Gemini Flash | $0.005 | $0.01 | $0.03 | $0.045 |
| Llama 70B (self) | $0.02 | $0.03 | $0.08 | $0.13 |

> **Target**: <$0.10/session using cost-optimized models without quality degradation.
