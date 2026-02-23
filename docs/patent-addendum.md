# Patent Addendum — Claims 13-16

> Additional provisional patent claims covering innovations identified in the
> Master Blueprint review. These extend the existing 12 claims in `patent-claims.md`.

---

## Claim 13: Autonomous and Adaptive Matrix — Runtime Customization Architecture

### Independent Claim

A computer-implemented system for adaptive educational simulation comprising a multi-layer architecture wherein:

(a) a curriculum generation layer processes learner interaction data through a recursive feedback pipeline to generate personalized micro-curricula;

(b) a world engine layer maintains a runtime world state comprising a location graph, time system, ambient event schedule, and NPC presence rules;

(c) a character control layer manages a plurality of character types including fully player-controlled characters, choice-tree-controlled characters, and fully autonomous NPC characters;

(d) a non-player character behavior layer governs NPC responses based on a composite function of personality model, mood state, social reputation score, and Forward Injection directives;

wherein each layer independently exposes a runtime customization interface, and wherein customization of any layer takes effect without session interruption and without requiring reinitialization of dependent layers, the customization interfaces communicating exclusively through a typed event bus using a standardized event envelope format.

### Dependent Claims

**13.1** The system of claim 13, wherein the typed event bus supports at least the following event types: FRICTION_DETECTED, AFFECTIVE_STATE_CHANGED, FORWARD_INJECTION_READY, REPUTATION_DELTA, WORLD_STATE_CHANGED, CURRICULUM_GENERATED, TIER_TRANSITION, NPC_MOOD_CHANGED, SCHEMA_ACTIVATED, and CONTROL_MODE_CHANGED.

**13.2** The system of claim 13, wherein the runtime customization interface includes an affective pressure slider enabling manual override of the system's pressure calibration during an active session.

**13.3** The system of claim 13, wherein the runtime customization interface includes a schema hot-swap mechanism enabling loading of a new persona schema mid-session while preserving session state including NPC relationship records and learner progress data.

---

## Claim 14: Schema-Driven Multimodal Prompt-to-Simulation Compilation

### Claim 14 Independent

A computer-implemented method for generating a complete educational simulation from a multimodal prompt set comprising:

(a) receiving one or more input prompts of type written, visual, and/or audio;

(b) mapping each prompt type to a corresponding schema field category, wherein:

- written prompts map to learner_profile, vocabulary_matrix, companion, and evaluation fields;
- visual prompts map to world_state, environment, and character_control fields;
- audio prompts map to input_modalities and phoneme configuration fields;

(c) generating a validated persona schema document from the mapped fields by merging multi-source field contributions according to a defined precedence hierarchy;

(d) compiling from said schema a complete set of NPC system prompts, world state contracts, Forward Injection templates, and UI component configurations that jointly constitute a playable simulation;

wherein the compilation pipeline produces a simulation conforming to the persona schema specification without manual intervention, and wherein the simulation is immediately deployable through a vibecoding tool.

### Claim 14 Dependents

**14.1** The method of claim 14, wherein written and visual prompts have overlapping contributions to the environment.locations field, and the system resolves the overlap by using written prompts for location names and vocabulary domains and visual prompts for spatial layout and connection topology.

**14.2** The method of claim 14, wherein written and audio prompts have overlapping contributions to the vocabulary field, and the system resolves the overlap by giving audio pronunciation priorities precedence over written frequency ordering.

---

## Claim 15: Hybrid Character Control with Pedagogical Autonomy Switching

### Claim 15 Independent

A computer-implemented method for managing character control in an educational simulation comprising:

(a) maintaining a character registry distinguishing fully player-controlled characters, choice-tree-controlled characters, voice-controlled characters, and fully autonomous NPC characters;

(b) defining a hybrid character type wherein a character normally operates as a fully autonomous NPC but may be temporarily possessed by the player;

(c) evaluating per-session learner affective state and Zone of Proximal Development coordinates;

(d) dynamically reassigning character control mode in response to affective threshold events, wherein a character originally designated as autonomous may be temporarily possessed by the player as a scaffolding intervention, enabling the learner to practice communicative strategies from the perspective of a character who possesses target-language competence;

(e) restoring autonomy when the affective threshold normalizes or when a takeoverDuration condition is met;

wherein all control mode transitions are emitted as events through a typed event bus and are logged as session events available for post-session analysis by the recursive feedback engine.

### Claim 15 Dependents

**15.1** The method of claim 15, wherein hybrid character possession is triggered by one of: manual learner request, affective filter threshold crossing, or educator assignment.

**15.2** The method of claim 15, wherein possession duration is bounded by one of: single conversational turn, full scene completion, or manual release by the learner.

---

## Claim 16: Cross-Schema Competency Transfer Protocol

### Claim 16 Independent

A computer-implemented method for preserving and transferring learner competency data across persona schema transitions comprising:

(a) on schema deactivation, serializing the active interlanguage grammar snapshot, friction pattern history, phoneme accuracy profile, and cultural intelligence profile to a schema-agnostic transfer record;

(b) on schema activation, ingesting said transfer record and computing a domain relevance score for each transferred competency item against the incoming schema's vocabulary matrix and cultural norms;

(c) selectively importing competency items above a relevance threshold into the new schema's learner state;

(d) generating a cross-schema adjustment directive that biases the incoming session's Forward Injection toward competencies not transferred;

wherein the transfer protocol ensures learner continuity across domain transitions without false-positive competency assumption, and wherein competency items below the relevance threshold are archived for potential re-import during future schema transitions.

### Claim 16 Dependents

**16.1** The method of claim 16, wherein the domain relevance score is computed using a composite function of vocabulary overlap coefficient, grammatical structure similarity, and cultural norm compatibility between source and target schemas.

**16.2** The method of claim 16, wherein on schema swap, NPC relationship records are preserved independently of vocabulary and environment fields, maintaining social continuity even when domain content resets.

---

## Patentability Differentiation

| Claim / Innovation | Prior Art (Closest Known) | Key Differentiator |
| --- | --- | --- |
| Recursive Feedback Engine (Claim 1) | ITS feedback loops | Forward Injection: NPC briefing invisible to learner; no prior art for this in social simulation |
| Interlanguage Engine (Claim 2) | CALL systems with error tracking | Bayesian confidence + Processability Theory developmental staging in real-time social sim |
| Anti-Fossilization (Claim 3) | Spaced repetition (Anki, SuperMemo) | Three-strategy escalation targeting fossilization mechanism, not recall frequency |
| Forward Injection (Claim 4) | Learning objectives in ITS | Invisible, narrative-embedded, NPC-mediated — distinct from explicit objective presentation |
| Tri-Refraction Interface (ADR-004) | Grammar correction UI | Simultaneous three-register output with metalinguistic explanation — no known prior art |
| Social Reputation (ADR-005) | Social skills games | Invisible numeric scores governing NPC behavior — inverts standard gamification |
| **AAM Runtime Customization (Claim 13)** | Adaptive learning platforms | Per-layer runtime customization without session interruption + event-bus isolation |
| **Multimodal Schema Compilation (Claim 14)** | Low-code app builders | Educational simulation compiled from multimodal prompt inputs in one pipeline |
| **Hybrid Character Control (Claim 15)** | Role-playing games | Pedagogically-motivated NPC possession with affective-threshold triggering |
| **Cross-Schema Transfer (Claim 16)** | Learning platform skill trees | Schema-agnostic competency serialization with domain-relevance scoring |

---

## Related Documents

| Document | Purpose |
| --- | --- |
| [patent-claims.md](patent-claims.md) | Original 12 provisional patent claims |
| [aam-charter.md](aam-charter.md) | AAM architecture (Claim 13 context) |
| [multimodal-prompt-guide.md](multimodal-prompt-guide.md) | Multimodal pipeline (Claim 14 context) |
| [character-control-spec.md](character-control-spec.md) | Hybrid control (Claim 15 context) |
