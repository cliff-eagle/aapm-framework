/**
 * @module event-bus/types
 * @description Canonical event envelope types for the AAPM Event Bus.
 *
 * Every event on the AAPM bus is wrapped in an AAPMEventEnvelope.
 * No bare payloads. The envelope enables logging, tracing, replay,
 * and schema validation without touching individual event handlers.
 *
 * @see docs/aam-charter.md
 * @see IMPLEMENTATION_MASTERCLASS.md Chapter 2
 * @patentCritical Claim 13 — Runtime Customization Architecture
 */

// ─── Event Types ──────────────────────────────────────────────────────────────

export type AAPMEventType =
    | 'FRICTION_DETECTED'
    | 'AFFECTIVE_STATE_CHANGED'
    | 'FORWARD_INJECTION_READY'
    | 'REPUTATION_DELTA'
    | 'WORLD_STATE_CHANGED'
    | 'CURRICULUM_GENERATED'
    | 'TIER_TRANSITION'
    | 'NPC_MOOD_CHANGED'
    | 'SCHEMA_ACTIVATED'
    | 'CONTROL_MODE_CHANGED'
    | 'SESSION_STARTED'
    | 'SESSION_ENDED'
    | 'PIPELINE_PHASE_COMPLETED'
    | 'SCAFFOLDING_ESCALATED';

// ─── Module Identifiers ───────────────────────────────────────────────────────

export type AAPMModuleId =
    | 'feedback-engine'
    | 'tier-manager'
    | 'affective-inference'
    | 'cultural-intelligence'
    | 'anti-fossilization'
    | 'interlanguage-engine'
    | 'phoneme-engine'
    | 'persistence'
    | 'npc-agent'
    | 'schema-loader'
    | 'collaboration'
    | 'runtime-customization'
    | 'world-engine'
    | 'dialogue-engine'
    | 'session-orchestrator'
    | 'multimodal-router'
    | 'curriculum-delivery-router';

// ─── Event Envelope ───────────────────────────────────────────────────────────

/**
 * The canonical event envelope wrapping every AAPM event.
 * Enables logging, tracing, replay, and schema validation.
 */
export interface AAPMEventEnvelope<T = unknown> {
    /** Globally unique event ID */
    eventId: string;

    /** Discriminant — must match one of the canonical event types */
    type: AAPMEventType;

    /** ISO 8601 timestamp — when this event was emitted */
    emittedAt: string;

    /** Module that emitted this event */
    source: AAPMModuleId;

    /** Learner this event belongs to */
    learnerId: string;

    /** Session this event belongs to — null for system-level events */
    sessionId: string | null;

    /** Correlation ID — links related events in a single pipeline run */
    correlationId: string;

    /** The actual event data */
    payload: T;

    /** Schema version of the payload — for future migration */
    schemaVersion: '1.0';
}

// ─── Event Payloads ───────────────────────────────────────────────────────────

export interface FrictionDetectedPayload {
    frictionType: 'lexical' | 'phonemic' | 'morphosyntactic' | 'pragmatic' | 'cultural' | 'register';
    learnerUtterance: string;
    detectedPattern: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AffectiveStateChangedPayload {
    previousState: 'low' | 'moderate' | 'elevated' | 'critical';
    newState: 'low' | 'moderate' | 'elevated' | 'critical';
    triggerSignals: string[];
}

export interface ForwardInjectionReadyPayload {
    targetForms: string[];
    npcIds: string[];
    maxSessionAttempts: number;
}

export interface ReputationDeltaPayload {
    npcId: string;
    previousScore: number;
    newScore: number;
    reason: string;
}

export interface TierTransitionPayload {
    previousTier: 1 | 2 | 3;
    newTier: 1 | 2 | 3;
    direction: 'advance' | 'retreat';
    reason: string;
}

export interface SchemaActivatedPayload {
    previousSchemaId: string | null;
    newSchemaId: string;
    transferRecordId?: string;
}

export interface ControlModeChangedPayload {
    changedField: string;
    previousValue: unknown;
    newValue: unknown;
    changedBy: 'learner' | 'educator' | 'system';
    reason?: string;
}

export interface SessionStartedPayload {
    tier: 1 | 2 | 3;
    personaSchemaId: string;
    npcIds: string[];
}

export interface SessionEndedPayload {
    tier: 1 | 2 | 3;
    durationMs: number;
    turnCount: number;
    frictionCount: number;
}

export interface PipelinePhaseCompletedPayload {
    phase: 'extraction' | 'classification' | 'curriculum-generation' | 'injection-prep' | 'delivery';
    durationMs: number;
    itemCount: number;
}

export interface ScaffoldingEscalatedPayload {
    fromLevel: string;
    toLevel: string;
    trigger: string;
}

// ─── Event Handler Type ───────────────────────────────────────────────────────

export type AAPMEventHandler<T = unknown> = (
    event: AAPMEventEnvelope<T>
) => void | Promise<void>;
