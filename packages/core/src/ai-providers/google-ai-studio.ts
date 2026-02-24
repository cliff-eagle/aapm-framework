/**
 * Google AI Studio Provider — Implements LLMProvider via the Interactions API.
 *
 * Architecture:
 *   ┌────────────────────────────────────┐
 *   │         AgentToolkit               │
 *   │  generate_text / generate_structured│
 *   └──────────────┬─────────────────────┘
 *                  │
 *   ┌──────────────▼─────────────────────┐
 *   │     GoogleAIStudioProvider          │
 *   │  • Implements LLMProvider           │
 *   │  • Manages Interactions sessions    │
 *   │  • Handles MCP tool calls           │
 *   │  • Server-side state management     │
 *   └──────────────┬─────────────────────┘
 *                  │ HTTPS
 *   ┌──────────────▼─────────────────────┐
 *   │   Google AI Studio Interactions API │
 *   │  • Gemini 3 Pro / Flash            │
 *   │  • Agentic context management      │
 *   │  • Background execution            │
 *   └────────────────────────────────────┘
 *
 * Key features:
 *   - Implements the same LLMProvider interface as all other providers
 *   - Adds Interactions API session management for stateful agent conversations
 *   - Supports Gemini 3 Pro (premium) and Gemini 3 Flash (standard)
 *   - MCP-compatible tool calling for agent actions
 *   - Server-side state management (offloads context from client)
 *   - Background execution for long-running agent reasoning
 *
 * @module ai-providers/google-ai-studio
 * @patentCritical Claim 14 — Agent LLM Transport
 */

import type { LLMProvider } from '../feedback-engine/pipeline';

// ─── Configuration ────────────────────────────────────────────

export interface GoogleAIStudioConfig {
    /** Google AI Studio API key */
    apiKey: string;
    /** Base URL for the Google AI Studio API */
    baseUrl: string;
    /** Default model for text generation */
    defaultModel: string;
    /** Model for embedding generation */
    embeddingModel: string;
    /** Enable the Interactions API for stateful sessions */
    enableInteractions: boolean;
    /** Enable server-side state management (reduces token usage) */
    enableServerState: boolean;
    /** Maximum retries on transient errors */
    maxRetries: number;
    /** Request timeout in milliseconds */
    timeoutMs: number;
    /** Safety settings threshold */
    safetyThreshold: 'BLOCK_NONE' | 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_HIGH';
}

export const DEFAULT_CONFIG: Omit<GoogleAIStudioConfig, 'apiKey'> = {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-3-flash',
    embeddingModel: 'text-embedding-005',
    enableInteractions: true,
    enableServerState: true,
    maxRetries: 3,
    timeoutMs: 30000,
    safetyThreshold: 'BLOCK_MEDIUM_AND_ABOVE',
};

// ─── Interactions API Types ───────────────────────────────────

/**
 * An Interactions session maintains server-side conversation state.
 * This allows agents to have multi-turn conversations without
 * re-sending the full context on every request.
 */
export interface InteractionSession {
    /** Session ID assigned by the Interactions API */
    sessionId: string;
    /** Agent ID this session belongs to */
    agentId: string;
    /** When this session was created */
    createdAt: number;
    /** Last activity timestamp */
    lastActiveAt: number;
    /** Number of turns in this session */
    turnCount: number;
    /** Whether server-side state is enabled */
    serverManaged: boolean;
}

/**
 * An Interaction turn — a single request/response within a session.
 */
export interface InteractionTurn {
    /** Turn index within the session */
    index: number;
    /** User content (prompt) */
    userContent: string;
    /** System instructions */
    systemInstruction?: string;
    /** Model response */
    modelResponse?: string;
    /** Tool calls the model wants to make */
    toolCalls?: ToolCall[];
    /** Tool results to feed back */
    toolResults?: ToolResult[];
    /** Whether this turn is still being processed (background execution) */
    pending: boolean;
    /** Timestamp */
    timestamp: number;
}

export interface ToolCall {
    /** Tool call ID for matching to results */
    id: string;
    /** Function name */
    name: string;
    /** Function arguments (JSON) */
    args: Record<string, unknown>;
}

export interface ToolResult {
    /** Matching tool call ID */
    callId: string;
    /** Result content */
    content: string;
    /** Whether the tool call succeeded */
    success: boolean;
}

/**
 * MCP-compatible tool declaration for the Interactions API.
 */
export interface MCPToolDeclaration {
    /** Tool name */
    name: string;
    /** Tool description (used by the model to decide when to call) */
    description: string;
    /** Parameter schema (JSON Schema) */
    parameters: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}

// ─── Provider Implementation ──────────────────────────────────

/**
 * The full Google AI Studio provider interface.
 * Extends LLMProvider with Interactions API capabilities.
 */
export interface GoogleAIStudioProviderInstance extends LLMProvider {
    /** Create an Interactions session for an agent */
    createSession(agentId: string, systemInstruction: string): Promise<InteractionSession>;
    /** Send a turn within an existing session */
    sendTurn(sessionId: string, content: string, tools?: MCPToolDeclaration[]): Promise<InteractionTurn>;
    /** Submit tool results for a pending turn */
    submitToolResults(sessionId: string, results: ToolResult[]): Promise<InteractionTurn>;
    /** Close a session */
    closeSession(sessionId: string): Promise<void>;
    /** Get active sessions */
    getActiveSessions(): InteractionSession[];
    /** Health check */
    healthCheck(): Promise<{ ok: boolean; model: string; latencyMs: number }>;
}

/**
 * Create a Google AI Studio provider instance.
 *
 * @param config - Provider configuration (API key + optional overrides)
 * @returns A provider implementing LLMProvider + Interactions API
 */
export function createGoogleAIStudioProvider(
    config: GoogleAIStudioConfig,
): GoogleAIStudioProviderInstance {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const sessions = new Map<string, InteractionSession>();
    const turnHistory = new Map<string, InteractionTurn[]>();

    // ── Core LLMProvider Implementation ──

    async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
        const body = {
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 2048,
            },
            safetySettings: buildSafetySettings(cfg.safetyThreshold),
        };

        const response = await callAPI(
            `models/${cfg.defaultModel}:generateContent`,
            body,
        );

        return extractTextFromResponse(response);
    }

    async function generateStructured<T>(
        systemPrompt: string,
        userPrompt: string,
        responseSchema: Record<string, unknown>,
    ): Promise<T> {
        const body = {
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                temperature: 0.3,
                topP: 0.8,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
                responseSchema,
            },
            safetySettings: buildSafetySettings(cfg.safetyThreshold),
        };

        const response = await callAPI(
            `models/${cfg.defaultModel}:generateContent`,
            body,
        );

        const text = extractTextFromResponse(response);
        return JSON.parse(text) as T;
    }

    async function generateEmbedding(text: string): Promise<number[]> {
        const body = {
            model: `models/${cfg.embeddingModel}`,
            content: { parts: [{ text }] },
        };

        const response = await callAPI(
            `models/${cfg.embeddingModel}:embedContent`,
            body,
        );

        return (response as { embedding: { values: number[] } }).embedding.values;
    }

    // ── Interactions API Implementation ──

    async function createSession(
        agentId: string,
        systemInstruction: string,
    ): Promise<InteractionSession> {
        if (!cfg.enableInteractions) {
            throw new Error('Interactions API is disabled in config');
        }

        const body = {
            model: `models/${cfg.defaultModel}`,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            config: {
                enableServerState: cfg.enableServerState,
                responseModalities: ['TEXT'],
            },
        };

        const response = await callAPI('interactions', body, 'POST');
        const sessionId = (response as { name: string }).name || `local-${Date.now()}`;

        const session: InteractionSession = {
            sessionId,
            agentId,
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            turnCount: 0,
            serverManaged: cfg.enableServerState,
        };

        sessions.set(sessionId, session);
        turnHistory.set(sessionId, []);
        return session;
    }

    async function sendTurn(
        sessionId: string,
        content: string,
        tools?: MCPToolDeclaration[],
    ): Promise<InteractionTurn> {
        const session = sessions.get(sessionId);
        if (!session) throw new Error(`Session '${sessionId}' not found`);

        const toolDeclarations = tools ? {
            functionDeclarations: tools.map(t => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            })),
        } : undefined;

        const body = {
            contents: [{ role: 'user', parts: [{ text: content }] }],
            ...(toolDeclarations ? { tools: [toolDeclarations] } : {}),
        };

        const response = await callAPI(
            `${sessionId}:sendMessage`,
            body,
            'POST',
        );

        session.turnCount++;
        session.lastActiveAt = Date.now();

        const turn: InteractionTurn = {
            index: session.turnCount,
            userContent: content,
            modelResponse: extractTextFromResponse(response),
            toolCalls: extractToolCalls(response),
            pending: hasToolCalls(response),
            timestamp: Date.now(),
        };

        const history = turnHistory.get(sessionId) ?? [];
        history.push(turn);
        turnHistory.set(sessionId, history);

        return turn;
    }

    async function submitToolResults(
        sessionId: string,
        results: ToolResult[],
    ): Promise<InteractionTurn> {
        const session = sessions.get(sessionId);
        if (!session) throw new Error(`Session '${sessionId}' not found`);

        const body = {
            contents: [{
                role: 'function',
                parts: results.map(r => ({
                    functionResponse: {
                        name: r.callId,
                        response: { content: r.content },
                    },
                })),
            }],
        };

        const response = await callAPI(
            `${sessionId}:sendMessage`,
            body,
            'POST',
        );

        session.lastActiveAt = Date.now();

        const turn: InteractionTurn = {
            index: session.turnCount,
            userContent: '',
            toolResults: results,
            modelResponse: extractTextFromResponse(response),
            toolCalls: extractToolCalls(response),
            pending: hasToolCalls(response),
            timestamp: Date.now(),
        };

        const history = turnHistory.get(sessionId) ?? [];
        history.push(turn);

        return turn;
    }

    async function closeSession(sessionId: string): Promise<void> {
        sessions.delete(sessionId);
        turnHistory.delete(sessionId);
        // In production, this would call the API to close the session
    }

    function getActiveSessions(): InteractionSession[] {
        return Array.from(sessions.values());
    }

    async function healthCheck(): Promise<{ ok: boolean; model: string; latencyMs: number }> {
        const start = Date.now();
        try {
            await generateText('You are a health check.', 'Reply with only the word OK.');
            return { ok: true, model: cfg.defaultModel, latencyMs: Date.now() - start };
        } catch {
            return { ok: false, model: cfg.defaultModel, latencyMs: Date.now() - start };
        }
    }

    // ── HTTP Transport ──

    async function callAPI(
        endpoint: string,
        body: Record<string, unknown>,
        method: string = 'POST',
    ): Promise<unknown> {
        const url = `${cfg.baseUrl}/${endpoint}?key=${cfg.apiKey}`;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    const errorBody = await response.text();
                    const error = new Error(
                        `Google AI Studio API error (${response.status}): ${errorBody}`,
                    );
                    // Retry on 429 (rate limit) and 503 (service unavailable)
                    if (response.status === 429 || response.status === 503) {
                        lastError = error;
                        await backoff(attempt);
                        continue;
                    }
                    throw error;
                }

                return await response.json();
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < cfg.maxRetries) {
                    await backoff(attempt);
                }
            }
        }

        throw lastError ?? new Error('Google AI Studio API call failed after retries');
    }

    return {
        // LLMProvider interface
        generateText,
        generateStructured,
        generateEmbedding,
        // Interactions API
        createSession,
        sendTurn,
        submitToolResults,
        closeSession,
        getActiveSessions,
        healthCheck,
    };
}

// ─── Helpers ──────────────────────────────────────────────────

function extractTextFromResponse(response: unknown): string {
    const resp = response as {
        candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
        }>;
    };
    return resp.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function extractToolCalls(response: unknown): ToolCall[] | undefined {
    const resp = response as {
        candidates?: Array<{
            content?: {
                parts?: Array<{
                    functionCall?: { name: string; args: Record<string, unknown> };
                }>;
            };
        }>;
    };

    const parts = resp.candidates?.[0]?.content?.parts;
    if (!parts) return undefined;

    const calls = parts
        .filter(p => p.functionCall)
        .map((p, i) => ({
            id: `call-${Date.now()}-${i}`,
            name: p.functionCall!.name,
            args: p.functionCall!.args,
        }));

    return calls.length > 0 ? calls : undefined;
}

function hasToolCalls(response: unknown): boolean {
    const calls = extractToolCalls(response);
    return calls !== undefined && calls.length > 0;
}

type SafetyCategory =
    | 'HARM_CATEGORY_HARASSMENT'
    | 'HARM_CATEGORY_HATE_SPEECH'
    | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
    | 'HARM_CATEGORY_DANGEROUS_CONTENT';

function buildSafetySettings(threshold: string): Array<{
    category: SafetyCategory;
    threshold: string;
}> {
    const categories: SafetyCategory[] = [
        'HARM_CATEGORY_HARASSMENT',
        'HARM_CATEGORY_HATE_SPEECH',
        'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        'HARM_CATEGORY_DANGEROUS_CONTENT',
    ];
    return categories.map(category => ({ category, threshold }));
}

async function backoff(attempt: number): Promise<void> {
    const baseDelay = 1000;
    const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, delay));
}
