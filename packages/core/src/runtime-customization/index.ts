/**
 * @module runtime-customization
 * @description AAM Event Bus and Runtime Customization Surface
 *
 * The typed event bus is the nervous system of the Autonomous Adaptive Matrix.
 * All cross-component communication flows through it — no component may write
 * directly to another component's state.
 *
 * @see docs/aam-charter.md
 * @patentCritical Claim 13 — Runtime Customization Architecture
 */

// ─── Event Types ──────────────────────────────────────────────────────────────

export type AAMEventType =
    | 'FRICTION_DETECTED'
    | 'AFFECTIVE_STATE_CHANGED'
    | 'FORWARD_INJECTION_READY'
    | 'REPUTATION_DELTA'
    | 'WORLD_STATE_CHANGED'
    | 'CURRICULUM_GENERATED'
    | 'TIER_TRANSITION'
    | 'NPC_MOOD_CHANGED'
    | 'SCHEMA_ACTIVATED'
    | 'CONTROL_MODE_CHANGED';

export interface AAMEvent<T extends AAMEventType = AAMEventType> {
    /** Event type identifier */
    type: T;
    /** Unix timestamp of event emission */
    timestamp: number;
    /** Active session ID */
    sessionId: string;
    /** Emitting module identifier */
    source: string;
    /** Type-safe payload */
    payload: AAMEventPayloadMap[T];
    /** Optional correlation and context metadata */
    metadata?: AAMEventMetadata;
}

export interface AAMEventMetadata {
    /** Links causally related events */
    correlationId?: string;
    /** Active tier when event was emitted */
    tier?: 1 | 2 | 3;
    /** Active persona schema ID */
    schemaId?: string;
}

// ─── Event Payloads ───────────────────────────────────────────────────────────

export interface AAMEventPayloadMap {
    FRICTION_DETECTED: {
        frictionType: 'lexical' | 'phonemic' | 'morphosyntactic' | 'pragmatic' | 'cultural' | 'register';
        learnerUtterance: string;
        detectedPattern: string;
        severity: 'minor' | 'moderate' | 'critical';
    };
    AFFECTIVE_STATE_CHANGED: {
        previousState: AffectiveLevel;
        newState: AffectiveLevel;
        triggerSignals: string[];
    };
    FORWARD_INJECTION_READY: {
        targetForms: string[];
        npcIds: string[];
        sessionId: string;
    };
    REPUTATION_DELTA: {
        npcId: string;
        previousScore: number;
        newScore: number;
        reason: string;
    };
    WORLD_STATE_CHANGED: {
        changeType: 'location' | 'time' | 'ambient-event' | 'npc-presence';
        entityId: string;
        previousValue: unknown;
        newValue: unknown;
    };
    CURRICULUM_GENERATED: {
        curriculumId: string;
        frictionSources: string[];
        deliveryFormat: CurriculumDeliveryFormat;
        itemCount: number;
    };
    TIER_TRANSITION: {
        previousTier: 1 | 2 | 3;
        newTier: 1 | 2 | 3;
        direction: 'advance' | 'retreat';
        reason: string;
    };
    NPC_MOOD_CHANGED: {
        npcId: string;
        previousMood: string;
        newMood: string;
        trigger: string;
    };
    SCHEMA_ACTIVATED: {
        previousSchemaId: string | null;
        newSchemaId: string;
        transferRecordId?: string;
    };
    CONTROL_MODE_CHANGED: {
        characterId: string;
        previousMode: CharacterControlMode;
        newMode: CharacterControlMode;
        trigger: 'manual' | 'affective-threshold' | 'educator-assigned';
    };
}

// ─── Supporting Types ─────────────────────────────────────────────────────────

export type AffectiveLevel = 'low' | 'moderate' | 'elevated' | 'critical';

export type CharacterControlMode =
    | 'full'
    | 'choice-tree'
    | 'voice'
    | 'fully-autonomous'
    | 'hybrid-possessed'
    | 'hybrid-autonomous';

export type CurriculumDeliveryFormat =
    | 'slideshow'
    | 'video'
    | 'flashcards'
    | 'podcast'
    | 'debrief'
    | 'auto';

// ─── Runtime Customization Controls ───────────────────────────────────────────

/** All runtime controls exposed through the UI layer */
export interface RuntimeControls {
    /** Manual override of system pressure calibration [0.0, 1.0] */
    affectivePressureOverride: number | null;
    /** Manually unlock/lock tier transitions */
    tierUnlockOverride: { tier: 1 | 2 | 3; unlocked: boolean } | null;
    /** Show/hide Tri-Refraction panel */
    refractionPanelVisible: boolean;
    /** Adjust NPC warmth/formality in real time */
    npcPersonalityDial: { npcId: string; warmth: number; formality: number } | null;
    /** Load new persona schema mid-session */
    schemaHotSwap: { targetSchemaId: string } | null;
    /** Override curriculum delivery format */
    deliveryFormatOverride: CurriculumDeliveryFormat | null;
    /** Manually add target form to next session's Forward Injection */
    forwardInjectionOverride: string[];
}

// ─── Event Bus Interface ──────────────────────────────────────────────────────

export type AAMEventHandler<T extends AAMEventType> = (event: AAMEvent<T>) => void;

/**
 * The typed event bus — the AAM's nervous system.
 * All cross-component communication flows through this interface.
 */
export interface AAMEventBus {
    /** Subscribe to a specific event type */
    on<T extends AAMEventType>(type: T, handler: AAMEventHandler<T>): () => void;
    /** Emit an event to all subscribers */
    emit<T extends AAMEventType>(event: AAMEvent<T>): void;
    /** Remove all handlers for a specific event type */
    off<T extends AAMEventType>(type: T): void;
    /** Get all events emitted in the current session (for logging/replay) */
    getSessionLog(): AAMEvent[];
}
