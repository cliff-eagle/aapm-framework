/**
 * @aapm/core — Master Barrel Export
 *
 * Every module in the AAPM Framework core is re-exported from this
 * single entry point. Modules with name collisions are exported
 * as namespaces to avoid ambiguity.
 *
 * Usage:
 *   import { createEventBus, type WorldState } from '@aapm/core';
 *   import { FeedbackEngine, Persistence } from '@aapm/core';
 *
 * @module core
 * @patentCritical Claim 13 — Unified Module Surface
 */

// ═══════════════════════════════════════════════════════════════
// 1. FOUNDATION — Core types, event bus, schema loader
// ═══════════════════════════════════════════════════════════════

// Root types (canonical definitions — these win any name conflicts)
export * from './types';

// Event bus (no conflicts — unique class + types)
export * from './event-bus';

// Schema loader
export * from './schema-loader';

// ═══════════════════════════════════════════════════════════════
// 2. ENGINE — World, dialogue, session orchestrator
// ═══════════════════════════════════════════════════════════════

export * from './world-engine';
export * from './dialogue-engine';
export * from './session-orchestrator';

// ═══════════════════════════════════════════════════════════════
// 3. INTELLIGENCE — Agent, AI providers, multimodal, curriculum
// ═══════════════════════════════════════════════════════════════

export * from './agent-intelligence';
export * from './ai-providers';
export * from './multimodal-router';

import * as CurriculumDeliveryRouter from './curriculum-delivery-router';
export { CurriculumDeliveryRouter };

// ═══════════════════════════════════════════════════════════════
// 4. LINGUISTICS — Modules with potential name collisions are
//    exported as namespaces to avoid ambiguity
// ═══════════════════════════════════════════════════════════════

import * as FeedbackEngine from './feedback-engine';
import * as InterlanguageEngine from './interlanguage-engine';
import * as PhonemeEngine from './phoneme-engine';
import * as AntiFossilization from './anti-fossilization';
import * as CulturalIntelligence from './cultural-intelligence';
import * as Refraction from './refraction';

export {
    FeedbackEngine,
    InterlanguageEngine,
    PhonemeEngine,
    AntiFossilization,
    CulturalIntelligence,
    Refraction,
};

// ═══════════════════════════════════════════════════════════════
// 5. INFRASTRUCTURE — Persistence, retention, evaluation,
//    tier management, collaboration, runtime customization
// ═══════════════════════════════════════════════════════════════

import * as Persistence from './persistence';
import * as Retention from './retention';
import * as Evaluation from './evaluation';
import * as TierManager from './tier-manager';
import * as Collaboration from './collaboration';
import * as RuntimeCustomization from './runtime-customization';
import * as Integration from './integration';

export {
    Persistence,
    Retention,
    Evaluation,
    TierManager,
    Collaboration,
    RuntimeCustomization,
    Integration,
};
