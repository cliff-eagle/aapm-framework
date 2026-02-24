/**
 * NPC Agent — Personality-driven conversational agent per NPC.
 *
 * Each active NPC in the world gets its own NPCAgent instance.
 * The agent:
 *   - Generates dialogue responses using Big Five personality + mood + reputation
 *   - Remembers past conversations via episodic memory
 *   - Adapts vocabulary complexity to learner's interlanguage stage
 *   - Steers conversations toward Tutor-injected target friction points
 *   - Models emotional responses to interaction quality
 *
 * Integrates with:
 *   - PromptComposer (4-layer prompt stack)
 *   - CulturalIntelligence (register/norm checking)
 *   - AgentMemory (conversation history + relationship arc)
 *   - Inter-agent: receives directives from TutorAgent
 *
 * @module agents/npc/NPCAgent
 * @patentCritical Claim 14 — NPC Agent Architecture
 */

import type { AgentConfig, AgentDecision, AgentMessage } from '../AgentTypes';
import type { AgentEvent, AgentInstance, AgentHandlers } from '../AgentBase';
import { createAgentBase, createMessage } from '../AgentBase';
import type { AgentMemoryInstance, SemanticFact } from '../AgentMemory';
import type { AgentToolkitInstance } from '../AgentToolkit';

// ─── NPC Agent Config ─────────────────────────────────────────

export interface NPCPersonality {
    /** Big Five traits (0.0–1.0 each) */
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    /** Cultural overlay */
    directness: number;
    formality: number;
    emotionalExpressiveness: number;
}

export interface NPCAgentConfig {
    /** NPC identity */
    npcId: string;
    npcName: string;
    /** NPC role from schema (vendor, teacher, etc.) */
    role: string;
    /** Register level */
    register: string;
    /** Personality model */
    personality: NPCPersonality;
    /** Vocabulary domains this NPC covers */
    vocabularyFocus: string[];
    /** Patience level (0.0–1.0) — affects error tolerance */
    patienceLevel: number;
    /** Current mood (mutable) */
    initialMood: string;
    /** Current reputation with learner */
    initialReputation: number;
}

// ─── NPC Agent State ──────────────────────────────────────────

interface NPCState {
    mood: string;
    reputation: number;
    turnCount: number;
    activeDirectives: string[];
    lastLearnerText: string;
    lastResponseText: string;
}

// ─── NPC Agent Implementation ─────────────────────────────────

export function createNPCAgent(
    npcConfig: NPCAgentConfig,
    toolkit: AgentToolkitInstance,
): AgentInstance {
    const npcState: NPCState = {
        mood: npcConfig.initialMood,
        reputation: npcConfig.initialReputation,
        turnCount: 0,
        activeDirectives: [],
        lastLearnerText: '',
        lastResponseText: '',
    };

    const agentConfig: AgentConfig = {
        id: `npc-${npcConfig.npcId}`,
        role: 'npc',
        name: npcConfig.npcName,
        modelOverride: undefined,
        maxReasoningSteps: 3,
        strategy: 'reactive',
        memory: {
            workingMemorySize: 20,
            episodicCapacity: 100,
            recallThreshold: 0.7,
            enableSemantic: true,
        },
    };

    const handlers: AgentHandlers = {
        onObserve(event: AgentEvent, memory: AgentMemoryInstance): void {
            if (event.type === 'turn_complete' && event.data['speaker'] === 'learner') {
                const text = String(event.data['text'] ?? '');
                npcState.lastLearnerText = text;
                npcState.turnCount++;

                memory.observe(`Learner said: "${text}"`, {
                    npcId: npcConfig.npcId,
                    turnIndex: npcState.turnCount,
                    frictionEvents: event.data['frictionEvents'],
                });
            }

            if (event.type === 'dialogue_start') {
                memory.observe(`Dialogue started with learner at ${event.data['locationId']}`, {
                    npcId: npcConfig.npcId,
                    locationId: event.data['locationId'],
                });
            }

            if (event.type === 'dialogue_end') {
                const outcome = String(event.data['outcome'] ?? 'completed');
                updateMoodFromOutcome(outcome);

                // Store episodic memory of the conversation
                void memory.remember({
                    content: `Conversation with learner: ${npcState.turnCount} turns, outcome: ${outcome}, mood: ${npcState.mood}`,
                    metadata: {
                        agentId: agentConfig.id,
                        turnCount: npcState.turnCount,
                        outcome,
                        mood: npcState.mood,
                        reputation: npcState.reputation,
                    },
                    timestamp: Date.now(),
                    importance: outcome === 'failed' ? 0.9 : 0.6,
                    sessionId: String(event.data['sessionId'] ?? ''),
                    npcId: npcConfig.npcId,
                    locationId: String(event.data['locationId'] ?? ''),
                });

                npcState.turnCount = 0;
            }
        },

        async onThink(
            memory: AgentMemoryInstance,
            tk: AgentToolkitInstance,
            inbox: AgentMessage[],
        ): Promise<AgentDecision[]> {
            // Process directives from Tutor Agent
            for (const msg of inbox) {
                if (msg.type === 'directive') {
                    npcState.activeDirectives.push(msg.content);
                }
            }

            // Only generate speech if there's learner input to respond to
            if (!npcState.lastLearnerText) return [];

            // Build the NPC reasoning context
            const memorySummary = memory.summarize();
            const personalityDesc = describePersonality(npcConfig.personality);
            const directivesStr = npcState.activeDirectives.length > 0
                ? `Active teaching directives:\n${npcState.activeDirectives.map(d => `  - ${d}`).join('\n')}`
                : '';

            const systemPrompt = [
                `You are ${npcConfig.npcName}, a ${npcConfig.role} speaking in ${npcConfig.register} register.`,
                `Personality: ${personalityDesc}`,
                `Current mood: ${npcState.mood} | Reputation with learner: ${npcState.reputation.toFixed(2)}`,
                `Vocabulary focus: ${npcConfig.vocabularyFocus.join(', ')}`,
                `Patience level: ${(npcConfig.patienceLevel * 100).toFixed(0)}%`,
                directivesStr,
                `\nMemory:\n${memorySummary}`,
                `\nRespond in character. Keep responses concise (1-3 sentences).`,
                `If the learner makes errors, respond naturally — recast correct forms without explicit correction.`,
                `${npcConfig.personality.formality > 0.7 ? 'Maintain formal register.' : 'Use casual, friendly register.'}`,
            ].filter(Boolean).join('\n');

            const userPrompt = `The learner says: "${npcState.lastLearnerText}"`;

            // Try to generate response via LLM
            const textTool = tk.getTool('generate_text');
            let responseText = generateFallbackResponse(npcConfig, npcState);

            if (textTool) {
                try {
                    const obs = await tk.execute('generate_text', {
                        system: systemPrompt,
                        user: userPrompt,
                    });
                    if (obs.success && typeof obs.data === 'string') {
                        responseText = obs.data;
                    }
                } catch {
                    // Fallback to template response
                }
            }

            npcState.lastResponseText = responseText;
            npcState.lastLearnerText = ''; // Consumed

            // Clear consumed directives
            npcState.activeDirectives = [];

            return [{
                type: 'speak',
                agentId: agentConfig.id,
                confidence: 0.85,
                reasoning: `Responding as ${npcConfig.npcName} (${npcState.mood} mood, rep=${npcState.reputation.toFixed(2)})`,
                payload: {
                    npcId: npcConfig.npcId,
                    text: responseText,
                    mood: npcState.mood,
                    reputation: npcState.reputation,
                },
                priority: 9, // NPC speech is highest priority
                timestamp: Date.now(),
            }];
        },

        onReflect(decisions: AgentDecision[], memory: AgentMemoryInstance): void {
            // Learn facts about the learner from friction events
            const workingMem = memory.getWorkingMemory();
            for (const item of workingMem) {
                const frictions = item.metadata['frictionEvents'];
                if (Array.isArray(frictions)) {
                    for (const f of frictions) {
                        const friction = f as Record<string, unknown>;
                        memory.learn({
                            content: `Learner has friction with: ${String(friction['type'])} — "${String(friction['form'] ?? '')}"`,
                            metadata: { npcId: npcConfig.npcId },
                            timestamp: Date.now(),
                            importance: 0.8,
                            category: friction['type'] === 'lexical_gap' ? 'vocabulary' : 'grammar',
                            confidence: 0.7,
                            evidence: [`turn-${npcState.turnCount}`],
                            superseded: false,
                        });
                    }
                }
            }
        },
    };

    function updateMoodFromOutcome(outcome: string): void {
        const agreeableness = npcConfig.personality.agreeableness;
        const neuroticism = npcConfig.personality.neuroticism;

        if (outcome === 'success' || outcome === 'completed') {
            // Positive outcome → mood improves, more for agreeable NPCs
            npcState.mood = agreeableness > 0.6 ? 'happy' : 'satisfied';
            npcState.reputation = Math.min(1.0, npcState.reputation + 0.05);
        } else if (outcome === 'failed' || outcome === 'abandoned') {
            // Negative outcome → mood worsens, more for neurotic NPCs
            npcState.mood = neuroticism > 0.6 ? 'annoyed' : 'neutral';
            npcState.reputation = Math.max(-0.5, npcState.reputation - 0.03);
        }
    }

    return createAgentBase(agentConfig, toolkit, handlers);
}

// ─── Helpers ──────────────────────────────────────────────────

function describePersonality(p: NPCPersonality): string {
    const traits: string[] = [];
    if (p.openness > 0.7) traits.push('curious and creative');
    else if (p.openness < 0.3) traits.push('practical and conventional');
    if (p.conscientiousness > 0.7) traits.push('organized and careful');
    if (p.extraversion > 0.7) traits.push('outgoing and talkative');
    else if (p.extraversion < 0.3) traits.push('reserved and quiet');
    if (p.agreeableness > 0.7) traits.push('warm and patient');
    else if (p.agreeableness < 0.3) traits.push('blunt and direct');
    if (p.neuroticism > 0.7) traits.push('easily stressed');
    return traits.join(', ') || 'balanced personality';
}

function generateFallbackResponse(config: NPCAgentConfig, state: NPCState): string {
    // Template-based fallback when LLM is unavailable
    const greetings = [
        `¡Hola! ¿En qué puedo ayudarte?`,
        `Buenos días. ¿Qué necesitas?`,
        `¡Bienvenido! Dime, ¿qué buscas?`,
    ];
    const followUps = [
        `Interesante. Cuéntame más.`,
        `Entiendo. ¿Algo más?`,
        `Ah, sí. ¿Y después?`,
    ];

    if (state.turnCount <= 1) {
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    return followUps[Math.floor(Math.random() * followUps.length)];
}
