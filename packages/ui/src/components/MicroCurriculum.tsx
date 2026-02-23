import React from 'react';
import type { CurriculumCard } from '../types';

/**
 * Props for the MicroCurriculum component.
 */
export interface MicroCurriculumProps {
    /** Generated curriculum cards from the Macro-Loop pipeline. */
    cards: CurriculumCard[];
    /** Source friction points that generated this curriculum. */
    sourceSessionId: string;
    /** Learner's preferred curriculum format from Axis Z profile. */
    format: 'flashcard' | 'fill-in-blank' | 'multiple-choice' | 'contextual-dialogue';
    /** Callback when a card is completed. */
    onCardComplete: (cardId: string, correct: boolean) => void;
    /** Callback when the learner asks a follow-up question about a card. */
    onAskFollowUp?: (cardId: string, question: string) => void;
    /** Whether to show the friction source context. */
    showFrictionContext?: boolean;
}

/**
 * MicroCurriculum — Post-session personalized lesson delivery.
 *
 * @remarks
 * Renders micro-curricula generated from the learner's own
 * conversational failures. Each card is tied to a specific
 * friction point from a previous session.
 *
 * Supports four delivery formats matched to the learner's
 * Axis Z retention profile.
 *
 * @patentCritical — Part of Claim 1 (Recursive Feedback Engine)
 */
export const MicroCurriculum: React.FC<MicroCurriculumProps> = (_props) => {
    return React.createElement('div', {
        'data-component': 'aapm-micro-curriculum',
        'data-status': 'stub',
    }, 'MicroCurriculum — Implementation pending');
};
