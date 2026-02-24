/**
 * @module ai-provider-types
 * @description Re-exported AI provider types for the @aapm/ui package.
 *
 * These types originate in @aapm/core/ai-providers but are re-exported
 * here so UI components can import without cross-package path resolution.
 * When @aapm/core is published as a proper npm package, these re-exports
 * will change to: export type { ... } from '@aapm/core';
 */

// ─── Capability & Model Types ────────────────────────────────────────────────

export type AICapability = 'llm' | 'embedding' | 'asr' | 'tts' | 'video';

export type AIProviderId =
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'mistral'
    | 'elevenlabs'
    | 'meta'
    | 'deepgram'
    | 'azure';

export interface AIModelOption {
    id: string;
    name: string;
    capability: AICapability;
    isDefault: boolean;
    costTier: 'budget' | 'standard' | 'premium';
    description: string;
    contextWindow?: number;
    supportsStructuredOutput?: boolean;
}

export interface AIProviderDefinition {
    id: AIProviderId;
    name: string;
    description: string;
    apiKeyUrl: string;
    apiKeyPrefix?: string;
    capabilities: AICapability[];
    models: AIModelOption[];
    logoEmoji: string;
    selfHosted?: boolean;
}

export interface AIProviderEntry {
    providerId: AIProviderId;
    apiKey: string;
    keyValidated: boolean;
    lastValidatedAt?: string;
    selectedModels: Partial<Record<AICapability, string>>;
    enabled: boolean;
}

export interface AIProviderConfig {
    providers: AIProviderEntry[];
    capabilityRouting: Partial<Record<AICapability, AIProviderId>>;
    lastModifiedAt: string;
    isComplete: boolean;
}

// ─── Capability Labels ───────────────────────────────────────────────────────

export const CAPABILITY_LABELS: Record<AICapability, { name: string; description: string; icon: string }> = {
    llm: { name: 'Language Model', description: 'Powers NPC dialogue, friction analysis, and curriculum generation.', icon: '🧠' },
    embedding: { name: 'Embeddings', description: 'Semantic memory for NPC relationships and pattern matching.', icon: '📐' },
    asr: { name: 'Speech Recognition', description: 'Voice input — speak to NPCs instead of typing.', icon: '🎤' },
    tts: { name: 'Text-to-Speech', description: 'Hear NPCs speak with natural voices.', icon: '🔈' },
    video: { name: 'Video Generation', description: 'Generate immersive scenario videos for environments.', icon: '🎬' },
};

export const REQUIRED_CAPABILITIES: readonly AICapability[] = ['llm', 'embedding'];

// ─── Provider Catalog ────────────────────────────────────────────────────────
// Duplicated from @aapm/core for UI independence. Single source of truth
// is packages/core/src/ai-providers/types.ts.

export const AI_PROVIDER_CATALOG: readonly AIProviderDefinition[] = [
    {
        id: 'openai', name: 'OpenAI', logoEmoji: '🟢',
        description: 'ChatGPT, Whisper, Sora 2, DALL·E — the most comprehensive single-key provider.',
        apiKeyUrl: 'https://platform.openai.com/api-keys', apiKeyPrefix: 'sk-',
        capabilities: ['llm', 'embedding', 'asr', 'tts', 'video'],
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', capability: 'llm', isDefault: true, costTier: 'standard', description: 'Most capable, best for NPC dialogue and friction analysis.', contextWindow: 128000, supportsStructuredOutput: true },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', capability: 'llm', isDefault: false, costTier: 'budget', description: 'Cost-optimized, good for curriculum generation.', contextWindow: 128000, supportsStructuredOutput: true },
            { id: 'o1', name: 'o1', capability: 'llm', isDefault: false, costTier: 'premium', description: 'Advanced reasoning for complex pattern analysis.', contextWindow: 200000, supportsStructuredOutput: true },
            { id: 'o3-mini', name: 'o3-mini', capability: 'llm', isDefault: false, costTier: 'standard', description: 'Reasoning model, cost-efficient.', contextWindow: 200000, supportsStructuredOutput: true },
            { id: 'text-embedding-3-small', name: 'Embedding 3 Small', capability: 'embedding', isDefault: true, costTier: 'budget', description: 'Fast embedding for semantic memory.' },
            { id: 'text-embedding-3-large', name: 'Embedding 3 Large', capability: 'embedding', isDefault: false, costTier: 'standard', description: 'Higher accuracy embedding.' },
            { id: 'whisper-1', name: 'Whisper', capability: 'asr', isDefault: true, costTier: 'standard', description: 'Industry-leading multilingual speech recognition.' },
            { id: 'tts-1', name: 'TTS-1', capability: 'tts', isDefault: true, costTier: 'budget', description: 'Fast text-to-speech for NPC voices.' },
            { id: 'tts-1-hd', name: 'TTS-1 HD', capability: 'tts', isDefault: false, costTier: 'standard', description: 'High-definition voice.' },
            { id: 'sora-2', name: 'Sora 2', capability: 'video', isDefault: true, costTier: 'premium', description: 'Generate immersive scenario videos.' },
        ],
    },
    {
        id: 'anthropic', name: 'Anthropic', logoEmoji: '🟤',
        description: 'Claude models — excellent instruction following and safety.',
        apiKeyUrl: 'https://console.anthropic.com/settings/keys', apiKeyPrefix: 'sk-ant-',
        capabilities: ['llm'],
        models: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', capability: 'llm', isDefault: true, costTier: 'standard', description: 'Best balance of capability and speed.', contextWindow: 200000, supportsStructuredOutput: true },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', capability: 'llm', isDefault: false, costTier: 'budget', description: 'Fast and cost-efficient.', contextWindow: 200000, supportsStructuredOutput: true },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', capability: 'llm', isDefault: false, costTier: 'premium', description: 'Most powerful for nuanced dialogue.', contextWindow: 200000, supportsStructuredOutput: true },
        ],
    },
    {
        id: 'google', name: 'Google AI Studio', logoEmoji: '🔵',
        description: 'Gemini 3 models with Interactions API for agentic sessions, 2M context, and built-in multimodal.',
        apiKeyUrl: 'https://aistudio.google.com/apikey',
        capabilities: ['llm', 'embedding', 'asr', 'tts', 'video'],
        models: [
            { id: 'gemini-3-flash', name: 'Gemini 3 Flash', capability: 'llm', isDefault: true, costTier: 'budget', description: 'Fastest Gemini 3 model — ideal for NPC dialogue.', contextWindow: 1000000, supportsStructuredOutput: true },
            { id: 'gemini-3-pro', name: 'Gemini 3 Pro', capability: 'llm', isDefault: false, costTier: 'standard', description: 'Most capable Gemini 3 model with 2M context.', contextWindow: 2000000, supportsStructuredOutput: true },
            { id: 'text-embedding-005', name: 'Text Embedding 005', capability: 'embedding', isDefault: true, costTier: 'budget', description: 'Latest Google embedding model for semantic memory.' },
            { id: 'google-cloud-speech-v2', name: 'Cloud Speech-to-Text', capability: 'asr', isDefault: true, costTier: 'standard', description: 'Multilingual speech recognition.' },
            { id: 'google-cloud-tts', name: 'Cloud Text-to-Speech', capability: 'tts', isDefault: true, costTier: 'standard', description: 'Natural voices in 40+ languages.' },
            { id: 'veo-3', name: 'Veo 3', capability: 'video', isDefault: true, costTier: 'premium', description: 'Google video generation for immersive scenario content.' },
        ],
    },
    {
        id: 'mistral', name: 'Mistral AI', logoEmoji: '🟠',
        description: 'European AI, strong multilingual performance.',
        apiKeyUrl: 'https://console.mistral.ai/api-keys/',
        capabilities: ['llm', 'embedding'],
        models: [
            { id: 'mistral-large-latest', name: 'Mistral Large', capability: 'llm', isDefault: true, costTier: 'standard', description: 'Excellent multilingual.', contextWindow: 128000, supportsStructuredOutput: true },
            { id: 'mistral-medium-latest', name: 'Mistral Medium', capability: 'llm', isDefault: false, costTier: 'budget', description: 'Balanced.', contextWindow: 32000, supportsStructuredOutput: true },
            { id: 'mistral-embed', name: 'Mistral Embed', capability: 'embedding', isDefault: true, costTier: 'budget', description: 'Mistral embedding.' },
        ],
    },
    {
        id: 'elevenlabs', name: 'ElevenLabs', logoEmoji: '🎙️',
        description: 'Premium voice synthesis — most natural NPC voices.',
        apiKeyUrl: 'https://elevenlabs.io/app/settings/api-keys',
        capabilities: ['tts'],
        models: [
            { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', capability: 'tts', isDefault: true, costTier: 'standard', description: 'Low-latency voice generation.' },
            { id: 'eleven_multilingual_v2', name: 'Multilingual v2', capability: 'tts', isDefault: false, costTier: 'premium', description: 'Highest quality multilingual.' },
        ],
    },
    {
        id: 'meta', name: 'Meta Llama (Self-Hosted)', logoEmoji: '🦙',
        description: 'Open-source Llama — requires GPU infrastructure.',
        apiKeyUrl: 'https://llama.meta.com/', selfHosted: true,
        capabilities: ['llm'],
        models: [
            { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', capability: 'llm', isDefault: true, costTier: 'standard', description: 'Strong open-source model.', contextWindow: 128000 },
            { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', capability: 'llm', isDefault: false, costTier: 'budget', description: 'Lightweight.', contextWindow: 128000 },
        ],
    },
    {
        id: 'deepgram', name: 'Deepgram', logoEmoji: '🔊',
        description: 'Specialized speech platform — fast ASR and TTS.',
        apiKeyUrl: 'https://console.deepgram.com/',
        capabilities: ['asr', 'tts'],
        models: [
            { id: 'nova-2', name: 'Nova-2', capability: 'asr', isDefault: true, costTier: 'standard', description: 'Fast multilingual ASR.' },
            { id: 'aura', name: 'Aura', capability: 'tts', isDefault: true, costTier: 'standard', description: 'Natural text-to-speech.' },
        ],
    },
    {
        id: 'azure', name: 'Azure AI', logoEmoji: '☁️',
        description: 'Enterprise-grade with data residency options.',
        apiKeyUrl: 'https://portal.azure.com/',
        capabilities: ['llm', 'embedding', 'asr', 'tts'],
        models: [
            { id: 'gpt-4o-azure', name: 'GPT-4o (Azure)', capability: 'llm', isDefault: true, costTier: 'standard', description: 'Azure-hosted OpenAI.', contextWindow: 128000, supportsStructuredOutput: true },
            { id: 'ada-002', name: 'Ada-002', capability: 'embedding', isDefault: true, costTier: 'budget', description: 'Azure embedding.' },
            { id: 'azure-speech-stt', name: 'Azure Speech', capability: 'asr', isDefault: true, costTier: 'standard', description: 'Azure speech recognition.' },
            { id: 'azure-speech-tts', name: 'Azure Speech TTS', capability: 'tts', isDefault: true, costTier: 'standard', description: 'Azure text-to-speech.' },
        ],
    },
];
