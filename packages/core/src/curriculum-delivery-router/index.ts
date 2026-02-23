/**
 * @module curriculum-delivery-router
 * @description Delivery Format Selection for Micro-Curriculum
 *
 * Selects the optimal delivery format (slideshow, video, flashcards, podcast,
 * debrief) based on learner retention profile, session length, and affective state.
 *
 * @see docs/dependency-graph.md — depends on Retention Profile
 * @patentCritical Related to Claim 14 — delivery routing
 */

// ─── Delivery Format Types ────────────────────────────────────────────────────

export type DeliveryFormat =
    | 'slideshow'
    | 'video'
    | 'flashcards'
    | 'podcast'
    | 'debrief';

export type DeliverySelectionStrategy =
    | 'retention_profile'
    | 'session_length'
    | 'affective_state';

// ─── Retention Profile Mapping ────────────────────────────────────────────────

export type RetentionStyle =
    | 'gamified-coercion'
    | 'organic-social'
    | 'professional-urgency'
    | 'intrinsic-mastery'
    | 'social-accountability';

/**
 * Maps retention profiles to their preferred delivery formats.
 * Each profile has a primary preference and a fallback.
 */
export const RETENTION_TO_FORMAT: Record<RetentionStyle, {
    preferred: DeliveryFormat;
    fallback: DeliveryFormat;
}> = {
    'gamified-coercion': { preferred: 'flashcards', fallback: 'slideshow' },
    'organic-social': { preferred: 'debrief', fallback: 'podcast' },
    'professional-urgency': { preferred: 'slideshow', fallback: 'flashcards' },
    'intrinsic-mastery': { preferred: 'video', fallback: 'slideshow' },
    'social-accountability': { preferred: 'debrief', fallback: 'video' },
} as const;

// ─── Session Context for Format Selection ─────────────────────────────────────

export interface DeliveryContext {
    /** Current retention profile */
    retentionStyle: RetentionStyle;
    /** Session duration in minutes so far */
    sessionLengthMinutes: number;
    /** Current affective state level */
    affectiveState: 'low' | 'moderate' | 'elevated' | 'critical';
    /** Explicitly selected format (runtime customization override) */
    overrideFormat?: DeliveryFormat;
    /** Selection strategy */
    strategy: DeliverySelectionStrategy;
}

// ─── Delivery Payload ─────────────────────────────────────────────────────────

export interface DeliveryPayload {
    /** Selected format */
    format: DeliveryFormat;
    /** Why this format was selected */
    selectionReason: string;
    /** Whether an override was applied */
    isOverride: boolean;
    /** Curriculum content items to deliver */
    items: DeliveryItem[];
}

export interface DeliveryItem {
    id: string;
    /** The friction source this item addresses */
    frictionSource: string;
    /** Target form the learner should acquire */
    targetForm: string;
    /** Content rendered in the selected format */
    content: string;
    /** Priority: higher = shown first */
    priority: number;
}

// ─── Format Capability Matrix ─────────────────────────────────────────────────

export interface FormatCapabilities {
    /** Can render L1/L2 comparison */
    supportsContrastiveDisplay: boolean;
    /** Can include audio */
    supportsAudio: boolean;
    /** Can include interactive elements */
    supportsInteraction: boolean;
    /** Minimum items to be useful */
    minimumItems: number;
    /** Maximum items before overload */
    maximumItems: number;
}

export const FORMAT_CAPABILITIES: Record<DeliveryFormat, FormatCapabilities> = {
    slideshow: {
        supportsContrastiveDisplay: true,
        supportsAudio: false,
        supportsInteraction: false,
        minimumItems: 3,
        maximumItems: 10,
    },
    video: {
        supportsContrastiveDisplay: true,
        supportsAudio: true,
        supportsInteraction: false,
        minimumItems: 1,
        maximumItems: 5,
    },
    flashcards: {
        supportsContrastiveDisplay: true,
        supportsAudio: false,
        supportsInteraction: true,
        minimumItems: 5,
        maximumItems: 20,
    },
    podcast: {
        supportsContrastiveDisplay: false,
        supportsAudio: true,
        supportsInteraction: false,
        minimumItems: 3,
        maximumItems: 8,
    },
    debrief: {
        supportsContrastiveDisplay: true,
        supportsAudio: true,
        supportsInteraction: true,
        minimumItems: 1,
        maximumItems: 15,
    },
} as const;
