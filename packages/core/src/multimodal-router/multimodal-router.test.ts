/**
 * @module multimodal-router tests
 * Tests for input modality routing constants and type exports.
 */
import { describe, it, expect } from 'vitest';
import {
    PROMPT_TO_SCHEMA_MAPPING,
} from './index';

describe('PROMPT_TO_SCHEMA_MAPPING', () => {
    it('should have entries for all 3 modalities', () => {
        expect(PROMPT_TO_SCHEMA_MAPPING.text).toBeDefined();
        expect(PROMPT_TO_SCHEMA_MAPPING.audio).toBeDefined();
        expect(PROMPT_TO_SCHEMA_MAPPING.visual).toBeDefined();
    });

    it('should have text modality mapping to persona and vocabulary fields', () => {
        const textMappings = PROMPT_TO_SCHEMA_MAPPING.text;
        expect(textMappings.length).toBeGreaterThan(0);
        expect(textMappings).toContain('persona.learner_profile');
        expect(textMappings).toContain('persona.vocabulary_matrix');
    });

    it('should have visual modality mapping to world_state fields', () => {
        const visualMappings = PROMPT_TO_SCHEMA_MAPPING.visual;
        expect(visualMappings.length).toBeGreaterThan(0);
        expect(visualMappings).toContain('world_state.location_graph');
    });

    it('should have audio modality mapping to input_modalities fields', () => {
        const audioMappings = PROMPT_TO_SCHEMA_MAPPING.audio;
        expect(audioMappings.length).toBeGreaterThan(0);
        expect(audioMappings).toContain('input_modalities.audio');
    });

    it('should have no empty arrays', () => {
        for (const [modality, fields] of Object.entries(PROMPT_TO_SCHEMA_MAPPING)) {
            expect(fields.length, `${modality} should have mappings`).toBeGreaterThan(0);
        }
    });

    it('should have text as the most comprehensive mapping', () => {
        expect(PROMPT_TO_SCHEMA_MAPPING.text.length)
            .toBeGreaterThanOrEqual(PROMPT_TO_SCHEMA_MAPPING.audio.length);
    });
});
