/**
 * Agent System — Comprehensive Test Suite
 *
 * Tests all 5 layers of the agent architecture:
 *   1. AgentMemory — working, episodic, semantic memory
 *   2. AgentToolkit — tool registration, execution, role filtering
 *   3. AgentBase — observe → think → act → reflect loop
 *   4. AgentOrchestrator — pool management, event routing, conflict resolution
 *   5. Specialized agents — NPC, Tutor, World, Evaluation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createAgentMemory,
    createAgentToolkit,
    registerBuiltinTools,
    createAgentBase,
    createMessage,
    createAgentOrchestrator,
    createNPCAgent,
    createTutorAgent,
    createWorldAgent,
    createEvaluationAgent,
} from './index';
import type {
    AgentMemoryInstance,
    AgentToolkitInstance,
    AgentInstance,
    AgentOrchestratorInstance,
    AgentEvent,
    MemoryConfig,
    NPCAgentConfig,
    TutorAgentConfig,
    WorldAgentConfig,
    EvaluationAgentConfig,
} from './index';

// ─── Test Helpers ─────────────────────────────────────────────

function makeMemoryConfig(overrides?: Partial<MemoryConfig>): MemoryConfig {
    return {
        workingMemorySize: 10,
        episodicCapacity: 20,
        recallThreshold: 0.5,
        enableSemantic: true,
        ...overrides,
    };
}

function makeEvent(type: string, data: Record<string, unknown> = {}): AgentEvent {
    return { type, data: { sessionId: 's1', timestamp: Date.now(), schemaId: 'test', ...data }, timestamp: Date.now() };
}

// ═══════════════════════════════════════════════════════════════
// 1. AGENT MEMORY
// ═══════════════════════════════════════════════════════════════

describe('AgentMemory', () => {
    let memory: AgentMemoryInstance;

    beforeEach(() => {
        memory = createAgentMemory(makeMemoryConfig());
    });

    describe('Working Memory', () => {
        it('stores observations in ring buffer', () => {
            memory.observe('first');
            memory.observe('second');
            const items = memory.getWorkingMemory();
            expect(items).toHaveLength(2);
            expect(items[0].content).toBe('first');
            expect(items[1].content).toBe('second');
        });

        it('evicts oldest when buffer is full', () => {
            const small = createAgentMemory(makeMemoryConfig({ workingMemorySize: 3 }));
            small.observe('a');
            small.observe('b');
            small.observe('c');
            small.observe('d'); // 'a' should be evicted
            const items = small.getWorkingMemory();
            expect(items).toHaveLength(3);
            expect(items[0].content).toBe('b');
            expect(items[2].content).toBe('d');
        });

        it('attaches metadata to observations', () => {
            memory.observe('hello', { npcId: 'maria', turnIndex: 5 });
            const items = memory.getWorkingMemory();
            expect(items[0].metadata['npcId']).toBe('maria');
            expect(items[0].metadata['turnIndex']).toBe(5);
        });
    });

    describe('Episodic Memory', () => {
        it('stores and recalls episodes by keyword', async () => {
            await memory.remember({
                content: 'Learner discussed buying fruit at the market',
                metadata: { agentId: 'npc-vendor' },
                timestamp: Date.now(),
                importance: 0.8,
                sessionId: 's1',
                npcId: 'vendor',
                locationId: 'mercado',
            });
            const recalled = await memory.recall('fruit at the market');
            expect(recalled).toHaveLength(1);
            expect(recalled[0].content).toContain('fruit');
        });

        it('returns empty for unrelated queries', async () => {
            await memory.remember({
                content: 'Discussed the weather',
                metadata: { agentId: 'npc-1' },
                timestamp: Date.now(),
                importance: 0.5,
                sessionId: 's1',
            });
            const recalled = await memory.recall('impossible query xyz');
            expect(recalled).toHaveLength(0);
        });

        it('evicts least important when over capacity', async () => {
            const small = createAgentMemory(makeMemoryConfig({ episodicCapacity: 2 }));
            await small.remember({ content: 'low', metadata: { agentId: 'a' }, timestamp: 1, importance: 0.1, sessionId: 's1' });
            await small.remember({ content: 'high', metadata: { agentId: 'a' }, timestamp: 2, importance: 0.9, sessionId: 's1' });
            await small.remember({ content: 'medium', metadata: { agentId: 'a' }, timestamp: 3, importance: 0.5, sessionId: 's1' });

            const snap = small.snapshot();
            expect(snap.episodicMemorySize).toBeLessThanOrEqual(2);
        });
    });

    describe('Semantic Memory', () => {
        it('stores and retrieves facts by category', () => {
            memory.learn({
                content: 'Learner struggles with subjunctive',
                metadata: {},
                timestamp: Date.now(),
                importance: 0.9,
                category: 'grammar',
                confidence: 0.8,
                evidence: ['turn-5'],
                superseded: false,
            });
            const grammarFacts = memory.getFacts('grammar');
            expect(grammarFacts).toHaveLength(1);
            expect(grammarFacts[0].confidence).toBe(0.8);
        });

        it('updates existing facts with higher confidence', () => {
            memory.learn({
                content: 'Knows basic greetings',
                metadata: {},
                timestamp: Date.now(),
                importance: 0.5,
                category: 'vocabulary',
                confidence: 0.6,
                evidence: ['turn-1'],
                superseded: false,
            });
            memory.learn({
                content: 'Knows basic greetings',
                metadata: {},
                timestamp: Date.now(),
                importance: 0.5,
                category: 'vocabulary',
                confidence: 0.9,
                evidence: ['turn-10'],
                superseded: false,
            });
            const facts = memory.getFacts('vocabulary');
            expect(facts).toHaveLength(1);
            expect(facts[0].confidence).toBe(0.9);
            expect(facts[0].evidence).toHaveLength(2);
        });

        it('filters superseded facts', () => {
            memory.learn({
                content: 'Old fact',
                metadata: {},
                timestamp: Date.now(),
                importance: 0.3,
                category: 'grammar',
                confidence: 0.5,
                evidence: [],
                superseded: true,
            });
            expect(memory.getFacts('grammar')).toHaveLength(0);
        });
    });

    describe('Summarize', () => {
        it('produces a readable summary', () => {
            memory.observe('Turn 1: Hello');
            memory.learn({
                content: 'Knows vocab X',
                metadata: {},
                timestamp: Date.now(),
                importance: 0.5,
                category: 'vocabulary',
                confidence: 0.7,
                evidence: [],
                superseded: false,
            });
            const summary = memory.summarize();
            expect(summary).toContain('Working Memory');
            expect(summary).toContain('Known Facts');
            expect(summary).toContain('vocabulary');
        });
    });

    describe('Forget & Clear', () => {
        it('forgets memories older than threshold', async () => {
            await memory.remember({ content: 'old', metadata: { agentId: 'a' }, timestamp: 1000, importance: 0.5, sessionId: 's1' });
            await memory.remember({ content: 'new', metadata: { agentId: 'a' }, timestamp: Date.now(), importance: 0.5, sessionId: 's1' });
            memory.forget(5000);
            const recalled = await memory.recall('old');
            expect(recalled).toHaveLength(0);
        });

        it('clears all memory', () => {
            memory.observe('test');
            memory.clear();
            expect(memory.getWorkingMemory()).toHaveLength(0);
            expect(memory.snapshot().workingMemorySize).toBe(0);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// 2. AGENT TOOLKIT
// ═══════════════════════════════════════════════════════════════

describe('AgentToolkit', () => {
    let toolkit: AgentToolkitInstance;

    beforeEach(() => {
        toolkit = createAgentToolkit();
    });

    it('registers and retrieves tools', () => {
        toolkit.register({
            name: 'test_tool',
            description: 'A test tool',
            availableTo: ['npc'],
            parameters: {},
            execute: async () => ({ toolName: 'test_tool', success: true, data: 42, timestamp: Date.now() }),
        });
        expect(toolkit.size).toBe(1);
        expect(toolkit.getTool('test_tool')).toBeDefined();
    });

    it('filters tools by role', () => {
        toolkit.register({
            name: 'npc_only',
            description: 'NPC tool',
            availableTo: ['npc'],
            parameters: {},
            execute: async () => ({ toolName: 'npc_only', success: true, data: null, timestamp: Date.now() }),
        });
        toolkit.register({
            name: 'tutor_only',
            description: 'Tutor tool',
            availableTo: ['tutor'],
            parameters: {},
            execute: async () => ({ toolName: 'tutor_only', success: true, data: null, timestamp: Date.now() }),
        });
        expect(toolkit.getToolsForRole('npc')).toHaveLength(1);
        expect(toolkit.getToolsForRole('npc')[0].name).toBe('npc_only');
        expect(toolkit.getToolsForRole('tutor')).toHaveLength(1);
    });

    it('executes tools and returns observations', async () => {
        toolkit.register({
            name: 'add',
            description: 'Add two numbers',
            availableTo: ['npc'],
            parameters: { a: 'number', b: 'number' },
            execute: async (params) => ({
                toolName: 'add',
                success: true,
                data: Number(params['a']) + Number(params['b']),
                timestamp: Date.now(),
            }),
        });
        const result = await toolkit.execute('add', { a: 3, b: 7 });
        expect(result.success).toBe(true);
        expect(result.data).toBe(10);
    });

    it('returns error for unknown tools', async () => {
        const result = await toolkit.execute('nonexistent', {});
        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
    });

    it('generates tool descriptions', () => {
        toolkit.register({
            name: 'my_tool',
            description: 'Does something cool',
            availableTo: ['npc', 'tutor'],
            parameters: {},
            execute: async () => ({ toolName: 'my_tool', success: true, data: null, timestamp: Date.now() }),
        });
        const desc = toolkit.describeTools('npc');
        expect(desc).toContain('my_tool');
        expect(desc).toContain('Does something cool');
    });

    it('registers builtin tools from providers', () => {
        registerBuiltinTools(toolkit, {
            generateText: async () => 'hello',
            getWorldState: () => ({ location: 'mercado' }),
        });
        expect(toolkit.getTool('generate_text')).toBeDefined();
        expect(toolkit.getTool('get_world_state')).toBeDefined();
    });
});

// ═══════════════════════════════════════════════════════════════
// 3. AGENT BASE
// ═══════════════════════════════════════════════════════════════

describe('AgentBase', () => {
    it('runs observe → think → act → reflect cycle', async () => {
        const phases: string[] = [];
        const toolkit = createAgentToolkit();
        const agent = createAgentBase(
            {
                id: 'test-1',
                role: 'npc',
                name: 'Test Agent',
                maxReasoningSteps: 3,
                strategy: 'reactive',
                memory: makeMemoryConfig(),
            },
            toolkit,
            {
                onObserve: (event, memory) => {
                    phases.push('observe');
                    memory.observe(String(event.data['text'] ?? 'event'));
                },
                onThink: async () => {
                    phases.push('think');
                    return [{
                        type: 'speak',
                        agentId: 'test-1',
                        confidence: 0.9,
                        reasoning: 'test',
                        payload: { text: 'Hola' },
                        priority: 5,
                        timestamp: Date.now(),
                    }];
                },
                onAct: (decisions) => {
                    phases.push('act');
                    return decisions;
                },
                onReflect: () => {
                    phases.push('reflect');
                },
            },
        );

        const decisions = await agent.process(makeEvent('turn_complete', { text: 'Hello' }));

        expect(phases).toEqual(['observe', 'think', 'act', 'reflect']);
        expect(decisions).toHaveLength(1);
        expect(decisions[0].type).toBe('speak');
        expect(agent.getState()).toBe('idle');
    });

    it('receives and processes inter-agent messages', async () => {
        const toolkit = createAgentToolkit();
        let receivedMessages: unknown[] = [];
        const agent = createAgentBase(
            {
                id: 'receiver',
                role: 'npc',
                name: 'Receiver',
                maxReasoningSteps: 1,
                strategy: 'reactive',
                memory: makeMemoryConfig(),
            },
            toolkit,
            {
                onObserve: () => { },
                onThink: async (_mem, _tk, inbox) => {
                    receivedMessages = inbox;
                    return [];
                },
            },
        );

        agent.receiveMessage(createMessage('tutor', 'receiver', 'directive', 'Focus on subjunctive'));
        await agent.process(makeEvent('turn_complete'));

        expect(receivedMessages).toHaveLength(1);
        expect((receivedMessages[0] as { content: string }).content).toBe('Focus on subjunctive');
    });

    it('generates correct snapshot', async () => {
        const toolkit = createAgentToolkit();
        const agent = createAgentBase(
            { id: 'snap-test', role: 'tutor', name: 'Snap', maxReasoningSteps: 1, strategy: 'reactive', memory: makeMemoryConfig() },
            toolkit,
            {
                onObserve: () => { },
                onThink: async () => [{ type: 'no_action', agentId: 'snap-test', confidence: 1, reasoning: 'test', payload: {}, priority: 1, timestamp: Date.now() }],
            },
        );

        await agent.process(makeEvent('tick'));
        const snap = agent.snapshot();
        expect(snap.id).toBe('snap-test');
        expect(snap.decisionCount).toBe(1);
        expect(snap.state).toBe('idle');
    });
});

// ═══════════════════════════════════════════════════════════════
// 4. AGENT ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

describe('AgentOrchestrator', () => {
    let orchestrator: AgentOrchestratorInstance;
    let toolkit: AgentToolkitInstance;

    beforeEach(() => {
        toolkit = createAgentToolkit();
        orchestrator = createAgentOrchestrator({
            toolkit,
            maxDecisionsPerTick: 20,
            enableMessaging: true,
            conflictStrategy: 'priority',
        });
    });

    it('manages agent pool', () => {
        const agent = createAgentBase(
            { id: 'a1', role: 'npc', name: 'A1', maxReasoningSteps: 1, strategy: 'reactive', memory: makeMemoryConfig() },
            toolkit,
            { onObserve: () => { }, onThink: async () => [] },
        );
        orchestrator.addAgent(agent);
        expect(orchestrator.size).toBe(1);
        expect(orchestrator.getAgent('a1')).toBeDefined();
        expect(orchestrator.getAgentsByRole('npc')).toHaveLength(1);
    });

    it('routes events to correct agents', async () => {
        const called: string[] = [];
        const npcAgent = createAgentBase(
            { id: 'npc-1', role: 'npc', name: 'NPC', maxReasoningSteps: 1, strategy: 'reactive', memory: makeMemoryConfig() },
            toolkit,
            { onObserve: () => { called.push('npc'); }, onThink: async () => [] },
        );
        const worldAgent = createAgentBase(
            { id: 'world-1', role: 'world', name: 'World', maxReasoningSteps: 1, strategy: 'reactive', memory: makeMemoryConfig() },
            toolkit,
            { onObserve: () => { called.push('world'); }, onThink: async () => [] },
        );

        orchestrator.addAgent(npcAgent);
        orchestrator.addAgent(worldAgent);

        // 'turn_complete' should route to NPC but NOT world
        await orchestrator.processEvent(makeEvent('turn_complete'));
        expect(called).toContain('npc');
        expect(called).not.toContain('world');
    });

    it('resolves conflicts by priority', async () => {
        const low = createAgentBase(
            { id: 'low', role: 'tutor', name: 'Low', maxReasoningSteps: 1, strategy: 'reactive', memory: makeMemoryConfig() },
            toolkit,
            {
                onObserve: () => { },
                onThink: async () => [{ type: 'adjust_pressure', agentId: 'low', confidence: 0.5, reasoning: 'low priority', payload: { level: 0.3 }, priority: 2, timestamp: Date.now() }],
            },
        );
        const high = createAgentBase(
            { id: 'high', role: 'evaluation', name: 'High', maxReasoningSteps: 1, strategy: 'reactive', memory: makeMemoryConfig() },
            toolkit,
            {
                onObserve: () => { },
                onThink: async () => [{ type: 'adjust_pressure', agentId: 'high', confidence: 0.9, reasoning: 'high priority', payload: { level: 0.8 }, priority: 8, timestamp: Date.now() }],
            },
        );

        orchestrator.addAgent(high);
        orchestrator.addAgent(low);

        const decisions = await orchestrator.processEvent(makeEvent('session_start'));
        const pressureDecisions = decisions.filter(d => d.type === 'adjust_pressure');
        // Priority resolution: only one should survive, and it should be the high-priority one
        expect(pressureDecisions).toHaveLength(1);
        expect(pressureDecisions[0].agentId).toBe('high');
    });

    it('delivers inter-agent messages', async () => {
        let received = false;
        const sender = createAgentBase(
            { id: 'sender', role: 'tutor', name: 'Sender', maxReasoningSteps: 1, strategy: 'reactive', memory: makeMemoryConfig() },
            toolkit,
            {
                onObserve: () => { },
                onThink: async () => [{
                    type: 'send_message',
                    agentId: 'sender',
                    confidence: 1,
                    reasoning: 'send directive',
                    payload: { message: createMessage('sender', 'receiver', 'directive', 'Do X') },
                    priority: 5,
                    timestamp: Date.now(),
                }],
            },
        );
        const receiver = createAgentBase(
            { id: 'receiver', role: 'npc', name: 'Receiver', maxReasoningSteps: 1, strategy: 'reactive', memory: makeMemoryConfig() },
            toolkit,
            {
                onObserve: () => { },
                onThink: async (_m, _t, inbox) => { if (inbox.length > 0) received = true; return []; },
            },
        );

        orchestrator.addAgent(sender);
        orchestrator.addAgent(receiver);

        // First tick: sender emits message
        await orchestrator.processEvent(makeEvent('session_start'));
        // Second tick: message is delivered to receiver
        await orchestrator.processEvent(makeEvent('turn_complete', { speaker: 'learner', text: 'hola' }));

        expect(received).toBe(true);
    });

    it('snapshots all agents', () => {
        const a = createAgentBase(
            { id: 'a', role: 'npc', name: 'A', maxReasoningSteps: 1, strategy: 'reactive', memory: makeMemoryConfig() },
            toolkit,
            { onObserve: () => { }, onThink: async () => [] },
        );
        orchestrator.addAgent(a);
        const snaps = orchestrator.snapshots();
        expect(snaps).toHaveLength(1);
        expect(snaps[0].id).toBe('a');
    });

    it('disposes all agents', () => {
        const a = createAgentBase(
            { id: 'a', role: 'npc', name: 'A', maxReasoningSteps: 1, strategy: 'reactive', memory: makeMemoryConfig() },
            toolkit,
            { onObserve: () => { }, onThink: async () => [] },
        );
        orchestrator.addAgent(a);
        orchestrator.dispose();
        expect(orchestrator.size).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════
// 5. SPECIALIZED AGENTS
// ═══════════════════════════════════════════════════════════════

describe('NPC Agent', () => {
    const npcConfig: NPCAgentConfig = {
        npcId: 'maria',
        npcName: 'María',
        role: 'vendor',
        register: 'informal',
        personality: {
            openness: 0.8, conscientiousness: 0.5, extraversion: 0.9,
            agreeableness: 0.7, neuroticism: 0.2, directness: 0.6,
            formality: 0.3, emotionalExpressiveness: 0.8,
        },
        vocabularyFocus: ['food', 'market', 'transactions'],
        patienceLevel: 0.8,
        initialMood: 'happy',
        initialReputation: 0.5,
    };

    it('creates with correct identity', () => {
        const toolkit = createAgentToolkit();
        const agent = createNPCAgent(npcConfig, toolkit);
        expect(agent.id).toBe('npc-maria');
        expect(agent.role).toBe('npc');
        expect(agent.name).toBe('María');
    });

    it('generates speak decision on learner input', async () => {
        const toolkit = createAgentToolkit();
        const agent = createNPCAgent(npcConfig, toolkit);

        const decisions = await agent.process(makeEvent('turn_complete', {
            speaker: 'learner',
            text: 'Buenos días, quiero comprar manzanas',
            frictionEvents: [],
            npcId: 'maria',
        }));

        expect(decisions).toHaveLength(1);
        expect(decisions[0].type).toBe('speak');
        expect(decisions[0].payload['npcId']).toBe('maria');
        expect(decisions[0].payload['text']).toBeDefined();
    });

    it('does not generate speech for NPC turns', async () => {
        const toolkit = createAgentToolkit();
        const agent = createNPCAgent(npcConfig, toolkit);
        const decisions = await agent.process(makeEvent('turn_complete', { speaker: 'npc', text: 'Hola' }));
        expect(decisions).toHaveLength(0);
    });

    it('stores episodic memory on dialogue end', async () => {
        const toolkit = createAgentToolkit();
        const agent = createNPCAgent(npcConfig, toolkit);

        // Start a dialogue
        await agent.process(makeEvent('dialogue_start', { npcId: 'maria', locationId: 'mercado' }));
        await agent.process(makeEvent('turn_complete', { speaker: 'learner', text: 'Hola', frictionEvents: [], npcId: 'maria' }));
        await agent.process(makeEvent('dialogue_end', { npcId: 'maria', outcome: 'success', locationId: 'mercado' }));

        const memory = agent.getMemory();
        const recalled = await memory.recall('Conversation');
        expect(recalled.length).toBeGreaterThan(0);
    });
});

describe('Tutor Agent', () => {
    const tutorConfig: TutorAgentConfig = {
        currentTier: 1,
        targetCompetencies: ['greetings', 'transactions'],
        learnerL1: 'en',
        sessionObjectives: ['Learn market vocabulary'],
        interventionThreshold: 0.3,
        enableForwardInjection: true,
    };

    it('creates with correct identity', () => {
        const toolkit = createAgentToolkit();
        const agent = createTutorAgent(tutorConfig, toolkit);
        expect(agent.id).toBe('tutor-main');
        expect(agent.role).toBe('tutor');
    });

    it('injects directive on recurring friction', async () => {
        const toolkit = createAgentToolkit();
        const agent = createTutorAgent(tutorConfig, toolkit);

        // Send multiple turns with same friction type
        for (let i = 0; i < 3; i++) {
            await agent.process(makeEvent('turn_complete', {
                speaker: 'learner',
                text: 'Yo quiero el manzanas',
                npcId: 'maria',
                frictionEvents: [{ type: 'morphosyntactic_error', form: 'el manzanas' }],
            }));
        }

        // The tutor should have generated an inject decision
        const lastDecisions = await agent.process(makeEvent('turn_complete', {
            speaker: 'learner',
            text: 'Dame el manzanas',
            npcId: 'maria',
            frictionEvents: [{ type: 'morphosyntactic_error', form: 'el manzanas' }],
        }));

        const injects = lastDecisions.filter(d => d.type === 'inject');
        expect(injects.length).toBeGreaterThanOrEqual(1);
        expect(injects[0].payload['directive']).toContain('manzanas');
    });
});

describe('World Agent', () => {
    const worldConfig: WorldAgentConfig = {
        locationIds: ['mercado', 'plaza', 'cafe'],
        npcIds: ['maria', 'pedro', 'lucia'],
        currentTier: 1,
        eventTemplates: [
            {
                id: 'festival',
                type: 'festival',
                description: 'Town festival',
                minLevel: 'A1',
                targetCompetencies: ['greetings', 'social'],
                duration: 300,
                involvedNpcs: ['maria', 'pedro'],
                locationId: 'plaza',
            },
        ],
        eventCheckInterval: 30,
    };

    it('creates with correct identity', () => {
        const toolkit = createAgentToolkit();
        const agent = createWorldAgent(worldConfig, toolkit);
        expect(agent.id).toBe('world-main');
        expect(agent.role).toBe('world');
    });

    it('fires events on tick interval', async () => {
        const toolkit = createAgentToolkit();
        const agent = createWorldAgent(worldConfig, toolkit);

        // First tick at t=0
        await agent.process(makeEvent('tick', { elapsedSeconds: 0 }));
        // Tick past interval
        const decisions = await agent.process(makeEvent('tick', { elapsedSeconds: 31 }));

        const eventDecisions = decisions.filter(d => d.type === 'fire_event');
        expect(eventDecisions.length).toBeGreaterThanOrEqual(1);
    });

    it('tracks narrative arc progress', async () => {
        const toolkit = createAgentToolkit();
        const agent = createWorldAgent(worldConfig, toolkit);

        // Trigger tick to start a narrative arc
        await agent.process(makeEvent('tick', { elapsedSeconds: 0 }));

        // Complete a dialogue with one of the NPCs
        await agent.process(makeEvent('dialogue_end', { npcId: 'maria', outcome: 'success' }));

        // Memory should contain the dialogue result
        const memory = agent.getMemory();
        const items = memory.getWorkingMemory();
        expect(items.some(i => i.content.includes('maria'))).toBe(true);
    });
});

describe('Evaluation Agent', () => {
    const evalConfig: EvaluationAgentConfig = {
        currentTier: 1,
        affectiveBaseline: {
            responseLatency: 2000,
            l1FallbackRate: 0.1,
            hedgingFrequency: 0.05,
            pauseDuration: 500,
            topicAvoidanceRate: 0.02,
            repairAttemptRate: 0.1,
        },
        escalationThreshold: 0.7,
        broadcastInterval: 3,
    };

    it('creates with correct identity', () => {
        const toolkit = createAgentToolkit();
        const agent = createEvaluationAgent(evalConfig, toolkit);
        expect(agent.id).toBe('evaluation-main');
        expect(agent.role).toBe('evaluation');
    });

    it('computes metrics from learner turns', async () => {
        const toolkit = createAgentToolkit();
        const agent = createEvaluationAgent(evalConfig, toolkit);

        await agent.process(makeEvent('turn_complete', {
            speaker: 'learner',
            text: 'Buenos días señora quiero comprar manzanas',
            frictionEvents: [],
            responseLatency: 1500,
        }));

        const snap = agent.snapshot();
        expect(snap.decisionCount).toBe(0); // No escalation needed for good input
    });

    it('triggers escalation on high frustration', async () => {
        const toolkit = createAgentToolkit();
        const agent = createEvaluationAgent(evalConfig, toolkit);

        // Simulate frustrated learner: high latency, many frictions, L1 fallback
        for (let i = 0; i < 5; i++) {
            await agent.process(makeEvent('turn_complete', {
                speaker: 'learner',
                text: 'Um... the... cosa...',
                frictionEvents: [
                    { type: 'lexical_gap', form: 'cosa' },
                    { type: 'morphosyntactic_error', form: 'the' },
                    { type: 'lexical_gap', form: 'um' },
                ],
                responseLatency: 6000,
                l1FallbackRate: 0.8,
                hedgingFrequency: 0.5,
                repairAttempts: 0,
            }));
        }

        const snap = agent.snapshot();
        // Should have triggered escalation and/or pressure adjustment
        expect(snap.decisionCount).toBeGreaterThan(0);
    });

    it('broadcasts metrics at configured interval', async () => {
        const toolkit = createAgentToolkit();
        const agent = createEvaluationAgent({ ...evalConfig, broadcastInterval: 2 }, toolkit);

        // Turn 1
        await agent.process(makeEvent('turn_complete', {
            speaker: 'learner', text: 'Hola', frictionEvents: [], responseLatency: 1000,
        }));

        // Turn 2 — should broadcast
        const decisions = await agent.process(makeEvent('turn_complete', {
            speaker: 'learner', text: 'Buenos días', frictionEvents: [], responseLatency: 1200,
        }));

        const broadcasts = decisions.filter(d => d.type === 'send_message');
        expect(broadcasts).toHaveLength(1);
        expect((broadcasts[0].payload['message'] as { type: string }).type).toBe('observation');
    });
});
