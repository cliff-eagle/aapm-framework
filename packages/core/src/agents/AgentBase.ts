/**
 * AgentBase — Abstract base agent for the AAPM agent system.
 *
 * All specialized agents (NPC, Tutor, World, Evaluation) extend this.
 * Provides the Observe → Think → Act → Reflect loop with:
 *   - Dual-layer memory (working + episodic + semantic)
 *   - Typed tool invocation
 *   - Inter-agent messaging
 *   - Lifecycle hooks compatible with ModuleHookRegistry
 *
 * @module agents/AgentBase
 * @patentCritical Claim 14 — Agent Reasoning Architecture
 */

import type {
    AgentConfig,
    AgentState,
    AgentDecision,
    AgentMessage,
    AgentPlan,
    PlanStep,
    AgentObservation,
    AgentSnapshot,
} from './AgentTypes';
import type { AgentMemoryInstance } from './AgentMemory';
import { createAgentMemory } from './AgentMemory';
import type { AgentToolkitInstance } from './AgentToolkit';

// ─── Agent Lifecycle Events ───────────────────────────────────

export interface AgentEvent {
    type: string;
    data: Record<string, unknown>;
    timestamp: number;
}

// ─── Agent Base ───────────────────────────────────────────────

export interface AgentInstance {
    /** Agent identity */
    readonly id: string;
    readonly role: AgentConfig['role'];
    readonly name: string;

    /** Current state */
    getState(): AgentState;

    /** Process an event through the observe → think → act loop */
    process(event: AgentEvent): Promise<AgentDecision[]>;

    /** Receive an inter-agent message */
    receiveMessage(message: AgentMessage): void;

    /** Get queued outgoing messages */
    flushMessages(): AgentMessage[];

    /** Get the agent's memory */
    getMemory(): AgentMemoryInstance;

    /** Get a snapshot for debugging */
    snapshot(): AgentSnapshot;

    /** Dispose */
    dispose(): void;
}

/**
 * Create a base agent with the observe-think-act-reflect loop.
 *
 * Specialized agents provide:
 *   - `onObserve(event)` — extract relevant info from events
 *   - `onThink(context)` — reason about what to do
 *   - `onAct(decisions)` — post-process decisions
 *   - `onReflect(decisions)` — learn from outcomes
 */
export interface AgentHandlers {
    /** Extract relevant info from an event into working memory */
    onObserve(event: AgentEvent, memory: AgentMemoryInstance): void;
    /** Reason about observations and produce decisions */
    onThink(
        memory: AgentMemoryInstance,
        toolkit: AgentToolkitInstance,
        inbox: AgentMessage[],
    ): Promise<AgentDecision[]>;
    /** Post-process decisions before they're emitted */
    onAct?(decisions: AgentDecision[]): AgentDecision[];
    /** Learn from outcomes */
    onReflect?(decisions: AgentDecision[], memory: AgentMemoryInstance): void;
}

export function createAgentBase(
    config: AgentConfig,
    toolkit: AgentToolkitInstance,
    handlers: AgentHandlers,
): AgentInstance {
    let state: AgentState = 'idle';
    const memory = createAgentMemory(config.memory);
    const inbox: AgentMessage[] = [];
    const outbox: AgentMessage[] = [];
    let decisionCount = 0;
    let messageSentCount = 0;
    let activePlan: AgentPlan | undefined;

    async function process(event: AgentEvent): Promise<AgentDecision[]> {
        // ── Phase 1: OBSERVE ──
        state = 'observing';
        handlers.onObserve(event, memory);

        // ── Phase 2: THINK ──
        state = 'thinking';
        let decisions: AgentDecision[];

        if (config.strategy === 'deliberative' && !activePlan) {
            // Deliberative: plan first, then execute steps
            decisions = await thinkDeliberative();
        } else {
            // Reactive: single-step reasoning
            decisions = await handlers.onThink(memory, toolkit, [...inbox]);
        }

        // Clear processed messages
        inbox.length = 0;

        // ── Phase 3: ACT ──
        state = 'acting';
        if (handlers.onAct) {
            decisions = handlers.onAct(decisions);
        }
        decisionCount += decisions.length;

        // ── Phase 4: REFLECT ──
        state = 'reflecting';
        if (handlers.onReflect) {
            handlers.onReflect(decisions, memory);
        }

        state = 'idle';
        return decisions;
    }

    async function thinkDeliberative(): Promise<AgentDecision[]> {
        // Use the think handler to get a plan or immediate decisions
        const decisions = await handlers.onThink(memory, toolkit, [...inbox]);

        // If any decision has a multi-step plan, track it
        for (const d of decisions) {
            if (d.payload['plan'] && Array.isArray((d.payload['plan'] as AgentPlan).steps)) {
                activePlan = d.payload['plan'] as AgentPlan;
            }
        }

        return decisions;
    }

    function receiveMessage(message: AgentMessage): void {
        inbox.push(message);
    }

    function flushMessages(): AgentMessage[] {
        const messages = [...outbox];
        outbox.length = 0;
        messageSentCount += messages.length;
        return messages;
    }

    function getState(): AgentState {
        return state;
    }

    function getMemory(): AgentMemoryInstance {
        return memory;
    }

    function snapshot(): AgentSnapshot {
        return {
            id: config.id,
            state,
            workingMemorySummary: memory.summarize(),
            activePlan,
            decisionCount,
            messageSentCount,
        };
    }

    function dispose(): void {
        memory.clear();
        inbox.length = 0;
        outbox.length = 0;
        state = 'idle';
    }

    return {
        id: config.id,
        role: config.role,
        name: config.name,
        getState,
        process,
        receiveMessage,
        flushMessages,
        getMemory,
        snapshot,
        dispose,
    };
}

// ─── Helper: Create an AgentMessage ───────────────────────────

let messageCounter = 0;

export function createMessage(
    from: string,
    to: string | null,
    type: AgentMessage['type'],
    content: string,
    payload?: Record<string, unknown>,
    priority: number = 5,
): AgentMessage {
    return {
        id: `msg-${++messageCounter}`,
        from,
        to,
        type,
        content,
        payload,
        timestamp: Date.now(),
        priority,
    };
}

// ─── Helper: Execute a Plan Step ──────────────────────────────

export async function executePlanStep(
    step: PlanStep,
    toolkit: AgentToolkitInstance,
): Promise<AgentObservation | null> {
    if (!step.toolName) return null; // Thinking step, no tool call

    step.status = 'running';
    try {
        const observation = await toolkit.execute(step.toolName, step.toolParams ?? {});
        step.status = observation.success ? 'completed' : 'failed';
        step.result = observation.data;
        return observation;
    } catch {
        step.status = 'failed';
        return null;
    }
}
