/**
 * @module multimodal-router
 * @description Input Modality Router — routes text, audio, and visual prompts
 * to appropriate AAPM engine modules.
 *
 * @see docs/multimodal-prompt-guide.md
 * @patentCritical Claim 14 — Schema-Driven Multimodal Prompt-to-Simulation Compilation
 */

// ─── Input Modality Types ─────────────────────────────────────────────────────

export type InputModality = 'text' | 'audio' | 'visual';

export interface ModalityConfig {
    text: TextModalityConfig;
    audio: AudioModalityConfig;
    visual: VisualModalityConfig;
}

export interface TextModalityConfig {
    enabled: boolean;
    /** Which language input defaults to */
    defaultLanguage: 'L1' | 'L2';
}

export interface AudioModalityConfig {
    enabled: boolean;
    /** ASR / phoneme alignment backend */
    phonemeEngine: 'wav2vec2' | 'azure-speech' | 'whisper' | 'deepgram';
    /** Fallback when audio is unavailable */
    fallback: 'text-only';
}

export interface VisualModalityConfig {
    enabled: boolean;
    /** Format for scene descriptors */
    sceneDescriptorFormat: 'json' | 'yaml' | 'natural-language';
    /** Fallback when visual is unavailable */
    fallback: 'text-description';
}

// ─── Prompt Reference Types ───────────────────────────────────────────────────

/** Written prompt input — specifies domain, learner profile, scenarios */
export interface WrittenPrompt {
    modality: 'text';
    domain: string;
    learnerProfile: {
        nativeLanguage: string;
        targetLanguage: string;
        age?: number;
        background?: string;
    };
    keyScenarios: string[];
    vocabularyPriorities: string[];
    culturalChallenges?: string[];
}

/** Visual prompt input — specifies scene layout, aesthetics, location graph */
export interface VisualPrompt {
    modality: 'visual';
    locationDescriptions: Array<{
        name: string;
        layout: string;
        connections: string[];
        aesthetic: string;
    }>;
    npcAppearanceCues: Array<{
        name: string;
        description: string;
    }>;
    uiColorScheme?: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
    };
}

/** Audio prompt input — specifies phonemes, prosody, accent reference */
export interface AudioPrompt {
    modality: 'audio';
    targetPhonemes: string[];
    prosodyStyle: string;
    accentReference: string;
    culturalVocalNorms?: string;
    pronunciationPriorities: string[];
}

export type MultimodalPrompt = WrittenPrompt | VisualPrompt | AudioPrompt;

// ─── Router Output Types ──────────────────────────────────────────────────────

export interface ModalityRoutingResult {
    /** Schema fields populated by this prompt */
    schemaFieldsMapped: string[];
    /** Modules that should be activated */
    activatedModules: string[];
    /** Any fallbacks that were triggered */
    fallbacksTriggered: string[];
}

// ─── Schema Field Mapping ─────────────────────────────────────────────────────

/** Maps prompt types to the schema sections they populate */
export const PROMPT_TO_SCHEMA_MAPPING: Record<InputModality, string[]> = {
    text: [
        'persona.learner_profile',
        'persona.vocabulary_matrix',
        'persona.environment',
        'persona.companion',
        'persona.evaluation',
    ],
    visual: [
        'world_state.location_graph',
        'world_state.ambient_events',
        'persona.environment.locations',
        'character_control',
    ],
    audio: [
        'input_modalities.audio',
        'persona.retention_profile',
    ],
} as const;
