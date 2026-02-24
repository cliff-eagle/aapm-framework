import React, { useState, useCallback, useEffect } from 'react';

/**
 * @module APIKeyGate
 * @description Landing page gate that requires an API key before
 * the app loads. Keys are validated against OpenAI's API and
 * persisted to localStorage for subsequent visits.
 *
 * Usage:
 *   <APIKeyGate onAuthenticated={(key) => initApp(key)}>
 *     <App />
 *   </APIKeyGate>
 */

// ─── Constants ───────────────────────────────────────────────

const STORAGE_KEY = 'aapm_openai_api_key';

// ─── Props ───────────────────────────────────────────────────

export interface APIKeyGateProps {
    /** Called with the validated API key when authentication succeeds */
    onAuthenticated: (apiKey: string) => void;
    /** Children to render once authenticated */
    children: React.ReactNode;
    /** Optional: custom title */
    title?: string;
    /** Optional: skip gate if key already exists in localStorage */
    autoRestore?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

async function validateOpenAIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (response.ok) return { valid: true };
        if (response.status === 401) return { valid: false, error: 'Invalid API key' };
        if (response.status === 429) return { valid: false, error: 'Rate limited — try again in a moment' };
        return { valid: false, error: `Unexpected error (${response.status})` };
    } catch (err) {
        return { valid: false, error: 'Network error — check your connection' };
    }
}

function getSavedKey(): string | null {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function saveKey(key: string): void {
    try { localStorage.setItem(STORAGE_KEY, key); } catch { /* noop */ }
}

function clearKey(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

// ─── Component ───────────────────────────────────────────────

export const APIKeyGate: React.FC<APIKeyGateProps> = ({
    onAuthenticated,
    children,
    title = 'AAPM Framework',
    autoRestore = true,
}) => {
    const [authenticated, setAuthenticated] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [validating, setValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [restoring, setRestoring] = useState(autoRestore);

    // Auto-restore from localStorage on mount
    useEffect(() => {
        if (!autoRestore) { setRestoring(false); return; }
        const saved = getSavedKey();
        if (saved) {
            setValidating(true);
            validateOpenAIKey(saved).then(result => {
                if (result.valid) {
                    onAuthenticated(saved);
                    setAuthenticated(true);
                } else {
                    clearKey();
                }
                setValidating(false);
                setRestoring(false);
            });
        } else {
            setRestoring(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = apiKey.trim();
        if (!trimmed) { setError('Please enter an API key'); return; }
        if (!trimmed.startsWith('sk-')) { setError('Key must start with sk-'); return; }

        setValidating(true);
        setError(null);

        const result = await validateOpenAIKey(trimmed);
        if (result.valid) {
            saveKey(trimmed);
            onAuthenticated(trimmed);
            setAuthenticated(true);
        } else {
            setError(result.error ?? 'Validation failed');
        }
        setValidating(false);
    }, [apiKey, onAuthenticated]);

    // Show loading while restoring from localStorage
    if (restoring) {
        return (
            <div style={styles.container}>
                <div style={styles.spinner} />
            </div>
        );
    }

    // App is authenticated — render children
    if (authenticated) {
        return <>{children}</>;
    }

    // Show landing page with key input
    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {/* Logo / Title */}
                <div style={styles.logoArea}>
                    <div style={styles.logo}>🌍</div>
                    <h1 style={styles.title}>{title}</h1>
                    <p style={styles.subtitle}>
                        Adaptive AI-Powered Mediterranean Language Learning
                    </p>
                </div>

                {/* Key Input Form */}
                <form onSubmit={handleSubmit} style={styles.form}>
                    <label style={styles.label}>
                        OpenAI API Key
                        <span style={styles.hint}>
                            — powers LLM, voice, embeddings, and video
                        </span>
                    </label>
                    <div style={styles.inputRow}>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder="sk-proj-..."
                            style={styles.input}
                            autoFocus
                            disabled={validating}
                        />
                        <button
                            type="submit"
                            disabled={validating || !apiKey.trim()}
                            style={{
                                ...styles.button,
                                opacity: validating || !apiKey.trim() ? 0.5 : 1,
                            }}
                        >
                            {validating ? '⏳ Validating...' : '→ Enter'}
                        </button>
                    </div>
                    {error && <div style={styles.error}>⚠ {error}</div>}
                </form>

                {/* Info */}
                <div style={styles.info}>
                    <p style={styles.infoText}>
                        Your key is stored locally in your browser and never sent to our servers.
                    </p>
                    <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.link}
                    >
                        Get an API key from OpenAI →
                    </a>
                </div>

                {/* Capabilities */}
                <div style={styles.capabilities}>
                    {[
                        { emoji: '💬', label: 'GPT-4o', desc: 'NPC dialogue & reasoning' },
                        { emoji: '🔍', label: 'Embeddings', desc: 'Semantic memory' },
                        { emoji: '🎤', label: 'Whisper', desc: 'Speech recognition' },
                        { emoji: '🔊', label: 'TTS', desc: 'NPC voices' },
                    ].map(cap => (
                        <div key={cap.label} style={styles.capCard}>
                            <span style={styles.capEmoji}>{cap.emoji}</span>
                            <span style={styles.capLabel}>{cap.label}</span>
                            <span style={styles.capDesc}>{cap.desc}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0c0a1a 0%, #1a1040 50%, #0d1b2a 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    card: {
        width: '100%', maxWidth: 480,
        padding: '48px 40px',
        background: 'rgba(30, 41, 59, 0.85)',
        backdropFilter: 'blur(24px)',
        borderRadius: 20,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 120px rgba(59, 130, 246, 0.08)',
    },
    logoArea: {
        textAlign: 'center' as const, marginBottom: 32,
    },
    logo: {
        fontSize: 52, marginBottom: 12,
        filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.4))',
    },
    title: {
        margin: 0, fontSize: 26, fontWeight: 700,
        color: '#f8fafc',
        letterSpacing: '-0.02em',
    },
    subtitle: {
        margin: '8px 0 0', fontSize: 14, color: '#94a3b8',
        letterSpacing: '0.01em',
    },
    form: {
        marginBottom: 24,
    },
    label: {
        display: 'block', fontSize: 13, fontWeight: 600,
        color: '#e2e8f0', marginBottom: 8,
    },
    hint: {
        fontWeight: 400, color: '#64748b', fontSize: 12,
    },
    inputRow: {
        display: 'flex', gap: 8,
    },
    input: {
        flex: 1, padding: '12px 16px',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(51, 65, 85, 0.8)',
        borderRadius: 10, color: '#f8fafc',
        fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    button: {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        border: 'none', borderRadius: 10,
        color: '#fff', fontSize: 14, fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.2s, transform 0.1s',
        whiteSpace: 'nowrap' as const,
    },
    error: {
        marginTop: 10, padding: '8px 12px',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 8, color: '#fca5a5',
        fontSize: 13,
    },
    info: {
        textAlign: 'center' as const, marginBottom: 28,
    },
    infoText: {
        margin: 0, fontSize: 12, color: '#64748b',
    },
    link: {
        fontSize: 12, color: '#60a5fa',
        textDecoration: 'none',
    },
    capabilities: {
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 10,
    },
    capCard: {
        display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', padding: '14px 8px',
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        borderRadius: 12, gap: 4,
    },
    capEmoji: { fontSize: 22 },
    capLabel: { fontSize: 12, fontWeight: 600, color: '#e2e8f0' },
    capDesc: { fontSize: 11, color: '#64748b', textAlign: 'center' as const },
    spinner: {
        width: 32, height: 32,
        border: '3px solid rgba(59,130,246,0.2)',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
};

export default APIKeyGate;
