/**
 * @module ai-providers/types
 * @description AI Provider configuration types and provider catalog.
 *
 * The AAPM framework is provider-agnostic. Users select their preferred
 * AI provider(s) during onboarding and configure them via settings.
 * One API key per provider unlocks all that provider's capabilities.
 *
 * PROVIDER UX PRINCIPLE: The user never selects individual models for
 * individual subsystems. They select a provider, input a key, and the
 * system maps provider → capabilities → default models automatically.
 *
 * @see docs/model-substitution.md — Provider compatibility matrix
 * @see docs/deployment-architecture.md — Cost control architecture
 */

// ─── Capability Types ────────────────────────────────────────────────────────

/**
 * AI capabilities required by the AAPM framework.
 *
 * Each subsystem requires one or more of these capabilities:
 * - llm: Text generation for NPC dialogue, friction extraction, curriculum
 * - embedding: Vector embeddings for semantic memory, pattern matching
 * - asr: Automatic Speech Recognition for voice input
 * - tts: Text-to-Speech for NPC voice output
 * - video: Video generation for immersive scenario content
 */
export type AICapability = 'llm' | 'embedding' | 'asr' | 'tts' | 'video';

// ─── Model Types ─────────────────────────────────────────────────────────────

/**
 * A selectable model within a provider for a specific capability.
 */
export interface AIModelOption {
    /** Model identifier used in API calls. */
    id: string;

    /** Human-readable display name. */
    name: string;

    /** Which capability this model serves. */
    capability: AICapability;

    /** Whether this is the default model for this capability. */
    isDefault: boolean;

    /** Cost tier: budget, standard, or premium. */
    costTier: 'budget' | 'standard' | 'premium';

    /** Brief description of this model's strengths. */
    description: string;

    /** Minimum context window in tokens (for LLMs). */
    contextWindow?: number;

    /** Whether this model supports structured JSON output (for LLMs). */
    supportsStructuredOutput?: boolean;
}

// ─── Provider Types ──────────────────────────────────────────────────────────

/**
 * A provider entry in the provider catalog.
 *
 * This defines what a single AI provider offers — its available
 * capabilities, models, and configuration metadata.
 */
export interface AIProviderDefinition {
    /** Unique provider identifier (e.g., 'openai', 'anthropic'). */
    id: AIProviderId;

    /** Display name (e.g., 'OpenAI'). */
    name: string;

    /** Provider description for onboarding UI. */
    description: string;

    /** URL to the provider's API key generation page. */
    apiKeyUrl: string;

    /** Prefix used to validate API keys (e.g., 'sk-' for OpenAI). */
    apiKeyPrefix?: string;

    /** Which capabilities this provider supports. */
    capabilities: AICapability[];

    /** Available models grouped by capability. */
    models: AIModelOption[];

    /** Logo emoji for display (until real logos are available). */
    logoEmoji: string;

    /** Whether this provider requires self-hosting. */
    selfHosted?: boolean;
}

/**
 * Known AI provider identifiers.
 */
export type AIProviderId =
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'mistral'
    | 'elevenlabs'
    | 'meta'
    | 'deepgram'
    | 'azure';

// ─── User Configuration Types ────────────────────────────────────────────────

/**
 * A single configured provider with the user's API key and model selections.
 */
export interface AIProviderEntry {
    /** Which provider this entry configures. */
    providerId: AIProviderId;

    /** The user's API key (stored encrypted at rest). */
    apiKey: string;

    /** Whether this key has been validated (test connection). */
    keyValidated: boolean;

    /** Timestamp of last successful validation. */
    lastValidatedAt?: string;

    /** User's selected model for each capability this provider serves. */
    selectedModels: Partial<Record<AICapability, string>>;

    /** Whether this provider is active (user can disable without deleting). */
    enabled: boolean;
}

/**
 * Complete AI provider configuration for a learner.
 *
 * Stored in `LearnerProfile.aiProviderConfig`.
 * Multiple providers can be configured simultaneously
 * to cover different capabilities.
 */
export interface AIProviderConfig {
    /** Configured provider entries (one per provider). */
    providers: AIProviderEntry[];

    /**
     * Which provider to use for each capability.
     * Maps capability → providerId.
     * This is the resolved routing table.
     */
    capabilityRouting: Partial<Record<AICapability, AIProviderId>>;

    /** When this configuration was last modified. */
    lastModifiedAt: string;

    /** Whether the configuration covers minimum requirements (LLM + embedding). */
    isComplete: boolean;
}

// ─── Provider Catalog ────────────────────────────────────────────────────────

/**
 * Complete catalog of supported AI providers.
 *
 * This is the source of truth for the onboarding wizard and settings UI.
 * Each entry defines what the provider offers and which models are available.
 */
export const AI_PROVIDER_CATALOG: readonly AIProviderDefinition[] = [
    // ── OpenAI ───────────────────────────────────────────────
    {
        id: 'openai',
        name: 'OpenAI',
        description: 'ChatGPT, Whisper, Sora 2, DALL·E — the most comprehensive single-key provider.',
        apiKeyUrl: 'https://platform.openai.com/api-keys',
        apiKeyPrefix: 'sk-',
        logoEmoji: '🟢',
        capabilities: ['llm', 'embedding', 'asr', 'tts', 'video'],
        models: [
            // LLM
            { id: 'gpt-4o', name: 'GPT-4o', capability: 'llm', isDefault: true, costTier: 'standard', description: 'Most capable, best for NPC dialogue and friction analysis.', contextWindow: 128000, supportsStructuredOutput: true },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', capability: 'llm', isDefault: false, costTier: 'budget', description: 'Cost-optimized, good for curriculum generation.', contextWindow: 128000, supportsStructuredOutput: true },
            { id: 'o1', name: 'o1', capability: 'llm', isDefault: false, costTier: 'premium', description: 'Advanced reasoning model for complex pattern analysis.', contextWindow: 200000, supportsStructuredOutput: true },
            { id: 'o3-mini', name: 'o3-mini', capability: 'llm', isDefault: false, costTier: 'standard', description: 'Reasoning model, cost-efficient for structured tasks.', contextWindow: 200000, supportsStructuredOutput: true },
            // Embedding
            { id: 'text-embedding-3-small', name: 'Embedding 3 Small', capability: 'embedding', isDefault: true, costTier: 'budget', description: 'Fast, cost-efficient embedding for semantic memory.' },
            { id: 'text-embedding-3-large', name: 'Embedding 3 Large', capability: 'embedding', isDefault: false, costTier: 'standard', description: 'Higher accuracy embedding for precise pattern matching.' },
            // ASR
            { id: 'whisper-1', name: 'Whisper', capability: 'asr', isDefault: true, costTier: 'standard', description: 'Industry-leading multilingual speech recognition.' },
            // TTS
            { id: 'tts-1', name: 'TTS-1', capability: 'tts', isDefault: true, costTier: 'budget', description: 'Fast text-to-speech for NPC voice responses.' },
            { id: 'tts-1-hd', name: 'TTS-1 HD', capability: 'tts', isDefault: false, costTier: 'standard', description: 'High-definition voice with more natural prosody.' },
            // Video
            { id: 'sora-2', name: 'Sora 2', capability: 'video', isDefault: true, costTier: 'premium', description: 'Generate immersive scenario videos for Tier 2/3 environments.' },
        ],
    },

    // ── Anthropic ────────────────────────────────────────────
    {
        id: 'anthropic',
        name: 'Anthropic',
        description: 'Claude models — excellent instruction following and safety alignment.',
        apiKeyUrl: 'https://console.anthropic.com/settings/keys',
        apiKeyPrefix: 'sk-ant-',
        logoEmoji: '🟤',
        capabilities: ['llm'],
        models: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', capability: 'llm', isDefault: true, costTier: 'standard', description: 'Best balance of capability and speed.', contextWindow: 200000, supportsStructuredOutput: true },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', capability: 'llm', isDefault: false, costTier: 'budget', description: 'Fast and cost-efficient for repetitive tasks.', contextWindow: 200000, supportsStructuredOutput: true },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', capability: 'llm', isDefault: false, costTier: 'premium', description: 'Most powerful Claude model for nuanced dialogue.', contextWindow: 200000, supportsStructuredOutput: true },
        ],
    },

    // ── Google ───────────────────────────────────────────────
    {
        id: 'google',
        name: 'Google AI',
        description: 'Gemini models with built-in multimodal capabilities and long context.',
        apiKeyUrl: 'https://aistudio.google.com/apikey',
        logoEmoji: '🔵',
        capabilities: ['llm', 'embedding', 'asr', 'tts', 'video'],
        models: [
            // LLM
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', capability: 'llm', isDefault: true, costTier: 'budget', description: 'Fastest Gemini model, excellent cost-efficiency.', contextWindow: 1000000, supportsStructuredOutput: true },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', capability: 'llm', isDefault: false, costTier: 'standard', description: 'Most capable Gemini with 1M context window.', contextWindow: 2000000, supportsStructuredOutput: true },
            // Embedding
            { id: 'text-embedding-004', name: 'Gecko Embedding', capability: 'embedding', isDefault: true, costTier: 'budget', description: 'Google embedding model for semantic search.' },
            // ASR
            { id: 'google-cloud-speech-v2', name: 'Cloud Speech-to-Text', capability: 'asr', isDefault: true, costTier: 'standard', description: 'Google Cloud multilingual speech recognition.' },
            // TTS
            { id: 'google-cloud-tts', name: 'Cloud Text-to-Speech', capability: 'tts', isDefault: true, costTier: 'standard', description: 'Natural-sounding voices in 40+ languages.' },
            // Video
            { id: 'veo-2', name: 'Veo 2', capability: 'video', isDefault: true, costTier: 'premium', description: 'Google video generation for scenario content.' },
        ],
    },

    // ── Mistral ──────────────────────────────────────────────
    {
        id: 'mistral',
        name: 'Mistral AI',
        description: 'European AI provider with strong multilingual performance.',
        apiKeyUrl: 'https://console.mistral.ai/api-keys/',
        logoEmoji: '🟠',
        capabilities: ['llm', 'embedding'],
        models: [
            { id: 'mistral-large-latest', name: 'Mistral Large', capability: 'llm', isDefault: true, costTier: 'standard', description: 'Most capable Mistral model with excellent multilingual.', contextWindow: 128000, supportsStructuredOutput: true },
            { id: 'mistral-medium-latest', name: 'Mistral Medium', capability: 'llm', isDefault: false, costTier: 'budget', description: 'Balanced capability and cost.', contextWindow: 32000, supportsStructuredOutput: true },
            { id: 'mistral-embed', name: 'Mistral Embed', capability: 'embedding', isDefault: true, costTier: 'budget', description: 'Mistral embedding model.' },
        ],
    },

    // ── ElevenLabs ───────────────────────────────────────────
    {
        id: 'elevenlabs',
        name: 'ElevenLabs',
        description: 'Premium voice synthesis — the most natural-sounding NPC voices.',
        apiKeyUrl: 'https://elevenlabs.io/app/settings/api-keys',
        logoEmoji: '🎙️',
        capabilities: ['tts'],
        models: [
            { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', capability: 'tts', isDefault: true, costTier: 'standard', description: 'Low-latency voice generation for real-time dialogue.' },
            { id: 'eleven_multilingual_v2', name: 'Multilingual v2', capability: 'tts', isDefault: false, costTier: 'premium', description: 'Highest quality multilingual voice with natural accents.' },
        ],
    },

    // ── Meta (Self-Hosted) ───────────────────────────────────
    {
        id: 'meta',
        name: 'Meta Llama (Self-Hosted)',
        description: 'Open-source Llama models — requires your own GPU infrastructure.',
        apiKeyUrl: 'https://llama.meta.com/',
        logoEmoji: '🦙',
        capabilities: ['llm'],
        selfHosted: true,
        models: [
            { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', capability: 'llm', isDefault: true, costTier: 'standard', description: 'Strong open-source model for NPC dialogue.', contextWindow: 128000, supportsStructuredOutput: false },
            { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', capability: 'llm', isDefault: false, costTier: 'budget', description: 'Lightweight open-source model.', contextWindow: 128000, supportsStructuredOutput: false },
        ],
    },

    // ── Deepgram ─────────────────────────────────────────────
    {
        id: 'deepgram',
        name: 'Deepgram',
        description: 'Specialized speech platform — fast ASR and natural TTS.',
        apiKeyUrl: 'https://console.deepgram.com/',
        logoEmoji: '🔊',
        capabilities: ['asr', 'tts'],
        models: [
            { id: 'nova-2', name: 'Nova-2', capability: 'asr', isDefault: true, costTier: 'standard', description: 'Fast, accurate multilingual ASR with real-time streaming.' },
            { id: 'aura', name: 'Aura', capability: 'tts', isDefault: true, costTier: 'standard', description: 'Natural-sounding text-to-speech voices.' },
        ],
    },

    // ── Azure ────────────────────────────────────────────────
    {
        id: 'azure',
        name: 'Azure AI',
        description: 'Microsoft Azure — enterprise-grade with data residency options.',
        apiKeyUrl: 'https://portal.azure.com/',
        logoEmoji: '☁️',
        capabilities: ['llm', 'embedding', 'asr', 'tts'],
        models: [
            { id: 'gpt-4o-azure', name: 'GPT-4o (Azure)', capability: 'llm', isDefault: true, costTier: 'standard', description: 'OpenAI models hosted on Azure with enterprise compliance.', contextWindow: 128000, supportsStructuredOutput: true },
            { id: 'ada-002', name: 'Ada-002', capability: 'embedding', isDefault: true, costTier: 'budget', description: 'Azure-hosted embedding model.' },
            { id: 'azure-speech-stt', name: 'Azure Speech', capability: 'asr', isDefault: true, costTier: 'standard', description: 'Azure Speech Services speech recognition.' },
            { id: 'azure-speech-tts', name: 'Azure Speech TTS', capability: 'tts', isDefault: true, costTier: 'standard', description: 'Azure Speech Services text-to-speech.' },
        ],
    },
] as const;

// ─── Required Capabilities ───────────────────────────────────────────────────

/**
 * Minimum capabilities required for the AAPM framework to function.
 *
 * LLM + embedding are absolute requirements. ASR, TTS, and video are
 * optional and gracefully degrade when not configured.
 */
export const REQUIRED_CAPABILITIES: readonly AICapability[] = ['llm', 'embedding'];

/**
 * Optional capabilities that enhance the experience but aren't required.
 */
export const OPTIONAL_CAPABILITIES: readonly AICapability[] = ['asr', 'tts', 'video'];

/**
 * Human-readable labels for each capability.
 */
export const CAPABILITY_LABELS: Record<AICapability, { name: string; description: string; icon: string }> = {
    llm: { name: 'Language Model', description: 'Powers NPC dialogue, friction analysis, and curriculum generation.', icon: '🧠' },
    embedding: { name: 'Embeddings', description: 'Semantic memory for NPC relationships and pattern matching.', icon: '📐' },
    asr: { name: 'Speech Recognition', description: 'Voice input — speak to NPCs instead of typing.', icon: '🎤' },
    tts: { name: 'Text-to-Speech', description: 'Hear NPCs speak with natural voices.', icon: '🔈' },
    video: { name: 'Video Generation', description: 'Generate immersive scenario videos for environments.', icon: '🎬' },
};
