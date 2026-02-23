/**
 * NPCPresence — NPC Entity in Scene
 *
 * Renders an individual NPC within the SceneRenderer.
 * Shows name, role, visual state (available/busy/mood),
 * and reputation-driven warmth signals via body language cues.
 *
 * @module ui/components/NPCPresence
 */

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────

export interface NPCPresenceProps {
    /** NPC identifier */
    npcId: string;
    /** Display name */
    name: string;
    /** NPC role (e.g., "nervous-flyer", "demanding-businessman") */
    role: string;
    /** NPC register style */
    register: string;
    /** Current mood */
    mood: string;
    /** Whether NPC is currently available for interaction */
    available: boolean;
    /** Reputation with learner [-0.5, 1.0] */
    reputation: number;
    /** Base patience level [0.0, 1.0] */
    patienceLevel: number;
    /** Whether this NPC has forward injection directives active */
    hasInjectionDirectives: boolean;
    /** Callback when learner clicks to initiate dialogue */
    onInteract: (npcId: string) => void;
}

// ─── Mood Visual Config ───────────────────────────────────────

const MOOD_VISUALS: Record<string, { emoji: string; color: string; label: string }> = {
    neutral: { emoji: '😐', color: '#94a3b8', label: 'Calm' },
    pleased: { emoji: '😊', color: '#22c55e', label: 'Pleased' },
    warm: { emoji: '🤗', color: '#f59e0b', label: 'Warm' },
    amused: { emoji: '😄', color: '#6366f1', label: 'Amused' },
    busy: { emoji: '⏳', color: '#f97316', label: 'Busy' },
    anxious: { emoji: '😟', color: '#eab308', label: 'Uneasy' },
    impatient: { emoji: '😤', color: '#ef4444', label: 'Impatient' },
    irritated: { emoji: '😒', color: '#dc2626', label: 'Irritated' },
    cold: { emoji: '❄️', color: '#64748b', label: 'Cold' },
    panicking: { emoji: '😱', color: '#b91c1c', label: 'Panicking' },
};

const ROLE_ICONS: Record<string, string> = {
    'business-guest': '💼',
    'honeymooners': '💑',
    'elderly-couple': '👴',
    'food-critic': '🍷',
    'allergic-guest': '⚠️',
    'nervous-flyer': '✈️',
    'demanding-businessman': '📱',
    'yacht-owner': '⛵',
    'celebrity-guest': '🌟',
};

// ─── Body Language from Reputation ────────────────────────────

function getBodyLanguageCue(reputation: number, mood: string): string {
    if (reputation >= 0.5) {
        return mood === 'warm' ? 'Making warm eye contact, smiling' : 'Open posture, attentive';
    }
    if (reputation >= 0.0) {
        return 'Professional demeanor, polite nod';
    }
    if (reputation >= -0.3) {
        return 'Guarded posture, minimal eye contact';
    }
    return 'Turned slightly away, arms crossed';
}

function getAvailabilityLabel(available: boolean, mood: string): string {
    if (!available) return 'Unavailable';
    if (mood === 'busy') return 'Occupied — may interrupt';
    if (mood === 'panicking') return 'Needs immediate help!';
    return 'Available';
}

// ─── Styles ───────────────────────────────────────────────────

const styles = {
    card: (available: boolean, reputation: number): React.CSSProperties => ({
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
        padding: '16px',
        borderRadius: '12px',
        background: available
            ? reputation >= 0.5
                ? 'linear-gradient(135deg, #1a2332 0%, #1e3a4f 100%)'
                : reputation >= 0
                    ? 'linear-gradient(135deg, #1a2332 0%, #1f2937 100%)'
                    : 'linear-gradient(135deg, #1a2332 0%, #2d1f2f 100%)'
            : 'rgba(26, 35, 50, 0.5)',
        border: `1px solid ${available
                ? reputation >= 0.5 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(148, 163, 184, 0.2)'
                : 'rgba(100, 116, 139, 0.1)'
            }`,
        cursor: available ? 'pointer' : 'default',
        opacity: available ? 1 : 0.5,
        transition: 'all 0.2s ease',
        minWidth: '200px',
    }),
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    } as React.CSSProperties,
    avatar: {
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        flexShrink: 0,
    } as React.CSSProperties,
    nameBlock: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2px',
    } as React.CSSProperties,
    name: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#e2e8f0',
        letterSpacing: '0.01em',
    } as React.CSSProperties,
    role: {
        fontSize: '11px',
        color: '#94a3b8',
        textTransform: 'capitalize' as const,
    } as React.CSSProperties,
    moodBadge: (color: string): React.CSSProperties => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        color,
        background: `${color}15`,
        padding: '3px 8px',
        borderRadius: '6px',
        alignSelf: 'flex-start',
    }),
    bodyLanguage: {
        fontSize: '11px',
        color: '#64748b',
        fontStyle: 'italic' as const,
        lineHeight: '1.4',
    } as React.CSSProperties,
    availabilityDot: (available: boolean, mood: string): React.CSSProperties => ({
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: !available ? '#475569'
            : mood === 'panicking' ? '#ef4444'
                : '#22c55e',
        flexShrink: 0,
    }),
    interactPrompt: {
        fontSize: '11px',
        color: '#6366f1',
        textAlign: 'center' as const,
        marginTop: '4px',
        opacity: 0.8,
    } as React.CSSProperties,
};

// ─── Component ────────────────────────────────────────────────

export const NPCPresence: React.FC<NPCPresenceProps> = ({
    npcId,
    name,
    role,
    register: _register,
    mood,
    available,
    reputation,
    patienceLevel: _patienceLevel,
    hasInjectionDirectives: _hasInjectionDirectives,
    onInteract,
}) => {
    const [hovered, setHovered] = useState(false);

    const moodVisual = MOOD_VISUALS[mood] ?? MOOD_VISUALS.neutral;
    const roleIcon = ROLE_ICONS[role] ?? '👤';
    const bodyLanguage = getBodyLanguageCue(reputation, mood);
    const availabilityLabel = getAvailabilityLabel(available, mood);

    const handleClick = () => {
        if (available) onInteract(npcId);
    };

    return React.createElement('div', {
        style: {
            ...styles.card(available, reputation),
            ...(hovered && available ? { borderColor: 'rgba(99, 102, 241, 0.5)', transform: 'translateY(-2px)' } : {}),
        },
        onClick: handleClick,
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        role: available ? 'button' : undefined,
        'aria-label': available ? `Speak with ${name}` : `${name} is unavailable`,
    },
        // Header: avatar + name
        React.createElement('div', { style: styles.header },
            React.createElement('div', { style: styles.avatar }, roleIcon),
            React.createElement('div', { style: styles.nameBlock },
                React.createElement('span', { style: styles.name }, name),
                React.createElement('span', { style: styles.role }, role.replace(/-/g, ' ')),
            ),
            React.createElement('div', {
                style: styles.availabilityDot(available, mood),
                title: availabilityLabel,
            }),
        ),

        // Mood badge
        React.createElement('span', { style: styles.moodBadge(moodVisual.color) },
            moodVisual.emoji, ' ', moodVisual.label,
        ),

        // Body language cue (the "social reading" element)
        React.createElement('p', { style: styles.bodyLanguage }, bodyLanguage),

        // Interact prompt
        available && hovered && React.createElement('div', { style: styles.interactPrompt },
            '→ Approach to speak',
        ),
    );
};
