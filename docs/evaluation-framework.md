# Evaluation Framework

> Quantitative metrics, test contracts, and A/B testing methodology
> for measuring whether the AAPM is achieving its pedagogical objectives.

---

## Core Metrics

### 1. Task Completion Rate (TCR)

**What it measures**: Can the learner accomplish real communicative tasks?

- **Scope**: Tier 2 and Tier 3
- **Formula**: `completedTasks / attemptedTasks`
- **Target**: ≥ 0.80 across 10 sessions
- **Example tasks**: Ordering a specific meal, negotiating a schedule change, explaining symptoms to a doctor

### 2. Friction Point Recurrence Rate (FPRR)

**What it measures**: Is the learner actually learning from friction?

- **Scope**: All tiers
- **Formula**: `recurringFriction / totalFriction`
- **Target**: Decreasing trend over 10-session window
- **Interpretation**: High FPRR = learner is not acquiring from friction feedback. Low FPRR = targeted instruction is working.

### 3. Comprehensibility Score

**What it measures**: Would a native speaker understand this learner?

- **Scope**: All tiers
- **Formula**: Mean of per-utterance PAE comprehensibility scores
- **Range**: 0.0 (unintelligible) to 1.0 (fully comprehensible)
- **Target**: ≥ 0.75 within 20 sessions
- **Note**: Distinguished from accent. A learner can score 0.95 comprehensibility with a strong accent.

### 4. Register Accuracy Score (RAS)

**What it measures**: Is the learner using the right register for the context?

- **Scope**: Tier 3 (primary), Tier 2 (secondary)
- **Formula**: `registerAppropriTurns / totalTurns`
- **Target**: ≥ 0.85 in Tier 3 scenarios
- **Classification**: Each turn is classified as register-appropriate or register-inappropriate by the LLM register classifier.

### 5. Code-Switch Reduction Rate (CSRR)

**What it measures**: Is the learner gaining L2 independence?

- **Scope**: Tier 1
- **Formula**: `1 - (currentL1Ratio / baselineL1Ratio)`
- **Target**: Steady decrease over 20-session window
- **Interpretation**: Measures the shrinking of L1 usage relative to baseline. A CSRR of 0.5 means the learner uses half as much L1 as they did initially.

### 6. Forward Injection Hit Rate

**What it measures**: Is the feedback loop actually closing?

- **Scope**: System-level
- **Formula**: `successfulInjections / totalInjections`
- **Target**: ≥ 0.60
- **A successful injection** = the NPC created a natural opportunity AND the learner used the target form (correctly or with improvement).

### 7. Social Reputation Trajectory

**What it measures**: Is the learner developing social-pragmatic competence?

- **Scope**: Tier 2
- **Formula**: Weighted average of all NPC reputation scores, tracked over time
- **Target**: Net positive trend
- **Interpretation**: Rising trajectory = learner is developing social communication skills. Declining = social friction is accumulating.

### 8. Negotiation Success Rate

**What it measures**: Can the learner achieve professional objectives in L2?

- **Scope**: Tier 3
- **Formula**: `objectivesAchieved / objectivesAttempted`
- **Target**: ≥ 0.70 (because some Tier 3 objectives are intentionally difficult)

---

## Per-Module Test Contracts

What a "passing test" looks like for each core module:

### Friction Extractor

- **Input**: A 20-turn conversation transcript containing 3 planted friction events
- **Expected**: All 3 friction events detected, correctly classified by type and severity
- **Tolerance**: 1 false positive allowed, 0 false negatives

### Pattern Classifier

- **Input**: 5 friction points, 2 of which match historical patterns
- **Expected**: Both recurring patterns identified, correct trajectory assessment
- **Tolerance**: Novel patterns may be misclustered (non-critical)

### Curriculum Generator

- **Input**: 3 classified friction patterns
- **Expected**: Curriculum with 3 units, each referencing the original context, with exercises matching the learner's CEFR level
- **Tolerance**: Exercise format may vary from expected

### Forward Injector

- **Input**: 2 injection directives
- **Expected**: Directives stored in NPC briefing, retrievable in next pre-session context load
- **Tolerance**: None — injection must be correctly stored

### Refraction Engine

- **Input**: "How do I say I want a window seat?"
- **Expected**: Three formulations (Basic, Native, Formal) with explanations
- **Tolerance**: Grammar explanation may use different terminology than expected

### PAE Pipeline

- **Input**: Audio file of learner saying "Ich möchte einen Fensterplatz"
- **Expected**: Per-phoneme accuracy scores, comprehensibility score, articulatory guidance
- **Tolerance**: ±0.1 on comprehensibility score

---

## Baseline Comparison Methodology

### Pre/Post Design

For measuring AAPM effectiveness:

1. **Pre-test**: Freeform conversation task (3 minutes) with Tier 2 NPC, scored for TCR, comprehensibility, register accuracy
2. **Intervention**: 20 sessions using the AAPM system
3. **Post-test**: Same conversation task type, different content, same scoring rubric
4. **Comparison**: Paired t-test on pre vs. post scores

### Control Group Design

For A/B testing pedagogical interventions within the AAPM:

- **Random assignment**: Learners assigned to control or treatment based on hashed learner ID
- **Stratification**: Balanced by CEFR level and active tier to prevent confounds
- **Duration**: Minimum 10 sessions per group
- **Primary metric**: Specified per experiment (see `ABTestConfig`)
- **Significance**: α = 0.05, power ≥ 0.80

---

## Reporting Cadence

| Report Type | Generated | Consumer |
|-------------|-----------|----------|
| Per-session metrics | After every session | Macro-Loop pipeline |
| Weekly progress | Every 7 days | Learner (optional) |
| Longitudinal report | Every 30 days | Learner + analytics |
| System health | Daily | Engineering team |
| A/B test results | On experiment completion | Product team |
