# Language Expansion Checklist

> Step-by-step process for adding a new L1-L2 language pair to the AAPM.

---

## Overview

The AAPM is designed to be language-agnostic at the framework level. Adding a new language pair requires configuring linguistic knowledge, cultural data, and evaluation parameters — not code changes.

---

## Prerequisites

Before starting, confirm:

- [ ] The L1 and L2 both have ISO 639-1 codes
- [ ] At least one CEFR-aligned proficiency framework exists for the L2
- [ ] PAE (Phoneme Accuracy Evaluator) has phoneme inventory data for the L2
- [ ] TTS and STT models support the L2

---

## Phase 1: Linguistic Foundation (2-4 weeks)

### 1.1 Phoneme Inventory

- [ ] Document L2 phoneme inventory (IPA)
- [ ] Identify L1→L2 phoneme mapping (which L2 phonemes don't exist in L1)
- [ ] Create pronunciation difficulty ranking (easiest → hardest for this L1 speaker)
- [ ] Configure PAE thresholds per phoneme (some phonemes tolerate more variation)

### 1.2 Morphosyntactic Transfer Profile

- [ ] Document known negative transfer patterns (L1 grammar rules that produce L2 errors)
- [ ] Document positive transfer patterns (L1 rules that help L2 production)
- [ ] Document avoidance patterns (L2 structures the L1 speaker avoids)
- [ ] Document overproduction patterns (L2 structures the L1 speaker overuses)
- [ ] Create `L1L2TransferRecord` entries per ADR-011 spec

### 1.3 Register System

- [ ] Define L2 register levels (e.g., Japanese: casual/polite/honorific/humble)
- [ ] Map L2 registers to AAPM's 3-level model (basic/native/formal) or extend
- [ ] Document register markers (words, morphology, syntax that signal register)
- [ ] Define register violation severity per social context

### 1.4 Developmental Stages

- [ ] Map L2 acquisition order to Processability Theory stages (if researched)
- [ ] Define CEFR → stage mapping for this L2
- [ ] Configure IHE developmental stage constraints

---

## Phase 2: Cultural Configuration (2-3 weeks)

### 2.1 Cultural Dimensions

- [ ] Score the L2 culture on Hofstede dimensions (power distance, individualism, etc.)
- [ ] Define cultural norms for the persona schema (greetings, gift-giving, taboos, etc.)
- [ ] Document culture shock points for L1 speakers entering L2 culture
- [ ] Create Cultural Intelligence assessment items

### 2.2 Pragmatic Competence

- [ ] Document speech act conventions (how to request, refuse, apologize, complain)
- [ ] Document face management strategies (positive face, negative face)
- [ ] Document conversational repair conventions
- [ ] Document non-verbal communication norms (if relevant to text-based sim)

### 2.3 NPC Cultural Overlay

- [ ] Configure NPC cultural overlay parameters (directness, formality default, etc.)
- [ ] Define culture-specific NPC behavioral variations
- [ ] Create at minimum 3 NPCs with culturally authentic personalities

---

## Phase 3: Content Development (3-4 weeks)

### 3.1 Persona Schema

- [ ] Create at least one complete persona schema for this L1-L2 pair
- [ ] Define Tier 1 companion personality (culturally appropriate bilingual friend)
- [ ] Define 3+ Tier 2 scenarios (daily life in L2 environment)
- [ ] Define 2+ Tier 3 scenarios (professional/high-stakes contexts)
- [ ] Create vocabulary matrix (Tier 1 essentials, Tier 2 domain, Tier 3 professional)

### 3.2 Prompt Templates

- [ ] Localize NPC system prompts for L2 cultural context
- [ ] Localize friction extraction prompts for L1-L2 specific error patterns
- [ ] Localize curriculum generation prompts for L1 explanations
- [ ] Localize refraction generation for L2 register system

### 3.3 Evaluation Calibration

- [ ] Calibrate comprehensibility thresholds for L2 (some languages more tolerant)
- [ ] Set register accuracy expectations per CEFR level
- [ ] Define CEFR boundary criteria specific to L2

---

## Phase 4: Testing & Validation (2-3 weeks)

### 4.1 Automated Testing

- [ ] Run model substitution tests with L2-specific test data
- [ ] Verify friction extraction correctly identifies L1-specific transfer errors
- [ ] Verify IHE developmental stage filtering works for L2
- [ ] Verify register classifier accuracy for L2

### 4.2 Expert Review

- [ ] L2 native speaker reviews all NPC dialogue templates
- [ ] Applied linguist reviews CEFR mapping and developmental stages
- [ ] Cultural consultant reviews cultural norms and CQ assessment items

### 4.3 Pilot Testing

- [ ] 5-10 learners complete 3+ sessions each
- [ ] Measure: friction detection accuracy, curriculum relevance, learner satisfaction
- [ ] Iterate on schema based on pilot feedback

---

## Quick Reference: Estimated Effort

| Phase | Duration | FTE Required |
| ----- | -------- | ------------ |
| Linguistic Foundation | 2-4 weeks | 1 linguist + 1 engineer |
| Cultural Configuration | 2-3 weeks | 1 cultural consultant + 1 engineer |
| Content Development | 3-4 weeks | 1 content creator + 1 linguist |
| Testing & Validation | 2-3 weeks | 1 QA + external reviewers |
| **Total** | **9-14 weeks** | **3-4 FTE** |

---

## Currently Supported Pairs

| L1 | L2 | Status | Example Schema |
| -- | -- | ------ | -------------- |
| Portuguese | English | ✅ Production | `premier-league.yaml` |
| Arabic | German | ✅ Production | `medical-migration.yaml` |
| Multiple | Multiple | ✅ Production | `mediterranean-yacht.yaml` |
| Chinese | English | ✅ Ready | `university-admissions.yaml` |
| Hindi | German | ✅ Ready | `tech-hub.yaml` |
| English | Korean | ✅ Ready | `heritage-recovery.yaml` |
