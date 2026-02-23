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

// ─── Styles ──────────────────────────────────────────────────────────────────

const C = {
    bg: '#0f172a', card: '#1e293b', border: '#334155',
    text: '#f8fafc', muted: '#94a3b8', dim: '#64748b',
    tier1: '#3b82f6', tier2: '#8b5cf6', tier3: '#f59e0b',
    accent: '#10b981',
};

const TIER_META: Record<number, { label: string; color: string; icon: string; desc: string }> = {
    1: { label: 'Tier 1 — Companion', color: C.tier1, icon: '🗣️', desc: 'Bilingual companion conversation' },
    2: { label: 'Tier 2 — Immersive', color: C.tier2, icon: '🌍', desc: 'NPC world with social reputation' },
    3: { label: 'Tier 3 — High-Stakes', color: C.tier3, icon: '⚡', desc: 'Authority negotiation scenarios' },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * TierProgress — Visual progression through the three-tier system.
 *
 * Displays the learner's journey through:
 * - **Tier 1**: Companion-supported bilingual conversation
 * - **Tier 2**: Immersive environment with NPCs and social reputation
 * - **Tier 3**: High-stakes negotiation with authority NPCs
 */
export const TierProgress: React.FC<TierProgressProps> = ({
    tierState,
    history = [],
    showDetails = true,
    onMilestoneSelect,
}) => {
    const { currentTier, progress, sessionsCompleted, sessionsRemaining, cefrLevel, milestones } = tierState;
    const progressPct = Math.round(progress * 100);

    return React.createElement('div', {
        'data-component': 'aapm-tier-progress',
        style: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: C.text,
        },
    },
        // Header with CEFR badge
        React.createElement('div', {
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
        },
            React.createElement('div', { style: { fontSize: '14px', fontWeight: 600 } }, 'Learning Progression'),
            React.createElement('span', {
                style: {
                    padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                    backgroundColor: C.accent + '20', color: C.accent,
                },
            }, 'CEFR ' + cefrLevel),
        ),

        // Three-tier track
        React.createElement('div', {
            style: { display: 'flex', gap: '4px', marginBottom: '16px' },
        },
            ...[1, 2, 3].map((tier: number) => {
                const meta = TIER_META[tier];
                const isCurrent = tier === currentTier;
                const isCompleted = tier < currentTier;
                const isFuture = tier > currentTier;
                const fillPct = isCompleted ? 100 : isCurrent ? progressPct : 0;

                return React.createElement('div', {
                    key: tier,
                    style: {
                        flex: 1, borderRadius: '8px',
                        border: '1px solid ' + (isCurrent ? meta.color : C.border),
                        backgroundColor: isCurrent ? meta.color + '10' : C.card,
                        padding: '12px', opacity: isFuture ? 0.5 : 1,
                        transition: 'all 0.2s',
                    },
                },
                    // Tier label
                    React.createElement('div', {
                        style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' },
                    },
                        React.createElement('span', { style: { fontSize: '16px' } }, meta.icon),
                        React.createElement('span', {
                            style: { fontSize: '12px', fontWeight: 600, color: isCurrent ? meta.color : C.muted },
                        }, meta.label),
                        isCompleted ? React.createElement('span', {
                            style: { marginLeft: 'auto', fontSize: '11px', color: C.accent },
                        }, '✓') : null,
                    ),
                    React.createElement('div', { style: { fontSize: '10px', color: C.dim, marginBottom: '8px' } }, meta.desc),
                    // Progress bar
                    React.createElement('div', {
                        style: {
                            height: '4px', borderRadius: '2px', backgroundColor: C.border, overflow: 'hidden',
                        },
                    },
                        React.createElement('div', {
                            style: {
                                height: '100%', width: fillPct + '%', borderRadius: '2px',
                                backgroundColor: meta.color,
                                transition: 'width 0.3s ease',
                            },
                        }),
                    ),
                    isCurrent ? React.createElement('div', {
                        style: { fontSize: '10px', color: C.muted, marginTop: '4px', textAlign: 'right' as const },
                    }, progressPct + '%') : null,
                );
            }),
        ),

        // Details section
        showDetails ? React.createElement('div', {
            style: {
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px',
            },
        },
            // Sessions completed
            React.createElement('div', {
                style: { padding: '10px', borderRadius: '6px', backgroundColor: C.card, border: '1px solid ' + C.border },
            },
                React.createElement('div', { style: { fontSize: '20px', fontWeight: 700, color: C.text } }, String(sessionsCompleted)),
                React.createElement('div', { style: { fontSize: '10px', color: C.muted } }, 'Sessions Completed'),
            ),
            // Sessions remaining
            React.createElement('div', {
                style: { padding: '10px', borderRadius: '6px', backgroundColor: C.card, border: '1px solid ' + C.border },
            },
                React.createElement('div', { style: { fontSize: '20px', fontWeight: 700, color: C.text } }, '~' + String(sessionsRemaining)),
                React.createElement('div', { style: { fontSize: '10px', color: C.muted } }, 'Sessions Remaining'),
            ),
        ) : null,

        // Milestones
        milestones.length > 0 ? React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '6px' } }, 'Milestones'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap' as const, gap: '4px' } },
                ...milestones.map((ms: string) =>
                    React.createElement('span', {
                        key: ms,
                        onClick: onMilestoneSelect ? () => onMilestoneSelect(ms) : undefined,
                        style: {
                            padding: '3px 8px', borderRadius: '4px', fontSize: '10px',
                            backgroundColor: C.accent + '15', color: C.accent,
                            cursor: onMilestoneSelect ? 'pointer' : 'default',
                        },
                    }, '✓ ' + ms),
                ),
            ),
        ) : null,

        // History timeline
        history.length > 0 ? React.createElement('div', { style: { marginTop: '12px' } },
            React.createElement('div', { style: { fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '6px' } }, 'Tier History'),
            ...history.map((h: { tier: number; enteredAt: string; exitedAt?: string }, idx: number) => {
                const meta = TIER_META[h.tier];
                return React.createElement('div', {
                    key: idx,
                    style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '11px' },
                },
                    React.createElement('span', { style: { color: meta.color } }, meta.icon),
                    React.createElement('span', { style: { color: C.text } }, meta.label),
                    React.createElement('span', { style: { color: C.dim } },
                        new Date(h.enteredAt).toLocaleDateString() +
                        (h.exitedAt ? ' → ' + new Date(h.exitedAt).toLocaleDateString() : ' → present'),
                    ),
                );
            }),
        ) : null,
    );
};
