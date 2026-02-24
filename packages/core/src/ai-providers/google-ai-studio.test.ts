/**
 * Google AI Studio Provider — Test Suite
 *
 * Tests:
 *   1. Provider creation with default/custom config
 *   2. LLMProvider interface (generateText, generateStructured, generateEmbedding)
 *   3. Interactions API (session lifecycle, turns, tool calls)
 *   4. Interactions Bridge (agent → session mapping, tool resolution)
 *   5. Error handling and retry logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createGoogleAIStudioProvider,
    DEFAULT_CONFIG,
} from './google-ai-studio';
import type {
    GoogleAIStudioConfig,
    GoogleAIStudioProviderInstance,
    MCPToolDeclaration,
} from './google-ai-studio';
import {
    createInteractionsBridge,
} from './interactions-bridge';
import { createAgentToolkit, registerBuiltinTools } from '../agents/AgentToolkit';

// ─── Mock fetch ───────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(data: unknown, status = 200): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => data,
        text: async () => JSON.stringify(data),
        headers: new Headers(),
        redirected: false,
        statusText: 'OK',
        type: 'basic',
        url: '',
        clone: () => mockResponse(data, status),
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob([]),
        formData: async () => { throw new Error('not implemented'); },
        bytes: async () => new Uint8Array(0),
    } as unknown as Response;
}

function geminiTextResponse(text: string): unknown {
    return {
        candidates: [{
            content: {
                parts: [{ text }],
                role: 'model',
            },
        }],
    };
}

function geminiEmbeddingResponse(values: number[]): unknown {
    return { embedding: { values } };
}

function geminiToolCallResponse(name: string, args: Record<string, unknown>): unknown {
    return {
        candidates: [{
            content: {
                parts: [{
                    functionCall: { name, args },
                }],
                role: 'model',
            },
        }],
    };
}

// ─── Test Config ──────────────────────────────────────────────

function makeConfig(overrides?: Partial<GoogleAIStudioConfig>): GoogleAIStudioConfig {
    return {
        apiKey: 'test-api-key-123',
        ...DEFAULT_CONFIG,
        maxRetries: 0, // No retries in tests
        timeoutMs: 5000,
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════════════
// 1. PROVIDER CREATION
// ═══════════════════════════════════════════════════════════════

describe('GoogleAIStudioProvider', () => {
    let provider: GoogleAIStudioProviderInstance;

    beforeEach(() => {
        mockFetch.mockReset();
        provider = createGoogleAIStudioProvider(makeConfig());
    });

    describe('Configuration', () => {
        it('creates with default config', () => {
            expect(provider).toBeDefined();
            expect(provider.generateText).toBeDefined();
            expect(provider.generateStructured).toBeDefined();
            expect(provider.generateEmbedding).toBeDefined();
            expect(provider.createSession).toBeDefined();
        });

        it('starts with no active sessions', () => {
            expect(provider.getActiveSessions()).toHaveLength(0);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // 2. LLMProvider Interface
    // ═══════════════════════════════════════════════════════════

    describe('generateText', () => {
        it('sends correct request and extracts text', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse(geminiTextResponse('Hola, ¿cómo estás?')));

            const result = await provider.generateText(
                'You are a Spanish tutor.',
                'Say hello in Spanish.',
            );

            expect(result).toBe('Hola, ¿cómo estás?');
            expect(mockFetch).toHaveBeenCalledOnce();

            // Verify request structure
            const [url, options] = mockFetch.mock.calls[0];
            expect(url).toContain('gemini-3-flash:generateContent');
            expect(url).toContain('key=test-api-key-123');
            const body = JSON.parse(options.body as string);
            expect(body.systemInstruction.parts[0].text).toBe('You are a Spanish tutor.');
            expect(body.contents[0].parts[0].text).toBe('Say hello in Spanish.');
        });

        it('handles empty response gracefully', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse({ candidates: [] }));
            const result = await provider.generateText('system', 'user');
            expect(result).toBe('');
        });
    });

    describe('generateStructured', () => {
        it('sends JSON response schema and parses result', async () => {
            const structured = { mood: 'happy', confidence: 0.9 };
            mockFetch.mockResolvedValueOnce(
                mockResponse(geminiTextResponse(JSON.stringify(structured))),
            );

            const result = await provider.generateStructured<typeof structured>(
                'Analyze mood.',
                'The learner is excited.',
                { type: 'object', properties: { mood: { type: 'string' }, confidence: { type: 'number' } } },
            );

            expect(result).toEqual(structured);

            const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
            expect(body.generationConfig.responseMimeType).toBe('application/json');
            expect(body.generationConfig.responseSchema).toBeDefined();
        });
    });

    describe('generateEmbedding', () => {
        it('returns embedding vector', async () => {
            const vector = [0.1, 0.2, 0.3, 0.4, 0.5];
            mockFetch.mockResolvedValueOnce(mockResponse(geminiEmbeddingResponse(vector)));

            const result = await provider.generateEmbedding('test text');
            expect(result).toEqual(vector);

            const [url] = mockFetch.mock.calls[0];
            expect(url).toContain('text-embedding-005:embedContent');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // 3. Interactions API
    // ═══════════════════════════════════════════════════════════

    describe('Interactions API', () => {
        it('creates a session', async () => {
            mockFetch.mockResolvedValueOnce(
                mockResponse({ name: 'interactions/session-abc' }),
            );

            const session = await provider.createSession('npc-maria', 'You are María.');
            expect(session.sessionId).toBe('interactions/session-abc');
            expect(session.agentId).toBe('npc-maria');
            expect(session.turnCount).toBe(0);
            expect(provider.getActiveSessions()).toHaveLength(1);
        });

        it('sends a turn within a session', async () => {
            // Create session
            mockFetch.mockResolvedValueOnce(
                mockResponse({ name: 'interactions/session-xyz' }),
            );
            const session = await provider.createSession('npc-pedro', 'You are Pedro.');

            // Send turn
            mockFetch.mockResolvedValueOnce(
                mockResponse(geminiTextResponse('¡Buenos días!')),
            );
            const turn = await provider.sendTurn(session.sessionId, 'Hola, Pedro');

            expect(turn.userContent).toBe('Hola, Pedro');
            expect(turn.modelResponse).toBe('¡Buenos días!');
            expect(turn.pending).toBe(false);
            expect(turn.index).toBe(1);
        });

        it('handles tool calls in a turn', async () => {
            // Create session
            mockFetch.mockResolvedValueOnce(
                mockResponse({ name: 'interactions/session-tools' }),
            );
            const session = await provider.createSession('tutor', 'You are a tutor.');

            const tools: MCPToolDeclaration[] = [{
                name: 'evaluate_performance',
                description: 'Check learner metrics',
                parameters: { type: 'object', properties: { sessionId: { type: 'string' } } },
            }];

            // Model requests a tool call
            mockFetch.mockResolvedValueOnce(
                mockResponse(geminiToolCallResponse('evaluate_performance', { sessionId: 's1' })),
            );
            const turn = await provider.sendTurn(session.sessionId, 'How is the learner doing?', tools);

            expect(turn.pending).toBe(true);
            expect(turn.toolCalls).toHaveLength(1);
            expect(turn.toolCalls![0].name).toBe('evaluate_performance');
        });

        it('submits tool results', async () => {
            // Create session + send turn with tool call
            mockFetch.mockResolvedValueOnce(mockResponse({ name: 'interactions/session-tr' }));
            const session = await provider.createSession('eval', 'Evaluator');

            // Submit tool results → model responds with text
            mockFetch.mockResolvedValueOnce(
                mockResponse(geminiTextResponse('Learner accuracy is 82%.')),
            );
            const turn = await provider.submitToolResults(session.sessionId, [
                { callId: 'call-1', content: '{"accuracy": 0.82}', success: true },
            ]);

            expect(turn.modelResponse).toBe('Learner accuracy is 82%.');
            expect(turn.toolResults).toHaveLength(1);
        });

        it('closes a session', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse({ name: 'interactions/session-close' }));
            const session = await provider.createSession('test', 'Test');
            expect(provider.getActiveSessions()).toHaveLength(1);

            await provider.closeSession(session.sessionId);
            expect(provider.getActiveSessions()).toHaveLength(0);
        });

        it('rejects turns for unknown sessions', async () => {
            await expect(
                provider.sendTurn('nonexistent-session', 'Hello'),
            ).rejects.toThrow('not found');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // 4. Error Handling
    // ═══════════════════════════════════════════════════════════

    describe('Error Handling', () => {
        it('throws on API errors', async () => {
            mockFetch.mockResolvedValueOnce(
                mockResponse({ error: { message: 'Invalid API key' } }, 401),
            );

            await expect(
                provider.generateText('system', 'user'),
            ).rejects.toThrow('401');
        });

        it('health check returns ok=false on failure', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            const health = await provider.healthCheck();
            expect(health.ok).toBe(false);
            expect(health.model).toBe('gemini-3-flash');
        });

        it('health check returns ok=true on success', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse(geminiTextResponse('OK')));
            const health = await provider.healthCheck();
            expect(health.ok).toBe(true);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// 5. Interactions Bridge
// ═══════════════════════════════════════════════════════════════

describe('InteractionsBridge', () => {
    it('creates bridge with LLMProvider interface', () => {
        // Create a mock provider
        const provider = createGoogleAIStudioProvider(makeConfig());
        const toolkit = createAgentToolkit();
        const bridge = createInteractionsBridge({
            provider,
            toolkit,
            maxToolRounds: 3,
            sessionTtlMs: 60000,
        });

        expect(bridge.generateText).toBeDefined();
        expect(bridge.generateStructured).toBeDefined();
        expect(bridge.generateEmbedding).toBeDefined();
        expect(bridge.getSession).toBeDefined();
        expect(bridge.activeSessionCount).toBe(0);
    });

    it('delegates text generation to provider', async () => {
        mockFetch.mockResolvedValueOnce(mockResponse(geminiTextResponse('Delegated!')));

        const provider = createGoogleAIStudioProvider(makeConfig());
        const toolkit = createAgentToolkit();
        const bridge = createInteractionsBridge({
            provider,
            toolkit,
            maxToolRounds: 3,
            sessionTtlMs: 60000,
        });

        const result = await bridge.generateText('system', 'user');
        expect(result).toBe('Delegated!');
    });

    it('manages agent session lifecycle', async () => {
        mockFetch.mockResolvedValueOnce(mockResponse({ name: 'interactions/bridge-session' }));

        const provider = createGoogleAIStudioProvider(makeConfig());
        const toolkit = createAgentToolkit();
        const bridge = createInteractionsBridge({
            provider,
            toolkit,
            maxToolRounds: 3,
            sessionTtlMs: 60000,
        });

        const session = await bridge.getSession('npc-maria', 'npc', 'You are María.');
        expect(session.agentId).toBe('npc-maria');
        expect(bridge.activeSessionCount).toBe(1);

        await bridge.closeAgentSession('npc-maria');
        expect(bridge.activeSessionCount).toBe(0);
    });

    it('closes all sessions', async () => {
        mockFetch.mockResolvedValueOnce(mockResponse({ name: 'interactions/s1' }));
        mockFetch.mockResolvedValueOnce(mockResponse({ name: 'interactions/s2' }));

        const provider = createGoogleAIStudioProvider(makeConfig());
        const toolkit = createAgentToolkit();
        const bridge = createInteractionsBridge({
            provider,
            toolkit,
            maxToolRounds: 3,
            sessionTtlMs: 60000,
        });

        await bridge.getSession('npc-a', 'npc', 'A');
        await bridge.getSession('tutor-main', 'tutor', 'Tutor');
        expect(bridge.activeSessionCount).toBe(2);

        await bridge.closeAll();
        expect(bridge.activeSessionCount).toBe(0);
    });
});
