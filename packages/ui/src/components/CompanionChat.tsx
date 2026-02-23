import React from 'react';

/**
 * Props for the CompanionChat component.
 *
 * @remarks
 * The Companion is the learner's persistent bilingual partner in Tier 1.
 * This component renders the chat interface including L1/L2 code-switching,
 * cultural bridging, and rapport-building interactions.
 */
export interface CompanionChatProps {
    /** Unique session identifier. */
    sessionId: string;
    /** Companion persona configuration from the active schema. */
    companionConfig: {
        personality: string;
        sharedInterests: string[];
        culturalBridge: string;
    };
    /** Current L1/L2 code-switching ratio (0.0 = full L2, 1.0 = full L1). */
    codeSwitchingRatio: number;
    /** Callback when the learner sends a message. */
    onSendMessage: (message: string) => void;
    /** Callback when voice recording is submitted. */
    onVoiceSubmit?: (audioBlob: Blob) => void;
    /** Whether the companion is currently typing/generating. */
    isTyping?: boolean;
}

/**
 * CompanionChat — Tier 1 bilingual companion chat interface.
 *
 * @remarks
 * Renders the persistent companion conversation with:
 * - Text input with L1/L2 toggle
 * - Voice recording button (optional)
 * - Companion avatar and personality expression
 * - Code-switching gradient indicator
 * - Help button to trigger Refraction Interface
 *
 * @example
 * ```tsx
 * <CompanionChat
 *   sessionId="session-123"
 *   companionConfig={{
 *     personality: "Warm, encouraging, shares football passion",
 *     sharedInterests: ["football", "music", "food"],
 *     culturalBridge: "Grew up in São Paulo, now lives in London"
 *   }}
 *   codeSwitchingRatio={0.6}
 *   onSendMessage={(msg) => pipeline.processInput(msg)}
 * />
 * ```
 *
 * @patentCritical — Part of the Code-Switching Gradient mechanism
 */
export const CompanionChat: React.FC<CompanionChatProps> = (_props) => {
    // Implementation pending — stub for vibe-coding extension
    return React.createElement('div', {
        'data-component': 'aapm-companion-chat',
        'data-status': 'stub',
    }, 'CompanionChat — Implementation pending');
};
