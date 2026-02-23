# Transparency & Explainability Layer

> Making the AAPM's adaptive decisions visible and understandable to learners, educators, and auditors.

---

## Motivation

The AAPM makes hundreds of invisible pedagogical decisions per session: adjusting communicative pressure, selecting curriculum content, modulating NPC behavior, triggering scaffolding. For the system to be trustworthy — especially in institutional and research contexts — these decisions must be explainable.

This document defines the Transparency Layer: a system for surfacing the AAPM's reasoning in context-appropriate ways.

---

## Audience-Specific Transparency

### For Learners: Session Insights

After each session, learners can access a "Session Insights" view:

| Insight | What It Shows | Example |
| ------- | ------------- | ------- |
| Friction Summary | What you struggled with today | "You had difficulty with subjunctive mood (3 instances)" |
| Strength Spotlight | What you did well | "Your register was appropriate in 9/10 turns ✨" |
| Companion Decisions | Why the Companion appeared | "Your Companion joined when the system detected you were getting overwhelmed" |
| Progress Trajectory | How you're improving over time | Visual graph of FPRR declining |

**Design constraint**: Insights are framed as encouragement, never as criticism. The system *shows* patterns; the Companion *explains* them.

### For Educators: Cohort Dashboard

Educators managing learner groups see:

| View | Contents |
| ---- | -------- |
| Cohort Overview | Average CEFR progression, session completion rates, engagement trends |
| Individual Learner Cards | Per-learner FPRR, tier progression, friction pattern analysis |
| Intervention Recommendations | "3 learners showing fossilization in subjunctive — consider targeted group lesson" |
| System Decision Log | Why the AAPM promoted/held a learner at a tier |
| Privacy-Respecting | Educators see aggregated metrics, NOT raw conversation transcripts |

### For Auditors/Researchers: Full Decision Trace

Complete audit trail for every pedagogical decision:

```typescript
interface DecisionTrace {
    /** Unique decision identifier */
    id: string;

    /** When this decision was made */
    timestamp: string;

    /** Which subsystem made it */
    subsystem: 'affective-inference' | 'pressure-calibration' | 'curriculum-generation'
              | 'forward-injection' | 'tier-promotion' | 'scaffolding' | 'npc-behavior';

    /** The decision that was made */
    decision: string;

    /** Human-readable explanation */
    explanation: string;

    /** Input signals that drove the decision */
    inputSignals: Record<string, unknown>;

    /** Alternative decisions that were considered */
    alternatives: Array<{
        decision: string;
        reason_rejected: string;
    }>;

    /** Outcome of the decision (populated after the fact) */
    outcome?: {
        learnerResponse: string;
        effectivenessScore: number;
    };
}
```

---

## Explainability by Subsystem

### Affective State Inference

**What the system shows**: "I noticed you might be feeling [state]. Here's what I picked up on."

**How it explains**:

- "Your responses got shorter and you switched to [L1] more often"
- "You started hedging with 'I think' and 'maybe' more frequently"
- "These are signals I use to understand how you're feeling — I might be wrong!"

**Key principle**: Always acknowledge uncertainty. Never say "You ARE frustrated" — say "It seems like this might be challenging."

### Forward Injection

**What the system shows** (post-session only): "Your Companion and NPCs created practice opportunities for [target form]."

**How it explains**:

- "Remember when [NPC] asked about weekend plans? That was designed to give you a chance to practice subjunctive mood."
- "This is how the AAPM works — it turns your mistakes into natural practice opportunities."

**Key principle**: Reveal injection mechanics ONLY after the session. Mid-session reveals would break immersion and the pedagogical effect.

### Tier Promotion / Soft Landing

**What the system shows**: "I'm suggesting we adjust your learning path."

**How it explains** (via Companion):

- "Based on how our conversations have been going, I think you're ready for [next tier]"
- "I noticed some areas where we could build more confidence before moving on — want to explore them together?"

**Key principle**: The Companion mediates all tier decisions. The system never directly announces promotions or demotions.

### Curriculum Selection

**What the system shows**: "Here's why your micro-curriculum focuses on [topic]."

**How it explains**:

- "This came up 3 times in your last session"
- "This is a pattern I've seen across multiple sessions"
- "This is a known challenge for [L1] speakers learning [L2]"

**Key principle**: Link curriculum to concrete learner experiences, never to abstract rules.

---

## Privacy-Preserving Transparency

| Data | Learner Sees | Educator Sees | Auditor Sees |
| ---- | ------------ | ------------- | ------------ |
| Raw transcript | ✅ Own only | ❌ Never | ✅ Anonymized |
| Affective state | ✅ Simplified | ✅ Aggregated | ✅ Full traces |
| Friction points | ✅ As insights | ✅ Patterns only | ✅ Full data |
| NPC reputation | ✅ Implied via NPC behavior | ❌ Never | ✅ Scores |
| Forward injections | ✅ Post-session | ❌ Never | ✅ Full specs |
| Decision traces | ❌ Too technical | ✅ Summary | ✅ Full traces |

---

## Opt-Out Rights

Learners can control transparency levels:

| Setting | Effect |
| ------- | ------ |
| "Show me insights" (default) | Session Insights view after each session |
| "Just teach me" | No post-session analysis shown; Companion still explains in-session |
| "Full transparency" | Show all decision reasoning, including injection mechanics |
| "Research mode" | Full decision traces stored and exportable for self-study |
