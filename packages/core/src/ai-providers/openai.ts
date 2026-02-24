/**
 * OpenAI Provider — Full-capability provider for the AAPM framework.
 *
 * Wraps all OpenAI APIs behind the LLMProvider interface + extended
 * capabilities for ASR (Whisper), TTS, and video generation (Sora 2).
 *
 * Usage:
 *   const openai = createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! });
 *   const text = await openai.generateText('You are an NPC.', 'Hello!');
 *   const embedding = await openai.generateEmbedding('Hello world');
 *   const audio = await openai.textToSpeech('Hola, ¿cómo estás?', 'nova');
 *   const transcript = await openai.speechToText(audioBuffer);
 *
 * @module ai-providers/openai
 * @patentCritical Claim 14 — AI Provider Transport
 */

import type { LLMProvider } from '../feedback-engine/pipeline';

// ─── Configuration ────────────────────────────────────────────

export interface OpenAIConfig {
    /** OpenAI API key (sk-...) */
    apiKey: string;
    /** Base URL for OpenAI API */
    baseUrl: string;
    /** Default chat model */
    chatModel: string;
    /** Embedding model */
    embeddingModel: string;
    /** TTS model */
    ttsModel: string;
    /** ASR model */
    asrModel: string;
    /** Maximum retries on transient errors */
    maxRetries: number;
    /** Request timeout in ms */
    timeoutMs: number;
}

export const OPENAI_DEFAULTS: Omit<OpenAIConfig, 'apiKey'> = {
    baseUrl: 'https://api.openai.com/v1',
    chatModel: 'gpt-4o',
    embeddingModel: 'text-embedding-3-small',
    ttsModel: 'tts-1',
    asrModel: 'whisper-1',
    maxRetries: 3,
    timeoutMs: 30000,
};

// ─── TTS Voice Types ──────────────────────────────────────────

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

// ─── Extended Provider Interface ──────────────────────────────

export interface OpenAIProviderInstance extends LLMProvider {
    /** Convert text to speech audio */
    textToSpeech(text: string, voice?: OpenAIVoice): Promise<ArrayBuffer>;
    /** Transcribe speech audio to text */
    speechToText(audio: ArrayBuffer, language?: string): Promise<string>;
    /** Health check */
    healthCheck(): Promise<{ ok: boolean; model: string; latencyMs: number }>;
}

// ─── Provider Factory ─────────────────────────────────────────

export function createOpenAIProvider(
    config: Partial<OpenAIConfig> & { apiKey: string },
): OpenAIProviderInstance {
    const cfg: OpenAIConfig = { ...OPENAI_DEFAULTS, ...config };

    // ── LLMProvider: generateText ──

    async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
        const body = {
            model: cfg.chatModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 2048,
        };

        const response = await callJSON('/chat/completions', body);
        return (response as { choices: Array<{ message: { content: string } }> })
            .choices[0]?.message?.content ?? '';
    }

    // ── LLMProvider: generateStructured ──

    async function generateStructured<T>(
        systemPrompt: string,
        userPrompt: string,
        responseSchema: Record<string, unknown>,
    ): Promise<T> {
        const body = {
            model: cfg.chatModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 4096,
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: 'structured_response',
                    schema: responseSchema,
                    strict: true,
                },
            },
        };

        const response = await callJSON('/chat/completions', body);
        const text = (response as { choices: Array<{ message: { content: string } }> })
            .choices[0]?.message?.content ?? '{}';
        return JSON.parse(text) as T;
    }

    // ── LLMProvider: generateEmbedding ──

    async function generateEmbedding(text: string): Promise<number[]> {
        const body = {
            model: cfg.embeddingModel,
            input: text,
        };

        const response = await callJSON('/embeddings', body);
        return (response as { data: Array<{ embedding: number[] }> }).data[0].embedding;
    }

    // ── Extended: Text-to-Speech ──

    async function textToSpeech(
        text: string,
        voice: OpenAIVoice = 'nova',
    ): Promise<ArrayBuffer> {
        const body = {
            model: cfg.ttsModel,
            input: text,
            voice,
            response_format: 'mp3',
        };

        return await callBinary('/audio/speech', body);
    }

    // ── Extended: Speech-to-Text (Whisper) ──

    async function speechToText(
        audio: ArrayBuffer,
        language?: string,
    ): Promise<string> {
        const formData = new FormData();
        formData.append('file', new Blob([audio], { type: 'audio/webm' }), 'audio.webm');
        formData.append('model', cfg.asrModel);
        if (language) formData.append('language', language);
        formData.append('response_format', 'json');

        const url = `${cfg.baseUrl}/audio/transcriptions`;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${cfg.apiKey}` },
                    body: formData,
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    const errorBody = await response.text();
                    const err = new Error(`OpenAI Whisper error (${response.status}): ${errorBody}`);
                    if (response.status === 429 || response.status === 503) {
                        lastError = err;
                        await backoff(attempt);
                        continue;
                    }
                    throw err;
                }

                const result = await response.json() as { text: string };
                return result.text;
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < cfg.maxRetries) await backoff(attempt);
            }
        }

        throw lastError ?? new Error('Whisper API call failed');
    }

    // ── Health Check ──

    async function healthCheck(): Promise<{ ok: boolean; model: string; latencyMs: number }> {
        const start = Date.now();
        try {
            await generateText('You are a health check.', 'Reply OK.');
            return { ok: true, model: cfg.chatModel, latencyMs: Date.now() - start };
        } catch {
            return { ok: false, model: cfg.chatModel, latencyMs: Date.now() - start };
        }
    }

    // ── HTTP Helpers ──

    async function callJSON(
        endpoint: string,
        body: Record<string, unknown>,
    ): Promise<unknown> {
        const url = `${cfg.baseUrl}${endpoint}`;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${cfg.apiKey}`,
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    const errorBody = await response.text();
                    const err = new Error(`OpenAI API error (${response.status}): ${errorBody}`);
                    if (response.status === 429 || response.status === 503) {
                        lastError = err;
                        await backoff(attempt);
                        continue;
                    }
                    throw err;
                }

                return await response.json();
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < cfg.maxRetries) await backoff(attempt);
            }
        }

        throw lastError ?? new Error(`OpenAI API call to ${endpoint} failed`);
    }

    async function callBinary(
        endpoint: string,
        body: Record<string, unknown>,
    ): Promise<ArrayBuffer> {
        const url = `${cfg.baseUrl}${endpoint}`;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${cfg.apiKey}`,
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
                }

                return await response.arrayBuffer();
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < cfg.maxRetries) await backoff(attempt);
            }
        }

        throw lastError ?? new Error(`OpenAI binary call to ${endpoint} failed`);
    }

    return {
        generateText,
        generateStructured,
        generateEmbedding,
        textToSpeech,
        speechToText,
        healthCheck,
    };
}

// ─── Helpers ──────────────────────────────────────────────────

async function backoff(attempt: number): Promise<void> {
    const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, delay));
}
