# Security & Privacy Architecture

> Data classification, compliance framework, and privacy-by-design
> architecture for AAPM Framework deployments.

---

## Data Classification

The AAPM processes four categories of sensitive data:

| Category | Examples | Classification | Retention |
|----------|----------|----------------|-----------|
| **PII** | Name, email, age, nationality | Restricted | Until account deletion |
| **Voice Data** | Audio recordings, pronunciation samples | Highly Restricted | Processed, then deleted within 72h unless learner opts in |
| **Behavioral Data** | Friction patterns, session transcripts, NPC interactions | Confidential | Aggregated after 90 days |
| **Derived Analytics** | CEFR progression, interlanguage model, engagement metrics | Internal | Retained indefinitely (anonymizable) |

---

## GDPR Compliance Architecture

### Lawful Basis

- **Consent** (Art. 6(1)(a)): Explicit consent obtained during onboarding for data processing, voice recording, and behavioral analysis.
- **Legitimate Interest** (Art. 6(1)(f)): System performance monitoring, fraud prevention.

### Data Subject Rights Implementation

| Right | Implementation | Endpoint |
|-------|---------------|----------|
| **Access** (Art. 15) | Export full learner profile, session history, NPC relationships | `GET /api/v1/learner/{id}/export` |
| **Rectification** (Art. 16) | Edit profile data, correct assessment | `PATCH /api/v1/learner/{id}/profile` |
| **Erasure** (Art. 17) | Delete all PII, anonymize behavioral data, delete vector memories | `DELETE /api/v1/learner/{id}` |
| **Portability** (Art. 20) | JSON export of all learner data | `GET /api/v1/learner/{id}/export?format=json` |
| **Restriction** (Art. 18) | Pause all processing, retain data | `POST /api/v1/learner/{id}/restrict` |
| **Objection** (Art. 21) | Opt out of specific processing activities | `POST /api/v1/learner/{id}/objection` |

### Deletion Pipeline

When a learner requests account deletion:

1. **Immediate**: PII fields nullified, auth tokens revoked
2. **Within 24h**: Voice recordings deleted from storage
3. **Within 72h**: Vector memory entries deleted from vector DB
4. **Within 30 days**: Session transcripts anonymized (learner ID replaced with hash)
5. **Retained** (anonymized): Aggregate friction statistics, phoneme accuracy distributions (for system improvement, no re-identification possible)

---

## COPPA Compliance (if users may be under 13)

- **Age Gating**: Age verification during onboarding
- **Parental Consent**: If under 13, require verifiable parental consent before data collection
- **Data Minimization**: Collect only data necessary for the service
- **No Behavioral Advertising**: AAPM never serves ads; this is preemptive protection
- **Parental Access**: Parents can review and delete child's data

> **Implementation Note**: If the deployment target exclusively serves adult professional learners (e.g., medical migration, football), COPPA compliance may be documented as "not applicable" with the age restriction enforced at registration.

---

## CCPA Compliance

- **Do Not Sell**: AAPM never sells personal data. Disclosure documented in privacy policy.
- **Right to Know**: Covered by GDPR access rights (same endpoint)
- **Right to Delete**: Covered by GDPR erasure rights (same endpoint)
- **Non-Discrimination**: Service quality does not change based on privacy choices

---

## Voice Data Handling

Voice recordings are the most sensitive data in the AAPM system.

### Processing Pipeline

```
Learner speaks
  → Audio captured in browser (WebRTC)
    → Transmitted over TLS 1.3 to processing server
      → ASR transcription (text extracted)
      → PAE analysis (phoneme scores extracted)
        → Audio DELETED from processing server
        → Only text transcript + phoneme scores retained
```

### Opt-In Extended Retention

Learners can opt in to retain voice recordings for:

- Personal review of pronunciation progress
- Fine-tuning of personalized pronunciation models

If opted in:

- Recordings encrypted at rest (AES-256)
- Stored in learner-specific isolated storage
- Deletable at any time through profile settings
- Automatically deleted on account deletion

### Third-Party Audio Processing

If using third-party ASR/TTS services (Azure Speech, Whisper API, ElevenLabs):

- Data processing agreements (DPAs) required
- Audio transmitted over encrypted channels only
- No third-party retention of audio beyond processing
- Privacy policy documents which services are used

---

## Encryption Architecture

| Layer | Mechanism |
|-------|-----------|
| **In Transit** | TLS 1.3 for all API communication |
| **At Rest (Database)** | AES-256 encryption for PII fields |
| **At Rest (Vector DB)** | Provider-managed encryption (Pinecone, Weaviate) |
| **At Rest (File Storage)** | AES-256 for audio files |
| **API Keys** | Environment variables, never in source code |
| **Session Tokens** | JWT with RS256 signing, 24h expiry |

---

## Data Residency

Deployment-configurable data residency:

- **EU deployments**: All data stored in EU regions (GDPR requirement)
- **US deployments**: Data stored in US regions
- **Multi-region**: Data stored in learner's declared region of residence

Vector database and LLM provider selection must align with residency requirements.

---

## Anonymization Pipeline

For system improvement analytics, learner data is anonymized:

1. **Learner ID removal**: Replaced with non-reversible hash
2. **NPC name generalization**: Character names replaced with role labels
3. **Domain generalization**: Specific domain replaced with category (e.g., "premier-league" → "sports")
4. **Temporal jittering**: Timestamps randomized within ±7 days
5. **Vocabulary generalization**: Specific terms replaced with frequency-tier labels

**k-Anonymity target**: k ≥ 5 (each anonymized record is indistinguishable from at least 4 others)

---

## Incident Response

| Severity | Response Time | Notification |
|----------|--------------|--------------|
| **Critical** (data breach) | Within 1 hour | Users within 72h (GDPR Art. 34) |
| **High** (vulnerability) | Within 4 hours | Affected users within 7 days |
| **Medium** (potential exposure) | Within 24 hours | Internal review, patch |
| **Low** (configuration issue) | Within 72 hours | Fix and document |
