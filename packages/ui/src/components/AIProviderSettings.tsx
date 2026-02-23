import React, { useState, useCallback } from 'react';

/**
 * @module AIProviderSettings
 * @description Post-onboarding settings panel for managing AI providers.
 *
 * Allows the user to:
 * - View currently configured providers and their status
 * - Add/remove providers
 * - Change API keys
 * - Select specific models per capability
 * - Test API key connectivity
 */

import type {
    AIProviderId,
    AICapability,
    AIProviderEntry,
    AIProviderConfig,
    AIProviderDefinition,
    AIModelOption,
} from '../ai-provider-types';

import {
    AI_PROVIDER_CATALOG,
    CAPABILITY_LABELS,
} from '../ai-provider-types';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AIProviderSettingsProps {
    /** Current provider configuration. */
    config: AIProviderConfig;
    /** Callback when config changes. */
    onChange: (config: AIProviderConfig) => void;
    /** Optional callback to test an API key. */
    onTestApiKey?: (providerId: AIProviderId, apiKey: string) => Promise<boolean>;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const C = {
    bg: '#0f172a', card: '#1e293b', cardHover: '#334155', border: '#334155',
    primary: '#3b82f6', accent: '#10b981', text: '#f8fafc', muted: '#94a3b8',
    dim: '#64748b', danger: '#ef4444', warn: '#f59e0b', inputBg: '#0f172a',
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', backgroundColor: C.inputBg,
    border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text,
    fontSize: '13px', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box' as const,
};

// ─── Component ───────────────────────────────────────────────────────────────

export const AIProviderSettings: React.FC<AIProviderSettingsProps> = ({
    config,
    onChange,
    onTestApiKey,
}) => {
    const [addingProvider, setAddingProvider] = useState(false);
    const [selectedNewProvider, setSelectedNewProvider] = useState<AIProviderId | null>(null);
    const [newApiKey, setNewApiKey] = useState('');
    const [editingKey, setEditingKey] = useState<AIProviderId | null>(null);
    const [editKeyValue, setEditKeyValue] = useState('');
    const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'valid' | 'invalid'>>({});

    // ── Helpers ──────────────────────────────────────────────

    const getDefinition = (id: AIProviderId) =>
        (AI_PROVIDER_CATALOG as unknown as AIProviderDefinition[]).find(p => p.id === id);

    const maskKey = (key: string): string => {
        if (key.length <= 8) return '••••••••';
        return key.slice(0, 6) + '••••' + key.slice(-4);
    };

    // ── Handlers ─────────────────────────────────────────────

    const handleTestKey = useCallback(async (providerId: AIProviderId, apiKey: string) => {
        if (!onTestApiKey) return;
        setTestStatus(prev => ({ ...prev, [providerId]: 'testing' }));
        try {
            const ok = await onTestApiKey(providerId, apiKey);
            setTestStatus(prev => ({ ...prev, [providerId]: ok ? 'valid' : 'invalid' }));
            if (ok) {
                const updated = { ...config };
                updated.providers = updated.providers.map(p =>
                    p.providerId === providerId ? { ...p, keyValidated: true, lastValidatedAt: new Date().toISOString() } : p
                );
                onChange(updated);
            }
        } catch {
            setTestStatus(prev => ({ ...prev, [providerId]: 'invalid' }));
        }
    }, [config, onChange, onTestApiKey]);

    const handleAddProvider = useCallback(() => {
        if (!selectedNewProvider || !newApiKey.trim()) return;
        const def = getDefinition(selectedNewProvider);
        if (!def) return;

        const selectedModels: Partial<Record<AICapability, string>> = {};
        for (const model of def.models) {
            if (model.isDefault) selectedModels[model.capability] = model.id;
        }

        const newEntry: AIProviderEntry = {
            providerId: selectedNewProvider,
            apiKey: newApiKey.trim(),
            keyValidated: false,
            selectedModels,
            enabled: true,
        };

        const newRouting = { ...config.capabilityRouting };
        for (const cap of def.capabilities) {
            if (!newRouting[cap]) newRouting[cap] = selectedNewProvider;
        }

        onChange({
            ...config,
            providers: [...config.providers.filter(p => p.providerId !== selectedNewProvider), newEntry],
            capabilityRouting: newRouting,
            lastModifiedAt: new Date().toISOString(),
        });

        setAddingProvider(false);
        setSelectedNewProvider(null);
        setNewApiKey('');
    }, [selectedNewProvider, newApiKey, config, onChange]);

    const handleRemoveProvider = useCallback((providerId: AIProviderId) => {
        const newProviders = config.providers.filter(p => p.providerId !== providerId);
        const newRouting = { ...config.capabilityRouting };
        for (const [cap, pid] of Object.entries(newRouting)) {
            if (pid === providerId) delete newRouting[cap as AICapability];
        }
        onChange({
            ...config,
            providers: newProviders,
            capabilityRouting: newRouting,
            lastModifiedAt: new Date().toISOString(),
            isComplete: !!newRouting.llm && !!newRouting.embedding,
        });
    }, [config, onChange]);

    const handleToggleProvider = useCallback((providerId: AIProviderId) => {
        const updated = {
            ...config,
            providers: config.providers.map(p =>
                p.providerId === providerId ? { ...p, enabled: !p.enabled } : p
            ),
            lastModifiedAt: new Date().toISOString(),
        };
        onChange(updated);
    }, [config, onChange]);

    const handleModelChange = useCallback((providerId: AIProviderId, capability: AICapability, modelId: string) => {
        const updated = {
            ...config,
            providers: config.providers.map(p =>
                p.providerId === providerId
                    ? { ...p, selectedModels: { ...p.selectedModels, [capability]: modelId } }
                    : p
            ),
            lastModifiedAt: new Date().toISOString(),
        };
        onChange(updated);
    }, [config, onChange]);

    const handleUpdateApiKey = useCallback((providerId: AIProviderId) => {
        if (!editKeyValue.trim()) return;
        const updated = {
            ...config,
            providers: config.providers.map(p =>
                p.providerId === providerId
                    ? { ...p, apiKey: editKeyValue.trim(), keyValidated: false }
                    : p
            ),
            lastModifiedAt: new Date().toISOString(),
        };
        onChange(updated);
        setEditingKey(null);
        setEditKeyValue('');
    }, [config, onChange, editKeyValue]);

    const handleSetRouting = useCallback((capability: AICapability, providerId: AIProviderId) => {
        onChange({
            ...config,
            capabilityRouting: { ...config.capabilityRouting, [capability]: providerId },
            lastModifiedAt: new Date().toISOString(),
        });
    }, [config, onChange]);

    // ── Render ───────────────────────────────────────────────

    const renderProviderRow = (entry: AIProviderEntry) => {
        const def = getDefinition(entry.providerId);
        if (!def) return null;
        const status = testStatus[entry.providerId] || (entry.keyValidated ? 'valid' : 'idle');

        return React.createElement('div', {
            key: entry.providerId,
            style: {
                padding: '16px', borderRadius: '10px',
                border: `1px solid ${C.border}`, backgroundColor: C.card,
                opacity: entry.enabled ? 1 : 0.5,
            },
        },
            // Header
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' } },
                React.createElement('span', { style: { fontSize: '20px' } }, def.logoEmoji),
                React.createElement('span', { style: { fontWeight: 600, fontSize: '15px', color: C.text, flex: 1 } }, def.name),
                // Status badge
                React.createElement('span', {
                    style: {
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
                        backgroundColor: status === 'valid' ? `${C.accent}20` : status === 'invalid' ? `${C.danger}20` : `${C.muted}20`,
                        color: status === 'valid' ? C.accent : status === 'invalid' ? C.danger : C.muted,
                    },
                }, status === 'valid' ? '✓ Connected' : status === 'invalid' ? '✕ Failed' : status === 'testing' ? '⏳ Testing' : '• Not tested'),
                // Toggle + Remove
                React.createElement('button', {
                    onClick: () => handleToggleProvider(entry.providerId),
                    style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px' },
                    title: entry.enabled ? 'Disable' : 'Enable',
                }, entry.enabled ? '🟢' : '⚪'),
                React.createElement('button', {
                    onClick: () => handleRemoveProvider(entry.providerId),
                    style: { background: 'none', border: `1px solid ${C.danger}40`, borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: C.danger, padding: '2px 8px' },
                }, 'Remove'),
            ),

            // API Key row
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' } },
                React.createElement('span', { style: { fontSize: '12px', color: C.muted, minWidth: '50px' } }, 'API Key'),
                editingKey === entry.providerId
                    ? React.createElement(React.Fragment, null,
                        React.createElement('input', {
                            type: 'password', value: editKeyValue,
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEditKeyValue(e.target.value),
                            style: { ...inputStyle, flex: 1 },
                            placeholder: 'New API key',
                        }),
                        React.createElement('button', {
                            onClick: () => handleUpdateApiKey(entry.providerId),
                            style: { padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: C.primary, color: C.text, cursor: 'pointer', fontSize: '11px' },
                        }, 'Save'),
                        React.createElement('button', {
                            onClick: () => setEditingKey(null),
                            style: { padding: '6px 12px', borderRadius: '6px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '11px' },
                        }, 'Cancel'),
                    )
                    : React.createElement(React.Fragment, null,
                        React.createElement('code', {
                            style: { flex: 1, fontSize: '12px', color: C.dim, backgroundColor: C.bg, padding: '6px 10px', borderRadius: '4px' },
                        }, maskKey(entry.apiKey)),
                        React.createElement('button', {
                            onClick: () => { setEditingKey(entry.providerId); setEditKeyValue(''); },
                            style: { padding: '4px 10px', borderRadius: '4px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '11px' },
                        }, 'Change'),
                        onTestApiKey ? React.createElement('button', {
                            onClick: () => handleTestKey(entry.providerId, entry.apiKey),
                            disabled: status === 'testing',
                            style: { padding: '4px 10px', borderRadius: '4px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '11px' },
                        }, 'Test') : null,
                    ),
            ),

            // Model selectors per capability
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: '6px' } },
                ...def.capabilities.map(cap => {
                    const models = def.models.filter(m => m.capability === cap);
                    const selectedModel = entry.selectedModels[cap] || models.find(m => m.isDefault)?.id || '';
                    const isRouted = config.capabilityRouting[cap] === entry.providerId;

                    return React.createElement('div', {
                        key: cap,
                        style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' },
                    },
                        React.createElement('span', { style: { minWidth: '20px' } }, CAPABILITY_LABELS[cap].icon),
                        React.createElement('span', { style: { minWidth: '120px', color: C.muted } }, CAPABILITY_LABELS[cap].name),
                        React.createElement('select', {
                            value: selectedModel,
                            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleModelChange(entry.providerId, cap, e.target.value),
                            style: { ...inputStyle, flex: 1, padding: '4px 8px', fontSize: '12px' },
                        },
                            ...models.map(m =>
                                React.createElement('option', { key: m.id, value: m.id },
                                    `${m.name} (${m.costTier})`),
                            ),
                        ),
                        // Route toggle
                        React.createElement('button', {
                            onClick: () => handleSetRouting(cap, entry.providerId),
                            title: isRouted ? 'Active for this capability' : 'Use this provider for this capability',
                            style: {
                                padding: '2px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                                backgroundColor: isRouted ? `${C.accent}20` : `${C.muted}10`,
                                color: isRouted ? C.accent : C.dim, fontSize: '10px', fontWeight: 600,
                            },
                        }, isRouted ? 'Active' : 'Use'),
                    );
                }),
            ),
        );
    };

    const renderAddProviderPanel = () => {
        const configuredIds = new Set(config.providers.map(p => p.providerId));
        const available = (AI_PROVIDER_CATALOG as unknown as AIProviderDefinition[]).filter(p => !configuredIds.has(p.id));

        if (available.length === 0) {
            return React.createElement('p', { style: { fontSize: '13px', color: C.muted, textAlign: 'center' as const } },
                'All providers configured!');
        }

        return React.createElement('div', {
            style: { padding: '16px', borderRadius: '10px', border: `1px dashed ${C.primary}40`, backgroundColor: `${C.primary}08` },
        },
            React.createElement('div', { style: { fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '12px' } },
                'Add Provider'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' } },
                ...available.map(def =>
                    React.createElement('div', {
                        key: def.id,
                        onClick: () => setSelectedNewProvider(def.id),
                        style: {
                            padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                            border: `1px solid ${selectedNewProvider === def.id ? C.primary : C.border}`,
                            backgroundColor: selectedNewProvider === def.id ? `${C.primary}15` : C.card,
                            fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                        },
                    },
                        React.createElement('span', null, def.logoEmoji),
                        React.createElement('span', { style: { color: C.text } }, def.name),
                    ),
                ),
            ),
            selectedNewProvider ? React.createElement('div', { style: { display: 'flex', gap: '8px' } },
                React.createElement('input', {
                    type: 'password', value: newApiKey,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewApiKey(e.target.value),
                    placeholder: 'Paste API key',
                    style: { ...inputStyle, flex: 1 },
                }),
                React.createElement('button', {
                    onClick: handleAddProvider,
                    disabled: !newApiKey.trim(),
                    style: {
                        padding: '8px 16px', borderRadius: '6px', border: 'none',
                        backgroundColor: newApiKey.trim() ? C.primary : C.border,
                        color: C.text, cursor: newApiKey.trim() ? 'pointer' : 'default',
                        fontSize: '12px', fontWeight: 600,
                    },
                }, 'Add'),
                React.createElement('button', {
                    onClick: () => { setAddingProvider(false); setSelectedNewProvider(null); setNewApiKey(''); },
                    style: {
                        padding: '8px 12px', borderRadius: '6px',
                        border: `1px solid ${C.border}`, backgroundColor: 'transparent',
                        color: C.muted, cursor: 'pointer', fontSize: '12px',
                    },
                }, 'Cancel'),
            ) : null,
        );
    };

    // ── Main Layout ──────────────────────────────────────────

    return React.createElement('div', {
        'data-component': 'aapm-ai-provider-settings',
        style: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: C.text,
        },
    },
        React.createElement('h3', { style: { margin: '0 0 4px', fontSize: '18px', color: C.text } }, '🧠 AI Provider Settings'),
        React.createElement('p', { style: { margin: '0 0 20px', fontSize: '13px', color: C.muted } },
            'Manage your AI providers, API keys, and model preferences.'),

        // Capability routing summary
        React.createElement('div', {
            style: { display: 'flex', flexWrap: 'wrap' as const, gap: '8px', marginBottom: '20px' },
        },
            ...(['llm', 'embedding', 'asr', 'tts', 'video'] as AICapability[]).map((cap: AICapability) => {
                const routedTo = config.capabilityRouting[cap];
                const def = routedTo ? getDefinition(routedTo) : null;
                const isRequired = cap === 'llm' || cap === 'embedding';
                const providerLabel = def ? def.name : (isRequired ? 'Required!' : 'Not set');
                const label = CAPABILITY_LABELS[cap].icon + ' ' + CAPABILITY_LABELS[cap].name + ': ' + providerLabel;
                return React.createElement('span', {
                    key: cap,
                    style: {
                        padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                        backgroundColor: routedTo ? (C.accent + '15') : (isRequired ? (C.danger + '15') : (C.muted + '10')),
                        color: routedTo ? C.accent : (isRequired ? C.danger : C.dim),
                    },
                }, label);
            }),
        ),

        // Configured providers
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: '12px', marginBottom: '16px' } },
            ...config.providers.map(renderProviderRow),
        ),

        // Add provider
        addingProvider
            ? renderAddProviderPanel()
            : React.createElement('button', {
                onClick: () => setAddingProvider(true),
                style: {
                    width: '100%', padding: '12px', borderRadius: '8px',
                    border: `1px dashed ${C.border}`, backgroundColor: 'transparent',
                    color: C.muted, cursor: 'pointer', fontSize: '13px',
                },
            }, '+ Add Provider'),
    );
};
