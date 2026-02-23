/**
 * @module event-bus
 * @description Concrete implementation of the AAPM Event Bus.
 *
 * The bus is synchronous for in-process modules and supports async handlers
 * for modules that write to external stores. It is fully inspectable for testing.
 *
 * AAPM CONTEXT: Core infrastructure — all modules communicate through this bus.
 *
 * PEDAGOGICAL INVARIANTS:
 * - Events must never cross-contaminate between learner sessions
 * - All events are logged for post-session analysis by the RFE
 *
 * @see docs/aam-charter.md — AAM Interoperability Guarantee
 * @see IMPLEMENTATION_MASTERCLASS.md Chapter 2
 * @patentCritical Claim 13 — Runtime Customization Architecture
 */

import type {
    AAPMEventType,
    AAPMEventEnvelope,
    AAPMEventHandler,
    AAPMModuleId,
} from './types';

export type { AAPMEventType, AAPMEventEnvelope, AAPMEventHandler, AAPMModuleId };
export * from './types';

/**
 * The AAPM Event Bus — the nervous system of the Autonomous Adaptive Matrix.
 *
 * All cross-component communication flows through this bus. No module may
 * call another module directly. This isolation is what enables runtime
 * module swap and per-module A/B testing.
 */
export class AAPMEventBus {
    private handlers = new Map<AAPMEventType, AAPMEventHandler<unknown>[]>();
    private emittedEvents: AAPMEventEnvelope[] = [];
    private readonly maxQueueSize: number;

    constructor(options?: { maxQueueSize?: number }) {
        this.maxQueueSize = options?.maxQueueSize ?? 1000;
    }

    /**
     * Subscribe to a specific event type.
     *
     * @param type - The event type to listen for
     * @param handler - Handler invoked when event is emitted
     * @returns Unsubscribe function — call to deregister the handler
     */
    on<T = unknown>(
        type: AAPMEventType,
        handler: AAPMEventHandler<T>
    ): () => void {
        const existing = this.handlers.get(type) ?? [];
        const typedHandler = handler as AAPMEventHandler<unknown>;
        this.handlers.set(type, [...existing, typedHandler]);

        // Return unsubscribe function — critical for runtime module swap
        return () => {
            const current = this.handlers.get(type) ?? [];
            this.handlers.set(type, current.filter(h => h !== typedHandler));
        };
    }

    /**
     * Emit an event to all subscribers.
     *
     * The eventId and emittedAt fields are auto-generated. The caller provides
     * type, source, learnerId, sessionId, correlationId, and payload.
     *
     * @param partial - Event data without auto-generated fields
     */
    async emit<T = unknown>(
        partial: Omit<AAPMEventEnvelope<T>, 'eventId' | 'emittedAt' | 'schemaVersion'>
    ): Promise<void> {
        const envelope: AAPMEventEnvelope<T> = {
            ...partial,
            eventId: crypto.randomUUID(),
            emittedAt: new Date().toISOString(),
            schemaVersion: '1.0',
        };

        // Guard: never let the queue grow unbounded
        if (this.emittedEvents.length >= this.maxQueueSize) {
            this.emittedEvents.shift();
        }
        this.emittedEvents.push(envelope as AAPMEventEnvelope);

        // Invoke all handlers — use allSettled so one failure doesn't block others
        const handlers = this.handlers.get(envelope.type) ?? [];
        await Promise.allSettled(
            handlers.map(h => h(envelope as AAPMEventEnvelope))
        );
    }

    /**
     * Remove all handlers for a specific event type.
     */
    off(type: AAPMEventType): void {
        this.handlers.delete(type);
    }

    // ─── Test & Inspection Utilities ────────────────────────────────────────────

    /**
     * Get all emitted events, optionally filtered by type.
     * Used for test assertions and session replay.
     */
    getEmitted(type?: AAPMEventType): AAPMEventEnvelope[] {
        return type
            ? this.emittedEvents.filter(e => e.type === type)
            : [...this.emittedEvents];
    }

    /**
     * Get count of emitted events, optionally filtered by type.
     */
    getEmittedCount(type?: AAPMEventType): number {
        return this.getEmitted(type).length;
    }

    /**
     * Clear all emitted events. Used between test cases.
     */
    clearEmitted(): void {
        this.emittedEvents = [];
    }

    /**
     * Clear all handlers and emitted events. Full reset.
     */
    reset(): void {
        this.handlers.clear();
        this.emittedEvents = [];
    }

    /**
     * Get count of registered handlers for a specific event type.
     * Useful for verifying module registration in tests.
     */
    getHandlerCount(type: AAPMEventType): number {
        return (this.handlers.get(type) ?? []).length;
    }
}
