# Soft Landing Protocol

> Graceful proficiency recalibration when assessed performance does not match stated level.

---

## Problem

A learner self-reports B2 but performs at A2. Placing them in Tier 2 environments triggers catastrophic Affective Filter elevation — the exact outcome the AAPM is designed to prevent. The system needs to detect and respond to this mismatch without humiliation.

---

## Detection Signals

The system monitors for **proficiency mismatch** using three converging signals within the first 3 sessions:

| Signal | Threshold | Window |
| ------ | --------- | ------ |
| Friction point density | >3× expected rate for stated level | Per session |
| L1 fallback rate | >40% of utterances contain L1 | Rolling 10 turns |
| Response latency | >2× population baseline for stated level | Rolling 10 turns |
| Task completion rate | <30% in Tier 2 environments | First 3 sessions |
| Affective state | Persistent `anxious` or `overwhelmed` | 2+ consecutive sessions |

When **3+ signals** converge, the system activates the Soft Landing Protocol.

---

## Response Sequence

### Phase 1: Immediate Scaffolding Increase (Within Session)

- Companion is auto-summoned with an in-narrative reason ("Hey, I was just nearby — mind if I join?")
- NPC speech rate reduces by 20%
- NPC register shifts one level more casual
- Scaffolding level increases to Level 3+ automatically
- **No explicit mention of proficiency mismatch**

### Phase 2: Post-Session Companion Debrief

After the session, the Companion initiates a debrief:

> "That was intense, right? I remember my first weeks — everything was too fast. Want to spend some time building up to that level? We can practice the fundamentals together first."

The debrief:

- Validates the learner's experience (normalizes difficulty)
- Offers the recalibration as **choice, not correction**
- Frames it as "building a foundation" rather than "going back to basics"
- Never references the original self-reported level

### Phase 3: Recalibration Options

The learner is presented with three options (through Companion dialogue, not a settings menu):

1. **"Let's build up together"** → System recalibrates to A2/B1, starts Tier 1 reinforcement, fast-tracks to Tier 2 when ready
2. **"I want to keep trying"** → System maintains current placement but increases scaffolding permanently; Companion stays present in Tier 2 as support
3. **"Show me what I'm good at"** → System runs a skills audit highlighting strengths and gaps; presents a personalized path that starts from demonstrated competence

### Phase 4: Graduated Re-Entry

If the learner accepts recalibration:

- Tier 1 sessions focus on the specific gaps detected (not a full restart)
- Forward Injection targets the exact friction patterns from the failed sessions
- Tier 2 readiness is computed from demonstrated proficiency, not time
- When the learner is re-promoted to Tier 2, the Companion explicitly celebrates: "You're ready now. I can tell."

---

## Design Principles

1. **Never use the word "level" or "downgrade"** — frame everything as path customization
2. **Agency over correction** — learner chooses; system suggests
3. **Companion is the messenger** — recalibration comes from a trusted relationship, not a system notification
4. **Fast-track, not restart** — curriculum targets gaps only, not the full sequence
5. **Celebrate re-entry** — the return to Tier 2 must feel earned and recognized

---

## Cold-Start Defaults

For the first 3 sessions before the system has reliable learner data:

| Parameter | Default |
| --------- | ------- |
| Curriculum format | Flashcard (simplest engagement) |
| Scaffolding level | Level 2 (moderate support) |
| Pressure target | Lower quartile of stated-level range |
| Affective baseline | Population norms for stated CEFR level |
| Code-switching ratio | 0.6 (majority L1 for safety) |
