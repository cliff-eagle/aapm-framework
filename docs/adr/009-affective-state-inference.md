# ADR-009: Affective State Inference

- **Status**: Accepted
- **Date**: 2026-02-23
- **Authors**: Cliff Eagle

## Context

Krashen's Affective Filter Hypothesis is one of the most robust findings in SLA: when a learner is anxious, self-conscious, or emotionally overwhelmed, acquisition stops regardless of input quality. The system must detect negative affect and respond pedagogically.

The original AAPM specification included an `EmotionalState` enum (confident, engaged, uncertain, frustrated, etc.) but provided no mechanism for determining WHICH state the learner is in. This made the enum decorative rather than functional.

Explicit self-report ("How are you feeling?") is unreliable — learners underreport anxiety and overreport engagement. The system must infer affect from behavioral signals.

## Decision

We implement a **six-signal computational inference method** that detects learner emotional state from observable interaction patterns, calibrated against per-learner baselines.

### Six Behavioral Signals

| Signal | Interpretation |
| -------- | --------------- |
| Response Latency | Above baseline → uncertainty/difficulty |
| L1 Fallback Rate | Increasing → cognitive overload |
| Hedging Frequency | High → uncertainty |
| Pause Duration | Long intra-utterance pauses → retrieval difficulty |
| Topic Avoidance | High → anxiety about specific domains |
| Repair Attempt Rate | High → both learning AND frustration signal |

### Per-Learner Baselines

Some learners are naturally hesitant; some are naturally fast. Interpreting signals requires knowing the learner's personal "normal." Baselines are computed from the first 3-5 sessions and continuously updated with Bayesian updates.

### Scaffolding Escalation

When negative affect is detected (frustrated, anxious, overwhelmed), the system automatically escalates scaffolding through 5 levels, from subtle adjustments to full companion activation.

## Rationale

### Why behavioral inference, not self-report?

1. Self-report interrupts the conversational flow (violates Flow State Preservation)
2. Learners underreport negative emotions (social desirability bias)
3. Behavioral signals are available in real-time without learner action
4. Inference accuracy improves with data; self-report accuracy does not

### Why per-learner baselines?

A response latency of 3 seconds is normal for one learner and a red flag for another. Without personal baselines, every inference is confounded by individual differences in processing speed, personality, and communication style.

### Why six signals, not more?

These six signals are measurable from text-based interaction alone (no camera, no biometrics). Adding physiological signals (heart rate, galvanic skin response) would improve accuracy but requires hardware the AAPM's web-first platform doesn't guarantee.

## Consequences

### Positive

- Detection of learner distress enables real-time pedagogical adaptation
- Scaffolding escalation implements Krashen's insight computationally
- Per-learner calibration prevents false positives from individual variation
- No additional hardware required — works from text interaction alone

### Negative

- Inference accuracy is limited by signal availability (no facial expression, no tone)
- Baseline requires 3-5 sessions before reliable inference
- "Frustrated" and "determined" states produce similar signals

### Mitigations

- Secondary state classification with confidence scores for ambiguous cases
- Conservative escalation: better to offer unnecessary support than miss genuine distress
- Baseline warm-up period uses population-level norms until personal baseline stabilizes

## Alternatives Considered

1. **Self-report survey**: Rejected — interrupts flow, social desirability bias
2. **Camera-based emotion detection**: Rejected — privacy concerns, hardware dependency
3. **Single signal (latency only)**: Rejected — insufficient for disambiguating frustration from difficulty
4. **No affect detection**: Rejected — ignores the most well-established finding in SLA
