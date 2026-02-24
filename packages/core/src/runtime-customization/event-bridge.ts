/**
 * Event Bus Bridge — Bidirectional adapter between the two event systems.
 *
 * The AAPM framework has two event systems:
 *   1. `event-bus/` → AAPMEventEnvelope (production, used by session-orchestrator)
 *   2. `runtime-customization/` → AAMEvent (design-time, used by UI controls)
 *
 * This bridge maps events between them so:
 *   - Runtime customization controls can affect live sessions
 *   - Session events feed into the customization surface
 *
 * @module runtime-customization/event-bridge
 * @patentCritical Claim 13 — Runtime Customization Architecture
 */

import type {
    AAMEventType,
    AAMEvent,
    AAMEventBus,
} from './index';

import type {
    AAPMEventEnvelope,
    AAPMEventType,
} from '../event-bus/types';

// ─── Event Mapping ────────────────────────────────────────────

/** Shared events that exist in both systems */
const AAPM_TO_AAM_MAP: Partial<Record<AAPMEventType, AAMEventType>> = {
    'FRICTION_DETECTED': 'FRICTION_DETECTED',
    'REPUTATION_DELTA': 'REPUTATION_DELTA',
    'TIER_TRANSITION': 'TIER_TRANSITION',
    'NPC_MOOD_CHANGED': 'NPC_MOOD_CHANGED',
    'WORLD_STATE_CHANGED': 'WORLD_STATE_CHANGED',
};

const AAM_TO_AAPM_MAP: Partial<Record<AAMEventType, AAPMEventType>> = {
    'FRICTION_DETECTED': 'FRICTION_DETECTED',
    'REPUTATION_DELTA': 'REPUTATION_DELTA',
    'TIER_TRANSITION': 'TIER_TRANSITION',
    'NPC_MOOD_CHANGED': 'NPC_MOOD_CHANGED',
    'CONTROL_MODE_CHANGED': 'CONTROL_MODE_CHANGED',
};

// ─── Adapter Functions ────────────────────────────────────────

/**
 * Convert an AAPM event envelope to an AAM event.
 */
export function aapmToAAM(envelope: AAPMEventEnvelope): AAMEvent | null {
    const aamType = AAPM_TO_AAM_MAP[envelope.type as AAPMEventType];
    if (!aamType) return null;

    return {
        type: aamType,
        timestamp: new Date(envelope.emittedAt).getTime(),
        sessionId: envelope.sessionId,
        source: envelope.source,
        payload: envelope.payload as AAMEvent[typeof aamType extends keyof AAMEvent ? 'payload' : never],
        metadata: {
            correlationId: envelope.correlationId,
            schemaId: undefined,
        },
    } as AAMEvent;
}

/**
 * Convert an AAM event to an AAPM event envelope.
 */
export function aamToAAPM(event: AAMEvent, learnerId: string): AAPMEventEnvelope | null {
    const aapmType = AAM_TO_AAPM_MAP[event.type];
    if (!aapmType) return null;

    return {
        eventId: `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: aapmType,
        emittedAt: new Date(event.timestamp).toISOString(),
        source: event.source as AAPMEventEnvelope['source'],
        learnerId,
        sessionId: event.sessionId,
        correlationId: event.metadata?.correlationId ?? event.sessionId,
        payload: event.payload,
        schemaVersion: '1.0',
    };
}

// ─── Live Piping ──────────────────────────────────────────────

export interface EventBridgeDisposer {
    dispose(): void;
}

/**
 * Pipe AAPM events → AAM event bus.
 * Used to feed session events into the runtime customization surface.
 */
export function pipeAAPMToAAM(
    aapmEmit: (handler: (event: AAPMEventEnvelope) => void) => () => void,
    aamBus: AAMEventBus,
): EventBridgeDisposer {
    const unsub = aapmEmit((envelope) => {
        const aamEvent = aapmToAAM(envelope);
        if (aamEvent) {
            aamBus.emit(aamEvent);
        }
    });

    return { dispose: unsub };
}

/**
 * Pipe AAM events → AAPM emitter.
 * Used for runtime control overrides to affect live sessions.
 */
export function pipeAAMToAAPM(
    aamBus: AAMEventBus,
    aapmEmitter: { emit(event: AAPMEventEnvelope): void },
    learnerId: string,
): EventBridgeDisposer {
    const unsubs: Array<() => void> = [];

    for (const aamType of Object.keys(AAM_TO_AAPM_MAP) as AAMEventType[]) {
        const unsub = aamBus.on(aamType, (event) => {
            const envelope = aamToAAPM(event, learnerId);
            if (envelope) {
                aapmEmitter.emit(envelope);
            }
        });
        unsubs.push(unsub);
    }

    return {
        dispose() {
            for (const unsub of unsubs) unsub();
        },
    };
}
