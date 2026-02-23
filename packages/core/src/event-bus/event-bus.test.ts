/**
 * Event Bus Tests
 *
 * Validates the AAPM Event Bus subscribe/emit/unsubscribe
 * lifecycle, queue overflow protection, and test inspection
 * utilities.
 *
 * @patentCritical Claim 13 — Runtime Customization Architecture
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AAPMEventBus } from './index';
import type { AAPMEventType, AAPMModuleId } from './types';

// ── Helpers ──────────────────────────────────────────────────

const FRICTION: AAPMEventType = 'FRICTION_DETECTED';
const CURRICULUM: AAPMEventType = 'CURRICULUM_GENERATED';
const SOURCE: AAPMModuleId = 'feedback-engine';

function emitTestEvent(bus: AAPMEventBus, type: AAPMEventType = FRICTION, payload = {}) {
    return bus.emit({
        type,
        source: SOURCE,
        learnerId: 'learner-001',
        sessionId: 'session-001',
        correlationId: 'corr-001',
        payload,
    });
}

// ── Tests ────────────────────────────────────────────────────

describe('AAPMEventBus', () => {
    let bus: AAPMEventBus;

    beforeEach(() => {
        bus = new AAPMEventBus();
    });

    describe('subscribe and emit', () => {
        it('handler receives emitted events', async () => {
            const handler = vi.fn();
            bus.on(FRICTION, handler);
            await emitTestEvent(bus, FRICTION, { form: 'test' });
            expect(handler).toHaveBeenCalledOnce();
        });

        it('handler receives full event envelope', async () => {
            const handler = vi.fn();
            bus.on(FRICTION, handler);
            await emitTestEvent(bus, FRICTION, { form: 'test' });
            const envelope = handler.mock.calls[0][0];
            expect(envelope.type).toBe(FRICTION);
            expect(envelope.source).toBe(SOURCE);
            expect(envelope.learnerId).toBe('learner-001');
            expect(envelope.eventId).toBeDefined();
            expect(envelope.emittedAt).toBeDefined();
            expect(envelope.schemaVersion).toBe('1.0');
        });

        it('only fires handlers registered for the event type', async () => {
            const frictionHandler = vi.fn();
            const curriculumHandler = vi.fn();
            bus.on(FRICTION, frictionHandler);
            bus.on(CURRICULUM, curriculumHandler);
            await emitTestEvent(bus, FRICTION);
            expect(frictionHandler).toHaveBeenCalledOnce();
            expect(curriculumHandler).not.toHaveBeenCalled();
        });

        it('supports multiple handlers for same event', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            bus.on(FRICTION, handler1);
            bus.on(FRICTION, handler2);
            await emitTestEvent(bus);
            expect(handler1).toHaveBeenCalledOnce();
            expect(handler2).toHaveBeenCalledOnce();
        });
    });

    describe('unsubscribe', () => {
        it('on() returns unsubscribe function', async () => {
            const handler = vi.fn();
            const unsub = bus.on(FRICTION, handler);
            unsub();
            await emitTestEvent(bus);
            expect(handler).not.toHaveBeenCalled();
        });

        it('off() removes all handlers for a type', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            bus.on(FRICTION, handler1);
            bus.on(FRICTION, handler2);
            bus.off(FRICTION);
            await emitTestEvent(bus);
            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
    });

    describe('inspection utilities', () => {
        it('getEmitted returns all events', async () => {
            await emitTestEvent(bus, FRICTION);
            await emitTestEvent(bus, CURRICULUM);
            expect(bus.getEmitted()).toHaveLength(2);
        });

        it('getEmitted filters by type', async () => {
            await emitTestEvent(bus, FRICTION);
            await emitTestEvent(bus, CURRICULUM);
            await emitTestEvent(bus, FRICTION);
            expect(bus.getEmitted(FRICTION)).toHaveLength(2);
            expect(bus.getEmitted(CURRICULUM)).toHaveLength(1);
        });

        it('getEmittedCount returns count', async () => {
            await emitTestEvent(bus);
            await emitTestEvent(bus);
            expect(bus.getEmittedCount()).toBe(2);
        });

        it('clearEmitted removes all stored events', async () => {
            await emitTestEvent(bus);
            bus.clearEmitted();
            expect(bus.getEmitted()).toHaveLength(0);
        });

        it('getHandlerCount returns handler count', () => {
            bus.on(FRICTION, vi.fn());
            bus.on(FRICTION, vi.fn());
            bus.on(CURRICULUM, vi.fn());
            expect(bus.getHandlerCount(FRICTION)).toBe(2);
            expect(bus.getHandlerCount(CURRICULUM)).toBe(1);
        });

        it('reset clears handlers and events', async () => {
            const handler = vi.fn();
            bus.on(FRICTION, handler);
            await emitTestEvent(bus);
            bus.reset();
            expect(bus.getEmitted()).toHaveLength(0);
            expect(bus.getHandlerCount(FRICTION)).toBe(0);
        });
    });

    describe('queue management', () => {
        it('respects maxQueueSize limit', async () => {
            const smallBus = new AAPMEventBus({ maxQueueSize: 3 });
            await emitTestEvent(smallBus);
            await emitTestEvent(smallBus);
            await emitTestEvent(smallBus);
            await emitTestEvent(smallBus);
            expect(smallBus.getEmittedCount()).toBe(3);
        });
    });

    describe('error isolation', () => {
        it('one handler failure does not block others', async () => {
            const failHandler = vi.fn().mockRejectedValue(new Error('boom'));
            const okHandler = vi.fn();
            bus.on(FRICTION, failHandler);
            bus.on(FRICTION, okHandler);
            await emitTestEvent(bus);
            expect(failHandler).toHaveBeenCalledOnce();
            expect(okHandler).toHaveBeenCalledOnce();
        });
    });
});
