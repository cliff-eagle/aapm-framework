/**
 * Tutor Agent — Session-wide learning overseer.
 *
 * The Tutor Agent sits above all NPC interactions and:
 *   - Generates learning objectives per session based on gap analysis
 *   - Decides WHEN to intervene (scaffold vs. productive struggle)
 *   - Creates forward injection directives for NPC agents
 *   - Recommends tier transitions based on accumulated evidence
 *   - Carries learning objectives across sessions via persistence
 *
 * Integrates with:
 *   - FeedbackEngine (friction patterns)
 *   - InterlanguageEngine (grammar model + developmental stage)
 *   - AntiFossilization (recurring error detection)
 *   - Retention (spaced repetition scheduling)
 *   - Evaluation (CEFR metrics)
 *   - Inter-agent: sends directives to NPC Agents
 *
 * @module agents/tutor/TutorAgent
 * @patentCritical Claim 14 — Tutor Agent Architecture
 */

import type { AgentConfig, AgentDecision, AgentMessage } from '../AgentTypes';
import type { AgentEvent, AgentInstance, AgentHandlers } from '../AgentBase';
import { createAgentBase, createMessage } from '../AgentBase';
import type { AgentMemoryInstance } from '../AgentMemory';
import type { AgentToolkitInstance } from '../AgentToolkit';

// ─── Tutor Agent Config ───────────────────────────────────────

export interface TutorAgentConfig {
    /** Current tier (1, 2, or 3) */
    currentTier: 1 | 2 | 3;
    /** Target competencies from schema */
    targetCompetencies: string[];
    /** Learner's L1 (for transfer prediction) */
    learnerL1: string;
    /** Session-level learning objectives */
    sessionObjectives: string[];
    /** Friction threshold before intervention (0.0–1.0) */
    interventionThreshold: number;
    /** Enable forward injection */
    enableForwardInjection: boolean;
}

// ─── Internal State ───────────────────────────────────────────

interface TutorState {
    /** Friction events accumulated this session */
    frictionLog: FrictionEntry[];
    /** Directives sent to NPCs */
    sentDirectives: string[];
    /** Current learning objectives (mutable) */
    activeObjectives: string[];
    /** Turn count this session */
    turnCount: number;
    /** Whether tier advancement has been recommended */
    tierAdvancementRecommended: boolean;
    /** Last evaluation metrics */
    lastMetrics: { accuracy: number; fluency: number; complexity: number } | null;
}

interface FrictionEntry {
    type: string;
    form: string;
    turnIndex: number;
    npcId: string;
    timestamp: number;
}

// ─── Tutor Agent Implementation ───────────────────────────────

export function createTutorAgent(
    tutorConfig: TutorAgentConfig,
    toolkit: AgentToolkitInstance,
): AgentInstance {
    const state: TutorState = {
        frictionLog: [],
        sentDirectives: [],
        activeObjectives: [...tutorConfig.sessionObjectives],
        turnCount: 0,
        tierAdvancementRecommended: false,
        lastMetrics: null,
    };

    const agentConfig: AgentConfig = {
        id: 'tutor-main',
        role: 'tutor',
        name: 'Tutor Agent',
        maxReasoningSteps: 5,
        strategy: 'deliberative',
        memory: {
            workingMemorySize: 50,
            episodicCapacity: 200,
            recallThreshold: 0.6,
            enableSemantic: true,
        },
    };

    const handlers: AgentHandlers = {
        onObserve(event: AgentEvent, memory: AgentMemoryInstance): void {
            if (event.type === 'turn_complete') {
                state.turnCount++;
                const frictions = event.data['frictionEvents'];
                if (Array.isArray(frictions)) {
                    for (const f of frictions) {
                        const friction = f as Record<string, unknown>;
                        state.frictionLog.push({
                            type: String(friction['type'] ?? ''),
                            form: String(friction['form'] ?? ''),
                            turnIndex: state.turnCount,
                            npcId: String(event.data['npcId'] ?? ''),
                            timestamp: Date.now(),
                        });
                    }
                }

                memory.observe(
                    `Turn ${state.turnCount}: ${event.data['speaker']} said "${String(event.data['text'] ?? '').slice(0, 100)}" [${Array.isArray(frictions) ? frictions.length : 0} friction events]`,
                    { turnCount: state.turnCount, npcId: event.data['npcId'] },
                );
            }

            if (event.type === 'session_start') {
                memory.observe('Session started', {
                    tier: tutorConfig.currentTier,
                    objectives: tutorConfig.sessionObjectives,
                });
            }

            if (event.type === 'dialogue_end') {
                const outcome = event.data['outcome'];
                memory.observe(
                    `Dialogue ended with ${event.data['npcId']}: ${outcome}`,
                    { npcId: event.data['npcId'], outcome },
                );
            }
        },

        async onThink(
            memory: AgentMemoryInstance,
            tk: AgentToolkitInstance,
            inbox: AgentMessage[],
        ): Promise<AgentDecision[]> {
            const decisions: AgentDecision[] = [];

            // Process evaluation updates from Evaluation Agent
            for (const msg of inbox) {
                if (msg.type === 'observation' && msg.payload?.['metrics']) {
                    state.lastMetrics = msg.payload['metrics'] as typeof state.lastMetrics;
                }
            }

            // ── Intervention Check ──
            // Analyze recent friction patterns and decide whether to intervene
            const recentFrictions = state.frictionLog.filter(
                f => f.turnIndex >= state.turnCount - 5,
            );

            if (recentFrictions.length > 0) {
                // Classify friction patterns
                const frictionByType = new Map<string, FrictionEntry[]>();
                for (const f of recentFrictions) {
                    const group = frictionByType.get(f.type) ?? [];
                    group.push(f);
                    frictionByType.set(f.type, group);
                }

                // Find recurring patterns (≥2 occurrences of same type)
                for (const [type, entries] of frictionByType) {
                    if (entries.length >= 2) {
                        // This is a pattern — decide whether to intervene or let it be
                        const frictionRate = entries.length / Math.max(1, state.turnCount);

                        if (frictionRate >= tutorConfig.interventionThreshold) {
                            // High friction rate → inject directive to NPC
                            if (tutorConfig.enableForwardInjection) {
                                const directive = generateDirective(type, entries);
                                state.sentDirectives.push(directive);

                                // Find which NPC to send the directive to
                                const targetNpc = entries[entries.length - 1].npcId;
                                decisions.push({
                                    type: 'inject',
                                    agentId: agentConfig.id,
                                    confidence: 0.8,
                                    reasoning: `Recurring ${type} friction (${entries.length}x in last 5 turns, rate=${frictionRate.toFixed(2)}). Injecting directive.`,
                                    payload: {
                                        directive,
                                        targetNpcId: targetNpc,
                                        message: createMessage(
                                            agentConfig.id,
                                            `npc-${targetNpc}`,
                                            'directive',
                                            directive,
                                            { frictionType: type, entries },
                                        ),
                                    },
                                    priority: 7,
                                    timestamp: Date.now(),
                                });
                            }
                        }
                    }
                }
            }

            // ── Tier Advancement Check ──
            if (!state.tierAdvancementRecommended && state.lastMetrics) {
                const { accuracy, fluency, complexity } = state.lastMetrics;
                const composite = (accuracy * 0.4) + (fluency * 0.35) + (complexity * 0.25);

                const thresholds: Record<number, number> = { 1: 0.7, 2: 0.75, 3: 1.0 };
                const threshold = thresholds[tutorConfig.currentTier] ?? 1.0;

                if (composite >= threshold && tutorConfig.currentTier < 3) {
                    state.tierAdvancementRecommended = true;
                    decisions.push({
                        type: 'advance_tier',
                        agentId: agentConfig.id,
                        confidence: composite,
                        reasoning: `Composite score ${composite.toFixed(2)} ≥ threshold ${threshold} for tier ${tutorConfig.currentTier}. Recommending advancement.`,
                        payload: {
                            currentTier: tutorConfig.currentTier,
                            targetTier: (tutorConfig.currentTier + 1) as 2 | 3,
                            compositeScore: composite,
                            metrics: state.lastMetrics,
                        },
                        priority: 6,
                        timestamp: Date.now(),
                    });
                }
            }

            // ── Retention Scheduling ──
            // After every 10 turns, schedule review items from friction log
            if (state.turnCount > 0 && state.turnCount % 10 === 0) {
                const uniqueForms = new Set(state.frictionLog.map(f => f.form));
                if (uniqueForms.size > 0) {
                    decisions.push({
                        type: 'schedule_review',
                        agentId: agentConfig.id,
                        confidence: 0.75,
                        reasoning: `${uniqueForms.size} unique friction forms after ${state.turnCount} turns — scheduling retention review.`,
                        payload: {
                            forms: Array.from(uniqueForms),
                            nextReviewTime: Date.now() + 24 * 60 * 60 * 1000, // +1 day
                        },
                        priority: 4,
                        timestamp: Date.now(),
                    });
                }
            }

            return decisions;
        },

        onReflect(decisions: AgentDecision[], memory: AgentMemoryInstance): void {
            for (const d of decisions) {
                if (d.type === 'inject') {
                    memory.learn({
                        content: `Injected directive to NPC: ${String(d.payload['directive'])}`,
                        metadata: { targetNpc: d.payload['targetNpcId'] },
                        timestamp: Date.now(),
                        importance: 0.7,
                        category: 'grammar',
                        confidence: d.confidence,
                        evidence: [`turn-${state.turnCount}`],
                        superseded: false,
                    });
                }

                if (d.type === 'advance_tier') {
                    memory.learn({
                        content: `Recommended tier advancement: ${d.payload['currentTier']} → ${d.payload['targetTier']}`,
                        metadata: { metrics: d.payload['metrics'] },
                        timestamp: Date.now(),
                        importance: 1.0,
                        category: 'preference',
                        confidence: d.confidence,
                        evidence: [`session-summary`],
                        superseded: false,
                    });
                }
            }
        },
    };

    return createAgentBase(agentConfig, toolkit, handlers);
}

// ─── Helpers ──────────────────────────────────────────────────

function generateDirective(frictionType: string, entries: FrictionEntry[]): string {
    const forms = [...new Set(entries.map(e => e.form))].join(', ');

    switch (frictionType) {
        case 'lexical_gap':
            return `Create natural opportunities for the learner to use: ${forms}. Model the vocabulary in context without explicit correction.`;
        case 'morphosyntactic_error':
            return `Recast the correct form of: ${forms}. Use contrastive emphasis to highlight the correct structure.`;
        case 'register_mismatch':
            return `Model appropriate register for this context. The learner used: ${forms} — guide toward correct register naturally.`;
        case 'phonemic_error':
            return `Encourage the learner to repeat key phrases containing: ${forms}. Slow your speech slightly to model correct pronunciation.`;
        case 'pragmatic_failure':
            return `Create a scenario that naturally requires the speech act the learner struggled with: ${forms}.`;
        case 'cultural_violation':
            return `Model the culturally appropriate behavior for: ${forms}. React naturally to the violation to provide calibrating feedback.`;
        default:
            return `Focus on helping the learner with: ${forms}.`;
    }
}
