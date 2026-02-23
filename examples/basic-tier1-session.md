# AAPM Basic Tier 1 Example

> A minimal reference implementation showing a complete Tier 1 Companion session.

---

## Prerequisites

```bash
npm install
npx tsc -p packages/core/tsconfig.json
```

## What This Example Demonstrates

1. **Schema loading** — Loads the `hospitality-professional` persona schema
2. **Prompt composition** — Builds a 4-layer NPC prompt for the Tier 1 Companion
3. **Simulated session** — Shows the data flow through the pipeline
4. **Feedback pipeline** — Runs through all 5 phases of the Macro-Loop

---

## Code Walkthrough

### Step 1: Load the Persona Schema

```typescript
import { loadAndValidateSchema } from '@aapm/core/schema-loader';

const schema = await loadAndValidateSchema(
  'schemas/examples/hospitality-professional.yaml'
);
```

### Step 2: Compose the Companion Prompt

```typescript
import { composePrompt, InMemoryPromptRegistry, initPromptRegistry } from '@aapm/core/agent-intelligence';
import type { SessionContext, RealTimeState } from '@aapm/core/types';

// Load prompt templates
const registry = new InMemoryPromptRegistry();
registry.register(1, 'tier1-companion', `
You are {{NPC_NAME}}, the learner's bilingual companion.
Personality: {{NPC_PERSONALITY}}
Role: {{NPC_ROLE}}
Register: casual, warm, supportive

[...full template from prompts/system/tier1-companion.md...]
`);
initPromptRegistry(registry);

// Build session context
const sessionContext: SessionContext = {
  sessionId: 'session-001',
  learnerId: 'learner-001',
  npcRelationshipHistory: 'First meeting.',
  codeSwitchRatio: 0.7, // 70% L2 target
  socialReputation: 0.0,
  forwardInjectionDirectives: [],
  upcomingChallenges: [],
};

const realTimeState: RealTimeState = {
  currentTurn: 1,
  lastUtterance: 'Ciao, come stai?',
  interlanguageAssessment: {
    systematicErrors: [],
    currentConfidence: 0.6,
    recentFrictionCount: 0,
  },
  activeScaffoldingTriggers: [],
  detectedEmotionalState: 'neutral',
};

// Compose the prompt
const prompt = composePrompt(
  1,
  { id: 'companion-001', name: 'Marco', role: 'companion', tier: 1, register: 'casual', personality: 'warm, curious, patient', vocabulary_focus: ['hospitality', 'food-service'] },
  schema,
  sessionContext,
  realTimeState,
);

// Send prompt.system to your LLM provider
console.log('System prompt length:', prompt.system.length, 'characters');
console.log('Tier:', prompt.tier);
console.log('NPC:', prompt.npcId);
```

### Step 3: Process the Session Through the Pipeline

```typescript
import { executeMacroLoop } from '@aapm/core/feedback-engine';

// After the session ends, run the 5-phase pipeline:
const pipelineResult = await executeMacroLoop('session-001', {
  llmProvider: yourLLMProvider,
  vectorStore: yourVectorStore,
  sessionStore: yourSessionStore,
  notificationService: yourNotificationService,
  logger: console,
});

console.log('Pipeline status:', pipelineResult.status);
console.log('Friction points found:', pipelineResult.frictionExtractionResult?.totalCount);
console.log('Curriculum units:', pipelineResult.curriculumGenerationResult?.curriculum.units.length);
console.log('Forward injections:', pipelineResult.forwardInjectionResult?.directives.length);
```

### Step 4: Generate Evaluation Reports

```typescript
import { generateSessionReport, generateLongitudinalReport } from '@aapm/core/evaluation';

const sessionReport = await generateSessionReport(session, learnerProfile, previousSessions);
console.log('Observations:', sessionReport.observations);
console.log('Recommendations:', sessionReport.recommendations);
```

---

## Testing with Mock Dependencies

Use the test utilities to run without real LLM/vector providers:

```typescript
import { buildMockDeps, FIXTURE_SESSION, FIXTURE_LEARNER } from '@aapm/core/test-utils';

const mockDeps = buildMockDeps();
const result = await executeMacroLoop('test-session', mockDeps);
// Pipeline runs with mock responses — useful for testing integration logic
```

---

## Data Flow Diagram

```
Learner speaks
  → Companion responds (via composed 4-layer prompt)
    → Session transcript captured
      → Phase 1: Friction Extraction
        → Phase 2: Pattern Classification
          → Phase 3: Curriculum Generation
            → Phase 4: Lesson Delivery
              → Phase 5: Forward Injection
                → Next session: NPCs create situations requiring target forms
```

---

## Next Steps

- See `recipes/new-persona-from-scratch.md` for creating custom schemas
- See `recipes/new-tier2-environment.md` for adding immersion environments
- See `IMPLEMENTATION_MASTERCLASS.md` for production-grade patterns
