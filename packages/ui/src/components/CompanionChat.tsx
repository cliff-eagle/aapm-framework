import React, { useState, useRef, useCallback } from 'react';

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
    /** Chat message history to render. */
    messages?: ChatMessage[];
    /** Callback when the learner requests a refraction (help). */
    onRequestRefraction?: (messageId: string) => void;
}

/**
 * A single message in the chat thread.
 */
export interface ChatMessage {
    /** Unique message identifier. */
    id: string;
    /** Who sent this message. */
    sender: 'learner' | 'companion';
    /** Message text content. */
    text: string;
    /** ISO 8601 timestamp. */
    timestamp: string;
    /** Language used in this message. */
    language: 'L1' | 'L2' | 'mixed';
    /** If the companion detected friction in this learner message. */
    frictionDetected?: boolean;
}

/**
 * CompanionChat — Tier 1 bilingual companion chat interface.
 *
 * @remarks
 * Renders the persistent companion conversation with:
 * - Message list with L1/L2 language indicators
 * - Text input with send button
 * - Code-switching gradient indicator bar
 * - Typing indicator when companion is generating
 * - Voice recording button (when onVoiceSubmit provided)
 * - Help button per message to trigger Refraction Interface
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
 *   messages={chatHistory}
 * />
 * ```
 *
 * @patentCritical — Part of the Code-Switching Gradient mechanism
 */
export const CompanionChat: React.FC<CompanionChatProps> = (props) => {
    const {
        sessionId,
        companionConfig,
        codeSwitchingRatio,
        onSendMessage,
        onVoiceSubmit,
        isTyping = false,
        messages = [],
        onRequestRefraction,
    } = props;

    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    // Scroll to bottom when messages change
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    React.useEffect(() => {
        scrollToBottom();
    }, [messages.length, scrollToBottom]);

    // ── Send Message Handler ─────────────────────────────────

    const handleSend = useCallback(() => {
        const trimmed = inputText.trim();
        if (!trimmed) return;
        onSendMessage(trimmed);
        setInputText('');
    }, [inputText, onSendMessage]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    // ── Voice Recording Handler ──────────────────────────────

    const startRecording = useCallback(async () => {
        if (!onVoiceSubmit) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                onVoiceSubmit(blob);
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
        } catch {
            // Microphone access denied — fail silently
        }
    }, [onVoiceSubmit]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    }, []);

    // ── Computed Values ──────────────────────────────────────

    const l2Percentage = Math.round((1 - codeSwitchingRatio) * 100);
    const gradientColor = `linear-gradient(90deg, #3b82f6 ${l2Percentage}%, #94a3b8 ${l2Percentage}%)`;

    // ── Render ───────────────────────────────────────────────

    return React.createElement('div', {
        'data-component': 'aapm-companion-chat',
        'data-session-id': sessionId,
        style: {
            display: 'flex',
            flexDirection: 'column' as const,
            height: '100%',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            overflow: 'hidden',
        },
    },
        // Header — Companion info + code-switching gradient
        React.createElement('header', {
            style: {
                padding: '12px 16px',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
            },
        },
            React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
            },
                // Avatar circle
                React.createElement('div', {
                    style: {
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                    },
                }, '🗣'),

                React.createElement('div', { style: { flex: 1 } },
                    React.createElement('div', {
                        style: { fontWeight: 600, fontSize: '14px' },
                    }, 'Companion'),
                    React.createElement('div', {
                        style: { fontSize: '12px', color: '#94a3b8' },
                    }, companionConfig.personality.slice(0, 50)),
                ),
            ),

            // Code-switching gradient bar
            React.createElement('div', {
                'data-testid': 'code-switch-gradient',
                title: `${l2Percentage}% L2`,
                style: {
                    height: '4px',
                    borderRadius: '2px',
                    background: gradientColor,
                },
            }),

            React.createElement('div', {
                style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#94a3b8' },
            },
                React.createElement('span', null, 'L2'),
                React.createElement('span', null, `${l2Percentage}%`),
                React.createElement('span', null, 'L1'),
            ),
        ),

        // Message List
        React.createElement('div', {
            'data-testid': 'message-list',
            style: {
                flex: 1,
                overflowY: 'auto' as const,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column' as const,
                gap: '12px',
            },
        },
            ...messages.map(msg =>
                React.createElement('div', {
                    key: msg.id,
                    'data-message-id': msg.id,
                    'data-sender': msg.sender,
                    style: {
                        display: 'flex',
                        flexDirection: 'column' as const,
                        alignItems: msg.sender === 'learner' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        alignSelf: msg.sender === 'learner' ? 'flex-end' : 'flex-start',
                    },
                },
                    // Message bubble
                    React.createElement('div', {
                        style: {
                            padding: '10px 14px',
                            borderRadius: msg.sender === 'learner' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            backgroundColor: msg.sender === 'learner' ? '#3b82f6' : '#e2e8f0',
                            color: msg.sender === 'learner' ? '#ffffff' : '#1e293b',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            position: 'relative' as const,
                            border: msg.frictionDetected ? '2px solid #f59e0b' : 'none',
                        },
                    }, msg.text),

                    // Language tag + help button
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '4px',
                            fontSize: '11px',
                            color: '#94a3b8',
                        },
                    },
                        // Language indicator
                        React.createElement('span', {
                            style: {
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: msg.language === 'L2' ? '#dbeafe' : msg.language === 'mixed' ? '#fef3c7' : '#f1f5f9',
                                color: msg.language === 'L2' ? '#1d4ed8' : msg.language === 'mixed' ? '#92400e' : '#64748b',
                                fontSize: '10px',
                                fontWeight: 600,
                            },
                        }, msg.language),

                        // Friction indicator
                        msg.frictionDetected ? React.createElement('span', {
                            title: 'Friction detected',
                            style: { fontSize: '12px' },
                        }, '⚡') : null,

                        // Help/Refraction button
                        msg.sender === 'learner' && onRequestRefraction
                            ? React.createElement('button', {
                                onClick: () => onRequestRefraction(msg.id),
                                title: 'Show alternative formulations',
                                style: {
                                    background: 'none',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px',
                                    padding: '1px 6px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    color: '#64748b',
                                },
                            }, '💡 Help')
                            : null,
                    ),
                ),
            ),

            // Typing indicator
            isTyping ? React.createElement('div', {
                'data-testid': 'typing-indicator',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 14px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '16px',
                    alignSelf: 'flex-start',
                    maxWidth: '80px',
                },
            },
                React.createElement('span', { style: { animation: 'pulse 1.4s infinite', fontSize: '16px' } }, '•'),
                React.createElement('span', { style: { animation: 'pulse 1.4s infinite 0.2s', fontSize: '16px' } }, '•'),
                React.createElement('span', { style: { animation: 'pulse 1.4s infinite 0.4s', fontSize: '16px' } }, '•'),
            ) : null,

            // Scroll anchor
            React.createElement('div', { ref: messagesEndRef }),
        ),

        // Input Area
        React.createElement('div', {
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
            },
        },
            // Voice button (if supported)
            onVoiceSubmit ? React.createElement('button', {
                'data-testid': 'voice-button',
                onClick: isRecording ? stopRecording : startRecording,
                title: isRecording ? 'Stop recording' : 'Record voice',
                style: {
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: isRecording ? '#ef4444' : '#f1f5f9',
                    color: isRecording ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                },
            }, isRecording ? '⏹' : '🎤') : null,

            // Text input
            React.createElement('textarea', {
                'data-testid': 'message-input',
                value: inputText,
                onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value),
                onKeyDown: handleKeyDown,
                placeholder: 'Type a message...',
                rows: 1,
                style: {
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    resize: 'none' as const,
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    lineHeight: '1.4',
                },
            }),

            // Send button
            React.createElement('button', {
                'data-testid': 'send-button',
                onClick: handleSend,
                disabled: !inputText.trim(),
                title: 'Send message',
                style: {
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: inputText.trim() ? '#3b82f6' : '#e2e8f0',
                    color: inputText.trim() ? '#ffffff' : '#94a3b8',
                    cursor: inputText.trim() ? 'pointer' : 'default',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                },
            }, '➤'),
        ),
    );
};
