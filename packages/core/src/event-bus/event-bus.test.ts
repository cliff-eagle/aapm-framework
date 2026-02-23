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
import type { AAPMEventType, AAPMEventEnvelope } from './types';

// ── Helpers ──────────────────────────────────────────────────

function emitTestEvent(bus: AAPMEventBus, type: AAPMEventType = 'friction-detected', payload = {}) {
    return bus.emit({
        type,
        source: 'feedback-engine',
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
            bus.on('friction-detected', handler);
            await emitTestEvent(bus, 'friction-detected', { form: 'test' });
            expect(handler).toHaveBeenCalledOnce();
        });

        it('handler receives full event envelope', async () => {
            const handler = vi.fn();
            bus.on('friction-detected', handler);
            await emitTestEvent(bus, 'friction-detected', { form: 'test' });
            const envelope: AAPMEventEnvelope = handler.mock.calls[0][0];
            expect(envelope.type).toBe('friction-detected');
            expect(envelope.source).toBe('feedback-engine');
            expect(envelope.learnerId).toBe('learner-001');
            expect(envelope.eventId).toBeDefined();
            expect(envelope.emittedAt).toBeDefined();
            expect(envelope.schemaVersion).toBe('1.0');
        });

        it('only fires handlers registered for the event type', async () => {
            const frictionHandler = vi.fn();
            const curriculumHandler = vi.fn();
            bus.on('friction-detected', frictionHandler);
            bus.on('curriculum-generated', curriculumHandler);
            await emitTestEvent(bus, 'friction-detected');
            expect(frictionHandler).toHaveBeenCalledOnce();
            expect(curriculumHandler).not.toHaveBeenCalled();
        });

        it('supports multiple handlers for same event', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            bus.on('friction-detected', handler1);
            bus.on('friction-detected', handler2);
            await emitTestEvent(bus);
            expect(handler1).toHaveBeenCalledOnce();
            expect(handler2).toHaveBeenCalledOnce();
        });
    });

    describe('unsubscribe', () => {
        it('on() returns unsubscribe function', async () => {
            const handler = vi.fn();
            const unsub = bus.on('friction-detected', handler);
            unsub();
            await emitTestEvent(bus);
            expect(handler).not.toHaveBeenCalled();
        });

        it('off() removes all handlers for a type', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            bus.on('friction-detected', handler1);
            bus.on('friction-detected', handler2);
            bus.off('friction-detected');
            await emitTestEvent(bus);
            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
    });

    describe('inspection utilities', () => {
        it('getEmitted returns all events', async () => {
            await emitTestEvent(bus, 'friction-detected');
            await emitTestEvent(bus, 'curriculum-generated');
            expect(bus.getEmitted()).toHaveLength(2);
        });

        it('getEmitted filters by type', async () => {
            await emitTestEvent(bus, 'friction-detected');
            await emitTestEvent(bus, 'curriculum-generated');
            await emitTestEvent(bus, 'friction-detected');
            expect(bus.getEmitted('friction-detected')).toHaveLength(2);
            expect(bus.getEmitted('curriculum-generated')).toHaveLength(1);
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
            bus.on('friction-detected', vi.fn());
            bus.on('friction-detected', vi.fn());
            bus.on('curriculum-generated', vi.fn());
            expect(bus.getHandlerCount('friction-detected')).toBe(2);
            expect(bus.getHandlerCount('curriculum-generated')).toBe(1);
        });

        it('reset clears handlers and events', async () => {
            const handler = vi.fn();
            bus.on('friction-detected', handler);
            await emitTestEvent(bus);
            bus.reset();
            expect(bus.getEmitted()).toHaveLength(0);
            expect(bus.getHandlerCount('friction-detected')).toBe(0);
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
            bus.on('friction-detected', failHandler);
            bus.on('friction-detected', okHandler);
            await emitTestEvent(bus);
            expect(failHandler).toHaveBeenCalledOnce();
            expect(okHandler).toHaveBeenCalledOnce();
        });
    });
});
