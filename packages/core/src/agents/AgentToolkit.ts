/**
 * Agent Toolkit — Wraps existing AAPM modules as typed tools for agents.
 *
 * Each tool is a structured interface an agent's reasoning loop can
 * invoke. Tools are the bridge between the agent's LLM-based reasoning
 * and the framework's deterministic modules.
 *
 * Architecture:
 *   AgentBase.think() → selects tool → AgentToolkit.execute() → module fn
 *
 * @module agents/AgentToolkit
 * @patentCritical Claim 14 — Agent Tool Wiring
 */

import type { AgentTool, AgentObservation, AgentRole } from './AgentTypes';

// ─── Tool Registry ────────────────────────────────────────────

export interface AgentToolkitInstance {
    /** Register a tool */
    register(tool: AgentTool): void;
    /** Get all tools available to a given role */
    getToolsForRole(role: AgentRole): AgentTool[];
    /** Get a tool by name */
    getTool(name: string): AgentTool | undefined;
    /** Execute a tool by name */
    execute(name: string, params: Record<string, unknown>): Promise<AgentObservation>;
    /** Get tool descriptions for LLM system prompt */
    describeTools(role: AgentRole): string;
    /** Number of registered tools */
    readonly size: number;
}

export function createAgentToolkit(): AgentToolkitInstance {
    const tools = new Map<string, AgentTool>();

    function register(tool: AgentTool): void {
        tools.set(tool.name, tool);
    }

    function getToolsForRole(role: AgentRole): AgentTool[] {
        return Array.from(tools.values()).filter(t =>
            t.availableTo.includes(role)
        );
    }

    function getTool(name: string): AgentTool | undefined {
        return tools.get(name);
    }

    async function execute(name: string, params: Record<string, unknown>): Promise<AgentObservation> {
        const tool = tools.get(name);
        if (!tool) {
            return {
                toolName: name,
                success: false,
                data: null,
                error: `Tool '${name}' not found`,
                timestamp: Date.now(),
            };
        }

        try {
            return await tool.execute(params);
        } catch (err) {
            return {
                toolName: name,
                success: false,
                data: null,
                error: err instanceof Error ? err.message : String(err),
                timestamp: Date.now(),
            };
        }
    }

    function describeTools(role: AgentRole): string {
        const available = getToolsForRole(role);
        if (available.length === 0) return 'No tools available.';

        return available.map(t =>
            `- **${t.name}**: ${t.description}`
        ).join('\n');
    }

    return {
        register,
        getToolsForRole,
        getTool,
        execute,
        describeTools,
        get size() { return tools.size; },
    };
}

// ─── Built-in Tool Definitions ────────────────────────────────

/**
 * Create standard tools from existing module providers.
 * Call this during session init to populate the toolkit.
 */
export interface ToolProviders {
    /** LLM text/structured generation */
    generateText?: (system: string, user: string) => Promise<string>;
    generateStructured?: <T>(system: string, user: string, schema: Record<string, unknown>) => Promise<T>;
    /** Embedding generation */
    embedText?: (text: string) => Promise<number[]>;
    /** Prompt composition */
    composePrompt?: (params: Record<string, unknown>) => string;
    /** World state access */
    getWorldState?: () => Record<string, unknown>;
    navigateWorld?: (locationId: string) => Record<string, unknown> | null;
    fireEvent?: (eventId: string) => Record<string, unknown>;
    /** Evaluation */
    evaluatePerformance?: (params: Record<string, unknown>) => Record<string, unknown>;
}

export function registerBuiltinTools(toolkit: AgentToolkitInstance, providers: ToolProviders): void {
    if (providers.generateText) {
        const genText = providers.generateText;
        toolkit.register({
            name: 'generate_text',
            description: 'Generate a text response using the LLM. Use for NPC dialogue, analysis, or reasoning.',
            availableTo: ['npc', 'tutor', 'world', 'evaluation'],
            parameters: { system: 'string', user: 'string' },
            async execute(params) {
                const result = await genText(String(params['system']), String(params['user']));
                return { toolName: 'generate_text', success: true, data: result, timestamp: Date.now() };
            },
        });
    }

    if (providers.generateStructured) {
        const genStructured = providers.generateStructured;
        toolkit.register({
            name: 'generate_structured',
            description: 'Generate a structured JSON response using the LLM. Use for decisions, classifications, and plans.',
            availableTo: ['npc', 'tutor', 'world', 'evaluation'],
            parameters: { system: 'string', user: 'string', schema: 'object' },
            async execute(params) {
                const result = await genStructured(
                    String(params['system']),
                    String(params['user']),
                    params['schema'] as Record<string, unknown>,
                );
                return { toolName: 'generate_structured', success: true, data: result, timestamp: Date.now() };
            },
        });
    }

    if (providers.embedText) {
        const embed = providers.embedText;
        toolkit.register({
            name: 'embed_text',
            description: 'Generate a vector embedding for text. Use for memory storage and similarity search.',
            availableTo: ['npc', 'tutor', 'evaluation'],
            parameters: { text: 'string' },
            async execute(params) {
                const result = await embed(String(params['text']));
                return { toolName: 'embed_text', success: true, data: result, timestamp: Date.now() };
            },
        });
    }

    if (providers.composePrompt) {
        const compose = providers.composePrompt;
        toolkit.register({
            name: 'compose_prompt',
            description: 'Compose a 4-layer NPC prompt from the prompt registry.',
            availableTo: ['npc'],
            parameters: { tier: 'string', npcConfig: 'object', schema: 'object', sessionContext: 'object', realTimeState: 'object' },
            async execute(params) {
                const result = compose(params);
                return { toolName: 'compose_prompt', success: true, data: result, timestamp: Date.now() };
            },
        });
    }

    if (providers.getWorldState) {
        const getState = providers.getWorldState;
        toolkit.register({
            name: 'get_world_state',
            description: 'Read the current world state including NPC locations, time of day, and active events.',
            availableTo: ['npc', 'tutor', 'world', 'evaluation'],
            parameters: {},
            async execute() {
                const result = getState();
                return { toolName: 'get_world_state', success: true, data: result, timestamp: Date.now() };
            },
        });
    }

    if (providers.navigateWorld) {
        const navigate = providers.navigateWorld;
        toolkit.register({
            name: 'navigate_world',
            description: 'Move the learner to a connected location in the world.',
            availableTo: ['world'],
            parameters: { locationId: 'string' },
            async execute(params) {
                const result = navigate(String(params['locationId']));
                return {
                    toolName: 'navigate_world',
                    success: result !== null,
                    data: result,
                    error: result === null ? 'Navigation failed — location not connected or inaccessible' : undefined,
                    timestamp: Date.now(),
                };
            },
        });
    }

    if (providers.fireEvent) {
        const fire = providers.fireEvent;
        toolkit.register({
            name: 'fire_event',
            description: 'Trigger an ambient event in the world (festival, emergency, weather change, etc.).',
            availableTo: ['world'],
            parameters: { eventId: 'string' },
            async execute(params) {
                const result = fire(String(params['eventId']));
                return { toolName: 'fire_event', success: true, data: result, timestamp: Date.now() };
            },
        });
    }

    if (providers.evaluatePerformance) {
        const evaluate = providers.evaluatePerformance;
        toolkit.register({
            name: 'evaluate_performance',
            description: 'Compute CEFR scores and competency metrics for the learner.',
            availableTo: ['evaluation', 'tutor'],
            parameters: { sessionData: 'object' },
            async execute(params) {
                const result = evaluate(params);
                return { toolName: 'evaluate_performance', success: true, data: result, timestamp: Date.now() };
            },
        });
    }
}
