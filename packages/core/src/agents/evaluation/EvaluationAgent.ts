/**
 * Evaluation Agent — Real-time + post-session competency assessment.
 *
 * The Evaluation Agent monitors learner performance in real-time:
 *   - Tracks competency signals during dialogue
 *   - Infers affective state from 6 behavioral signals
 *   - Calibrates communicative pressure recommendations
 *   - Generates portfolio assessment snapshots
 *
 * Integrates with:
 *   - Evaluation/Metrics (CEFR scoring)
 *   - PhonemeEngine (pronunciation data)
 *   - InterlanguageEngine (grammar stage)
 *   - Inter-agent: broadcasts metrics to Tutor, sends pressure to NPC
 *
 * @module agents/evaluation/EvaluationAgent
 * @patentCritical Claim 14 — Evaluation Agent Architecture
 */

import type { AgentConfig, AgentDecision, AgentMessage } from '../AgentTypes';
import type { AgentEvent, AgentInstance, AgentHandlers } from '../AgentBase';
import { createAgentBase, createMessage } from '../AgentBase';
import type { AgentMemoryInstance } from '../AgentMemory';
import type { AgentToolkitInstance } from '../AgentToolkit';

// ─── Evaluation Agent Config ──────────────────────────────────

export interface EvaluationAgentConfig {
    /** Current tier */
    currentTier: 1 | 2 | 3;
    /** Learner's baseline affective calibration */
    affectiveBaseline: AffectiveBaseline;
    /** Frustration threshold for escalation (0.0–1.0) */
    escalationThreshold: number;
    /** How often to broadcast metrics (in turns) */
    broadcastInterval: number;
}

export interface AffectiveBaseline {
    /** Baseline response latency in ms */
    responseLatency: number;
    /** Baseline L1 fallback rate */
    l1FallbackRate: number;
    /** Baseline hedging frequency */
    hedgingFrequency: number;
    /** Baseline pause duration in ms */
    pauseDuration: number;
    /** Baseline topic avoidance rate */
    topicAvoidanceRate: number;
    /** Baseline repair attempt rate */
    repairAttemptRate: number;
}

// ─── Affective State ──────────────────────────────────────────

export type AffectiveState =
    | 'confident'
    | 'engaged'
    | 'uncertain'
    | 'frustrated'
    | 'anxious'
    | 'disengaged'
    | 'amused'
    | 'determined'
    | 'overwhelmed';

// ─── Internal State ───────────────────────────────────────────

interface EvalState {
    /** Per-turn signal accumulator */
    turnSignals: TurnSignal[];
    /** Running competency scores */
    accuracy: number;
    fluency: number;
    complexity: number;
    /** Current inferred affective state */
    affectiveState: AffectiveState;
    /** Current pressure recommendation (0.0–1.0) */
    pressureLevel: number;
    /** Turn count */
    turnCount: number;
    /** Friction counts by type */
    frictionCounts: Map<string, number>;
    /** Total word count (for fluency estimation) */
    totalWords: number;
    /** Total error count */
    totalErrors: number;
    /** Unique vocabulary used */
    uniqueVocab: Set<string>;
}

interface TurnSignal {
    turnIndex: number;
    speaker: string;
    wordCount: number;
    frictionCount: number;
    responseLatency: number;
    l1FallbackRate: number;
    hedgingFrequency: number;
    repairAttempts: number;
    timestamp: number;
}

// ─── Evaluation Agent Implementation ──────────────────────────

export function createEvaluationAgent(
    evalConfig: EvaluationAgentConfig,
    toolkit: AgentToolkitInstance,
): AgentInstance {
    const state: EvalState = {
        turnSignals: [],
        accuracy: 0.5,
        fluency: 0.5,
        complexity: 0.5,
        affectiveState: 'engaged',
        pressureLevel: 0.5,
        turnCount: 0,
        frictionCounts: new Map(),
        totalWords: 0,
        totalErrors: 0,
        uniqueVocab: new Set(),
    };

    const agentConfig: AgentConfig = {
        id: 'evaluation-main',
        role: 'evaluation',
        name: 'Evaluation Agent',
        maxReasoningSteps: 2,
        strategy: 'reactive',
        memory: {
            workingMemorySize: 30,
            episodicCapacity: 50,
            recallThreshold: 0.5,
            enableSemantic: true,
        },
    };

    const handlers: AgentHandlers = {
        onObserve(event: AgentEvent, memory: AgentMemoryInstance): void {
            if (event.type === 'turn_complete' && event.data['speaker'] === 'learner') {
                state.turnCount++;
                const text = String(event.data['text'] ?? '');
                const words = text.split(/\s+/).filter(Boolean);
                state.totalWords += words.length;
                for (const w of words) state.uniqueVocab.add(w.toLowerCase());

                const frictions = event.data['frictionEvents'];
                const frictionCount = Array.isArray(frictions) ? frictions.length : 0;
                state.totalErrors += frictionCount;

                if (Array.isArray(frictions)) {
                    for (const f of frictions) {
                        const type = String((f as Record<string, unknown>)['type'] ?? 'unknown');
                        state.frictionCounts.set(type, (state.frictionCounts.get(type) ?? 0) + 1);
                    }
                }

                // Compute signals from metadata
                const signal: TurnSignal = {
                    turnIndex: state.turnCount,
                    speaker: 'learner',
                    wordCount: words.length,
                    frictionCount,
                    responseLatency: Number(event.data['responseLatency'] ?? 0),
                    l1FallbackRate: Number(event.data['l1FallbackRate'] ?? 0),
                    hedgingFrequency: Number(event.data['hedgingFrequency'] ?? 0),
                    repairAttempts: Number(event.data['repairAttempts'] ?? 0),
                    timestamp: Date.now(),
                };
                state.turnSignals.push(signal);

                // Update running metrics
                updateMetrics();

                memory.observe(
                    `Learner turn ${state.turnCount}: ${words.length} words, ${frictionCount} frictions. Accuracy=${state.accuracy.toFixed(2)}, Fluency=${state.fluency.toFixed(2)}`,
                    { turnCount: state.turnCount, accuracy: state.accuracy, fluency: state.fluency },
                );
            }

            if (event.type === 'dialogue_end') {
                memory.observe(
                    `Session metrics: accuracy=${state.accuracy.toFixed(2)}, fluency=${state.fluency.toFixed(2)}, complexity=${state.complexity.toFixed(2)}, affect=${state.affectiveState}`,
                    { accuracy: state.accuracy, fluency: state.fluency, complexity: state.complexity, affect: state.affectiveState },
                );
            }
        },

        async onThink(
            memory: AgentMemoryInstance,
            tk: AgentToolkitInstance,
            inbox: AgentMessage[],
        ): Promise<AgentDecision[]> {
            const decisions: AgentDecision[] = [];

            if (state.turnCount === 0) return decisions;

            // ── Affective State Inference ──
            const affective = inferAffectiveState(state, evalConfig.affectiveBaseline);
            state.affectiveState = affective;

            // ── Pressure Calibration ──
            const newPressure = calibratePressure(affective, state.pressureLevel, evalConfig.currentTier);
            const pressureChanged = Math.abs(newPressure - state.pressureLevel) > 0.05;
            state.pressureLevel = newPressure;

            // ── Escalation Check ──
            if (affective === 'frustrated' || affective === 'overwhelmed') {
                const frustrationSignal = computeFrustrationSignal(state, evalConfig.affectiveBaseline);
                if (frustrationSignal >= evalConfig.escalationThreshold) {
                    decisions.push({
                        type: 'escalate',
                        agentId: agentConfig.id,
                        confidence: frustrationSignal,
                        reasoning: `Affective state: ${affective}, frustration signal=${frustrationSignal.toFixed(2)} ≥ threshold ${evalConfig.escalationThreshold}. Triggering scaffolding escalation.`,
                        payload: {
                            affectiveState: affective,
                            frustrationSignal,
                            pressureLevel: state.pressureLevel,
                            recommendation: affective === 'overwhelmed' ? 'activate_companion' : 'reduce_difficulty',
                        },
                        priority: 8,
                        timestamp: Date.now(),
                    });
                }
            }

            // ── Pressure Adjustment ──
            if (pressureChanged) {
                decisions.push({
                    type: 'adjust_pressure',
                    agentId: agentConfig.id,
                    confidence: 0.75,
                    reasoning: `Pressure adjusted to ${state.pressureLevel.toFixed(2)} based on affective state: ${affective}`,
                    payload: {
                        pressureLevel: state.pressureLevel,
                        affectiveState: affective,
                    },
                    priority: 6,
                    timestamp: Date.now(),
                });
            }

            // ── Metrics Broadcast ──
            if (state.turnCount % evalConfig.broadcastInterval === 0) {
                decisions.push({
                    type: 'send_message',
                    agentId: agentConfig.id,
                    confidence: 0.9,
                    reasoning: `Broadcasting metrics after ${state.turnCount} turns.`,
                    payload: {
                        message: createMessage(
                            agentConfig.id,
                            null, // broadcast
                            'observation',
                            `Metrics update: accuracy=${state.accuracy.toFixed(2)}, fluency=${state.fluency.toFixed(2)}, complexity=${state.complexity.toFixed(2)}, affect=${affective}`,
                            {
                                metrics: {
                                    accuracy: state.accuracy,
                                    fluency: state.fluency,
                                    complexity: state.complexity,
                                },
                                affectiveState: affective,
                                pressureLevel: state.pressureLevel,
                                competencies: deriveCompetencies(state),
                            },
                        ),
                    },
                    priority: 5,
                    timestamp: Date.now(),
                });
            }

            return decisions;
        },

        onReflect(decisions: AgentDecision[], memory: AgentMemoryInstance): void {
            for (const d of decisions) {
                if (d.type === 'escalate') {
                    memory.learn({
                        content: `Escalation triggered: ${d.payload['recommendation']} (frustration=${String(d.payload['frustrationSignal'])})`,
                        metadata: { affectiveState: d.payload['affectiveState'] },
                        timestamp: Date.now(),
                        importance: 0.9,
                        category: 'preference',
                        confidence: d.confidence,
                        evidence: [`turn-${state.turnCount}`],
                        superseded: false,
                    });
                }
            }
        },
    };

    function updateMetrics(): void {
        if (state.totalWords === 0) return;

        // Accuracy: 1 - (errors / words)
        state.accuracy = Math.max(0, 1 - (state.totalErrors / state.totalWords));

        // Fluency: average words per turn (normalized to 0–1 scale, 20 words = 1.0)
        const avgWords = state.totalWords / state.turnCount;
        state.fluency = Math.min(1.0, avgWords / 20);

        // Complexity: vocabulary diversity (type-token ratio, capped at 1.0)
        state.complexity = Math.min(1.0, state.uniqueVocab.size / state.totalWords);
    }

    return createAgentBase(agentConfig, toolkit, handlers);
}

// ─── Affective State Inference ────────────────────────────────

function inferAffectiveState(state: EvalState, baseline: AffectiveBaseline): AffectiveState {
    if (state.turnSignals.length === 0) return 'engaged';

    const recent = state.turnSignals.slice(-5);
    const avg = (arr: number[]): number => arr.reduce((a, b) => a + b, 0) / arr.length;

    const avgLatency = avg(recent.map(s => s.responseLatency));
    const avgL1Rate = avg(recent.map(s => s.l1FallbackRate));
    const avgHedging = avg(recent.map(s => s.hedgingFrequency));
    const avgRepair = avg(recent.map(s => s.repairAttempts));
    const avgFriction = avg(recent.map(s => s.frictionCount));
    const avgWords = avg(recent.map(s => s.wordCount));

    // Compute deviation from baseline
    const latencyDev = baseline.responseLatency > 0 ? avgLatency / baseline.responseLatency : 1;
    const l1Dev = baseline.l1FallbackRate > 0 ? avgL1Rate / baseline.l1FallbackRate : 1;
    const hedgeDev = baseline.hedgingFrequency > 0 ? avgHedging / baseline.hedgingFrequency : 1;
    const repairDev = baseline.repairAttemptRate > 0 ? avgRepair / baseline.repairAttemptRate : 1;

    // Classification rules (from architecture.md)
    if (latencyDev > 2.0 && l1Dev > 1.5 && avgFriction > 2) return 'overwhelmed';
    if (latencyDev > 1.5 && hedgeDev > 1.5 && avgFriction > 1) return 'frustrated';
    if (l1Dev > 1.5 && hedgeDev > 1.3) return 'anxious';
    if (latencyDev > 1.3 && hedgeDev > 1.2) return 'uncertain';
    if (avgWords < 3 && latencyDev > 1.5) return 'disengaged';
    if (avgFriction === 0 && avgWords > 8 && repairDev < 0.8) return 'confident';
    if (avgFriction > 0 && repairDev > 1.2) return 'determined';
    if (avgWords > 5 && avgFriction < 1) return 'engaged';

    return 'engaged';
}

function computeFrustrationSignal(state: EvalState, baseline: AffectiveBaseline): number {
    if (state.turnSignals.length === 0) return 0;

    const recent = state.turnSignals.slice(-3);
    const avgLatency = recent.reduce((s, t) => s + t.responseLatency, 0) / recent.length;
    const avgFriction = recent.reduce((s, t) => s + t.frictionCount, 0) / recent.length;
    const avgL1 = recent.reduce((s, t) => s + t.l1FallbackRate, 0) / recent.length;

    const latencyScore = baseline.responseLatency > 0
        ? Math.min(1, (avgLatency / baseline.responseLatency - 1) * 0.5)
        : 0;
    const frictionScore = Math.min(1, avgFriction / 3);
    const l1Score = Math.min(1, avgL1 * 2);

    return Math.min(1, (latencyScore * 0.3) + (frictionScore * 0.4) + (l1Score * 0.3));
}

function calibratePressure(
    affective: AffectiveState,
    currentPressure: number,
    tier: number,
): number {
    const adjustments: Record<AffectiveState, number> = {
        confident: 0.05,
        engaged: 0.02,
        determined: 0.03,
        amused: 0.01,
        uncertain: -0.02,
        anxious: -0.05,
        frustrated: -0.08,
        disengaged: -0.03,
        overwhelmed: -0.15,
    };

    const delta = adjustments[affective] ?? 0;

    // Tier affects pressure floor and ceiling
    const floor = tier === 1 ? 0.2 : tier === 2 ? 0.3 : 0.4;
    const ceiling = tier === 1 ? 0.7 : tier === 2 ? 0.85 : 1.0;

    return Math.max(floor, Math.min(ceiling, currentPressure + delta));
}

function deriveCompetencies(state: EvalState): string[] {
    const competencies: string[] = [];
    if (state.accuracy > 0.8) competencies.push('grammar_accuracy');
    if (state.fluency > 0.7) competencies.push('conversational_fluency');
    if (state.complexity > 0.5) competencies.push('vocabulary_diversity');
    if (state.uniqueVocab.size > 50) competencies.push('broad_vocabulary');
    const frictionRate = state.totalErrors / Math.max(1, state.totalWords);
    if (frictionRate < 0.05) competencies.push('low_friction');
    return competencies;
}
