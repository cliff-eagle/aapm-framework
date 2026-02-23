import React, { useState, useCallback, useRef } from 'react';
import type { RefractionLevel } from '../types';

/**
 * Props for the RefractionPanel component.
 *
 * The Tri-Refraction Interface shows the learner three formulations
 * of the same communicative intent at different competence levels.
 */
export interface RefractionPanelProps {
    /** The learner's original (attempted) formulation. */
    learnerUtterance: string;
    /** Refraction alternatives at three levels. */
    refractions: Record<RefractionLevel, {
        text: string;
        explanation: string;
        audioUrl?: string;
    }>;
    /** Currently selected refraction level. */
    selectedLevel?: RefractionLevel;
    /** Callback when the learner selects a refraction to practice. */
    onSelectRefraction: (level: RefractionLevel) => void;
    /** Callback when the learner records a pronunciation attempt. */
    onRecordAttempt?: (level: RefractionLevel, audioBlob: Blob) => void;
    /** Whether explanations should be in L1 (for lower proficiency). */
    explainInL1?: boolean;
    /** Whether the panel is in loading state (TTS synthesis). */
    isLoading?: boolean;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const C = {
    bg: '#0f172a', card: '#1e293b', border: '#334155',
    text: '#f8fafc', muted: '#94a3b8', dim: '#64748b',
    basic: '#22c55e', native: '#3b82f6', formal: '#8b5cf6',
    danger: '#ef4444',
};

const LEVEL_META: Record<RefractionLevel, { label: string; icon: string; color: string; desc: string }> = {
    basic: { label: 'Basic', icon: '🟢', color: C.basic, desc: 'Simplified, grammatically correct' },
    native: { label: 'Native', icon: '🔵', color: C.native, desc: 'Natural, idiomatic expression' },
    formal: { label: 'Formal', icon: '🟣', color: C.formal, desc: 'Register-appropriate, professional' },
};

const LEVELS: RefractionLevel[] = ['basic', 'native', 'formal'];

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * RefractionPanel — Tri-Refraction Interface for communicative repair.
 *
 * Displays three formulations of the same intent:
 * - **Basic**: Simplified, grammatically correct version
 * - **Native**: Natural, idiomatic expression
 * - **Formal**: Register-appropriate professional version
 *
 * Each refraction includes TTS playback and optional pronunciation
 * recording with PAE analysis feedback.
 *
 * @patentCritical — Core of Claim 1 (Recursive Feedback Engine)
 */
export const RefractionPanel: React.FC<RefractionPanelProps> = ({
    learnerUtterance,
    refractions,
    selectedLevel,
    onSelectRefraction,
    onRecordAttempt,
    explainInL1 = false,
    isLoading = false,
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [playingAudio, setPlayingAudio] = useState<RefractionLevel | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const active = selectedLevel || 'native';
    const activeRefraction = refractions[active];
    const activeMeta = LEVEL_META[active];

    // Audio playback
    const handlePlayAudio = useCallback((level: RefractionLevel) => {
        const ref = refractions[level];
        if (!ref.audioUrl) return;
        setPlayingAudio(level);
        const audio = new Audio(ref.audioUrl);
        audio.onended = () => setPlayingAudio(null);
        audio.play().catch(() => setPlayingAudio(null));
    }, [refractions]);

    // Recording
    const handleStartRecording = useCallback(async () => {
        if (!onRecordAttempt) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = (e: BlobEvent) => chunksRef.current.push(e.data);
            recorder.onstop = () => {
                stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                onRecordAttempt(active, blob);
            };
            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
        } catch {
            // Microphone access denied — silent fail
        }
    }, [active, onRecordAttempt]);

    const handleStopRecording = useCallback(() => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    }, []);

    return React.createElement('div', {
        'data-component': 'aapm-refraction-panel',
        style: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: C.text,
        },
    },
        // Header
        React.createElement('div', {
            style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
        },
            React.createElement('span', { style: { fontSize: '16px' } }, '🔬'),
            React.createElement('span', { style: { fontSize: '14px', fontWeight: 600 } }, 'Tri-Refraction'),
            isLoading ? React.createElement('span', {
                style: { marginLeft: 'auto', fontSize: '11px', color: C.muted },
            }, '⏳ Synthesizing...') : null,
        ),

        // Learner's original utterance
        React.createElement('div', {
            style: {
                padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                backgroundColor: C.danger + '10', border: '1px solid ' + C.danger + '30',
                fontSize: '13px',
            },
        },
            React.createElement('div', { style: { fontSize: '10px', fontWeight: 600, color: C.danger, marginBottom: '4px' } },
                'Your attempt'),
            React.createElement('div', { style: { color: C.text, fontStyle: 'italic' } }, learnerUtterance),
        ),

        // Three refraction tabs
        React.createElement('div', {
            style: { display: 'flex', gap: '4px', marginBottom: '12px' },
        },
            ...LEVELS.map((level: RefractionLevel) => {
                const meta = LEVEL_META[level];
                const isActive = level === active;
                return React.createElement('button', {
                    key: level,
                    onClick: () => onSelectRefraction(level),
                    style: {
                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                        backgroundColor: isActive ? meta.color + '20' : C.card,
                        color: isActive ? meta.color : C.muted,
                        cursor: 'pointer', fontSize: '12px', fontWeight: isActive ? 700 : 400,
                        transition: 'all 0.15s',
                        borderBottom: isActive ? ('2px solid ' + meta.color) : '2px solid transparent',
                    },
                },
                    React.createElement('div', null, meta.icon + ' ' + meta.label),
                );
            }),
        ),

        // Active refraction content
        React.createElement('div', {
            style: {
                padding: '16px', borderRadius: '10px',
                border: '1px solid ' + activeMeta.color + '30',
                backgroundColor: activeMeta.color + '08',
                marginBottom: '12px',
            },
        },
            // Level description
            React.createElement('div', {
                style: { fontSize: '10px', color: C.dim, marginBottom: '8px' },
            }, activeMeta.desc),

            // Refraction text
            React.createElement('div', {
                style: {
                    fontSize: '18px', fontWeight: 600, color: C.text,
                    lineHeight: '1.5', marginBottom: '12px',
                },
            }, activeRefraction.text),

            // Explanation
            React.createElement('div', {
                style: {
                    padding: '10px 12px', borderRadius: '6px',
                    backgroundColor: C.bg, border: '1px solid ' + C.border,
                    fontSize: '12px', color: C.muted, lineHeight: '1.5',
                    fontStyle: explainInL1 ? 'italic' : 'normal',
                },
            },
                explainInL1 ? React.createElement('span', {
                    style: { fontSize: '9px', padding: '1px 4px', borderRadius: '3px', backgroundColor: '#f59e0b20', color: '#f59e0b', marginRight: '6px' },
                }, 'L1') : null,
                activeRefraction.explanation,
            ),

            // Audio + Record buttons
            React.createElement('div', {
                style: { display: 'flex', gap: '8px', marginTop: '12px' },
            },
                // TTS playback
                activeRefraction.audioUrl ? React.createElement('button', {
                    onClick: () => handlePlayAudio(active),
                    disabled: playingAudio === active,
                    style: {
                        flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                        backgroundColor: activeMeta.color, color: C.text,
                        cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    },
                }, playingAudio === active ? '🔊 Playing...' : '▶ Listen') : null,

                // Record pronunciation
                onRecordAttempt ? React.createElement('button', {
                    onClick: isRecording ? handleStopRecording : handleStartRecording,
                    style: {
                        flex: 1, padding: '8px', borderRadius: '6px',
                        border: isRecording ? ('2px solid ' + C.danger) : ('1px solid ' + C.border),
                        backgroundColor: isRecording ? C.danger + '20' : 'transparent',
                        color: isRecording ? C.danger : C.muted,
                        cursor: 'pointer', fontSize: '12px',
                    },
                }, isRecording ? '⏹ Stop Recording' : '🎤 Practice') : null,
            ),
        ),

        // Comparison strip (all three side-by-side)
        React.createElement('div', {
            style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' },
        },
            ...LEVELS.map((level: RefractionLevel) => {
                const meta = LEVEL_META[level];
                const ref = refractions[level];
                const isActive = level === active;
                return React.createElement('div', {
                    key: level,
                    onClick: () => onSelectRefraction(level),
                    style: {
                        padding: '8px', borderRadius: '6px', cursor: 'pointer',
                        border: isActive ? ('1px solid ' + meta.color) : ('1px solid ' + C.border),
                        backgroundColor: isActive ? meta.color + '10' : C.card,
                        opacity: isActive ? 1 : 0.6,
                        transition: 'all 0.15s',
                    },
                },
                    React.createElement('div', {
                        style: { fontSize: '9px', fontWeight: 600, color: meta.color, marginBottom: '4px' },
                    }, meta.icon + ' ' + meta.label),
                    React.createElement('div', {
                        style: { fontSize: '11px', color: C.text, lineHeight: '1.4' },
                    }, ref.text),
                );
            }),
        ),
    );
};
