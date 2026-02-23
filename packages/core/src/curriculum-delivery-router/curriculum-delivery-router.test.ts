/**
 * @module curriculum-delivery-router tests
 * Tests for delivery format selection constants and type exports.
 */
import { describe, it, expect } from 'vitest';
import {
    RETENTION_TO_FORMAT,
    FORMAT_CAPABILITIES,
} from './index';

describe('RETENTION_TO_FORMAT', () => {
    it('should have entries for all 5 retention styles', () => {
        const styles = ['gamified-coercion', 'organic-social', 'professional-urgency', 'intrinsic-mastery', 'social-accountability'] as const;
        for (const style of styles) {
            expect(RETENTION_TO_FORMAT[style]).toBeDefined();
            expect(RETENTION_TO_FORMAT[style].preferred).toBeDefined();
            expect(RETENTION_TO_FORMAT[style].fallback).toBeDefined();
        }
    });

    it('should have preferred and fallback be different formats', () => {
        for (const [style, mapping] of Object.entries(RETENTION_TO_FORMAT)) {
            expect(mapping.preferred).not.toBe(mapping.fallback);
        }
    });

    it('should only reference valid delivery formats', () => {
        const validFormats = ['slideshow', 'video', 'flashcards', 'podcast', 'debrief'];
        for (const mapping of Object.values(RETENTION_TO_FORMAT)) {
            expect(validFormats).toContain(mapping.preferred);
            expect(validFormats).toContain(mapping.fallback);
        }
    });
});

describe('FORMAT_CAPABILITIES', () => {
    it('should have entries for all 5 delivery formats', () => {
        const formats = ['slideshow', 'video', 'flashcards', 'podcast', 'debrief'] as const;
        for (const format of formats) {
            expect(FORMAT_CAPABILITIES[format]).toBeDefined();
        }
    });

    it('should have valid capability fields per format', () => {
        for (const [, cap] of Object.entries(FORMAT_CAPABILITIES)) {
            expect(typeof cap.supportsContrastiveDisplay).toBe('boolean');
            expect(typeof cap.supportsAudio).toBe('boolean');
            expect(typeof cap.supportsInteraction).toBe('boolean');
            expect(typeof cap.minimumItems).toBe('number');
            expect(typeof cap.maximumItems).toBe('number');
            expect(cap.minimumItems).toBeLessThanOrEqual(cap.maximumItems);
        }
    });

    it('should have debrief as the most capable format (supports all features)', () => {
        const debrief = FORMAT_CAPABILITIES.debrief;
        expect(debrief.supportsContrastiveDisplay).toBe(true);
        expect(debrief.supportsAudio).toBe(true);
        expect(debrief.supportsInteraction).toBe(true);
    });

    it('should have podcast as audio-only (no contrastive, no interaction)', () => {
        const podcast = FORMAT_CAPABILITIES.podcast;
        expect(podcast.supportsAudio).toBe(true);
        expect(podcast.supportsContrastiveDisplay).toBe(false);
        expect(podcast.supportsInteraction).toBe(false);
    });
});
