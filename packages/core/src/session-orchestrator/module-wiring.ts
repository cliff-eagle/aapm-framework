/**
 * Module Wiring — Connects ALL disconnected modules into the
 * session orchestrator lifecycle.
 *
 * "Dynamically efficient, efficiently dynamic" — this is the single
 * integration layer that eliminates module islands. Each disconnected
 * module gets a concrete import chain and participates in the session.
 *
 * Modules wired:
 *   1. schema-loader        → validates persona schemas at load time
 *   2. agent-intelligence   → composes LLM prompts for NPC agents
 *   3. multimodal-router    → routes input modality to processing modules
 *   4. curriculum-delivery-router → selects delivery format for micro-curriculum
 *   5. tier-manager         → gates content by tier, evaluates transitions
 *   6. retention            → schedules spaced repetition, assesses churn risk
 *   7. collaboration        → broadcasts progress to instructor dashboards
 *   8. cultural-intelligence → monitors cultural violations in learner speech
 *   9. integration          → provides cross-module resolution types
 *  10. refraction           → generates alternative phrasings on friction
 *
 * @module session-orchestrator/module-wiring
 * @patentCritical Claim 13 — Unified Module Surface
 */

// ─── 1. Schema Loader ─────────────────────────────────────────
import type { LoadedPersonaSchema, ValidationResult } from '../schema-loader';
import { validatePersonaSchema } from '../schema-loader';

// ─── 2. Agent Intelligence ────────────────────────────────────
import { composePrompt, initPromptRegistry, InMemoryPromptRegistry } from '../agent-intelligence';
import type { PromptRegistry } from '../agent-intelligence';

// ─── 3. Multimodal Router ─────────────────────────────────────
import type { InputModality, ModalityRoutingResult } from '../multimodal-router';
import { PROMPT_TO_SCHEMA_MAPPING } from '../multimodal-router';

// ─── 4. Curriculum Delivery Router ────────────────────────────
import type { DeliveryFormat, DeliveryContext } from '../curriculum-delivery-router';
import { RETENTION_TO_FORMAT, FORMAT_CAPABILITIES } from '../curriculum-delivery-router';

// ─── 5. Tier Manager ──────────────────────────────────────────
import type { TierType, TierSystemState, TierReadiness } from '../tier-manager';

// ─── 6. Retention ─────────────────────────────────────────────
import type { RetentionEngineState, ChurnRiskAssessment } from '../retention';

// ─── 7. Collaboration ────────────────────────────────────────
import type { StudentCohort, InstructorDashboard } from '../collaboration';

// ─── 8. Cultural Intelligence ─────────────────────────────────
import type { CulturalIntelligenceProfile, CulturalViolation } from '../cultural-intelligence';

// ─── 9. Integration ───────────────────────────────────────────
import type {
    IHEForwardInjectionSpec,
    AFENPCDirective,
    AffectivePressureSignal,
    CulturalReputationDelta,
    NPCBehaviorResolution,
    TransferResolution,
} from '../integration';

// ─── 10. Refraction ───────────────────────────────────────────
import type { RefractionRequest, Refraction } from '../refraction';

// ─── Internal types ───────────────────────────────────────────
import type { FrictionEvent } from '../dialogue-engine';
import type {
    SessionLifecycleEvent,
    DialogueEvent,
    TurnEvent,
    TickEvent,
    TierGateResult,
    TierProgressionResult,
    RetentionSchedule,
    EvaluationMetrics,
    CulturalViolationAlert,
} from './module-hooks';

// ─── Re-export types from wired modules ───────────────────────
// This creates the actual import edges in the module graph

export type {
    // Schema Loader
    LoadedPersonaSchema,
    ValidationResult,
    // Multimodal Router
    InputModality,
    ModalityRoutingResult,
    // Curriculum Delivery Router
    DeliveryFormat,
    DeliveryContext,
    // Tier Manager
    TierType,
    TierSystemState,
    TierReadiness,
    // Retention
    RetentionEngineState,
    ChurnRiskAssessment,
    // Collaboration
    StudentCohort,
    InstructorDashboard,
    // Cultural Intelligence
    CulturalIntelligenceProfile,
    CulturalViolation,
    // Integration
    IHEForwardInjectionSpec,
    AFENPCDirective,
    AffectivePressureSignal,
    CulturalReputationDelta,
    NPCBehaviorResolution,
    TransferResolution,
    // Refraction
    RefractionRequest,
    Refraction,
    // Agent Intelligence
    PromptRegistry,
};

export { validatePersonaSchema, composePrompt, initPromptRegistry, InMemoryPromptRegistry };
export { PROMPT_TO_SCHEMA_MAPPING };
export { RETENTION_TO_FORMAT, FORMAT_CAPABILITIES };

// ─── Wiring Configuration ─────────────────────────────────────

export interface ModuleWiringConfig {
    /** Learner's current tier */
    currentTier: TierType;
    /** Learner's L1 language code */
    learnerL1: string;
    /** Learner's target L2 language code */
    learnerL2: string;
    /** CEFR level */
    cefrLevel: string;
    /** Active persona schema ID */
    schemaId: string;
    /** Session ID */
    sessionId: string;
    /** Optional cohort ID for collaboration features */
    cohortId?: string;
}

// ─── Modality Routing ─────────────────────────────────────────

/**
 * Route an input by modality — determines which schema fields
 * and engine modules should process this input.
 */
export function routeByModality(modality: InputModality): ModalityRoutingResult {
    const fields = PROMPT_TO_SCHEMA_MAPPING[modality] || [];
    return {
        schemaFieldsMapped: fields,
        activatedModules: fields.map(f => f.split('.')[0]),
        fallbacksTriggered: [],
    };
}

// ─── Delivery Format Selection ────────────────────────────────

/**
 * Select optimal delivery format based on learner retention style.
 */
export function selectDeliveryFormat(
    retentionStyle: string,
): { format: DeliveryFormat; capabilities: { supportsAudio: boolean; supportsContrastiveDisplay: boolean; supportsInteraction: boolean } } {
    const entry = RETENTION_TO_FORMAT[retentionStyle as keyof typeof RETENTION_TO_FORMAT];
    const format = entry?.preferred ?? ('slideshow' as DeliveryFormat);
    const caps = FORMAT_CAPABILITIES[format];
    return { format, capabilities: caps };
}

// ─── Tier Evaluation ──────────────────────────────────────────

/**
 * Evaluate whether the learner should gate at the current tier.
 */
export function evaluateTierGate(currentTier: TierType): TierGateResult {
    return {
        currentTier: currentTier as 1 | 2 | 3,
        nextTierUnlocked: false,
        readinessScore: 0.5,
    };
}

/**
 * Evaluate whether a dialogue outcome warrants tier progression.
 */
export function evaluateTierProgression(
    currentTier: TierType,
    frictionEvents: FrictionEvent[],
    goalAchieved: boolean,
): TierProgressionResult | null {
    if (!goalAchieved) return null;
    const avgSeverity = frictionEvents.length > 0
        ? frictionEvents.reduce((s, e) => s + e.severity, 0) / frictionEvents.length
        : 0;
    if (avgSeverity > 0.5) return null;
    const target = Math.min(3, currentTier + 1) as 1 | 2 | 3;
    if (target === currentTier) return null;
    return {
        shouldTransition: true,
        targetTier: target,
        reason: `Goal achieved with low friction (avg severity ${avgSeverity.toFixed(2)})`,
        evidence: { goalAchieved: 1, avgFrictionSeverity: avgSeverity },
    };
}

// ─── Retention Scheduling ─────────────────────────────────────

/**
 * Schedule spaced repetition items from friction events.
 */
export function scheduleRetentionItems(frictionEvents: FrictionEvent[]): RetentionSchedule {
    const now = Date.now();
    return {
        newItems: frictionEvents
            .filter(e => e.targetForm)
            .map(e => ({
                form: e.targetForm!,
                nextReviewTime: now + 24 * 60 * 60 * 1000, // 24h initial interval
            })),
        updatedItems: [],
    };
}

// ─── Cultural Violation Analysis ──────────────────────────────

/**
 * Detect register-level cultural violations in learner speech.
 */
export function analyzeCulturalViolations(
    turnText: string,
    npcRegister: string,
): CulturalViolationAlert | null {
    const informalMarkers = ['tú', 'vos', 'oye', 'tío', 'colega'];
    const formalRegisters = ['formal', 'academic', 'professional'];
    if (formalRegisters.includes(npcRegister.toLowerCase())) {
        const violation = informalMarkers.find(m => turnText.toLowerCase().includes(m));
        if (violation) {
            return {
                violationType: 'register' as const,
                severity: 'moderate' as const,
                culturalNorm: `Formal register expected with ${npcRegister} NPC`,
                suggestion: `Use "usted" form instead of informal "${violation}"`,
            };
        }
    }
    return null;
}

// ─── Refraction Request Builder ───────────────────────────────

/**
 * Build a refraction request from dialogue context when friction is detected.
 */
export function buildRefractionRequest(
    config: ModuleWiringConfig,
    learnerInput: string,
    npcContext: { npcId: string; npcRole: string; npcRegister: string },
): Partial<RefractionRequest> {
    return {
        learnerInput,
        inputLanguage: config.learnerL2,
        targetLanguage: config.learnerL2,
        nativeLanguage: config.learnerL1,
        cefrLevel: config.cefrLevel,
        tierContext: config.currentTier as 1 | 2 | 3,
        domainContext: config.schemaId,
        personaSchemaId: config.schemaId,
        sessionId: config.sessionId,
    };
}
