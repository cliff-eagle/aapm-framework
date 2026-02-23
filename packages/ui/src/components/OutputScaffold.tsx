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

// ─── Styles ──────────────────────────────────────────────────────────────────

const C = {
    bg: '#0f172a', card: '#1e293b', border: '#334155',
    primary: '#3b82f6', accent: '#10b981', warn: '#f59e0b',
    text: '#f8fafc', muted: '#94a3b8', dim: '#64748b',
};

const LEVEL_META: Record<number, { label: string; icon: string; color: string }> = {
    1: { label: 'Vocabulary hint', icon: '💡', color: '#22c55e' },
    2: { label: 'Sentence starter', icon: '✏️', color: '#3b82f6' },
    3: { label: 'Full L2 model', icon: '📝', color: '#8b5cf6' },
    4: { label: 'L1 + L2 model', icon: '🔄', color: '#f59e0b' },
    5: { label: 'Companion assist', icon: '🤝', color: '#ef4444' },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * OutputScaffold — Graduated hint system for production support.
 *
 * Provides tiered scaffolding during NPC interactions:
 * - Level 1: Subtle vocabulary hint
 * - Level 2: Sentence starter
 * - Level 3: Full model answer in L2
 * - Level 4: L1 explanation + L2 model
 * - Level 5: Companion intervention (full support)
 *
 * Scaffold level is influenced by Affective State Inference —
 * negative affect triggers automatic escalation.
 */
export const OutputScaffold: React.FC<OutputScaffoldProps> = ({
    taskDescription,
    hints,
    currentLevel,
    onRequestHelp,
    onDismiss,
}) => {
    const visibleHints = hints.filter((h: { level: number; text: string; isL1: boolean }) => h.level <= currentLevel);
    const canEscalate = currentLevel < 5;
    const maxLevel = Math.max(...hints.map((h: { level: number }) => h.level), 1);

    return React.createElement('div', {
        'data-component': 'aapm-output-scaffold',
        'data-level': currentLevel,
        style: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: C.text, maxWidth: '480px',
        },
    },
        // Header
        React.createElement('div', {
            style: {
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '12px',
            },
        },
            React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', gap: '6px' },
            },
                React.createElement('span', { style: { fontSize: '14px' } }, '🛟'),
                React.createElement('span', { style: { fontSize: '13px', fontWeight: 600 } }, 'Output Scaffold'),
            ),
            // Dismiss button
            React.createElement('button', {
                onClick: onDismiss,
                style: {
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '14px', color: C.dim, padding: '2px',
                },
                title: 'Dismiss scaffolding',
            }, '✕'),
        ),

        // Task description
        React.createElement('div', {
            style: {
                padding: '10px 14px', borderRadius: '8px', marginBottom: '12px',
                backgroundColor: C.primary + '10', border: '1px solid ' + C.primary + '30',
                fontSize: '12px', color: C.muted, lineHeight: '1.5',
            },
        },
            React.createElement('span', { style: { fontWeight: 600, color: C.text } }, 'Task: '),
            taskDescription,
        ),

        // Scaffold level indicator
        React.createElement('div', {
            style: { display: 'flex', gap: '2px', marginBottom: '12px' },
        },
            ...[1, 2, 3, 4, 5].map((level: number) => {
                const meta = LEVEL_META[level];
                const isActive = level <= currentLevel;
                const isCurrent = level === currentLevel;
                return React.createElement('div', {
                    key: level,
                    title: meta.label,
                    style: {
                        flex: 1, height: '6px', borderRadius: '3px',
                        backgroundColor: isActive ? meta.color : C.border,
                        opacity: isCurrent ? 1 : (isActive ? 0.6 : 0.3),
                        transition: 'all 0.2s',
                    },
                });
            }),
        ),

        // Current level label
        React.createElement('div', {
            style: { fontSize: '11px', color: C.dim, marginBottom: '12px', textAlign: 'center' as const },
        },
            (() => {
                const meta = LEVEL_META[currentLevel] || LEVEL_META[1];
                return meta.icon + ' Level ' + currentLevel + ': ' + meta.label;
            })(),
        ),

        // Visible hints
        React.createElement('div', {
            style: { display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '16px' },
        },
            ...visibleHints.map((hint: { level: number; text: string; isL1: boolean }) => {
                const meta = LEVEL_META[hint.level] || LEVEL_META[1];
                return React.createElement('div', {
                    key: hint.level,
                    style: {
                        padding: '10px 14px', borderRadius: '8px',
                        border: '1px solid ' + C.border,
                        backgroundColor: hint.level === currentLevel ? C.card : C.bg,
                        borderLeft: '3px solid ' + meta.color,
                    },
                },
                    React.createElement('div', {
                        style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' },
                    },
                        React.createElement('span', { style: { fontSize: '12px' } }, meta.icon),
                        React.createElement('span', { style: { fontSize: '10px', fontWeight: 600, color: meta.color } }, meta.label),
                        hint.isL1 ? React.createElement('span', {
                            style: {
                                fontSize: '9px', padding: '1px 4px', borderRadius: '3px',
                                backgroundColor: C.warn + '20', color: C.warn,
                            },
                        }, 'L1') : null,
                    ),
                    React.createElement('div', {
                        style: {
                            fontSize: '13px', color: C.text, lineHeight: '1.5',
                            fontStyle: hint.isL1 ? 'italic' : 'normal',
                        },
                    }, hint.text),
                );
            }),
        ),

        // Action buttons
        React.createElement('div', { style: { display: 'flex', gap: '8px' } },
            canEscalate ? React.createElement('button', {
                onClick: onRequestHelp,
                style: {
                    flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                    backgroundColor: C.primary, color: C.text, cursor: 'pointer',
                    fontSize: '12px', fontWeight: 600,
                },
            }, '🆘 More Help (Level ' + (currentLevel + 1) + ')') : null,
            React.createElement('button', {
                onClick: onDismiss,
                style: {
                    flex: canEscalate ? 0 : 1, padding: '10px 16px', borderRadius: '8px',
                    border: '1px solid ' + C.border, backgroundColor: 'transparent',
                    color: C.muted, cursor: 'pointer', fontSize: '12px',
                },
            }, canEscalate ? 'I\'ll try' : 'Dismiss'),
        ),
    );
};
