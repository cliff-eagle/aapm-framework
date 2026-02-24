/**
 * Agent Orchestrator — Manages the agent pool and inter-agent communication.
 *
 * Responsibilities:
 *   - Spawns agents per schema configuration
 *   - Routes lifecycle events to appropriate agents
 *   - Manages inter-agent message bus
 *   - Resolves decision conflicts (priority-based)
 *   - Registers as a single ModuleHook that delegates to child agents
 *
 * The orchestrator is the ONLY entity the SessionOrchestrator interacts
 * with directly. All agent complexity is hidden behind this interface.
 *
 * @module agents/AgentOrchestrator
 * @patentCritical Claim 14 — Agent Pool Management
 */

import type {
    AgentConfig,
    AgentRole,
    AgentDecision,
    AgentMessage,
    AgentSnapshot,
} from './AgentTypes';
import type { AgentInstance, AgentEvent } from './AgentBase';
import { createMessage } from './AgentBase';
import type { AgentToolkitInstance } from './AgentToolkit';

// ─── Orchestrator Config ──────────────────────────────────────

export interface AgentOrchestratorConfig {
    /** Agent toolkit (shared across all agents) */
    toolkit: AgentToolkitInstance;
    /** Maximum total decisions per tick (prevents runaway) */
    maxDecisionsPerTick: number;
    /** Enable inter-agent messaging */
    enableMessaging: boolean;
    /** Conflict resolution strategy */
    conflictStrategy: 'priority' | 'first-wins' | 'all-pass';
}

export interface AgentOrchestratorInstance {
    /** Add an agent to the pool */
    addAgent(agent: AgentInstance): void;
    /** Remove an agent from the pool */
    removeAgent(agentId: string): void;
    /** Get an agent by ID */
    getAgent(agentId: string): AgentInstance | undefined;
    /** Get all agents of a given role */
    getAgentsByRole(role: AgentRole): AgentInstance[];
    /** Process a lifecycle event through all agents */
    processEvent(event: AgentEvent): Promise<AgentDecision[]>;
    /** Send an inter-agent message */
    sendMessage(message: AgentMessage): void;
    /** Broadcast a message to all agents */
    broadcast(from: string, content: string, payload?: Record<string, unknown>): void;
    /** Get snapshots of all agents */
    snapshots(): AgentSnapshot[];
    /** Total agent count */
    readonly size: number;
    /** Dispose all agents */
    dispose(): void;
}

// ─── Orchestrator Implementation ──────────────────────────────

export function createAgentOrchestrator(
    config: AgentOrchestratorConfig,
): AgentOrchestratorInstance {
    const agents = new Map<string, AgentInstance>();
    const pendingMessages: AgentMessage[] = [];

    function addAgent(agent: AgentInstance): void {
        agents.set(agent.id, agent);
    }

    function removeAgent(agentId: string): void {
        const agent = agents.get(agentId);
        if (agent) {
            agent.dispose();
            agents.delete(agentId);
        }
    }

    function getAgent(agentId: string): AgentInstance | undefined {
        return agents.get(agentId);
    }

    function getAgentsByRole(role: AgentRole): AgentInstance[] {
        return Array.from(agents.values()).filter(a => a.role === role);
    }

    async function processEvent(event: AgentEvent): Promise<AgentDecision[]> {
        // 1. Deliver pending inter-agent messages
        if (config.enableMessaging) {
            deliverMessages();
        }

        // 2. Determine which agents should process this event
        const relevantAgents = routeEvent(event);

        // 3. Process event through each relevant agent
        const allDecisions: AgentDecision[] = [];
        for (const agent of relevantAgents) {
            const decisions = await agent.process(event);
            allDecisions.push(...decisions);

            // Collect outgoing messages
            if (config.enableMessaging) {
                const outgoing = agent.flushMessages();
                pendingMessages.push(...outgoing);
            }

            // Safety: cap total decisions
            if (allDecisions.length >= config.maxDecisionsPerTick) break;
        }

        // 4. Resolve conflicts
        const resolved = resolveConflicts(allDecisions);

        // 5. Extract inter-agent directives from resolved decisions
        for (const decision of resolved) {
            if (decision.type === 'send_message' && decision.payload['message']) {
                pendingMessages.push(decision.payload['message'] as AgentMessage);
            }
        }

        return resolved;
    }

    /**
     * Route events to the agents that care about them.
     *
     * Priority order ensures real-time agents (NPC) go first,
     * then analytical agents (Evaluation), then strategic
     * agents (Tutor, World).
     */
    function routeEvent(event: AgentEvent): AgentInstance[] {
        const roleOrder: AgentRole[] = ['npc', 'evaluation', 'tutor', 'world'];

        // Some events are role-specific
        const roleFilter = EVENT_ROLE_MAP[event.type];

        const ordered: AgentInstance[] = [];
        for (const role of roleOrder) {
            if (roleFilter && !roleFilter.includes(role)) continue;
            for (const agent of agents.values()) {
                if (agent.role === role) ordered.push(agent);
            }
        }

        return ordered;
    }

    function deliverMessages(): void {
        for (const msg of pendingMessages) {
            if (msg.to === null) {
                // Broadcast
                for (const agent of agents.values()) {
                    if (agent.id !== msg.from) {
                        agent.receiveMessage(msg);
                    }
                }
            } else {
                const target = agents.get(msg.to);
                target?.receiveMessage(msg);
            }
        }
        pendingMessages.length = 0;
    }

    function resolveConflicts(decisions: AgentDecision[]): AgentDecision[] {
        if (config.conflictStrategy === 'all-pass') return decisions;

        // Group decisions by type
        const grouped = new Map<string, AgentDecision[]>();
        for (const d of decisions) {
            const key = d.type;
            const group = grouped.get(key) ?? [];
            group.push(d);
            grouped.set(key, group);
        }

        const resolved: AgentDecision[] = [];
        for (const [, group] of grouped) {
            if (group.length === 1) {
                resolved.push(group[0]);
                continue;
            }

            if (config.conflictStrategy === 'priority') {
                // Highest priority wins
                group.sort((a, b) => b.priority - a.priority);
                resolved.push(group[0]);
            } else {
                // first-wins
                resolved.push(group[0]);
            }
        }

        return resolved;
    }

    function sendMessage(message: AgentMessage): void {
        pendingMessages.push(message);
    }

    function broadcastMsg(from: string, content: string, payload?: Record<string, unknown>): void {
        pendingMessages.push(createMessage(from, null, 'broadcast', content, payload));
    }

    function snapshots(): AgentSnapshot[] {
        return Array.from(agents.values()).map(a => a.snapshot());
    }

    function dispose(): void {
        for (const agent of agents.values()) {
            agent.dispose();
        }
        agents.clear();
        pendingMessages.length = 0;
    }

    return {
        addAgent,
        removeAgent,
        getAgent,
        getAgentsByRole,
        processEvent,
        sendMessage,
        broadcast: broadcastMsg,
        snapshots,
        get size() { return agents.size; },
        dispose,
    };
}

// ─── Event → Role Routing Map ─────────────────────────────────

/**
 * Maps event types to the agent roles that should process them.
 * Omitted types are routed to ALL agents.
 */
const EVENT_ROLE_MAP: Record<string, AgentRole[]> = {
    'turn_complete': ['npc', 'evaluation', 'tutor'],
    'dialogue_start': ['npc', 'evaluation'],
    'dialogue_end': ['npc', 'tutor', 'evaluation', 'world'],
    'session_start': ['tutor', 'world', 'evaluation'],
    'session_end': ['tutor', 'world', 'evaluation'],
    'tick': ['world', 'evaluation'],
    'location_enter': ['npc', 'world'],
    'location_exit': ['world'],
};
