# ADR-005: Social Reputation Persistence System

- **Status**: Accepted
- **Date**: 2025-02-23
- **Authors**: Cliff Eagle

## Context

Language learning applications lack consequences. When a learner fails a Duolingo exercise, nothing happens beyond a lost heart. When a learner mispronounces a word in Babbel, the system forgets by the next lesson. This absence of consequence removes the most powerful motivator for accurate communication: social reality.

In real life, how you communicate changes how people treat you. The barista who remembers your order, the colleague who gets annoyed when you forget their name, the client who loses confidence when you use the wrong register — these social consequences create the motivation to communicate better.

The AAPM must create social consequences within the simulation that feel real.

## Decision

We implement an **invisible Social Reputation System** where every NPC maintains an internal reputation score for the learner. This score:

- Ranges from **-1.0** (hostile) to **+1.0** (trusted)
- Is **never directly visible** to the learner
- **Governs NPC behavior**: warmth, helpfulness, information sharing, patience
- Is **bidirectional**: both NPC-to-learner and learner-to-NPC impression tracking
- **Allows repair**: The learner can always improve a damaged relationship

### Score Ranges and NPC Behavior

| Range | NPC Behavior |
|-------|-------------|
| -1.0 to -0.5 | Cold, minimal responses, avoids interaction |
| -0.5 to 0.0 | Neutral, professional distance, standard service |
| 0.0 to 0.5 | Friendly, conversational, offers discretionary help |
| 0.5 to 1.0 | Warm, remembers details, offers deals/tips/introductions |

### Score Modification Events

| Event | Delta | Applies To |
|-------|-------|-----------|
| Successful communication | +0.05-0.10 | All tiers |
| Remembering NPC's name/details | +0.05 | All tiers |
| Register-appropriate interaction | +0.05 | Tier 2, 3 |
| Communication breakdown (unrepaired) | -0.05-0.15 | Tier 2, 3 |
| Topic/commitment forgotten | -0.10 | Tier 2, 3 |
| Register violation | -0.10 | Tier 3 |
| Cultural insensitivity | -0.15 | All tiers |
| Repair of previous error | +0.10-0.15 | All tiers |

## Rationale

### Why invisible, not a visible gamification metric?

Visible scores create gaming behavior — learners optimize for the metric rather than for genuine communication. If the learner can see a "7.3 reputation" number:

1. They learn to manipulate the score rather than developing real social awareness
2. The score becomes the goal rather than the communication
3. Anxiety shifts from social skill to number optimization
4. The simulation feel is destroyed: "This NPC's reputation meter went up" vs. "The shopkeeper seemed friendlier today"

The invisibility forces the learner to read social cues — exactly the skill they need in real life. They notice the barista is warmer, the colleague more chatty, or the doctor more curt, and they learn to correlate their communication behavior with social response.

### Why bidirectional?

The learner also forms impressions of NPCs. This creates narrative agency:

- "I don't like that shopkeeper, he was rude when I stumbled." But the NPC was rude because the learner had a low reputation from previous interactions. This creates a recoverable feedback loop grounded in social reality.
- The learner's impression of NPCs guides their navigation of the simulation world — they gravitate toward friendlier NPCs (higher mutual reputation) and avoid difficult ones, until the system (through forward injection) creates reasons to re-engage.

### Why must repair always be possible?

Language learning involves failure. If a damaged reputation were permanent:

1. Learners would avoid NPCs they'd failed with, reducing practice diversity
2. The simulation world would become progressively hostile as reputation degrades
3. Learners would restart rather than face consequences — losing progress

Repair is always possible because in real life, social relationships are repairable. The repair itself is a high-value learning moment — apologizing, acknowledging a past mistake, demonstrating improvement. The system incentivizes repair by making it the highest-delta positive event.

### Why per-NPC, not a global score?

Global reputation would average across contexts, losing the social texture. A learner might be great with peers (Tier 2 high reputation) but terrible with authority figures (Tier 3 low reputation). This asymmetry is diagnostic — it reveals specific communicative gaps. Per-NPC reputation also creates narrative depth: relationships with individual characters drive engagement.

## Consequences

### Positive

- Creates genuine communicative stakes within the simulation
- Develops social-pragmatic awareness in addition to linguistic competence
- NPC behavior variability makes the simulation world feel alive
- Repair mechanics create some of the most powerful learning moments
- Per-NPC differentiation creates narrative investment

### Negative

- Reputation must decay gracefully during learner absence (if the learner doesn't use the app for weeks, NPCs shouldn't punish them when they return)
- Reputation scoring must be consistent and fair — perceived unfairness would be deeply demotivating
- Implementation complexity: every NPC must query reputation before generating behavior

### Mitigations

- Reputation decay during absence is capped: maximum decay of 0.1 per week of inactivity
- Scoring events are logged with reasons, enabling debugging and calibration
- Minimum reputation floor: -0.5 (NPCs never become hostile, only cold)
- Session warmup: First interaction after extended absence starts with a neutral, friendly NPC overture

## Alternatives Considered

1. **Visible XP/reputation score**: Rejected — creates gaming behavior
2. **No social consequence system**: Rejected — removes the core motivator for accurate communication
3. **Global reputation score**: Rejected — loses per-NPC social texture
4. **Fixed NPC behavior**: Rejected — makes the simulation feel scripted and unmotivating
5. **Permanent reputation damage**: Rejected — contradicts the pedagogical principle that failure is necessary for learning
