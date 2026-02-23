import React from 'react';
import type { TierState } from '../types';

/**
 * Props for the TierProgress component.
 */
export interface TierProgressProps {
    /** Current tier state. */
    tierState: TierState;
    /** Historical tier transitions. */
    history?: Array<{
        tier: 1 | 2 | 3;
        enteredAt: string;
        exitedAt?: string;
    }>;
    /** Whether to show detailed metrics (sessions, milestones). */
    showDetails?: boolean;
    /** Callback when the learner taps a milestone for context. */
    onMilestoneSelect?: (milestone: string) => void;
}

/**
 * TierProgress — Visual progression through the three-tier system.
 *
 * @remarks
 * Displays the learner's journey through:
 * - **Tier 1**: Companion-supported bilingual conversation
 * - **Tier 2**: Immersive environment with NPCs and social reputation
 * - **Tier 3**: High-stakes negotiation with authority NPCs
 *
 * Shows CEFR level, session counts, and key milestones.
 */
export const TierProgress: React.FC<TierProgressProps> = (_props) => {
    return React.createElement('div', {
        'data-component': 'aapm-tier-progress',
        'data-status': 'stub',
    }, 'TierProgress — Implementation pending');
};
