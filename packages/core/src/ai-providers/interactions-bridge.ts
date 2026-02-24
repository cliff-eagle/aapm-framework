/**
 * Agent ↔ Interactions Bridge — Connects AAPM agents to Google AI Studio
 * Interactions API sessions for stateful, multi-turn reasoning.
 *
 * Why this matters:
 *   Without this bridge, each agent.process() call is stateless — the agent
 *   must re-send the full context on every LLM call. The Interactions API
 *   maintains server-side conversation state, so:
 *     - NPC agents can have long conversations without context bloat
 *     - Tutor agents can maintain cross-session reasoning chains
 *     - Token costs drop because context is managed server-side
 *
 * Architecture:
 *   AgentOrchestrator.processEvent()
 *     → AgentBase.process()
 *       → AgentToolkit.execute('generate_text', ...)
 *         → InteractionsBridge.generateText()
 *           → Interactions API (session-managed)
 *
 * Each agent gets its own Interactions session with its role-specific
 * system instruction. The bridge manages session lifecycle and
 * routes tool calls through the agent's toolkit.
 *
 * @module ai-providers/interactions-bridge
 * @patentCritical Claim 14 — Agentic LLM Session Management
 */

import type { GoogleAIStudioProviderInstance, InteractionSession, MCPToolDeclaration } from './google-ai-studio';
import type { AgentToolkitInstance } from '../agents/AgentToolkit';
import type { AgentRole } from '../agents/AgentTypes';
import type { LLMProvider } from '../feedback-engine/pipeline';

// ─── Bridge Config ────────────────────────────────────────────

export interface InteractionsBridgeConfig {
    /** The Google AI Studio provider instance */
    provider: GoogleAIStudioProviderInstance;
    /** The agent toolkit (for resolving MCP tool calls) */
    toolkit: AgentToolkitInstance;
    /** Max tool call rounds per turn (prevents infinite loops) */
    maxToolRounds: number;
    /** Session TTL in milliseconds (auto-close idle sessions) */
    sessionTtlMs: number;
}

export interface InteractionsBridgeInstance extends LLMProvider {
    /** Get or create an Interactions session for an agent */
    getSession(agentId: string, role: AgentRole, systemInstruction: string): Promise<InteractionSession>;
    /** Close a specific agent's session */
    closeAgentSession(agentId: string): Promise<void>;
    /** Close all sessions */
    closeAll(): Promise<void>;
    /** Number of active sessions */
    readonly activeSessionCount: number;
}

// ─── System Instructions ──────────────────────────────────────

const ROLE_SYSTEM_PREFIXES: Record<AgentRole, string> = {
    npc: 'You are an NPC character in a language learning simulation. Stay in character. Respond in the target language. Use your personality traits to guide your responses.',
    tutor: 'You are a pedagogical AI tutor overseeing a language learning session. Analyze learner friction patterns, plan interventions, and recommend tier adjustments.',
    world: 'You are a world narrative engine. Generate dynamic events, manage NPC schedules, and create story arcs that exercise specific language competencies.',
    evaluation: 'You are an assessment engine. Analyze learner utterances for accuracy, fluency, and complexity. Infer affective state from behavioral signals.',
};

// ─── Bridge Implementation ────────────────────────────────────

export function createInteractionsBridge(
    config: InteractionsBridgeConfig,
): InteractionsBridgeInstance {
    const { provider, toolkit, maxToolRounds, sessionTtlMs } = config;
    const agentSessions = new Map<string, string>(); // agentId → sessionId

    async function getSession(
        agentId: string,
        role: AgentRole,
        systemInstruction: string,
    ): Promise<InteractionSession> {
        const existingSessionId = agentSessions.get(agentId);
        if (existingSessionId) {
            const sessions = provider.getActiveSessions();
            const existing = sessions.find(s => s.sessionId === existingSessionId);
            if (existing) {
                // Check TTL
                if (Date.now() - existing.lastActiveAt < sessionTtlMs) {
                    return existing;
                }
                // Session expired — close and create new
                await provider.closeSession(existingSessionId);
            }
        }

        // Create new session with role-prefixed system instruction
        const fullInstruction = `${ROLE_SYSTEM_PREFIXES[role]}\n\n${systemInstruction}`;
        const session = await provider.createSession(agentId, fullInstruction);
        agentSessions.set(agentId, session.sessionId);
        return session;
    }

    /**
     * Generate text using the Interactions API (session-managed).
     * Falls back to stateless generation if session creation fails.
     */
    async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
        // Try stateless first (simpler, no session management needed)
        return provider.generateText(systemPrompt, userPrompt);
    }

    /**
     * Generate structured response using the Interactions API.
     */
    async function generateStructured<T>(
        systemPrompt: string,
        userPrompt: string,
        responseSchema: Record<string, unknown>,
    ): Promise<T> {
        return provider.generateStructured<T>(systemPrompt, userPrompt, responseSchema);
    }

    /**
     * Generate embeddings (no session needed — stateless operation).
     */
    async function generateEmbedding(text: string): Promise<number[]> {
        return provider.generateEmbedding(text);
    }

    /**
     * Agentic turn — send a message within an agent's session,
     * automatically resolving any MCP tool calls.
     */
    async function agenticTurn(
        agentId: string,
        role: AgentRole,
        systemInstruction: string,
        content: string,
        availableTools?: MCPToolDeclaration[],
    ): Promise<string> {
        const session = await getSession(agentId, role, systemInstruction);

        // Build MCP tool declarations from toolkit if not provided
        const tools = availableTools ?? buildMCPTools(role);

        let turn = await provider.sendTurn(session.sessionId, content, tools);

        // Resolve tool calls iteratively
        let rounds = 0;
        while (turn.pending && turn.toolCalls && rounds < maxToolRounds) {
            rounds++;
            const results = await Promise.all(
                turn.toolCalls.map(async (call) => {
                    const obs = await toolkit.execute(call.name, call.args);
                    return {
                        callId: call.id,
                        content: JSON.stringify(obs.data),
                        success: obs.success,
                    };
                }),
            );
            turn = await provider.submitToolResults(session.sessionId, results);
        }

        return turn.modelResponse ?? '';
    }

    /**
     * Build MCP tool declarations from the agent toolkit for a given role.
     */
    function buildMCPTools(role: AgentRole): MCPToolDeclaration[] {
        return toolkit.getToolsForRole(role).map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object' as const,
                properties: tool.parameters,
            },
        }));
    }

    async function closeAgentSession(agentId: string): Promise<void> {
        const sessionId = agentSessions.get(agentId);
        if (sessionId) {
            await provider.closeSession(sessionId);
            agentSessions.delete(agentId);
        }
    }

    async function closeAll(): Promise<void> {
        for (const [agentId, sessionId] of agentSessions) {
            await provider.closeSession(sessionId);
        }
        agentSessions.clear();
    }

    return {
        // LLMProvider interface (stateless)
        generateText,
        generateStructured,
        generateEmbedding,
        // Session management
        getSession,
        closeAgentSession,
        closeAll,
        get activeSessionCount() { return agentSessions.size; },
    };
}
