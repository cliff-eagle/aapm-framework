/**
 * SceneRenderer — Spatial World View
 *
 * Renders the current location from a WorldState including:
 * - Location atmosphere (ambient description, visual treatment)
 * - Time-of-day indicator
 * - Present NPCs with interactive state
 * - Navigation options to connected locations
 * - Interactable objects
 *
 * This is the "camera" through which the learner sees the simulation world.
 * It replaces the flat dashboard paradigm with a spatial one.
 *
 * @module ui/components/SceneRenderer
 * @patentCritical Claim 13 — World rendering layer
 */

import React from 'react';
import { NPCPresence } from './NPCPresence';

// ─── Types ────────────────────────────────────────────────────

/** Location info needed for rendering */
export interface SceneLocation {
    id: string;
    name: Record<string, string>;
    description: string;
    type: 'public' | 'private' | 'commercial' | 'institutional';
    connections: string[];
    interactables: Array<{
        id: string;
        name: Record<string, string>;
        type: 'object' | 'sign' | 'menu' | 'document' | 'device';
        vocabularyDomain: string;
        interactionPrompt: string;
    }>;
    ambientDescription: string;
}

/** NPC info needed for rendering */
export interface SceneNPC {
    npcId: string;
    name: string;
    role: string;
    register: string;
    mood: string;
    available: boolean;
    reputation: number;
    patienceLevel: number;
    hasInjectionDirectives: boolean;
}

/** Location metadata for navigation */
export interface NavigableLocation {
    id: string;
    name: Record<string, string>;
    accessible: boolean;
    description: string;
}

export interface SceneRendererProps {
    /** Current location data */
    location: SceneLocation;
    /** NPCs present at this location */
    npcs: SceneNPC[];
    /** Connected locations for navigation */
    connectedLocations: NavigableLocation[];
    /** Current time of day */
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    /** Currently active ambient events */
    activeEvents: Array<{ id: string; name: string; description: string }>;
    /** Navigation handler */
    onNavigate: (locationId: string) => void;
    /** NPC interaction handler */
    onInteractNPC: (npcId: string) => void;
    /** Object interaction handler */
    onInteractObject: (interactableId: string) => void;
}

// ─── Visual Vocabulary ────────────────────────────────────────

const TIME_VISUALS: Record<string, { gradient: string; icon: string; label: string }> = {
    morning: {
        gradient: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 30%, transparent 60%)',
        icon: '🌅',
        label: 'Morning',
    },
    afternoon: {
        gradient: 'linear-gradient(180deg, #bfdbfe 0%, #93c5fd 30%, transparent 60%)',
        icon: '☀️',
        label: 'Afternoon',
    },
    evening: {
        gradient: 'linear-gradient(180deg, #c4b5fd 0%, #a78bfa 30%, transparent 60%)',
        icon: '🌆',
        label: 'Evening',
    },
    night: {
        gradient: 'linear-gradient(180deg, #312e81 0%, #1e1b4b 30%, transparent 60%)',
        icon: '🌙',
        label: 'Night',
    },
};

const LOCATION_TYPE_STYLES: Record<string, { accent: string; icon: string }> = {
    public: { accent: '#22c55e', icon: '🏛️' },
    private: { accent: '#6366f1', icon: '🔒' },
    commercial: { accent: '#f59e0b', icon: '🏪' },
    institutional: { accent: '#3b82f6', icon: '🏢' },
};

const INTERACTABLE_ICONS: Record<string, string> = {
    object: '📦',
    sign: '🪧',
    menu: '📋',
    document: '📄',
    device: '📱',
};

// ─── Styles ───────────────────────────────────────────────────

const s = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0',
        background: '#0f172a',
        color: '#e2e8f0',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        borderRadius: '16px',
        overflow: 'hidden',
        minHeight: '600px',
        position: 'relative' as const,
    } as React.CSSProperties,
    atmosphereBar: (gradient: string): React.CSSProperties => ({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '120px',
        background: gradient,
        opacity: 0.15,
        pointerEvents: 'none',
        zIndex: 0,
    }),
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px 12px',
        zIndex: 1,
        position: 'relative' as const,
    } as React.CSSProperties,
    locationTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    } as React.CSSProperties,
    locationIcon: {
        fontSize: '24px',
    } as React.CSSProperties,
    locationName: {
        fontSize: '20px',
        fontWeight: 700,
        color: '#f1f5f9',
        letterSpacing: '-0.02em',
    } as React.CSSProperties,
    locationSub: {
        fontSize: '12px',
        color: '#64748b',
        marginTop: '2px',
    } as React.CSSProperties,
    timeBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: '#94a3b8',
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        padding: '6px 12px',
        borderRadius: '8px',
    } as React.CSSProperties,
    ambient: {
        fontSize: '13px',
        color: '#94a3b8',
        fontStyle: 'italic' as const,
        lineHeight: '1.6',
        padding: '0 24px 16px',
        position: 'relative' as const,
        zIndex: 1,
    } as React.CSSProperties,
    section: {
        padding: '0 24px 20px',
        position: 'relative' as const,
        zIndex: 1,
    } as React.CSSProperties,
    sectionLabel: {
        fontSize: '11px',
        fontWeight: 600,
        color: '#475569',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        marginBottom: '10px',
    } as React.CSSProperties,
    npcGrid: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '12px',
    } as React.CSSProperties,
    navGrid: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '8px',
    } as React.CSSProperties,
    navButton: (accessible: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 16px',
        borderRadius: '10px',
        border: '1px solid',
        borderColor: accessible ? 'rgba(99, 102, 241, 0.3)' : 'rgba(100, 116, 139, 0.15)',
        background: accessible ? 'rgba(99, 102, 241, 0.08)' : 'rgba(30, 41, 59, 0.5)',
        color: accessible ? '#a5b4fc' : '#475569',
        fontSize: '13px',
        fontWeight: 500,
        cursor: accessible ? 'pointer' : 'not-allowed',
        opacity: accessible ? 1 : 0.5,
        transition: 'all 0.15s ease',
    }),
    interactableRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        marginBottom: '6px',
    } as React.CSSProperties,
    interactableName: {
        fontSize: '13px',
        color: '#cbd5e1',
        fontWeight: 500,
    } as React.CSSProperties,
    interactablePrompt: {
        fontSize: '11px',
        color: '#64748b',
    } as React.CSSProperties,
    eventBanner: {
        margin: '0 24px 12px',
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        fontSize: '13px',
        color: '#fca5a5',
        position: 'relative' as const,
        zIndex: 1,
    } as React.CSSProperties,
    divider: {
        height: '1px',
        background: 'rgba(148, 163, 184, 0.08)',
        margin: '0 24px 16px',
    } as React.CSSProperties,
};

// ─── Component ────────────────────────────────────────────────

export const SceneRenderer: React.FC<SceneRendererProps> = ({
    location,
    npcs,
    connectedLocations,
    timeOfDay,
    activeEvents,
    onNavigate,
    onInteractNPC,
    onInteractObject,
}) => {
    const timeVisual = TIME_VISUALS[timeOfDay] ?? TIME_VISUALS.morning;
    const locStyle = LOCATION_TYPE_STYLES[location.type] ?? LOCATION_TYPE_STYLES.public;
    const displayLang = 'en';

    return React.createElement('div', { style: s.container },
        // Atmospheric gradient overlay
        React.createElement('div', { style: s.atmosphereBar(timeVisual.gradient) }),

        // ── Header: location name + time ──
        React.createElement('div', { style: s.header },
            React.createElement('div', null,
                React.createElement('div', { style: s.locationTitle },
                    React.createElement('span', { style: s.locationIcon }, locStyle.icon),
                    React.createElement('h2', { style: s.locationName },
                        location.name[displayLang] ?? location.id),
                ),
                React.createElement('p', { style: s.locationSub }, location.description),
            ),
            React.createElement('div', { style: s.timeBadge },
                React.createElement('span', null, timeVisual.icon),
                React.createElement('span', null, timeVisual.label),
            ),
        ),

        // ── Ambient description ──
        React.createElement('p', { style: s.ambient },
            `"${location.ambientDescription}"`),

        // ── Active events ──
        ...activeEvents.map(evt =>
            React.createElement('div', { key: evt.id, style: s.eventBanner },
                React.createElement('strong', null, `⚡ ${evt.name}: `),
                evt.description,
            ),
        ),

        // ── Divider ──
        React.createElement('div', { style: s.divider }),

        // ── NPCs Present ──
        npcs.length > 0 && React.createElement('div', { style: s.section },
            React.createElement('div', { style: s.sectionLabel }, 'People here'),
            React.createElement('div', { style: s.npcGrid },
                ...npcs.map(npc =>
                    React.createElement(NPCPresence, {
                        key: npc.npcId,
                        npcId: npc.npcId,
                        name: npc.name,
                        role: npc.role,
                        register: npc.register,
                        mood: npc.mood,
                        available: npc.available,
                        reputation: npc.reputation,
                        patienceLevel: npc.patienceLevel,
                        hasInjectionDirectives: npc.hasInjectionDirectives,
                        onInteract: onInteractNPC,
                    }),
                ),
            ),
        ),

        // ── Interactable objects ──
        location.interactables.length > 0 && React.createElement('div', { style: s.section },
            React.createElement('div', { style: s.sectionLabel }, 'Objects'),
            ...location.interactables.map(obj =>
                React.createElement('div', {
                    key: obj.id,
                    style: s.interactableRow,
                    onClick: () => onInteractObject(obj.id),
                    role: 'button',
                    'aria-label': obj.interactionPrompt,
                },
                    React.createElement('span', null, INTERACTABLE_ICONS[obj.type] ?? '📦'),
                    React.createElement('div', null,
                        React.createElement('div', { style: s.interactableName },
                            obj.name[displayLang] ?? obj.id),
                        React.createElement('div', { style: s.interactablePrompt },
                            obj.interactionPrompt),
                    ),
                ),
            ),
        ),

        // ── Navigation ──
        React.createElement('div', { style: s.section },
            React.createElement('div', { style: s.sectionLabel }, 'Go to'),
            React.createElement('div', { style: s.navGrid },
                ...connectedLocations.map(loc =>
                    React.createElement('button', {
                        key: loc.id,
                        style: s.navButton(loc.accessible),
                        disabled: !loc.accessible,
                        onClick: () => loc.accessible && onNavigate(loc.id),
                    },
                        '→ ',
                        loc.name[displayLang] ?? loc.id,
                        !loc.accessible && ' (closed)',
                    ),
                ),
            ),
        ),
    );
};
