/**
 * Module Integration Hooks — Wires all orphaned modules into the
 * session orchestrator lifecycle.
 *
 * Each hook is a typed interface that a module can implement to
 * participate in the session lifecycle. The session orchestrator
 * calls these hooks at specific lifecycle points:
 *
 *   Session Init → onSessionStart
 *   Navigation   → onLocationEnter, onLocationExit
 *   Dialogue     → onDialogueStart, onTurnComplete, onDialogueEnd
 *   Tick Loop    → onTick
 *   Session End  → onSessionEnd
 *
 * Modules plug in by implementing the relevant hook interface and
 * registering with the orchestrator via registerModuleHook().
 *
 * @module session-orchestrator/module-hooks
 * @patentCritical Claim 13 — Dynamic Module Wiring
 */

// ─── Types from upstream modules (mirrored to avoid import cycles) ───

import type { FrictionEvent, DialogueOutcome, DialogueSession } from '../dialogue-engine';
import type { WorldState, NPCWorldState, AmbientEvent } from '../world-engine';

// ─── Hook Lifecycle Events ────────────────────────────────────

export interface SessionLifecycleEvent {
    sessionId: string;
    timestamp: number;
    schemaId: string;
}

export interface LocationEvent extends SessionLifecycleEvent {
    locationId: string;
    previousLocationId?: string;
}

export interface DialogueEvent extends SessionLifecycleEvent {
    npcId: string;
    locationId: string;
}

export interface TurnEvent extends DialogueEvent {
    turnIndex: number;
    speaker: 'learner' | 'npc';
    text: string;
    frictionEvents: FrictionEvent[];
}

export interface TickEvent extends SessionLifecycleEvent {
    deltaTime: number;
    worldState: WorldState;
    elapsedSeconds: number;
}

// ─── Module Hook Interfaces ───────────────────────────────────

/**
 * Anti-Fossilization Hook — Monitors for fossilized L2 patterns
 * after each dialogue. Triggers defossilization strategies when
 * recurring error patterns are detected.
 */
export interface AntiFossilizationHook {
    readonly moduleId: 'anti-fossilization';
    /** Analyze turn for fossilization patterns */
    onTurnComplete?(event: TurnEvent): FossilizationAlert | null;
    /** Post-dialogue fossilization check */
    onDialogueEnd?(event: DialogueEvent, outcome: DialogueOutcome): void;
}

export interface FossilizationAlert {
    form: string;
    occurrenceCount: number;
    suggestedStrategy: string;
}

/**
 * Cultural Intelligence Hook — Monitors register violations and
 * cultural faux pas during NPC interactions.
 */
export interface CulturalIntelligenceHook {
    readonly moduleId: 'cultural-intelligence';
    /** Check for cultural violations in learner speech */
    onTurnComplete?(event: TurnEvent): CulturalViolationAlert | null;
    /** Update cultural competence score after dialogue */
    onDialogueEnd?(event: DialogueEvent, outcome: DialogueOutcome): void;
}

export interface CulturalViolationAlert {
    violationType: 'register' | 'honorific' | 'taboo' | 'gesture';
    severity: 'minor' | 'moderate' | 'severe';
    culturalNorm: string;
    suggestion: string;
}

/**
 * Interlanguage Engine Hook — Classifies friction events against
 * the learner's evolving interlanguage grammar model.
 */
export interface InterlanguageHook {
    readonly moduleId: 'interlanguage-engine';
    /** Classify friction against interlanguage grammar */
    onTurnComplete?(event: TurnEvent): InterlanguageClassification | null;
    /** Update grammar model after session */
    onSessionEnd?(event: SessionLifecycleEvent): void;
}

export interface InterlanguageClassification {
    ruleId: string;
    l1TransferType: string;
    developmentalStage: string;
    isLearningFrontier: boolean;
}

/**
 * Phoneme Engine Hook — Processes voice input for pronunciation
 * analysis against native speaker models.
 */
export interface PhonemeHook {
    readonly moduleId: 'phoneme-engine';
    /** Analyze pronunciation from audio input */
    onTurnComplete?(event: TurnEvent & { audioData?: ArrayBuffer }): PhonemeAnalysisResult | null;
}

export interface PhonemeAnalysisResult {
    phonemeScores: Array<{ phoneme: string; accuracy: number }>;
    overallScore: number;
    problemAreas: string[];
}

/**
 * Tier Manager Hook — Gates content access and manages tier
 * transitions based on accumulated evidence.
 */
export interface TierManagerHook {
    readonly moduleId: 'tier-manager';
    /** Check tier readiness on session start */
    onSessionStart?(event: SessionLifecycleEvent): TierGateResult;
    /** Evaluate tier progression after dialogue */
    onDialogueEnd?(event: DialogueEvent, outcome: DialogueOutcome): TierProgressionResult | null;
}

export interface TierGateResult {
    currentTier: 1 | 2 | 3;
    nextTierUnlocked: boolean;
    readinessScore: number;
}

export interface TierProgressionResult {
    shouldTransition: boolean;
    targetTier: 1 | 2 | 3;
    reason: string;
    evidence: Record<string, number>;
}

/**
 * Retention Hook — Schedules spaced repetition items based on
 * friction events and dialogue outcomes.
 */
export interface RetentionHook {
    readonly moduleId: 'retention';
    /** Schedule items for review after dialogue */
    onDialogueEnd?(event: DialogueEvent, outcome: DialogueOutcome): RetentionSchedule;
    /** Update item memory strength on tick */
    onTick?(event: TickEvent): void;
}

export interface RetentionSchedule {
    newItems: Array<{ form: string; nextReviewTime: number }>;
    updatedItems: Array<{ form: string; newInterval: number }>;
}

/**
 * Persistence Hook — Saves and loads session state.
 */
export interface PersistenceHook {
    readonly moduleId: 'persistence';
    /** Save state checkpoint */
    onSessionEnd?(event: SessionLifecycleEvent, worldState: WorldState): Promise<void>;
    /** Load previous state on session start */
    onSessionStart?(event: SessionLifecycleEvent): Promise<Partial<WorldState> | null>;
}

/**
 * Collaboration Hook — Manages multiplayer/instructor integration.
 */
export interface CollaborationHook {
    readonly moduleId: 'collaboration';
    /** Broadcast session progress to instructor dashboard */
    onDialogueEnd?(event: DialogueEvent, outcome: DialogueOutcome): void;
    /** Check for instructor interventions on tick */
    onTick?(event: TickEvent): InstructorIntervention | null;
}

export interface InstructorIntervention {
    type: 'hint' | 'redirect' | 'pause' | 'scaffold';
    message: string;
    targetNpcId?: string;
}

/**
 * Runtime Customization Hook — Injects user-configurable overrides
 * into the session pipeline.
 */
export interface RuntimeCustomizationHook {
    readonly moduleId: 'runtime-customization';
    /** Apply runtime overrides on session start */
    onSessionStart?(event: SessionLifecycleEvent): RuntimeOverrides;
    /** Process control surface changes on tick */
    onTick?(event: TickEvent): RuntimeOverrides | null;
}

export interface RuntimeOverrides {
    pressureOverride?: number;
    tierOverride?: 1 | 2 | 3;
    npcWarmthOverrides?: Record<string, number>;
    deliveryFormatOverride?: string;
}

/**
 * Evaluation/Metrics Hook — Computes evaluation metrics after
 * dialogue for progress tracking.
 */
export interface EvaluationHook {
    readonly moduleId: 'evaluation';
    /** Compute metrics after dialogue */
    onDialogueEnd?(event: DialogueEvent, outcome: DialogueOutcome): EvaluationMetrics;
}

export interface EvaluationMetrics {
    accuracyScore: number;
    fluencyScore: number;
    complexityScore: number;
    overallCEFR: string;
}

// ─── Union Type of All Hooks ──────────────────────────────────

export type ModuleHook =
    | AntiFossilizationHook
    | CulturalIntelligenceHook
    | InterlanguageHook
    | PhonemeHook
    | TierManagerHook
    | RetentionHook
    | PersistenceHook
    | CollaborationHook
    | RuntimeCustomizationHook
    | EvaluationHook;

export type ModuleHookId = ModuleHook['moduleId'];

// ─── Hook Registry ────────────────────────────────────────────

/**
 * Registry for all module hooks. The session orchestrator
 * iterates this registry at each lifecycle point.
 */
export class ModuleHookRegistry {
    private hooks: Map<ModuleHookId, ModuleHook> = new Map();

    /** Register a module hook */
    register(hook: ModuleHook): void {
        this.hooks.set(hook.moduleId, hook);
    }

    /** Unregister a module hook */
    unregister(moduleId: ModuleHookId): void {
        this.hooks.delete(moduleId);
    }

    /** Get a specific hook by module ID */
    get<T extends ModuleHook>(moduleId: T['moduleId']): T | undefined {
        return this.hooks.get(moduleId) as T | undefined;
    }

    /** Get all registered hooks */
    getAll(): ModuleHook[] {
        return Array.from(this.hooks.values());
    }

    /** Check if a module is registered */
    has(moduleId: ModuleHookId): boolean {
        return this.hooks.has(moduleId);
    }

    /** Get count of registered modules */
    get size(): number {
        return this.hooks.size;
    }

    /** Clear all hooks */
    clear(): void {
        this.hooks.clear();
    }
}
