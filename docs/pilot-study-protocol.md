# Pilot Study Protocol

> Structured evaluation plan for validating AAPM learning outcomes.

---

## Study Design

### Type

Mixed-methods quasi-experimental study with pre/post assessment.

### Research Questions

1. **Efficacy**: Do AAPM learners demonstrate greater communicative competence gains than control group learners using conventional apps?
2. **Engagement**: Do AAPM learners show higher session completion rates and longer engagement durations?
3. **Affect**: Do AAPM learners report lower language anxiety than control group learners?
4. **Transfer**: Do AAPM friction patterns resolve at a higher rate than conventional SRS-based correction?

---

## Participants

| Parameter | Value |
| --------- | ----- |
| Sample size | 60 (30 treatment, 30 control) |
| Age range | 18-45 |
| L1 | Homogeneous per cohort (e.g., all Mandarin speakers) |
| L2 | English |
| Starting CEFR | A2-B1 (verified via placement test) |
| Recruitment | University language programs, corporate L&D |
| Compensation | $50 gift card + free continued access |

### Exclusion criteria

- Heritage speakers of L2
- Prior AAPM exposure
- Diagnosed language learning disability (may confound)

---

## Protocol

### Timeline

| Week | Activity |
| ---- | -------- |
| 0 | Recruitment, screening, informed consent |
| 1 | Pre-assessment: placement test, anxiety survey, speaking sample |
| 2-7 | Intervention period (6 weeks, 3 sessions/week) |
| 8 | Post-assessment: repeat pre-assessment battery |
| 10 | Delayed post-test (2-week retention check) |
| 11 | Qualitative interviews (subset of 12 participants) |

### Treatment Group (AAPM)

- 3× 30-minute AAPM sessions per week
- Progressive tier exposure: Weeks 1-2 (Tier 1 dominant), Weeks 3-4 (Tier 2 introduction), Weeks 5-6 (Tier 2 dominant + Tier 3 introduction)
- Same persona schema for all participants (e.g., `university-admissions.yaml`)
- All micro-curricula delivered between sessions

### Control Group

- 3× 30-minute sessions with conventional app (Duolingo or equivalent)
- Matched content domain (academic English)
- Matched time-on-task

---

## Instruments

### Pre/Post Assessments

| Instrument | What It Measures | Administration |
| ---------- | --------------- | -------------- |
| Oxford Placement Test | CEFR level (grammar + listening) | Online, 45 min |
| IELTS Speaking Mock | Communicative competence (holistic) | Examiner-rated, 15 min |
| Elicited Imitation Task | Implicit grammatical knowledge | Audio prompt, 20 min |
| Foreign Language Anxiety Scale (FLCAS) | Language anxiety | Likert survey, 10 min |
| Can-Do Self-Assessment | Perceived communicative ability | Survey, 5 min |

### Process Measures (AAPM Group Only)

Collected automatically by the framework:

| Metric | Source | Frequency |
| ------ | ------ | --------- |
| Friction Point Recurrence Rate | Pipeline Phase 2 | Per session |
| Task Completion Rate | Session record | Per session |
| Code-Switch Reduction Rate | Session metrics | Per session |
| Affective State Distribution | Micro-loop | Per turn |
| Forward Injection Hit Rate | Phase 5 logs | Per session |
| Social Reputation Trajectory | NPC state | Per session |
| Comprehensibility Score | PAE | Per utterance |

### Qualitative Data

- Semi-structured interviews (30 min, audio-recorded)
- Thematic analysis using Braun & Clarke (2006) framework
- Interview guide topics: perceived learning, emotional experience, NPC relationships, comparison to prior learning

---

## Analysis Plan

### Quantitative

| Comparison | Test | Primary Outcome |
| ---------- | ---- | --------------- |
| Treatment vs Control (IELTS) | Independent t-test / Mann-Whitney | Speaking score gain |
| Treatment vs Control (FLCAS) | Independent t-test | Anxiety reduction |
| Pre/Post within AAPM | Paired t-test | CEFR advancement |
| FPRR trend over 6 weeks | Linear mixed model | Friction resolution rate |
| Session engagement | Survival analysis | Time-to-dropout |

### Effect Size

- Target: Cohen's d ≥ 0.5 (medium effect) for speaking score improvement
- Power analysis: n=30/group provides 80% power for d=0.55 at α=0.05

### Qualitative

- Thematic analysis of interview transcripts
- Axial coding of emotional experience themes
- Member checking with 3 participants

---

## Ethical Considerations

| Consideration | Mitigation |
| ------------- | ---------- |
| Data privacy | All session data anonymized; voice recordings deleted after transcription |
| Informed consent | IRB-approved consent form; right to withdraw without penalty |
| Learner distress | Soft Landing Protocol active; researcher contact for escalation |
| AI deception | Participants informed AI is generating dialogue (no deception about NPC nature) |
| Control group disadvantage | Control group offered AAPM access after study completion |

### IRB Submission Requirements

- Protocol description (this document)
- Informed consent template
- Data management plan
- Risk assessment
- Participant recruitment materials

---

## Success Criteria

| Criterion | Threshold | Priority |
| --------- | --------- | -------- |
| IELTS speaking improvement ≥ treatment advantage | d ≥ 0.5 | Primary |
| FLCAS anxiety reduction ≥ treatment advantage | d ≥ 0.3 | Secondary |
| Session completion rate | >80% of scheduled sessions | Engagement |
| FPRR decrease over 6 weeks | Significant negative slope | Process |
| Participant NPS | ≥ 40 | Satisfaction |
