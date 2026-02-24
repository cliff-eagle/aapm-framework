/**
 * Agent Types — Shared types for the AAPM agent system.
 *
 * All agents extend AgentBase and share these core types for
 * configuration, messaging, decision-making, and tool invocation.
 *
 * @module agents/AgentTypes
 * @patentCritical Claim 14 — Autonomous Agent Architecture
 */

// ─── Agent Identity ───────────────────────────────────────────

export type AgentRole = 'npc' | 'tutor' | 'world' | 'evaluation';

export interface AgentConfig {
    /** Unique agent instance ID (e.g., 'npc-maria', 'tutor-main') */
    id: string;
    /** Agent role — determines available tools and lifecycle hooks */
    role: AgentRole;
    /** Display name for logging/debugging */
    name: string;
    /** LLM model to use for reasoning (defaults to session default) */
    modelOverride?: string;
    /** Maximum reasoning steps before forced action */
    maxReasoningSteps: number;
    /** Reasoning strategy */
    strategy: 'reactive' | 'deliberative';
    /** Memory configuration */
    memory: MemoryConfig;
}

export interface MemoryConfig {
    /** Max items in working memory ring buffer */
    workingMemorySize: number;
    /** Max episodic memories to retain per session */
    episodicCapacity: number;
    /** Similarity threshold for episodic recall (0.0–1.0) */
    recallThreshold: number;
    /** Enable semantic (fact-based) memory */
    enableSemantic: boolean;
}

// ─── Agent Messaging ──────────────────────────────────────────

export type MessageType =
    | 'request'       // Agent asks another agent for something
    | 'response'      // Reply to a request
    | 'broadcast'     // Announcement to all agents
    | 'directive'     // Authoritative instruction (Tutor → NPC)
    | 'observation';  // Raw data from the environment

export interface AgentMessage {
    /** Unique message ID */
    id: string;
    /** Sender agent ID */
    from: string;
    /** Recipient agent ID (null for broadcast) */
    to: string | null;
    /** Message type */
    type: MessageType;
    /** Message content */
    content: string;
    /** Structured payload */
    payload?: Record<string, unknown>;
    /** Timestamp */
    timestamp: number;
    /** Priority (0 = lowest, 10 = highest) */
    priority: number;
}

// ─── Agent Decisions ──────────────────────────────────────────

export type DecisionType =
    | 'speak'           // NPC generates dialogue response
    | 'inject'          // Tutor injects forward directive
    | 'fire_event'      // World fires ambient event
    | 'move_npc'        // World moves NPC to new location
    | 'adjust_pressure' // Evaluation adjusts communicative pressure
    | 'escalate'        // Evaluation triggers scaffolding escalation
    | 'advance_tier'    // Tutor recommends tier advancement
    | 'schedule_review'  // Tutor schedules retention review
    | 'send_message'    // Inter-agent message
    | 'no_action';      // Deliberately do nothing

export interface AgentDecision {
    /** Decision type */
    type: DecisionType;
    /** Agent making the decision */
    agentId: string;
    /** Confidence in this decision (0.0–1.0) */
    confidence: number;
    /** Human-readable reasoning chain */
    reasoning: string;
    /** Structured action payload */
    payload: Record<string, unknown>;
    /** Priority for conflict resolution */
    priority: number;
    /** Timestamp */
    timestamp: number;
}

// ─── Agent Planning ───────────────────────────────────────────

export interface AgentPlan {
    /** Plan ID */
    id: string;
    /** Agent that created the plan */
    agentId: string;
    /** Goal this plan tries to achieve */
    goal: string;
    /** Ordered steps */
    steps: PlanStep[];
    /** Current step index */
    currentStep: number;
    /** Plan status */
    status: 'active' | 'completed' | 'failed' | 'abandoned';
    /** Created timestamp */
    createdAt: number;
}

export interface PlanStep {
    /** Step description */
    description: string;
    /** Tool to invoke (null for thinking steps) */
    toolName?: string;
    /** Tool parameters */
    toolParams?: Record<string, unknown>;
    /** Dependencies on other step indices */
    dependsOn: number[];
    /** Step status */
    status: 'pending' | 'running' | 'completed' | 'failed';
    /** Step result */
    result?: unknown;
}

// ─── Agent Tools ──────────────────────────────────────────────

export interface AgentTool {
    /** Tool name (e.g., 'compose_prompt', 'generate_text') */
    name: string;
    /** Human-readable description for LLM tool use */
    description: string;
    /** Which agent roles can use this tool */
    availableTo: AgentRole[];
    /** Parameter schema (JSON Schema format) */
    parameters: Record<string, unknown>;
    /** Execute the tool */
    execute(params: Record<string, unknown>): Promise<AgentObservation>;
}

export interface AgentObservation {
    /** Tool that produced this observation */
    toolName: string;
    /** Whether the tool call succeeded */
    success: boolean;
    /** Result data */
    data: unknown;
    /** Error message if failed */
    error?: string;
    /** Timestamp */
    timestamp: number;
}

// ─── Agent Lifecycle ──────────────────────────────────────────

export type AgentState = 'idle' | 'observing' | 'thinking' | 'acting' | 'reflecting';

export interface AgentSnapshot {
    /** Agent ID */
    id: string;
    /** Current state */
    state: AgentState;
    /** Working memory summary */
    workingMemorySummary: string;
    /** Active plan (if any) */
    activePlan?: AgentPlan;
    /** Decisions made this session */
    decisionCount: number;
    /** Messages sent this session */
    messageSentCount: number;
}
