# AAPM Provisional Patent Claims

> Draft patent claims organized by type for the Autonomous Adaptive Pedagogical Matrix.
> Each claim references specific implementation types annotated with `@patentCritical`.

---

## Claim 1: Recursive Feedback Engine (Method)

**A computer-implemented method for adaptive language instruction comprising:**

a) receiving learner language production during a simulated social interaction with a non-player character (NPC);

b) extracting friction points from said production in real-time via a micro-loop, each friction point comprising one or more of: lexical gap, morphosyntactic error, phonemic error, register mismatch, pragmatic failure, or cultural violation;

c) post-session, processing said friction points through a macro-loop comprising five phases: friction extraction, pattern classification, micro-curriculum generation, adaptive lesson feedback, and forward injection directive generation;

d) generating forward injection directives that instruct NPCs in subsequent sessions to create natural communicative opportunities targeting identified friction patterns, wherein the learner is unaware of the programmatic targeting;

e) persisting learner state, NPC relationship states, and social reputation scores across sessions via a persistence loop;

**wherein** steps (b) through (e) form a recursive cycle that continuously adapts instruction based on accumulated evidence of learner competence development.

**Referenced types**: `FrictionPoint`, `MacroLoopPipelineState`, `ForwardInjectionDirective`, `SessionRecord`, `NPCRelationshipState`

---

## Claim 2: Interlanguage Hypothesis Engine (Method + System)

**A computer-implemented method for modeling a language learner's internal grammar comprising:**

a) maintaining a probabilistic rule set (`InterlanguageGrammar`) representing the learner's hypothesized grammar rules, each rule having a confidence score, evidence chain, and trajectory;

b) for each learner production, performing Bayesian confidence updates to said rules based on whether the production confirms, violates, or provides novel evidence for each hypothesis;

c) mapping said rules to developmental stages derived from Processability Theory (Pienemann), wherein the system filters instructional targets to include only structures acquirable at the learner's current processing stage;

d) maintaining an L1 transfer profile (`L1TransferProfile`) identifying positive transfer patterns, negative transfer patterns, avoidance patterns, and overproduction patterns specific to the learner's L1-L2 language pair;

e) identifying learning frontier rules — rules where the learner alternates between correct and incorrect forms — as highest-value teaching targets;

f) generating predictions (`RulePrediction`) about what the learner will produce in future interactions, with each prediction having an expected form, correct form, and confidence score;

g) feeding said predictions into a forward injection system to create proactive communicative scenarios that test predicted forms;

**wherein** the rule set is continuously updated through Bayesian inference, enabling the system to predict learner errors before they occur and to distinguish systematic rule application from random performance errors.

**Referenced types**: `InterlanguageGrammar`, `HypothesisRule`, `DevelopmentalStage`, `L1TransferProfile`, `LearningFrontierRule`, `RulePrediction`, `GrammarEvolutionEvent`

---

## Claim 3: Anti-Fossilization Engine (Method)

**A computer-implemented method for detecting and remediating fossilized language errors comprising:**

a) monitoring a set of interlanguage hypothesis rules for fossilization criteria, wherein a form is classified as fossilized when: (i) the form has recurred across a minimum threshold of sessions, (ii) the trajectory is stable-incorrect or worsening, (iii) the confidence score exceeds 0.7, and (iv) at least one previous curriculum intervention has failed to improve the form;

b) upon fossilization detection, applying a three-strategy intervention system in sequence:

- **Strategy 1 (Varied Context Exposure)**: presenting the target form in a minimum of five different NPC/location/scenario contexts to break context-dependent storage;
- **Strategy 2 (Contrastive Minimal Pairs)**: generating sentence pairs identical except for the fossilized form, using the learner's actual productions;
- **Strategy 3 (NPC Correction Sequences)**: instructing NPCs to model the correct form using SLA-validated correction techniques selected based on the learner's affective state;

c) tracking defossilization progress toward a success threshold of sustained accuracy above 0.85 for a minimum number of consecutive sessions;

**wherein** each strategy addresses a different cognitive mechanism of fossilization and strategies are escalated based on measured ineffectiveness of prior strategies.

**Referenced types**: `FossilizationProfile`, `FossilizedForm`, `DefossilizationStrategy`, `VariedContextPlan`, `ContrastiveMinimalPairPlan`, `NPCCorrectionPlan`

---

## Claim 4: Forward Injection (Method)

**A computer-implemented method for embedding instructional targets into simulated social interactions comprising:**

a) receiving forward injection directives generated from a post-session analysis pipeline;

b) translating each directive into NPC behavior instructions that create natural communicative opportunities for target material;

c) injecting said instructions into the NPC prompt stack at the session context layer, such that the NPC's dialogue naturally elicits the target forms;

d) measuring injection success rate as the proportion of injections where: (i) the NPC created a natural opportunity AND (ii) the learner used the target form;

**wherein** the learner is not aware that communicative opportunities are being programmatically created, and the injection creates the appearance of organic conversation.

**Referenced types**: `ForwardInjectionDirective`, `IHEForwardInjectionSpec`, `ObjectiveInjectionSpec`

---

## Claim 5: Social Reputation System (System)

**A computer-implemented system for simulating social consequences in language learning comprising:**

a) a per-NPC reputation score ranging from -1.0 to +1.0, initialized at a schema-defined baseline;

b) score modification logic driven by communicative events including: successful communication (+), register-appropriate interaction (+), communication breakdown (-), register violation (-), cultural insensitivity (-), and repair of previous error (+);

c) NPC behavior modulation based on reputation score, wherein NPCs with higher learner reputation exhibit increased warmth, helpfulness, and willingness to share information;

d) reputation score persistence across sessions;

**wherein** said reputation score is never directly visible to the learner, requiring the learner to infer social standing from NPC behavioral changes — developing the same social reading skills required in real-world communication.

**Referenced types**: `NPCRelationshipState`, `SessionRecord.reputationDeltas`, `NPCBehaviorResolution`

---

## Claim 6: Affective State Inference (Method)

**A computer-implemented method for inferring learner emotional state during language learning interactions comprising:**

a) extracting six behavioral signals from each learner turn: response latency, L1 fallback rate, hedging frequency, pause duration, topic avoidance rate, and repair attempt rate;

b) maintaining a per-learner calibrated baseline for each signal, initialized from population norms and continuously updated via Bayesian methods from session data;

c) computing deviation scores by comparing current signal values against said personalized baselines;

d) classifying the learner's affective state from said deviation scores into one of a set of states including: confident, engaged, uncertain, frustrated, anxious, disengaged, amused, determined, and overwhelmed;

e) when negative affect is detected with confidence above a threshold, automatically escalating scaffolding support through a graduated protocol;

**wherein** emotional state is inferred solely from behavioral signals measurable in text-based interaction, without requiring camera, biometric sensors, or learner self-report.

**Referenced types**: `AffectiveSignalVector`, `AffectiveInferenceResult`, `AffectiveCalibrationProfile`, `ScaffoldingEscalation`, `AffectivePressureSignal`

---

## Claim 7: Cultural Intelligence Assessment (System)

**A computer-implemented system for assessing and developing cultural intelligence in language learners comprising:**

a) a four-factor Cultural Intelligence (CQ) model measuring Metacognitive CQ, Cognitive CQ, Motivational CQ, and Behavioral CQ;

b) a cultural norm database defined per persona schema, each norm specifying appropriate behavior, common violations by L1 culture, applicable tiers, and reputation impact;

c) real-time cultural norm checking during NPC interactions, wherein violations are detected and classified by severity;

d) persistent social consequences for cultural violations through the reputation system, wherein witnessing NPCs reduce their relationship score and, optionally, related NPCs are informed;

e) a repair mechanism for cultural faux pas, wherein the learner can restore reputation through demonstrated cultural learning;

**wherein** cultural intelligence is treated as a core competence dimension with weighted contribution to overall evaluation, not as supplementary content.

**Referenced types**: `CulturalIntelligenceProfile`, `CulturalDimensions`, `CulturalNorm`, `CulturalViolation`, `CulturalFauxPas`, `CulturalReputationDelta`

---

## Claim 8: Communicative Pressure Calibration (Method)

**A computer-implemented method for dynamically adjusting interaction difficulty during language learning sessions comprising:**

a) computing a current communicative pressure level from multiple pressure components, each component having an independent contribution score and source (tier-context, NPC-mood, topic-complexity, register-requirement, time-pressure, social-stakes, audience-size, or consequences-severity);

b) determining whether the learner is within a Zone of Proximal Development (ZPD) based on said pressure level relative to a target range;

c) when the learner deviates from ZPD, executing pressure adjustment events through one or more mechanisms: NPC behavior change, topic shift, register relaxation, scaffolding level change, companion intervention, or timer adjustment;

d) integrating affective state inference data to inform pressure adjustments, wherein negative affect triggers pressure reduction and positive engagement triggers pressure increase;

e) constraining adjustment magnitude per turn to prevent jarring changes;

**wherein** communicative pressure is distinct from linguistic difficulty and is modulated in real-time within each session, not just across sessions.

**Referenced types**: `CommunicativePressureState`, `PressureComponent`, `PressureAdjustmentEvent`, `AdaptivePressureConfig`, `PressureTierAdjustment`

---

## Claim 9: Cross-Schema Transfer Engine (Method)

**A computer-implemented method for managing skill transfer between language learning environments comprising:**

a) maintaining a record of skills acquired in a source persona schema, each skill having a category (phonemic-accuracy, grammar-rule, repair-strategy, register-awareness, cultural-norm, vocabulary, pragmatic-competence, pronunciation-pattern, or negotiation-tactic), a proficiency level, and a transfer eligibility designation;

b) upon activation of a target persona schema, evaluating each skill for transferability based on category, determining that: language-universal skills (grammar rules, pronunciation patterns) transfer with high confidence, while context-dependent skills (domain vocabulary, cultural norms) do not transfer;

c) creating a transfer mapping with per-skill confidence scores and level adjustments;

d) adjusting the learner's starting position in the target schema based on successful transfers;

**wherein** the system prevents catastrophic forgetting while enabling appropriate reuse of genuinely transferable competencies, and the transfer resolution is transparent and auditable.

**Referenced types**: `CrossSchemaTransferRecord`, `TransferableSkill`, `TransferMapping`, `TransferResolution`

---

## Claim 10: NPC Behavioral Authenticity (System)

**A computer-implemented system for generating consistent, dynamic NPC behavior in language learning simulations comprising:**

a) a per-NPC personality model based on the Big Five personality traits (openness, conscientiousness, extraversion, agreeableness, neuroticism), each trait scored from 0.0 to 1.0;

b) a cultural overlay modifying trait expression based on four cultural parameters: communicative directness, formality default, power distance sensitivity, and emotional expressiveness;

c) dynamic mood states that change in response to session events, decay toward a baseline over time, and influence behavior modifiers;

d) a behavioral variation matrix computing final NPC behavior as a function of personality traits, current mood, learner reputation score, and cultural overlay, producing modifiers for: patience, responsiveness, helpfulness, register strictness, topic openness, and emotional expressiveness;

e) consistency constraints ensuring that core character identity (verbal tics, prohibited behaviors, mandatory behaviors) persists across all mood states;

**wherein** the combination of static personality traits, dynamic mood states, and relationship-dependent reputation creates emergent behavioral dynamics that require the learner to develop social reading skills — the same skills needed for real-world communication.

**Referenced types**: `NPCPersonalityModel`, `NPCMoodState`, `NPCBehavioralVariation`, `NPCConsistencyConstraints`, `NPCBehaviorResolution`
