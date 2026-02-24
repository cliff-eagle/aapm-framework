/**
 * @module agents
 *
 * Agent System — Autonomous agents for the AAPM framework.
 *
 * Five-layer architecture:
 *   1. AgentTypes — Shared types (config, messages, decisions, tools)
 *   2. AgentMemory — 3-tier memory (working, episodic, semantic)
 *   3. AgentToolkit — Wraps existing modules as agent tools
 *   4. AgentBase — Observe → Think → Act → Reflect loop
 *   5. AgentOrchestrator — Pool management, routing, conflict resolution
 *
 * Four specialized agents:
 *   - NPCAgent — Personality-driven conversational agent per NPC
 *   - TutorAgent — Session-wide learning overseer
 *   - WorldAgent — Narrative and environment manager
 *   - EvaluationAgent — Real-time competency assessment
 *
 * @patentCritical Claim 14 — Autonomous Agent Architecture
 */

// ─── Base Framework ───────────────────────────────────────────

export type {
    AgentRole,
    AgentConfig,
    MemoryConfig,
    MessageType,
    AgentMessage,
    DecisionType,
    AgentDecision,
    AgentPlan,
    PlanStep,
    AgentTool,
    AgentObservation,
    AgentState,
    AgentSnapshot,
} from './AgentTypes';

export type {
    MemoryItem,
    EpisodicMemory,
    SemanticFact,
    MemoryVectorStore,
    EmbedFunction,
    AgentMemoryInstance,
    MemorySnapshot,
} from './AgentMemory';
export { createAgentMemory } from './AgentMemory';

export type {
    AgentToolkitInstance,
    ToolProviders,
} from './AgentToolkit';
export { createAgentToolkit, registerBuiltinTools } from './AgentToolkit';

export type {
    AgentEvent,
    AgentInstance,
    AgentHandlers,
} from './AgentBase';
export { createAgentBase, createMessage, executePlanStep } from './AgentBase';

export type {
    AgentOrchestratorConfig,
    AgentOrchestratorInstance,
} from './AgentOrchestrator';
export { createAgentOrchestrator } from './AgentOrchestrator';

// ─── NPC Agent ────────────────────────────────────────────────

export type {
    NPCPersonality,
    NPCAgentConfig,
} from './npc/NPCAgent';
export { createNPCAgent } from './npc/NPCAgent';

// ─── Tutor Agent ──────────────────────────────────────────────

export type {
    TutorAgentConfig,
} from './tutor/TutorAgent';
export { createTutorAgent } from './tutor/TutorAgent';

// ─── World Agent ──────────────────────────────────────────────

export type {
    WorldAgentConfig,
    EventTemplate,
} from './world/WorldAgent';
export { createWorldAgent } from './world/WorldAgent';

// ─── Evaluation Agent ─────────────────────────────────────────

export type {
    EvaluationAgentConfig,
    AffectiveBaseline,
    AffectiveState,
} from './evaluation/EvaluationAgent';
export { createEvaluationAgent } from './evaluation/EvaluationAgent';
