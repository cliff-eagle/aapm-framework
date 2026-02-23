import React from 'react';
import type { RefractionLevel } from '../types';

/**
 * Props for the RefractionPanel component.
 *
 * @remarks
 * The Tri-Refraction Interface shows the learner three formulations
 * of the same communicative intent at different competence levels.
 */
export interface RefractionPanelProps {
    /** The learner's original (attempted) formulation. */
    learnerUtterance: string;
    /** Refraction alternatives at three levels. */
    refractions: Record<RefractionLevel, {
        text: string;
        explanation: string;
        audioUrl?: string;
    }>;
    /** Currently selected refraction level. */
    selectedLevel?: RefractionLevel;
    /** Callback when the learner selects a refraction to practice. */
    onSelectRefraction: (level: RefractionLevel) => void;
    /** Callback when the learner records a pronunciation attempt. */
    onRecordAttempt?: (level: RefractionLevel, audioBlob: Blob) => void;
    /** Whether explanations should be in L1 (for lower proficiency). */
    explainInL1?: boolean;
    /** Whether the panel is in loading state (TTS synthesis). */
    isLoading?: boolean;
}

/**
 * RefractionPanel — Tri-Refraction Interface for communicative repair.
 *
 * @remarks
 * Displays three formulations of the same intent:
 * - **Basic**: Simplified, grammatically correct version
 * - **Native**: Natural, idiomatic expression
 * - **Formal**: Register-appropriate professional version
 *
 * Each refraction includes TTS playback and optional pronunciation
 * recording with PAE analysis feedback.
 *
 * @patentCritical — Core of Claim 1 (Recursive Feedback Engine)
 */
export const RefractionPanel: React.FC<RefractionPanelProps> = (_props) => {
    return React.createElement('div', {
        'data-component': 'aapm-refraction-panel',
        'data-status': 'stub',
    }, 'RefractionPanel — Implementation pending');
};
