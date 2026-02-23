import React from 'react';
import type { PhonemeScore } from '../types';

/**
 * Props for the PhonemeHeatmap component.
 */
export interface PhonemeHeatmapProps {
    /** Target utterance text. */
    targetText: string;
    /** Per-phoneme comparison scores from the PAE. */
    scores: PhonemeScore[];
    /** Overall similarity score (0.0–1.0). */
    overallScore: number;
    /** Whether to show articulatory guidance tooltips. */
    showGuidance?: boolean;
    /** Callback when a phoneme cell is tapped for guidance. */
    onPhonemeSelect?: (phoneme: PhonemeScore) => void;
}

/**
 * PhonemeHeatmap — Visual pronunciation feedback from the PAE.
 *
 * @remarks
 * Renders a color-coded heatmap of phoneme accuracy:
 * - Green (>0.85): Accurate production
 * - Yellow (0.60–0.85): Approximate production
 * - Red (<0.60): Significant deviation
 *
 * Tapping a phoneme cell reveals articulatory guidance.
 */
export const PhonemeHeatmap: React.FC<PhonemeHeatmapProps> = (_props) => {
    return React.createElement('div', {
        'data-component': 'aapm-phoneme-heatmap',
        'data-status': 'stub',
    }, 'PhonemeHeatmap — Implementation pending');
};
