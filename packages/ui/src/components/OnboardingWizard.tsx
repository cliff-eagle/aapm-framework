import React, { useState, useCallback } from 'react';

/**
 * @module OnboardingWizard
 * @description Multi-step onboarding wizard for new AAPM learners.
 *
 * Steps:
 * 1. Profile — Name, native language
 * 2. AI Provider — Select provider, input API key, auto-detect capabilities
 * 3. Language — Target language, self-assessed CEFR level
 * 4. Persona — Choose persona schema
 * 5. Confirm — Summary + start
 */

// ─── Types ───────────────────────────────────────────────────────────────────

import type {
    AIProviderId,
    AICapability,
    AIProviderDefinition,
    AIProviderEntry,
    AIModelOption,
} from '../ai-provider-types';

import {
    AI_PROVIDER_CATALOG,
    REQUIRED_CAPABILITIES,
    CAPABILITY_LABELS,
} from '../ai-provider-types';

/** Data collected across all onboarding steps. */
export interface OnboardingData {
    /** Step 1 */
    profileName: string;
    nativeLanguage: string;
    /** Step 2 */
    aiProviders: AIProviderEntry[];
    capabilityRouting: Partial<Record<AICapability, AIProviderId>>;
    /** Step 3 */
    targetLanguage: string;
    selfAssessedCEFR: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    /** Step 4 */
    selectedPersonaId: string;
}

export interface OnboardingWizardProps {
    /** Callback when onboarding is completed. */
    onComplete: (data: OnboardingData) => void;
    /** Available persona schemas for step 4. */
    availablePersonas: Array<{ id: string; name: string; description: string }>;
    /** Optional callback to test an API key. */
    onTestApiKey?: (providerId: AIProviderId, apiKey: string) => Promise<boolean>;
}

type OnboardingStep = 'profile' | 'ai-provider' | 'language' | 'persona' | 'confirm';
const STEPS: OnboardingStep[] = ['profile', 'ai-provider', 'language', 'persona', 'confirm'];
const STEP_LABELS: Record<OnboardingStep, string> = {
    'profile': 'Profile',
    'ai-provider': 'AI Provider',
    'language': 'Language',
    'persona': 'Persona',
    'confirm': 'Confirm',
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const COLORS = {
    bg: '#0f172a',
    card: '#1e293b',
    cardHover: '#334155',
    border: '#334155',
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    accent: '#10b981',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    textDim: '#64748b',
    danger: '#ef4444',
    warning: '#f59e0b',
    surface: '#0f172a',
    inputBg: '#0f172a',
};

const baseInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: COLORS.inputBg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    color: COLORS.text,
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
};

// ─── Component ───────────────────────────────────────────────────────────────

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
    onComplete,
    availablePersonas,
    onTestApiKey,
}) => {
    // ── State ────────────────────────────────────────────────

    const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile');
    const [data, setData] = useState<OnboardingData>({
        profileName: '',
        nativeLanguage: 'English',
        aiProviders: [],
        capabilityRouting: {},
        targetLanguage: '',
        selfAssessedCEFR: 'A1',
        selectedPersonaId: '',
    });

    // AI provider step state
    const [selectedProvider, setSelectedProvider] = useState<AIProviderId | null>(null);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [keyTestStatus, setKeyTestStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

    const currentStepIndex = STEPS.indexOf(currentStep);

    // ── Navigation ───────────────────────────────────────────

    const canProceed = useCallback((): boolean => {
        switch (currentStep) {
            case 'profile':
                return data.profileName.trim().length >= 2 && data.nativeLanguage.trim().length > 0;
            case 'ai-provider':
                return data.aiProviders.length > 0 && !!data.capabilityRouting.llm;
            case 'language':
                return data.targetLanguage.trim().length > 0;
            case 'persona':
                return data.selectedPersonaId.length > 0;
            case 'confirm':
                return true;
            default:
                return false;
        }
    }, [currentStep, data]);

    const goNext = useCallback(() => {
        if (currentStep === 'confirm') {
            onComplete(data);
            return;
        }
        setCurrentStep(STEPS[currentStepIndex + 1]);
    }, [currentStep, currentStepIndex, data, onComplete]);

    const goBack = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStep(STEPS[currentStepIndex - 1]);
        }
    }, [currentStepIndex]);

    // ── AI Provider Handlers ─────────────────────────────────

    const handleSelectProvider = useCallback((providerId: AIProviderId) => {
        setSelectedProvider(providerId);
        setApiKeyInput('');
        setKeyTestStatus('idle');
    }, []);

    const handleAddProvider = useCallback(() => {
        if (!selectedProvider || !apiKeyInput.trim()) return;

        const definition = AI_PROVIDER_CATALOG.find(p => p.id === selectedProvider);
        if (!definition) return;

        // Build default model selections
        const selectedModels: Partial<Record<AICapability, string>> = {};
        for (const model of definition.models) {
            if (model.isDefault) {
                selectedModels[model.capability] = model.id;
            }
        }

        const newEntry: AIProviderEntry = {
            providerId: selectedProvider,
            apiKey: apiKeyInput.trim(),
            keyValidated: keyTestStatus === 'valid',
            selectedModels,
            enabled: true,
        };

        // Update routing: set this provider for each capability it supports
        const newRouting = { ...data.capabilityRouting };
        for (const cap of definition.capabilities) {
            if (!newRouting[cap]) {
                newRouting[cap] = selectedProvider;
            }
        }

        setData(prev => ({
            ...prev,
            aiProviders: [...prev.aiProviders.filter(p => p.providerId !== selectedProvider), newEntry],
            capabilityRouting: newRouting,
        }));

        setSelectedProvider(null);
        setApiKeyInput('');
        setKeyTestStatus('idle');
    }, [selectedProvider, apiKeyInput, keyTestStatus, data.capabilityRouting]);

    const handleTestKey = useCallback(async () => {
        if (!selectedProvider || !apiKeyInput.trim() || !onTestApiKey) return;
        setKeyTestStatus('testing');
        try {
            const ok = await onTestApiKey(selectedProvider, apiKeyInput.trim());
            setKeyTestStatus(ok ? 'valid' : 'invalid');
        } catch {
            setKeyTestStatus('invalid');
        }
    }, [selectedProvider, apiKeyInput, onTestApiKey]);

    const handleRemoveProvider = useCallback((providerId: AIProviderId) => {
        setData(prev => {
            const newProviders = prev.aiProviders.filter(p => p.providerId !== providerId);
            const newRouting = { ...prev.capabilityRouting };
            for (const [cap, pid] of Object.entries(newRouting)) {
                if (pid === providerId) {
                    delete newRouting[cap as AICapability];
                }
            }
            return { ...prev, aiProviders: newProviders, capabilityRouting: newRouting };
        });
    }, []);

    // ── Render Helpers ───────────────────────────────────────

    const renderStepIndicator = () => {
        return React.createElement('div', {
            style: { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' },
        },
            ...STEPS.map((step, i) => {
                const isCurrent = step === currentStep;
                const isPast = i < currentStepIndex;
                return React.createElement('div', {
                    key: step,
                    style: { display: 'flex', alignItems: 'center', gap: '8px' },
                },
                    React.createElement('div', {
                        style: {
                            width: '32px', height: '32px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: 600,
                            backgroundColor: isCurrent ? COLORS.primary : isPast ? COLORS.accent : COLORS.card,
                            color: COLORS.text,
                            transition: 'background-color 0.2s',
                        },
                    }, isPast ? '✓' : String(i + 1)),
                    i < STEPS.length - 1 ? React.createElement('div', {
                        style: { width: '40px', height: '2px', backgroundColor: isPast ? COLORS.accent : COLORS.border },
                    }) : null,
                );
            }),
        );
    };

    // ── Step: Profile ────────────────────────────────────────

    const renderProfileStep = () => {
        return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: '20px' } },
            React.createElement('h2', { style: { margin: 0, color: COLORS.text, fontSize: '20px' } }, 'Create Your Profile'),
            React.createElement('p', { style: { margin: 0, color: COLORS.textMuted, fontSize: '14px' } },
                'Tell us about yourself so we can personalize your learning experience.'),
            // Name
            React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', marginBottom: '6px', fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 } }, 'Display Name'),
                React.createElement('input', {
                    type: 'text',
                    value: data.profileName,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setData(prev => ({ ...prev, profileName: e.target.value })),
                    placeholder: 'Enter your name',
                    style: baseInputStyle,
                }),
            ),
            // Native language
            React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', marginBottom: '6px', fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 } }, 'Native Language'),
                React.createElement('select', {
                    value: data.nativeLanguage,
                    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setData(prev => ({ ...prev, nativeLanguage: e.target.value })),
                    style: baseInputStyle,
                },
                    ...['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Mandarin', 'Arabic', 'Hindi', 'Russian', 'Turkish', 'Dutch', 'Polish', 'Swedish'].map(lang =>
                        React.createElement('option', { key: lang, value: lang }, lang),
                    ),
                ),
            ),
        );
    };

    // ── Step: AI Provider ────────────────────────────────────

    const renderProviderCard = (def: AIProviderDefinition) => {
        const isSelected = selectedProvider === def.id;
        const isConfigured = data.aiProviders.some(p => p.providerId === def.id);

        return React.createElement('div', {
            key: def.id,
            'data-provider': def.id,
            onClick: () => !isConfigured && handleSelectProvider(def.id),
            style: {
                padding: '14px 16px',
                borderRadius: '10px',
                border: `2px solid ${isSelected ? COLORS.primary : isConfigured ? COLORS.accent : COLORS.border}`,
                backgroundColor: isSelected ? `${COLORS.primary}15` : isConfigured ? `${COLORS.accent}10` : COLORS.card,
                cursor: isConfigured ? 'default' : 'pointer',
                transition: 'all 0.15s',
            },
        },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' } },
                React.createElement('span', { style: { fontSize: '20px' } }, def.logoEmoji),
                React.createElement('span', { style: { fontWeight: 600, fontSize: '15px', color: COLORS.text } }, def.name),
                isConfigured ? React.createElement('span', {
                    style: { marginLeft: 'auto', fontSize: '11px', color: COLORS.accent, fontWeight: 600, padding: '2px 8px', backgroundColor: `${COLORS.accent}20`, borderRadius: '4px' },
                }, '✓ Added') : null,
            ),
            React.createElement('p', { style: { margin: 0, fontSize: '12px', color: COLORS.textMuted, lineHeight: '1.4' } }, def.description),
            // Capability badges
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap' as const, gap: '4px', marginTop: '8px' } },
                ...def.capabilities.map(cap =>
                    React.createElement('span', {
                        key: cap,
                        style: {
                            fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                            backgroundColor: `${COLORS.primary}20`, color: COLORS.primary,
                        },
                    }, `${CAPABILITY_LABELS[cap].icon} ${CAPABILITY_LABELS[cap].name}`),
                ),
            ),
            // Remove button for configured providers
            isConfigured ? React.createElement('button', {
                onClick: (e: React.MouseEvent) => { e.stopPropagation(); handleRemoveProvider(def.id); },
                style: {
                    marginTop: '8px', background: 'none', border: `1px solid ${COLORS.danger}40`,
                    borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
                    fontSize: '11px', color: COLORS.danger,
                },
            }, 'Remove') : null,
        );
    };

    const renderApiKeyPanel = () => {
        if (!selectedProvider) return null;
        const def = AI_PROVIDER_CATALOG.find(p => p.id === selectedProvider)!;

        return React.createElement('div', {
            style: {
                padding: '16px', borderRadius: '10px',
                border: `1px solid ${COLORS.primary}40`,
                backgroundColor: `${COLORS.primary}08`,
                marginTop: '16px',
            },
        },
            React.createElement('h4', { style: { margin: '0 0 4px', fontSize: '14px', color: COLORS.text } },
                `${def.logoEmoji} Configure ${def.name}`),
            React.createElement('p', { style: { margin: '0 0 12px', fontSize: '12px', color: COLORS.textMuted } },
                'Paste your API key below. One key unlocks all capabilities.'),
            // API key input
            React.createElement('div', { style: { display: 'flex', gap: '8px', marginBottom: '12px' } },
                React.createElement('input', {
                    type: 'password',
                    value: apiKeyInput,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setApiKeyInput(e.target.value); setKeyTestStatus('idle'); },
                    placeholder: def.apiKeyPrefix ? `${def.apiKeyPrefix}...` : 'Paste API key',
                    style: { ...baseInputStyle, flex: 1 },
                }),
                onTestApiKey ? React.createElement('button', {
                    onClick: handleTestKey,
                    disabled: !apiKeyInput.trim() || keyTestStatus === 'testing',
                    style: {
                        padding: '8px 14px', borderRadius: '8px', border: 'none',
                        backgroundColor: COLORS.card, color: COLORS.text,
                        cursor: 'pointer', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' as const,
                    },
                }, keyTestStatus === 'testing' ? '⏳ Testing...' : keyTestStatus === 'valid' ? '✅ Valid' : keyTestStatus === 'invalid' ? '❌ Retry' : '🔑 Test') : null,
            ),
            // Key link
            React.createElement('a', {
                href: def.apiKeyUrl, target: '_blank', rel: 'noopener',
                style: { fontSize: '11px', color: COLORS.primary, textDecoration: 'none' },
            }, `Get your ${def.name} API key →`),
            // What this key enables
            React.createElement('div', { style: { marginTop: '12px' } },
                React.createElement('div', { style: { fontSize: '11px', color: COLORS.textMuted, marginBottom: '6px', fontWeight: 500 } },
                    'This key enables:'),
                ...def.capabilities.map(cap => {
                    const defaultModel = def.models.find(m => m.capability === cap && m.isDefault);
                    return React.createElement('div', {
                        key: cap,
                        style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '12px', color: COLORS.textMuted },
                    },
                        React.createElement('span', null, CAPABILITY_LABELS[cap].icon),
                        React.createElement('span', { style: { color: COLORS.text } }, CAPABILITY_LABELS[cap].name),
                        React.createElement('span', { style: { color: COLORS.textDim } }, `— ${defaultModel?.name ?? 'default'}`),
                    );
                }),
            ),
            // Add button
            React.createElement('div', { style: { display: 'flex', gap: '8px', marginTop: '14px' } },
                React.createElement('button', {
                    onClick: handleAddProvider,
                    disabled: !apiKeyInput.trim(),
                    style: {
                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                        backgroundColor: apiKeyInput.trim() ? COLORS.primary : COLORS.border,
                        color: COLORS.text, cursor: apiKeyInput.trim() ? 'pointer' : 'default',
                        fontSize: '13px', fontWeight: 600,
                    },
                }, `Add ${def.name}`),
                React.createElement('button', {
                    onClick: () => setSelectedProvider(null),
                    style: {
                        padding: '10px 16px', borderRadius: '8px',
                        border: `1px solid ${COLORS.border}`, backgroundColor: 'transparent',
                        color: COLORS.textMuted, cursor: 'pointer', fontSize: '13px',
                    },
                }, 'Cancel'),
            ),
        );
    };

    const renderAIProviderStep = () => {
        const hasLLM = !!data.capabilityRouting.llm;
        const hasEmbedding = !!data.capabilityRouting.embedding;

        return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: '16px' } },
            React.createElement('h2', { style: { margin: 0, color: COLORS.text, fontSize: '20px' } }, 'Choose Your AI Provider'),
            React.createElement('p', { style: { margin: 0, color: COLORS.textMuted, fontSize: '14px' } },
                'Select a provider and enter your API key. One key unlocks all that provider\'s capabilities.'),
            // Requirement badges
            React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' as const } },
                React.createElement('span', {
                    style: {
                        padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        backgroundColor: hasLLM ? `${COLORS.accent}20` : `${COLORS.danger}20`,
                        color: hasLLM ? COLORS.accent : COLORS.danger,
                    },
                }, `${hasLLM ? '✓' : '!'} Language Model (required)`),
                React.createElement('span', {
                    style: {
                        padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        backgroundColor: hasEmbedding ? `${COLORS.accent}20` : `${COLORS.warning}20`,
                        color: hasEmbedding ? COLORS.accent : COLORS.warning,
                    },
                }, `${hasEmbedding ? '✓' : '!'} Embeddings (required)`),
            ),
            // Provider grid
            React.createElement('div', {
                style: {
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '12px',
                },
            },
                ...(AI_PROVIDER_CATALOG as unknown as AIProviderDefinition[]).map(renderProviderCard),
            ),
            // API key panel
            renderApiKeyPanel(),
        );
    };

    // ── Step: Language ────────────────────────────────────────

    const renderLanguageStep = () => {
        const languages = ['Italian', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese', 'Korean', 'Mandarin', 'Arabic', 'Hindi', 'Russian', 'Turkish', 'Dutch', 'Polish', 'Swedish', 'Greek', 'Czech', 'Thai', 'Vietnamese', 'Indonesian'];
        const cefrLevels: Array<{ value: string; label: string; desc: string }> = [
            { value: 'A1', label: 'A1 — Beginner', desc: 'Can understand basic phrases' },
            { value: 'A2', label: 'A2 — Elementary', desc: 'Can handle simple daily tasks' },
            { value: 'B1', label: 'B1 — Intermediate', desc: 'Can deal with most travel situations' },
            { value: 'B2', label: 'B2 — Upper Intermediate', desc: 'Can interact fluently with native speakers' },
            { value: 'C1', label: 'C1 — Advanced', desc: 'Can express ideas fluently and spontaneously' },
            { value: 'C2', label: 'C2 — Proficiency', desc: 'Can understand virtually everything' },
        ];

        return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: '20px' } },
            React.createElement('h2', { style: { margin: 0, color: COLORS.text, fontSize: '20px' } }, 'Target Language'),
            React.createElement('p', { style: { margin: 0, color: COLORS.textMuted, fontSize: '14px' } },
                'Which language do you want to learn?'),
            // Language select
            React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', marginBottom: '6px', fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 } }, 'Language'),
                React.createElement('select', {
                    value: data.targetLanguage,
                    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setData(prev => ({ ...prev, targetLanguage: e.target.value })),
                    style: baseInputStyle,
                },
                    React.createElement('option', { value: '' }, '— Select a language —'),
                    ...languages.map(lang =>
                        React.createElement('option', { key: lang, value: lang }, lang),
                    ),
                ),
            ),
            // CEFR level
            React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', marginBottom: '6px', fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 } },
                    'Current Level (self-assessment)'),
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: '6px' } },
                    ...cefrLevels.map(level =>
                        React.createElement('label', {
                            key: level.value,
                            style: {
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 14px', borderRadius: '8px',
                                border: `1px solid ${data.selfAssessedCEFR === level.value ? COLORS.primary : COLORS.border}`,
                                backgroundColor: data.selfAssessedCEFR === level.value ? `${COLORS.primary}15` : COLORS.card,
                                cursor: 'pointer', transition: 'all 0.15s',
                            },
                        },
                            React.createElement('input', {
                                type: 'radio', name: 'cefr',
                                value: level.value,
                                checked: data.selfAssessedCEFR === level.value,
                                onChange: () => setData(prev => ({ ...prev, selfAssessedCEFR: level.value as OnboardingData['selfAssessedCEFR'] })),
                                style: { accentColor: COLORS.primary },
                            }),
                            React.createElement('div', null,
                                React.createElement('div', { style: { fontSize: '13px', fontWeight: 600, color: COLORS.text } }, level.label),
                                React.createElement('div', { style: { fontSize: '11px', color: COLORS.textMuted } }, level.desc),
                            ),
                        ),
                    ),
                ),
            ),
        );
    };

    // ── Step: Persona ────────────────────────────────────────

    const renderPersonaStep = () => {
        return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: '20px' } },
            React.createElement('h2', { style: { margin: 0, color: COLORS.text, fontSize: '20px' } }, 'Choose Your Persona'),
            React.createElement('p', { style: { margin: 0, color: COLORS.textMuted, fontSize: '14px' } },
                'A persona defines your learning environment, NPCs, and scenarios.'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' } },
                ...availablePersonas.map(persona =>
                    React.createElement('div', {
                        key: persona.id,
                        onClick: () => setData(prev => ({ ...prev, selectedPersonaId: persona.id })),
                        style: {
                            padding: '16px', borderRadius: '10px', cursor: 'pointer',
                            border: `2px solid ${data.selectedPersonaId === persona.id ? COLORS.primary : COLORS.border}`,
                            backgroundColor: data.selectedPersonaId === persona.id ? `${COLORS.primary}15` : COLORS.card,
                            transition: 'all 0.15s',
                        },
                    },
                        React.createElement('div', { style: { fontWeight: 600, fontSize: '15px', color: COLORS.text, marginBottom: '6px' } }, persona.name),
                        React.createElement('div', { style: { fontSize: '12px', color: COLORS.textMuted, lineHeight: '1.4' } }, persona.description),
                    ),
                ),
            ),
        );
    };

    // ── Step: Confirm ────────────────────────────────────────

    const renderConfirmStep = () => {
        const configuredProviders = data.aiProviders.map(p => {
            const def = AI_PROVIDER_CATALOG.find(d => d.id === p.providerId);
            return def ? `${def.logoEmoji} ${def.name}` : p.providerId;
        });

        const summaryRows: Array<[string, string]> = [
            ['Name', data.profileName],
            ['Native Language', data.nativeLanguage],
            ['AI Provider(s)', configuredProviders.join(', ')],
            ['Target Language', data.targetLanguage],
            ['Starting Level', data.selfAssessedCEFR],
            ['Persona', availablePersonas.find(p => p.id === data.selectedPersonaId)?.name || data.selectedPersonaId],
        ];

        return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: '20px' } },
            React.createElement('h2', { style: { margin: 0, color: COLORS.text, fontSize: '20px' } }, 'Ready to Start!'),
            React.createElement('p', { style: { margin: 0, color: COLORS.textMuted, fontSize: '14px' } },
                'Review your configuration. You can change these settings later.'),
            React.createElement('div', {
                style: { padding: '16px', borderRadius: '10px', backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` },
            },
                ...summaryRows.map(([label, value]) =>
                    React.createElement('div', {
                        key: label,
                        style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` },
                    },
                        React.createElement('span', { style: { fontSize: '13px', color: COLORS.textMuted } }, label),
                        React.createElement('span', { style: { fontSize: '13px', fontWeight: 600, color: COLORS.text } }, value),
                    ),
                ),
            ),
        );
    };

    // ── Step Router ──────────────────────────────────────────

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 'profile': return renderProfileStep();
            case 'ai-provider': return renderAIProviderStep();
            case 'language': return renderLanguageStep();
            case 'persona': return renderPersonaStep();
            case 'confirm': return renderConfirmStep();
        }
    };

    // ── Main Layout ──────────────────────────────────────────

    return React.createElement('div', {
        'data-component': 'aapm-onboarding-wizard',
        'data-step': currentStep,
        style: {
            maxWidth: '720px', margin: '0 auto', padding: '32px 24px',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: COLORS.text,
        },
    },
        // Step indicator
        renderStepIndicator(),

        // Step title
        React.createElement('div', { style: { marginBottom: '24px' } },
            React.createElement('div', { style: { fontSize: '11px', color: COLORS.textDim, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' as const } },
                `Step ${currentStepIndex + 1} of ${STEPS.length} — ${STEP_LABELS[currentStep]}`),
        ),

        // Current step content
        renderCurrentStep(),

        // Navigation buttons
        React.createElement('div', {
            style: { display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: `1px solid ${COLORS.border}` },
        },
            currentStepIndex > 0
                ? React.createElement('button', {
                    onClick: goBack,
                    style: {
                        padding: '10px 20px', borderRadius: '8px',
                        border: `1px solid ${COLORS.border}`, backgroundColor: 'transparent',
                        color: COLORS.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                    },
                }, '← Back')
                : React.createElement('div'),

            React.createElement('button', {
                onClick: goNext,
                disabled: !canProceed(),
                style: {
                    padding: '10px 24px', borderRadius: '8px', border: 'none',
                    backgroundColor: canProceed() ? COLORS.primary : COLORS.border,
                    color: canProceed() ? COLORS.text : COLORS.textDim,
                    cursor: canProceed() ? 'pointer' : 'default',
                    fontSize: '13px', fontWeight: 600,
                },
            }, currentStep === 'confirm' ? '🚀 Start Learning' : 'Continue →'),
        ),
    );
};
