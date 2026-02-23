/**
 * DialogueScene — Contextual Conversation Interface
 *
 * Replaces the flat chat box with a consequential, NPC-driven dialogue.
 * Renders:
 * - Goal display (the communicative objective)
 * - NPC responses colored by personality × mood × reputation × register
 * - OutputScaffold overlay (hold help button, never automatic)
 * - Consequence rendering (NPC behavior changes, not score numbers)
 * - Turn-by-turn friction indicators
 *
 * @module ui/components/DialogueScene
 * @patentCritical Claim 7 — Dialogue Consequence Rendering
 */

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────

export interface DialogueTurn {
    turnNumber: number;
    speaker: 'learner' | 'npc' | 'system';
    content: string;
    timestamp: number;
    frictionEvents: Array<{
        id: string;
        type: 'vocabulary' | 'register' | 'pragmatic' | 'cultural' | 'phonetic';
        description: string;
        severity: number;
    }>;
    registerAnalysis?: {
        aligned: boolean;
        score: number;
    };
}

export interface DialogueSceneProps {
    /** NPC display name */
    npcName: string;
    /** NPC role */
    npcRole: string;
    /** NPC current mood */
    npcMood: string;
    /** NPC reputation with learner */
    npcReputation: number;
    /** The communicative goal */
    goal: string;
    /** Current dialogue phase */
    phase: 'opening' | 'active' | 'closing' | 'ended';
    /** Turns so far */
    turns: DialogueTurn[];
    /** NPC patience behavior */
    npcPatience: number;
    /** NPC silence tolerance in seconds */
    silenceToleranceSeconds: number;
    /** Callback when learner submits input */
    onLearnerInput: (text: string) => void;
    /** Callback to close the dialogue */
    onClose: () => void;
    /** Callback to request help (OutputScaffold) */
    onRequestHelp: () => void;
}

// ─── Mood Colors ──────────────────────────────────────────────

const MOOD_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    neutral: { bg: '#1e293b', border: '#334155', text: '#94a3b8' },
    pleased: { bg: '#14532d', border: '#22543d', text: '#86efac' },
    warm: { bg: '#451a03', border: '#78350f', text: '#fbbf24' },
    amused: { bg: '#1e1b4b', border: '#312e81', text: '#a5b4fc' },
    busy: { bg: '#431407', border: '#7c2d12', text: '#fb923c' },
    anxious: { bg: '#422006', border: '#713f12', text: '#fde047' },
    impatient: { bg: '#450a0a', border: '#7f1d1d', text: '#fca5a5' },
    irritated: { bg: '#450a0a', border: '#991b1b', text: '#f87171' },
    cold: { bg: '#0f172a', border: '#1e293b', text: '#64748b' },
    panicking: { bg: '#450a0a', border: '#b91c1c', text: '#fca5a5' },
};

// ─── Friction Indicators ──────────────────────────────────────

const FRICTION_ICONS: Record<string, string> = {
    vocabulary: '📖',
    register: '🎭',
    pragmatic: '🤝',
    cultural: '🌍',
    phonetic: '🗣️',
};

function getFrictionLabel(type: string): string {
    switch (type) {
        case 'vocabulary': return 'Vocabulary gap';
        case 'register': return 'Register mismatch';
        case 'pragmatic': return 'Pragmatic issue';
        case 'cultural': return 'Cultural sensitivity';
        case 'phonetic': return 'Pronunciation';
        default: return 'Friction';
    }
}

// ─── Consequence Descriptions ─────────────────────────────────

function getConsequenceDescription(
    frictions: DialogueTurn['frictionEvents'],
    registerAnalysis?: DialogueTurn['registerAnalysis'],
): string | null {
    if (frictions.length === 0 && registerAnalysis?.aligned !== false) return null;

    const descriptions: string[] = [];

    // Register consequences (visible in NPC behavior, not scores)
    if (registerAnalysis && !registerAnalysis.aligned) {
        descriptions.push('The NPC seems slightly taken aback by your tone.');
    }

    // Cultural friction consequences
    const cultural = frictions.filter(f => f.type === 'cultural');
    if (cultural.length > 0) {
        descriptions.push('You notice a shift in their expression — something felt off culturally.');
    }

    // Register friction consequences
    const register = frictions.filter(f => f.type === 'register');
    if (register.length > 0) {
        descriptions.push('Their response suggests your formality level didn\'t quite fit.');
    }

    // Vocabulary gaps — less severe
    const vocab = frictions.filter(f => f.type === 'vocabulary');
    if (vocab.length > 0) {
        descriptions.push('They paused briefly, trying to understand what you meant.');
    }

    return descriptions.length > 0 ? descriptions.join(' ') : null;
}

// ─── Styles ───────────────────────────────────────────────────

const s = {
    overlay: {
        position: 'fixed' as const,
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    } as React.CSSProperties,
    container: {
        width: '600px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column' as const,
        background: '#0f172a',
        borderRadius: '16px',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        overflow: 'hidden',
    } as React.CSSProperties,
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        background: 'rgba(15, 23, 42, 0.8)',
    } as React.CSSProperties,
    npcInfo: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px',
    } as React.CSSProperties,
    npcNameRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    } as React.CSSProperties,
    npcName: {
        fontSize: '16px',
        fontWeight: 600,
        color: '#f1f5f9',
    } as React.CSSProperties,
    goalBadge: {
        fontSize: '12px',
        color: '#6366f1',
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        padding: '4px 10px',
        borderRadius: '6px',
        lineHeight: '1.4',
    } as React.CSSProperties,
    closeButton: {
        background: 'none',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        color: '#94a3b8',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        cursor: 'pointer',
    } as React.CSSProperties,
    conversation: {
        flex: 1,
        overflowY: 'auto' as const,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
    } as React.CSSProperties,
    turn: (speaker: string, moodColor?: string): React.CSSProperties => ({
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        alignSelf: speaker === 'learner' ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
    }),
    bubble: (speaker: string, moodColor?: string): React.CSSProperties => ({
        padding: '10px 14px',
        borderRadius: speaker === 'learner' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        background: speaker === 'learner'
            ? 'rgba(99, 102, 241, 0.15)'
            : speaker === 'system'
                ? 'rgba(251, 191, 36, 0.1)'
                : (moodColor ?? '#1e293b'),
        border: `1px solid ${speaker === 'learner'
                ? 'rgba(99, 102, 241, 0.25)'
                : speaker === 'system'
                    ? 'rgba(251, 191, 36, 0.2)'
                    : 'rgba(148, 163, 184, 0.1)'
            }`,
        color: speaker === 'system' ? '#fbbf24' : '#e2e8f0',
        fontSize: '14px',
        lineHeight: '1.6',
    }),
    speakerLabel: {
        fontSize: '11px',
        color: '#64748b',
        fontWeight: 500,
    } as React.CSSProperties,
    frictionChip: (severity: number): React.CSSProperties => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        color: severity > 0.5 ? '#fca5a5' : '#fde047',
        background: severity > 0.5 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
        padding: '3px 8px',
        borderRadius: '4px',
        marginTop: '4px',
    }),
    consequence: {
        fontSize: '12px',
        color: '#94a3b8',
        fontStyle: 'italic' as const,
        padding: '6px 10px',
        borderLeft: '2px solid rgba(239, 68, 68, 0.3)',
        marginTop: '4px',
    } as React.CSSProperties,
    inputArea: {
        display: 'flex',
        gap: '8px',
        padding: '12px 20px 16px',
        borderTop: '1px solid rgba(148, 163, 184, 0.1)',
        background: 'rgba(15, 23, 42, 0.8)',
    } as React.CSSProperties,
    textInput: {
        flex: 1,
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        background: 'rgba(30, 41, 59, 0.5)',
        color: '#e2e8f0',
        fontSize: '14px',
        outline: 'none',
        fontFamily: 'inherit',
    } as React.CSSProperties,
    sendButton: {
        padding: '10px 18px',
        borderRadius: '10px',
        border: 'none',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: 'white',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
    } as React.CSSProperties,
    helpButton: {
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        background: 'rgba(251, 191, 36, 0.08)',
        color: '#fbbf24',
        fontSize: '13px',
        cursor: 'pointer',
    } as React.CSSProperties,
};

// ─── Component ────────────────────────────────────────────────

export const DialogueScene: React.FC<DialogueSceneProps> = ({
    npcName,
    npcRole,
    npcMood,
    npcReputation: _npcReputation,
    goal,
    phase,
    turns,
    npcPatience: _npcPatience,
    silenceToleranceSeconds: _silenceToleranceSeconds,
    onLearnerInput,
    onClose,
    onRequestHelp,
}) => {
    const [inputText, setInputText] = useState('');

    const moodStyle = MOOD_COLORS[npcMood] ?? MOOD_COLORS.neutral;
    const isActive = phase === 'opening' || phase === 'active';

    const handleSend = () => {
        const text = inputText.trim();
        if (!text || !isActive) return;
        onLearnerInput(text);
        setInputText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return React.createElement('div', { style: s.overlay },
        React.createElement('div', { style: s.container },

            // ── Header ──
            React.createElement('div', { style: s.header },
                React.createElement('div', { style: s.npcInfo },
                    React.createElement('div', { style: s.npcNameRow },
                        React.createElement('span', { style: s.npcName }, npcName),
                        React.createElement('span', {
                            style: {
                                fontSize: '11px',
                                color: moodStyle.text,
                                background: `${moodStyle.bg}`,
                                border: `1px solid ${moodStyle.border}`,
                                padding: '2px 8px',
                                borderRadius: '4px',
                            },
                        }, npcMood),
                    ),
                    React.createElement('span', {
                        style: { fontSize: '12px', color: '#64748b' },
                    }, npcRole.replace(/-/g, ' ')),
                ),
                React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                    React.createElement('div', { style: s.goalBadge }, `🎯 ${goal}`),
                    React.createElement('button', {
                        style: s.closeButton,
                        onClick: onClose,
                    }, phase === 'ended' ? 'Done' : 'Leave'),
                ),
            ),

            // ── Conversation ──
            React.createElement('div', { style: s.conversation },
                ...turns.map((turn) => {
                    const consequence = turn.speaker === 'learner'
                        ? getConsequenceDescription(turn.frictionEvents, turn.registerAnalysis)
                        : null;

                    return React.createElement('div', {
                        key: `turn-${turn.turnNumber}`,
                        style: s.turn(turn.speaker),
                    },
                        React.createElement('span', { style: s.speakerLabel },
                            turn.speaker === 'learner' ? 'You'
                                : turn.speaker === 'system' ? '📋 System'
                                    : npcName,
                        ),
                        React.createElement('div', {
                            style: s.bubble(turn.speaker, moodStyle.bg),
                        }, turn.content),

                        // Friction chips
                        ...turn.frictionEvents.map(f =>
                            React.createElement('span', {
                                key: f.id,
                                style: s.frictionChip(f.severity),
                            },
                                FRICTION_ICONS[f.type] ?? '⚡',
                                ' ',
                                getFrictionLabel(f.type),
                            ),
                        ),

                        // Consequence narration (invisible score → visible behavior)
                        consequence && React.createElement('div', {
                            style: s.consequence,
                        }, consequence),
                    );
                }),
            ),

            // ── Input area ──
            isActive && React.createElement('div', { style: s.inputArea },
                React.createElement('button', {
                    style: s.helpButton,
                    onClick: onRequestHelp,
                    title: 'Ask for help (Companion assist)',
                }, '💡'),
                React.createElement('input', {
                    type: 'text',
                    style: s.textInput,
                    placeholder: 'Type your response...',
                    value: inputText,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setInputText(e.target.value),
                    onKeyDown: handleKeyDown,
                    autoFocus: true,
                }),
                React.createElement('button', {
                    style: s.sendButton,
                    onClick: handleSend,
                    disabled: !inputText.trim(),
                }, 'Send'),
            ),
        ),
    );
};
