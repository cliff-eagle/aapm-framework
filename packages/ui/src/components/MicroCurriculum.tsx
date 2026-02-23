import React, { useState, useCallback } from 'react';
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const C = {
    bg: '#0f172a', card: '#1e293b', border: '#334155',
    primary: '#3b82f6', accent: '#10b981', warn: '#f59e0b',
    text: '#f8fafc', muted: '#94a3b8', dim: '#64748b',
    danger: '#ef4444',
};

const TYPE_META: Record<string, { icon: string; color: string }> = {
    vocabulary: { icon: '📖', color: C.primary },
    grammar: { icon: '✏️', color: C.warn },
    pronunciation: { icon: '🎤', color: '#ec4899' },
    cultural: { icon: '🌍', color: C.accent },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * MicroCurriculum — Post-session personalized lesson delivery.
 *
 * Renders micro-curricula generated from the learner's own conversational
 * failures. Each card is tied to a specific friction point.
 *
 * @patentCritical — Part of Claim 1 (Recursive Feedback Engine)
 */
export const MicroCurriculum: React.FC<MicroCurriculumProps> = ({
    cards,
    sourceSessionId,
    format,
    onCardComplete,
    onAskFollowUp,
    showFrictionContext = false,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [followUpInput, setFollowUpInput] = useState('');

    const currentCard = cards[currentIndex];
    const completedCount = cards.filter((c: CurriculumCard) => c.completed).length;
    const totalCount = cards.length;

    const handleAnswer = useCallback((correct: boolean) => {
        if (!currentCard) return;
        onCardComplete(currentCard.id, correct);
        setRevealed(false);
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    }, [currentCard, currentIndex, cards.length, onCardComplete]);

    const handleFollowUp = useCallback(() => {
        if (!currentCard || !followUpInput.trim() || !onAskFollowUp) return;
        onAskFollowUp(currentCard.id, followUpInput.trim());
        setFollowUpInput('');
    }, [currentCard, followUpInput, onAskFollowUp]);

    if (!currentCard) {
        return React.createElement('div', {
            'data-component': 'aapm-micro-curriculum',
            style: { textAlign: 'center' as const, padding: '32px', color: C.muted, fontSize: '14px' },
        }, '🎉 All cards completed!');
    }

    const meta = TYPE_META[currentCard.type] || { icon: '📋', color: C.primary };

    return React.createElement('div', {
        'data-component': 'aapm-micro-curriculum',
        'data-session-id': sourceSessionId,
        'data-format': format,
        style: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: C.text, maxWidth: '480px',
        },
    },
        // Header
        React.createElement('div', {
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
        },
            React.createElement('div', { style: { fontSize: '13px', fontWeight: 600 } }, '📚 Micro-Curriculum'),
            React.createElement('div', { style: { fontSize: '11px', color: C.muted } },
                completedCount + '/' + totalCount + ' completed'),
        ),

        // Progress dots
        React.createElement('div', {
            style: { display: 'flex', gap: '4px', marginBottom: '16px' },
        },
            ...cards.map((_: CurriculumCard, idx: number) =>
                React.createElement('div', {
                    key: idx,
                    onClick: () => { setCurrentIndex(idx); setRevealed(false); },
                    style: {
                        flex: 1, height: '4px', borderRadius: '2px', cursor: 'pointer',
                        backgroundColor: idx === currentIndex ? meta.color : (cards[idx].completed ? C.accent : C.border),
                    },
                }),
            ),
        ),

        // Card
        React.createElement('div', {
            style: {
                padding: '20px', borderRadius: '12px',
                border: '1px solid ' + C.border, backgroundColor: C.card,
            },
        },
            // Type + CEFR badge
            React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
            },
                React.createElement('span', { style: { fontSize: '16px' } }, meta.icon),
                React.createElement('span', {
                    style: { fontSize: '11px', fontWeight: 600, color: meta.color, textTransform: 'capitalize' as const },
                }, currentCard.type),
                React.createElement('span', {
                    style: {
                        marginLeft: 'auto', fontSize: '10px', padding: '2px 6px',
                        borderRadius: '4px', backgroundColor: C.primary + '20', color: C.primary,
                    },
                }, currentCard.cefrLevel),
            ),

            // Target form (the L2 content)
            React.createElement('div', {
                style: {
                    fontSize: '20px', fontWeight: 700, color: C.text, marginBottom: '8px',
                    fontStyle: 'italic',
                },
            }, currentCard.targetForm),

            // Example sentence
            React.createElement('div', {
                style: { fontSize: '13px', color: C.muted, marginBottom: '16px', lineHeight: '1.5' },
            }, currentCard.exampleSentence),

            // Flashcard mode: reveal/answer
            format === 'flashcard' ? (
                !revealed
                    ? React.createElement('button', {
                        onClick: () => setRevealed(true),
                        style: {
                            width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                            backgroundColor: C.primary, color: C.text, cursor: 'pointer',
                            fontSize: '13px', fontWeight: 600,
                        },
                    }, 'Reveal Answer')
                    : React.createElement('div', null,
                        // L1 explanation
                        React.createElement('div', {
                            style: {
                                padding: '12px', borderRadius: '8px', backgroundColor: C.bg,
                                border: '1px solid ' + C.border, marginBottom: '12px',
                                fontSize: '13px', color: C.text, lineHeight: '1.5',
                            },
                        }, currentCard.l1Explanation),
                        // Self-assessment buttons
                        React.createElement('div', { style: { display: 'flex', gap: '8px' } },
                            React.createElement('button', {
                                onClick: () => handleAnswer(false),
                                style: {
                                    flex: 1, padding: '8px', borderRadius: '6px',
                                    border: '1px solid ' + C.danger + '40', backgroundColor: 'transparent',
                                    color: C.danger, cursor: 'pointer', fontSize: '12px',
                                },
                            }, '✗ Didn\'t know'),
                            React.createElement('button', {
                                onClick: () => handleAnswer(true),
                                style: {
                                    flex: 1, padding: '8px', borderRadius: '6px',
                                    border: 'none', backgroundColor: C.accent,
                                    color: C.text, cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                },
                            }, '✓ Got it'),
                        ),
                    )
            ) : (
                // Other formats: show answer + complete button
                React.createElement('div', null,
                    React.createElement('div', {
                        style: {
                            padding: '10px', borderRadius: '8px', backgroundColor: C.bg,
                            border: '1px solid ' + C.border, marginBottom: '12px',
                            fontSize: '12px', color: C.muted,
                        },
                    }, currentCard.l1Explanation),
                    React.createElement('button', {
                        onClick: () => handleAnswer(true),
                        style: {
                            width: '100%', padding: '8px', borderRadius: '6px', border: 'none',
                            backgroundColor: C.accent, color: C.text, cursor: 'pointer',
                            fontSize: '12px', fontWeight: 600,
                        },
                    }, 'Mark Complete'),
                )
            ),

            // Friction context
            showFrictionContext ? React.createElement('div', {
                style: { marginTop: '12px', fontSize: '10px', color: C.dim },
            }, 'Source: Session ' + sourceSessionId) : null,
        ),

        // Follow-up question
        onAskFollowUp ? React.createElement('div', {
            style: { display: 'flex', gap: '6px', marginTop: '12px' },
        },
            React.createElement('input', {
                type: 'text', value: followUpInput,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFollowUpInput(e.target.value),
                onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && handleFollowUp(),
                placeholder: 'Ask a follow-up question...',
                style: {
                    flex: 1, padding: '8px 12px', borderRadius: '6px',
                    backgroundColor: C.bg, border: '1px solid ' + C.border,
                    color: C.text, fontSize: '12px', fontFamily: 'inherit', outline: 'none',
                },
            }),
            React.createElement('button', {
                onClick: handleFollowUp,
                disabled: !followUpInput.trim(),
                style: {
                    padding: '8px 12px', borderRadius: '6px', border: 'none',
                    backgroundColor: followUpInput.trim() ? C.primary : C.border,
                    color: C.text, cursor: followUpInput.trim() ? 'pointer' : 'default',
                    fontSize: '12px',
                },
            }, 'Ask'),
        ) : null,

        // Navigation
        React.createElement('div', {
            style: { display: 'flex', justifyContent: 'space-between', marginTop: '12px' },
        },
            React.createElement('button', {
                onClick: () => { setCurrentIndex(prev => Math.max(0, prev - 1)); setRevealed(false); },
                disabled: currentIndex === 0,
                style: {
                    padding: '6px 12px', borderRadius: '6px',
                    border: '1px solid ' + C.border, backgroundColor: 'transparent',
                    color: currentIndex === 0 ? C.dim : C.muted, cursor: currentIndex === 0 ? 'default' : 'pointer',
                    fontSize: '11px',
                },
            }, '← Previous'),
            React.createElement('span', { style: { fontSize: '11px', color: C.dim, alignSelf: 'center' as const } },
                (currentIndex + 1) + ' / ' + totalCount),
            React.createElement('button', {
                onClick: () => { setCurrentIndex(prev => Math.min(cards.length - 1, prev + 1)); setRevealed(false); },
                disabled: currentIndex === cards.length - 1,
                style: {
                    padding: '6px 12px', borderRadius: '6px',
                    border: '1px solid ' + C.border, backgroundColor: 'transparent',
                    color: currentIndex === cards.length - 1 ? C.dim : C.muted,
                    cursor: currentIndex === cards.length - 1 ? 'default' : 'pointer',
                    fontSize: '11px',
                },
            }, 'Next →'),
        ),
    );
};
