import React, { useState, useCallback } from 'react';
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const C = {
    bg: '#0f172a', card: '#1e293b', border: '#334155',
    green: '#22c55e', yellow: '#eab308', red: '#ef4444',
    text: '#f8fafc', muted: '#94a3b8', dim: '#64748b',
};

function scoreColor(similarity: number): string {
    if (similarity >= 0.85) return C.green;
    if (similarity >= 0.60) return C.yellow;
    return C.red;
}

function scoreBg(similarity: number): string {
    if (similarity >= 0.85) return C.green + '20';
    if (similarity >= 0.60) return C.yellow + '20';
    return C.red + '20';
}

function scoreLabel(similarity: number): string {
    if (similarity >= 0.85) return 'Accurate';
    if (similarity >= 0.60) return 'Approximate';
    return 'Needs work';
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * PhonemeHeatmap — Visual pronunciation feedback from the PAE.
 *
 * Renders a color-coded heatmap of phoneme accuracy:
 * - Green (>0.85): Accurate production
 * - Yellow (0.60–0.85): Approximate production
 * - Red (<0.60): Significant deviation
 *
 * Tapping a phoneme cell reveals articulatory guidance.
 */
export const PhonemeHeatmap: React.FC<PhonemeHeatmapProps> = ({
    targetText,
    scores,
    overallScore,
    showGuidance = true,
    onPhonemeSelect,
}) => {
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

    const handleCellClick = useCallback((idx: number) => {
        setSelectedIdx(prev => prev === idx ? null : idx);
        if (onPhonemeSelect) onPhonemeSelect(scores[idx]);
    }, [onPhonemeSelect, scores]);

    const overallPct = Math.round(overallScore * 100);
    const overallColor = scoreColor(overallScore);

    return React.createElement('div', {
        'data-component': 'aapm-phoneme-heatmap',
        style: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: C.text,
        },
    },
        // Header
        React.createElement('div', {
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
        },
            React.createElement('div', null,
                React.createElement('div', { style: { fontSize: '13px', fontWeight: 600, color: C.text } }, 'Pronunciation Analysis'),
                React.createElement('div', { style: { fontSize: '11px', color: C.muted, marginTop: '2px' } }, targetText),
            ),
            // Overall score badge
            React.createElement('div', {
                style: {
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 12px', borderRadius: '20px',
                    backgroundColor: scoreBg(overallScore),
                    color: overallColor, fontWeight: 700, fontSize: '14px',
                },
            },
                React.createElement('span', null, overallPct + '%'),
                React.createElement('span', { style: { fontSize: '10px', fontWeight: 500 } }, scoreLabel(overallScore)),
            ),
        ),

        // Phoneme grid
        React.createElement('div', {
            style: {
                display: 'flex', flexWrap: 'wrap' as const, gap: '4px', marginBottom: '12px',
            },
        },
            ...scores.map((score: PhonemeScore, idx: number) => {
                const isSelected = selectedIdx === idx;
                const color = scoreColor(score.similarity);
                const bg = scoreBg(score.similarity);

                return React.createElement('div', {
                    key: idx,
                    onClick: () => handleCellClick(idx),
                    style: {
                        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
                        padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
                        border: isSelected ? ('2px solid ' + color) : ('2px solid transparent'),
                        backgroundColor: bg,
                        transition: 'all 0.15s', minWidth: '40px',
                    },
                },
                    // Target phoneme (IPA)
                    React.createElement('span', {
                        style: { fontSize: '16px', fontWeight: 600, color: color, fontFamily: 'monospace' },
                    }, score.target),
                    // Similarity %
                    React.createElement('span', {
                        style: { fontSize: '9px', color: C.muted, marginTop: '2px' },
                    }, Math.round(score.similarity * 100) + '%'),
                    // What the learner produced
                    score.produced !== score.target
                        ? React.createElement('span', {
                            style: { fontSize: '10px', color: C.dim, fontFamily: 'monospace', textDecoration: 'line-through' },
                        }, score.produced)
                        : null,
                );
            }),
        ),

        // Guidance tooltip
        showGuidance && selectedIdx !== null && scores[selectedIdx].guidance
            ? React.createElement('div', {
                style: {
                    padding: '10px 14px', borderRadius: '8px',
                    backgroundColor: C.card, border: '1px solid ' + C.border,
                    fontSize: '12px', color: C.muted, lineHeight: '1.5',
                },
            },
                React.createElement('div', { style: { fontWeight: 600, color: C.text, marginBottom: '4px', fontSize: '11px' } },
                    '💬 Articulatory Guidance — /' + scores[selectedIdx].target + '/'),
                React.createElement('div', null, scores[selectedIdx].guidance),
            )
            : null,

        // Legend
        React.createElement('div', {
            style: { display: 'flex', gap: '16px', marginTop: '8px' },
        },
            ...[
                { color: C.green, label: '≥85% Accurate' },
                { color: C.yellow, label: '60–84% Approximate' },
                { color: C.red, label: '<60% Needs work' },
            ].map((item: { color: string; label: string }) =>
                React.createElement('div', {
                    key: item.label,
                    style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: C.dim },
                },
                    React.createElement('div', {
                        style: { width: '8px', height: '8px', borderRadius: '2px', backgroundColor: item.color },
                    }),
                    React.createElement('span', null, item.label),
                ),
            ),
        ),
    );
};
