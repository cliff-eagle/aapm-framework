import React from 'react';

/**
 * Props for the OutputScaffold component.
 */
export interface OutputScaffoldProps {
    /** The communicative task the learner needs to accomplish. */
    taskDescription: string;
    /** Scaffold hints, ordered from most supportive to least. */
    hints: Array<{
        level: number;
        text: string;
        isL1: boolean;
    }>;
    /** Current scaffold level (auto-adjusted by affective state). */
    currentLevel: number;
    /** Callback when the learner requests more help. */
    onRequestHelp: () => void;
    /** Callback when the learner dismisses scaffolding. */
    onDismiss: () => void;
}

/**
 * OutputScaffold — Graduated hint system for production support.
 *
 * @remarks
 * Provides tiered scaffolding during NPC interactions:
 * - Level 1: Subtle vocabulary hint
 * - Level 2: Sentence starter
 * - Level 3: Full model answer in L2
 * - Level 4: L1 explanation + L2 model
 * - Level 5: Companion intervention (full support)
 *
 * Scaffold level is influenced by the Affective State Inference
 * system — negative affect triggers automatic escalation.
 */
export const OutputScaffold: React.FC<OutputScaffoldProps> = (_props) => {
    return React.createElement('div', {
        'data-component': 'aapm-output-scaffold',
        'data-status': 'stub',
    }, 'OutputScaffold — Implementation pending');
};
