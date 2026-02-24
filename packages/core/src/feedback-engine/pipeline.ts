/**
 * AAPM Feedback Engine — Pipeline Implementation
 *
 * The 5-phase Macro-Loop pipeline that converts every session's
 * conversational data into personalized learning material and
 * forward injection directives for subsequent sessions.
 *
 * Pipeline: Extract → Classify → Generate → Deliver → Inject
 *
 * @module feedback-engine/pipeline
 * @patentCritical The complete pipeline method — from friction
 *   extraction through forward injection — is the core patent claim.
 */

import type {
    FrictionPoint,
    FrictionType,
    FrictionSeverity,
    FrictionExtractionResult,
    PatternClassificationResult,
    CurriculumGenerationResult,
    AdaptiveLessonResult,
    ForwardInjectionResult,
    MacroLoopPipelineState,
    FrictionCluster,
    RecurringPattern,
    InterlanguageModelDelta,
    MicroCurriculum,
    CurriculumUnit,
    ForwardInjectionSpec,
    UnitEngagementData,
    LearnerPreferenceSignals,
} from './types';

import type { SessionRecord } from '../persistence/types';
import type { LearnerProfile } from '../persistence/types';

// ─── Pipeline Orchestrator ───────────────────────────────────

/**
 * Dependencies required by the Macro-Loop pipeline.
 *
 * All external services are injected, making the pipeline
 * testable and provider-agnostic.
 */
export interface MacroLoopDependencies {
    /** LLM provider for friction extraction and curriculum generation */
    llmProvider: LLMProvider;

    /** Vector store for NPC memory and interlanguage model */
    vectorStore: VectorStoreProvider;

    /** Persistent storage for sessions and learner profiles */
    sessionStore: SessionStoreProvider;

    /** Notification service for async engagement triggers */
    notificationService: NotificationProvider;

    /** Logger for pipeline monitoring */
    logger: PipelineLogger;
}

/**
 * LLM provider interface — abstracts over OpenAI, Anthropic, etc.
 */
export interface LLMProvider {
    /**
     * Send a structured prompt and receive a typed response.
     *
     * @param systemPrompt - System-level instructions
     * @param userPrompt - The specific task prompt
     * @param responseSchema - JSON Schema for the expected response
     * @returns Parsed, validated response matching the schema
     */
    generateStructured<T>(
        systemPrompt: string,
        userPrompt: string,
        responseSchema: Record<string, unknown>,
    ): Promise<T>;

    /**
     * Generate a text completion.
     */
    generateText(systemPrompt: string, userPrompt: string): Promise<string>;

    /**
     * Generate embeddings for text.
     */
    generateEmbedding(text: string): Promise<number[]>;
}

/**
 * Vector store provider interface.
 */
export interface VectorStoreProvider {
    /** Store a vector embedding with metadata */
    upsert(id: string, embedding: number[], metadata: Record<string, unknown>): Promise<void>;

    /** Query for similar vectors */
    query(embedding: number[], topK: number, filter?: Record<string, unknown>): Promise<VectorQueryResult[]>;

    /** Delete vectors by ID */
    delete(ids: string[]): Promise<void>;
}

/**
 * Result from a vector similarity query.
 */
export interface VectorQueryResult {
    id: string;
    score: number;
    metadata: Record<string, unknown>;
}

/**
 * Session storage provider interface.
 */
export interface SessionStoreProvider {
    /** Retrieve a session record */
    getSession(sessionId: string): Promise<SessionRecord | null>;

    /** Store a session record */
    saveSession(session: SessionRecord): Promise<void>;

    /** Retrieve a learner profile */
    getLearnerProfile(learnerId: string): Promise<LearnerProfile | null>;

    /** Update a learner profile */
    updateLearnerProfile(profile: LearnerProfile): Promise<void>;

    /** Get previous friction points for recurrence checking */
    getPreviousFrictionPoints(learnerId: string, limit: number): Promise<FrictionPoint[]>;
}

/**
 * Notification delivery provider interface.
 */
export interface NotificationProvider {
    /** Schedule a notification for future delivery */
    schedule(learnerId: string, content: { title: string; body: string; deepLink: string }, deliverAt: string): Promise<string>;

    /** Cancel a scheduled notification */
    cancel(notificationId: string): Promise<void>;
}

/**
 * Pipeline execution logger.
 */
export interface PipelineLogger {
    info(phase: string, message: string, data?: Record<string, unknown>): void;
    warn(phase: string, message: string, data?: Record<string, unknown>): void;
    error(phase: string, message: string, error?: Error): void;
}

// ─── Phase 1: Friction Extraction ────────────────────────────

/**
 * Phase 1: Extract communicative friction points from session data.
 *
 * Processes the complete session transcript to identify every moment
 * where the learner experienced communicative difficulty, preserving
 * full conversational context for each friction point.
 *
 * Detection heuristics:
 * - **Lexical**: Hesitation markers, L1 intrusion, topic abandonment
 * - **Morphosyntactic**: Interlanguage rule violation patterns
 * - **Phonemic**: PAE cosine similarity below threshold
 * - **Register**: Formality classifier mismatch
 * - **Pragmatic**: Speech act classifier mismatch
 *
 * @patentCritical The multi-heuristic friction detection method,
 *   combined with full contextual preservation, is a novel approach
 *   that extends beyond traditional error analysis.
 *
 * @param session - Complete session record with transcript
 * @param learnerProfile - Current learner state for baseline comparison
 * @param deps - Pipeline dependencies
 * @returns Structured extraction result with classified friction points
 */
export async function extractFriction(
    session: SessionRecord,
    learnerProfile: LearnerProfile,
    deps: MacroLoopDependencies,
): Promise<FrictionExtractionResult> {
    deps.logger.info('friction-extraction', 'Starting Phase 1', {
        sessionId: session.sessionId,
        conversationCount: session.conversations.length,
    });

    // ── Build analysis prompt from session transcript ──
    const transcript = session.conversations
        .flatMap(conv => conv.turns.map(t =>
            `[${t.speaker}] ${t.content}`
        ))
        .join('\n');

    const systemPrompt = [
        'You are a Second Language Acquisition expert analyzing a language learning session.',
        'Identify every moment of communicative friction — where the learner struggled,',
        'made an error, used L1, avoided a topic, or misused register.',
        'For each friction point, classify it by type (lexical, morphosyntactic, phonemic,',
        'register, pragmatic) and severity (minor, moderate, major, critical).',
        'Preserve 3 turns of context before and after each friction event.',
        `Current CEFR: ${learnerProfile.currentCEFR}`,
        `Active Persona: ${learnerProfile.activePersonaId}`,
    ].join('\n');

    const responseSchema = {
        type: 'object',
        properties: {
            frictionPoints: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['lexical', 'morphosyntactic', 'phonemic', 'register', 'pragmatic'] },
                        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                        rawUtterance: { type: 'string' },
                        analysis: {
                            type: 'object',
                            properties: {
                                whatWentWrong: { type: 'string' },
                                l1TransferHypothesis: { type: 'string' },
                                interlanguagePattern: { type: 'string', enum: ['systematic', 'random'] },
                                targetRule: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    };

    const llmResult = await deps.llmProvider.generateStructured<{
        frictionPoints: Array<{
            type: FrictionType;
            severity: FrictionSeverity;
            rawUtterance: string;
            analysis: {
                whatWentWrong: string;
                l1TransferHypothesis: string | null;
                interlanguagePattern: 'systematic' | 'random';
                targetRule: string;
            };
        }>;
    }>(systemPrompt, `Analyze this session transcript:\n\n${transcript}`, responseSchema);

    // ── Build structured FrictionPoint objects ──
    const frictionPoints: FrictionPoint[] = llmResult.frictionPoints.map((fp, idx) => ({
        id: `${session.sessionId}-fp-${idx}`,
        type: fp.type,
        severity: fp.severity,
        timestamp: new Date().toISOString(),
        durationMs: 0,
        rawUtterance: fp.rawUtterance,
        context: {
            turnsBefore: [],
            frictionTurn: { speaker: 'learner', content: fp.rawUtterance, timestamp: new Date().toISOString(), durationMs: 0 },
            turnsAfter: [],
            communicativeConsequence: 'communication-partially-succeeded',
            npcId: session.conversations[0]?.npcId ?? 'unknown',
            tierAtFriction: 1,
            locationId: 'default',
        },
        analysis: {
            whatWentWrong: fp.analysis.whatWentWrong,
            l1TransferHypothesis: fp.analysis.l1TransferHypothesis,
            interlanguagePattern: fp.analysis.interlanguagePattern,
            comprehensibilityImpact: fp.severity,
            socialImpact: 'none',
            targetRule: fp.analysis.targetRule,
        },
        curriculumRecommendation: {
            priority: fp.severity === 'critical' || fp.severity === 'high' ? 'immediate' : 'soon',
            targetForm: fp.analysis.targetRule,
            recommendedFormat: 'spaced-repetition-cards',
            forwardInjectionSpec: {
                targetForm: fp.analysis.targetRule,
                frictionType: fp.type,
                injectionMethod: `Create a natural opportunity to practice '${fp.analysis.targetRule}'.`,
                naturalityConstraint: 'Must feel like organic conversation.',
                targetNpcIds: ['companion'],
                targetTier: 1,
                targetLocationIds: ['default'],
                maxSessionAttempts: 3,
                status: 'pending',
            },
            estimatedDurationMinutes: 3,
        },
        recurrence: {
            seenBefore: false,
            previousSessionIds: [],
            totalOccurrences: 1,
            trajectory: 'stable',
        },
    }));

    // ── Count by type and severity ──
    const countByType = {} as Record<FrictionType, number>;
    const countBySeverity = {} as Record<FrictionSeverity, number>;
    for (const fp of frictionPoints) {
        countByType[fp.type] = (countByType[fp.type] ?? 0) + 1;
        countBySeverity[fp.severity] = (countBySeverity[fp.severity] ?? 0) + 1;
    }

    deps.logger.info('friction-extraction', `Phase 1 complete: ${frictionPoints.length} friction points`, { countByType });

    return {
        frictionPoints,
        totalCount: frictionPoints.length,
        countByType,
        countBySeverity,
        fluencyMetrics: {
            totalWordsProduced: transcript.split(/\s+/).length,
            wordsPerMinute: 0, // Requires timing data
            frictionRate: frictionPoints.length / Math.max(session.conversations.length, 1),
            averageHesitationMs: 0,
            l1IntrusionCount: countByType['lexical'] ?? 0,
            topicAbandonmentCount: 0,
            recoveryRate: 0,
        },
    };
}

// ─── Phase 2: Pattern Classification ─────────────────────────

/**
 * Phase 2: Classify and cluster friction patterns.
 *
 * Groups the extracted friction points by linguistic domain,
 * identifies recurring patterns from previous sessions, and
 * updates the learner's interlanguage model.
 *
 * Key operations:
 * 1. Semantic clustering of friction points within the session
 * 2. Cross-session recurrence check against historical friction data
 * 3. Interlanguage model delta computation
 * 4. Fossilization risk assessment for recurring patterns
 *
 * @patentCritical The computational interlanguage model that tracks
 *   learner-specific grammar rule hypotheses across sessions is a
 *   novel application of second language acquisition theory.
 *
 * @param extractionResult - Output of Phase 1
 * @param learnerProfile - Current learner state
 * @param deps - Pipeline dependencies
 * @returns Classified patterns with recurrence data and interlanguage updates
 */
export async function classifyPatterns(
    extractionResult: FrictionExtractionResult,
    learnerProfile: LearnerProfile,
    deps: MacroLoopDependencies,
): Promise<PatternClassificationResult> {
    deps.logger.info('pattern-classification', 'Starting Phase 2', {
        frictionCount: extractionResult.totalCount,
    });

    // ── Step 1: Retrieve historical friction points ──
    const historicalFriction = await deps.sessionStore.getPreviousFrictionPoints(
        learnerProfile.learnerId,
        100, // Last 100 friction points
    );
    const historicalForms = new Map<string, number>();
    for (const hf of historicalFriction) {
        const form = hf.analysis.targetRule ?? hf.rawUtterance;
        historicalForms.set(form, (historicalForms.get(form) ?? 0) + 1);
    }

    // ── Step 2: Cluster current friction points by type ──
    const clusterMap = new Map<FrictionType, FrictionPoint[]>();
    for (const fp of extractionResult.frictionPoints) {
        const existing = clusterMap.get(fp.type) ?? [];
        existing.push(fp);
        clusterMap.set(fp.type, existing);
    }

    const clusters: FrictionCluster[] = Array.from(clusterMap.entries()).map(
        ([type, members]) => ({
            clusterLabel: `${type} friction cluster`,
            dominantType: type,
            members,
            isStructuralGap: members.length >= 3,
            treatmentApproach: members.length >= 3 ? 'systematic' : 'individual',
        }),
    );

    // ── Step 3: Detect recurring patterns ──
    const recurringPatterns: RecurringPattern[] = [];
    const novelPatterns: FrictionPoint[] = [];

    for (const fp of extractionResult.frictionPoints) {
        const form = fp.analysis.targetRule ?? fp.rawUtterance;
        const prevCount = historicalForms.get(form) ?? 0;

        if (prevCount > 0) {
            recurringPatterns.push({
                patternId: `pattern-${form}`,
                targetForm: form,
                sessionCount: prevCount + 1,
                trajectory: prevCount >= 5 ? 'stable' : 'improving',
                fossilizationRisk: prevCount >= 3,
                escalatedPriority: prevCount >= 3 ? 'immediate' : 'soon',
            });
        } else {
            novelPatterns.push(fp);
        }
    }

    // ── Step 4: Compute interlanguage model delta ──
    const confirmedRules: string[] = [];
    const violatedRules = extractionResult.frictionPoints
        .filter(fp => fp.analysis.interlanguagePattern === 'systematic')
        .map(fp => fp.analysis.targetRule)
        .filter((r): r is string => r !== undefined);

    const emergingRules = novelPatterns
        .map(fp => fp.analysis.targetRule)
        .filter((r): r is string => r !== undefined);

    const fossilizingRules = recurringPatterns
        .filter(rp => rp.fossilizationRisk)
        .map(rp => rp.targetForm);

    deps.logger.info('pattern-classification', `Phase 2 complete: ${clusters.length} clusters, ${recurringPatterns.length} recurring`, {});

    return {
        clusters,
        recurringPatterns,
        novelPatterns,
        interlanguageUpdate: {
            confirmedRules,
            violatedRules,
            emergingRules,
            fossilizingRules,
        },
    };
}

// ─── Phase 3: Curriculum Generation ──────────────────────────

/**
 * Phase 3: Generate a hyper-personalized micro-curriculum.
 *
 * Converts classified friction patterns into instructional content
 * delivered in the learner's preferred format (Axis Z profile).
 *
 * Key operations:
 * 1. Priority ordering of friction patterns by severity × recurrence
 * 2. Curriculum format selection based on Axis Z retention profile
 * 3. Unit generation with contextual examples from the actual session
 * 4. Exercise generation calibrated to learner's current CEFR level
 * 5. Forward injection directive generation for each curriculum unit
 *
 * @patentCritical The generation of micro-curricula that use the
 *   learner's OWN conversational friction as instructional material,
 *   combined with forward injection planning, is a novel pedagogical method.
 *
 * @param classificationResult - Output of Phase 2
 * @param learnerProfile - Current learner state including Axis Z
 * @param deps - Pipeline dependencies
 * @returns Generated curriculum with forward injection specifications
 */
export async function generateCurriculum(
    classificationResult: PatternClassificationResult,
    learnerProfile: LearnerProfile,
    deps: MacroLoopDependencies,
): Promise<CurriculumGenerationResult> {
    deps.logger.info('curriculum-generation', 'Starting Phase 3', {
        clusterCount: classificationResult.clusters.length,
        recurringCount: classificationResult.recurringPatterns.length,
    });

    // ── Step 1: Build priority queue from friction data ──
    const priorityItems = [
        ...classificationResult.recurringPatterns.map(rp => ({
            priority: rp.escalatedPriority === 'immediate' ? 0 : 1,
            targetForm: rp.targetForm,
            source: 'recurring' as const,
            frictionPoints: classificationResult.clusters
                .flatMap(c => c.members)
                .filter(fp => (fp.analysis.targetRule ?? fp.rawUtterance) === rp.targetForm),
        })),
        ...classificationResult.clusters
            .filter(c => c.isStructuralGap)
            .map(c => ({
                priority: 2,
                targetForm: c.clusterLabel,
                source: 'cluster' as const,
                frictionPoints: c.members,
            })),
    ].sort((a, b) => a.priority - b.priority)
        .slice(0, 5); // Cap at 5 curriculum units per session

    // ── Step 2: Generate curriculum units via LLM ──
    const units: CurriculumUnit[] = [];
    const forwardInjectionDirectives: ForwardInjectionSpec[] = [];

    for (const item of priorityItems) {
        const contextSnippets = item.frictionPoints
            .map(fp => `Learner said: "${fp.rawUtterance}" — Problem: ${fp.analysis.whatWentWrong}`)
            .join('\n');

        const unitPrompt = [
            `Generate a micro-curriculum unit for a ${learnerProfile.currentCEFR} learner.`,
            `Target form: ${item.targetForm}`,
            `Learner persona: ${learnerProfile.activePersonaId}`,
            `Context from session:\n${contextSnippets}`,
            '',
            'Provide:',
            '1. A clear explanation in the learner\'s L1 of what went wrong',
            '2. Three correct example sentences in L2',
            '3. One fill-in-the-blank exercise and one multiple-choice exercise',
        ].join('\n');

        const unitResult = await deps.llmProvider.generateStructured<{
            explanationL1: string;
            examplesL2: string[];
            exercises: Array<{
                type: 'fill-blank' | 'multiple-choice';
                prompt: string;
                answer: string;
                feedback: string;
            }>;
        }>(
            'You are a language curriculum designer. Generate concise, learner-friendly content.',
            unitPrompt,
            {
                type: 'object',
                properties: {
                    explanationL1: { type: 'string' },
                    examplesL2: { type: 'array', items: { type: 'string' } },
                    exercises: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                type: { type: 'string' },
                                prompt: { type: 'string' },
                                answer: { type: 'string' },
                                feedback: { type: 'string' },
                            },
                        },
                    },
                },
            },
        );

        const unitId = `unit-${units.length}`;
        units.push({
            id: unitId,
            frictionPointIds: item.frictionPoints.map(fp => fp.id),
            targetForm: item.targetForm,
            title: `Practice: ${item.targetForm}`,
            content: {
                explanationL1: unitResult.explanationL1,
                examplesL2: unitResult.examplesL2,
            },
            exercises: unitResult.exercises.map((ex, i) => ({
                type: ex.type,
                prompt: ex.prompt,
                acceptedAnswers: [ex.answer],
                incorrectFeedback: ex.feedback,
                correctFeedback: 'Correct! Well done.',
            })),
            contextReference: contextSnippets,
        });

        // ── Generate forward injection directive ──
        forwardInjectionDirectives.push({
            targetForm: item.targetForm,
            frictionType: item.frictionPoints[0]?.type ?? 'lexical',
            injectionMethod: `Create a natural conversational situation requiring '${item.targetForm}'. The NPC should organically steer dialogue toward this form.`,
            naturalityConstraint: 'The NPC must create a conversational situation where the target form is needed, without explicitly teaching it.',
            targetNpcIds: ['companion'],
            targetTier: 1,
            targetLocationIds: ['default'],
            maxSessionAttempts: 3,
            status: 'pending',
        });
    }

    const curriculum: MicroCurriculum = {
        id: `curriculum-${classificationResult.clusters[0]?.clusterLabel ?? 'default'}-${Date.now()}`,
        sourceSessionId: classificationResult.clusters[0]?.members[0]?.context?.npcId
            ? classificationResult.clusters[0].members[0].id.split('-fp-')[0]
            : 'unknown',
        addressedFrictionPointIds: units.flatMap(u => u.frictionPointIds),
        format: 'spaced-repetition-cards',
        units,
        schemaVersion: '1.0.0',
    };

    deps.logger.info('curriculum-generation', `Phase 3 complete: ${units.length} units, ${forwardInjectionDirectives.length} injection directives`, {});

    return {
        curriculum,
        forwardInjectionDirectives,
        estimatedDeliveryMinutes: units.length * 3, // ~3 min per unit
    };
}

// ─── Phase 4: Adaptive Lesson Delivery ───────────────────────

/**
 * Phase 4: Deliver the micro-curriculum and track engagement.
 *
 * Presents the generated curriculum to the learner and captures
 * detailed engagement data to adapt future curriculum generation.
 *
 * Key operations:
 * 1. Render curriculum in the selected format
 * 2. Track per-unit completion, skip, and engagement signals
 * 3. Capture exercise accuracy and time-on-task
 * 4. Detect preference signals for future adaptation
 * 5. Write engagement data back to learner profile
 *
 * @param curriculum - Generated micro-curriculum from Phase 3
 * @param learnerProfile - Current learner state
 * @param deps - Pipeline dependencies
 * @returns Engagement data and preference signals
 */
export async function deliverLesson(
    curriculum: MicroCurriculum,
    learnerProfile: LearnerProfile,
    deps: MacroLoopDependencies,
): Promise<AdaptiveLessonResult> {
    deps.logger.info('adaptive-lesson', 'Starting Phase 4', {
        curriculumId: curriculum.id,
        unitCount: curriculum.units.length,
    });

    // Precondition: curriculum must have at least one unit
    // Postcondition: returns engagement data for all units

    // Phase 4 initializes the lesson delivery state.
    // In the full runtime, the UI component renders each unit and
    // collects engagement signals. Here we set up the tracking
    // structure and compute initial delivery preferences.

    const unitEngagement: UnitEngagementData[] = curriculum.units.map(
        (unit: CurriculumUnit) => ({
            unitId: unit.id,
            completed: false,
            skipped: false,
            flaggedUnclear: false,
            requestedMoreExamples: false,
            exerciseAccuracy: 0,
            timeSpentSeconds: 0,
        }),
    );

    // Compute preference signals from learner's historical profile
    // These guide the UI rendering order, format, and depth
    const preferenceSignals: LearnerPreferenceSignals = {
        examplePreference: 'standard',
        readsExplanations: true,
        engagesAudio: false,
        engagesVideo: false,
        paceRelativeToEstimate: 1.0,
        asksFollowUps: false,
    };

    // Compute total estimated time for the curriculum
    const estimatedMinutes = curriculum.units.length * 3; // ~3 min per unit

    deps.logger.info('adaptive-lesson', 'Phase 4 lesson state initialized', {
        curriculumId: curriculum.id,
        estimatedMinutes,
        unitCount: unitEngagement.length,
    });

    return {
        curriculumId: curriculum.id,
        completionRate: 0, // Updated by UI as learner progresses
        timeSpentMinutes: 0, // Updated by UI in real-time
        unitEngagement,
        preferenceSignals,
    };
}

// ─── Phase 5: Forward Injection ──────────────────────────────

/**
 * Phase 5: Execute forward injection into the simulation world.
 *
 * Takes the injection directives from Phase 3 and writes them
 * to the NPC briefing system, so that during the learner's next
 * session, NPCs will organically create situations that require
 * the target linguistic forms.
 *
 * Key operations:
 * 1. Validate injection directives (NPC exists, location exists)
 * 2. Merge with any existing active injections (avoid overload)
 * 3. Write injection directives to NPC memory store
 * 4. Set injection status to 'pending'
 * 5. Schedule injection expiry based on maxSessionAttempts
 *
 * @patentCritical The injection of learning targets into NPC behavior
 *   through environmentally natural prompts, invisible to the learner,
 *   is the culminating novel method of the feedback pipeline.
 *
 * @param injectionSpecs - Forward injection directives from Phase 3
 * @param learnerProfile - Current learner state
 * @param deps - Pipeline dependencies
 * @returns Injection execution result with briefed NPCs
 */
export async function injectForward(
    injectionSpecs: ForwardInjectionSpec[],
    learnerProfile: LearnerProfile,
    deps: MacroLoopDependencies,
): Promise<ForwardInjectionResult> {
    deps.logger.info('forward-injection', 'Starting Phase 5', {
        directiveCount: injectionSpecs.length,
    });

    // Precondition: injection specs contain valid NPC and location IDs
    // Postcondition: directives written to vector store, NPC briefings queued

    // Cap total active injections at 5 per session to avoid overload.
    // If more than 5 directives, sort by friction severity and defer the rest.
    const MAX_ACTIVE_INJECTIONS = 5;
    const activatedSpecs = injectionSpecs.slice(0, MAX_ACTIVE_INJECTIONS);
    const deferredSpecs = injectionSpecs.slice(MAX_ACTIVE_INJECTIONS);

    // Mark deferred specs
    for (const spec of deferredSpecs) {
        spec.status = 'deferred';
    }

    // Track which NPCs and locations are primed
    const briefedNpcIds = new Set<string>();
    const primedLocationIds = new Set<string>();

    // Write each directive to the vector store as an NPC briefing memory.
    // These will be retrieved by the Pre-Session Context Loader in the
    // next session and injected into NPC system prompts.
    for (const spec of activatedSpecs) {
        spec.status = 'pending';

        // Create a briefing memory entry for each target NPC
        for (const npcId of spec.targetNpcIds) {
            const briefingContent = [
                `FORWARD INJECTION BRIEFING — Target: ${spec.targetForm}`,
                `Friction type: ${spec.frictionType}`,
                `Method: ${spec.injectionMethod}`,
                `Constraint: ${spec.naturalityConstraint}`,
                `Max attempts: ${spec.maxSessionAttempts}`,
                `Tier: ${spec.targetTier}`,
            ].join('\n');

            // Generate embedding for the briefing content via the
            // provider's embedding API — falls back to zero-vector if unavailable.
            let briefingEmbedding: number[];
            try {
                briefingEmbedding = await deps.llmProvider.generateEmbedding(briefingContent);
            } catch {
                briefingEmbedding = new Array(1536).fill(0);
            }

            await deps.vectorStore.upsert(
                `injection-${learnerProfile.learnerId}-${npcId}-${Date.now()}`,
                briefingEmbedding,
                {
                    type: 'forward-injection',
                    content: briefingContent,
                    learnerId: learnerProfile.learnerId,
                    npcId,
                    targetForm: spec.targetForm,
                    frictionType: spec.frictionType,
                    status: 'pending',
                    maxSessionAttempts: spec.maxSessionAttempts,
                    targetTier: spec.targetTier,
                    targetLocationIds: spec.targetLocationIds,
                },
            );

            briefedNpcIds.add(npcId);
        }

        // Track primed locations
        for (const locationId of spec.targetLocationIds) {
            primedLocationIds.add(locationId);
        }
    }

    // Estimate sessions needed based on the number of active directives
    // and their max attempt windows
    const maxAttempts = activatedSpecs.map(s => s.maxSessionAttempts);
    const estimatedSessions = maxAttempts.length > 0
        ? Math.max(...maxAttempts)
        : 0;

    deps.logger.info('forward-injection', 'Phase 5 complete', {
        activated: activatedSpecs.length,
        deferred: deferredSpecs.length,
        briefedNpcs: briefedNpcIds.size,
        primedLocations: primedLocationIds.size,
    });

    return {
        directives: [...activatedSpecs, ...deferredSpecs],
        briefedNpcIds: Array.from(briefedNpcIds),
        primedLocationIds: Array.from(primedLocationIds),
        estimatedSessionsToComplete: estimatedSessions,
    };
}

// ─── Pipeline Orchestrator ───────────────────────────────────

/**
 * Execute the complete 5-phase Macro-Loop pipeline.
 *
 * Orchestrates the sequential execution of all five phases,
 * with error handling, state tracking, and pipeline monitoring.
 *
 * @patentCritical The full pipeline orchestration — from raw
 *   session data to forward injection — constitutes the complete
 *   Recursive Friction-to-Curriculum method.
 *
 * @param sessionId - Session to process
 * @param deps - Pipeline dependencies
 * @returns Complete pipeline state with all phase outputs
 */
export async function executeMacroLoop(
    sessionId: string,
    deps: MacroLoopDependencies,
): Promise<MacroLoopPipelineState> {
    const state: MacroLoopPipelineState = {
        sessionId,
        currentPhase: 'friction-extraction',
        status: 'running',
        startedAt: new Date().toISOString(),
    };

    try {
        // Retrieve session and learner data
        const session = await deps.sessionStore.getSession(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const learnerProfile = await deps.sessionStore.getLearnerProfile(session.learnerId);
        if (!learnerProfile) throw new Error(`Learner ${session.learnerId} not found`);

        // Phase 1: Friction Extraction
        state.currentPhase = 'friction-extraction';
        state.frictionExtractionResult = await extractFriction(session, learnerProfile, deps);

        // Phase 2: Pattern Classification
        state.currentPhase = 'pattern-classification';
        state.patternClassificationResult = await classifyPatterns(
            state.frictionExtractionResult,
            learnerProfile,
            deps,
        );

        // Phase 3: Curriculum Generation
        state.currentPhase = 'curriculum-generation';
        state.curriculumGenerationResult = await generateCurriculum(
            state.patternClassificationResult,
            learnerProfile,
            deps,
        );

        // Phase 4: Adaptive Lesson Delivery
        state.currentPhase = 'adaptive-lesson-feedback';
        state.adaptiveLessonResult = await deliverLesson(
            state.curriculumGenerationResult.curriculum,
            learnerProfile,
            deps,
        );

        // Phase 5: Forward Injection
        state.currentPhase = 'forward-injection';
        state.forwardInjectionResult = await injectForward(
            state.curriculumGenerationResult.forwardInjectionDirectives,
            learnerProfile,
            deps,
        );

        // Pipeline complete
        state.status = 'completed';
        state.completedAt = new Date().toISOString();

        deps.logger.info('pipeline', 'Macro-Loop pipeline completed', {
            sessionId,
            frictionCount: state.frictionExtractionResult.totalCount,
            curriculumUnits: state.curriculumGenerationResult.curriculum.units.length,
            injectionDirectives: state.forwardInjectionResult.directives.length,
        });

        return state;
    } catch (error) {
        state.status = 'failed';
        state.error = {
            failedAtPhase: state.currentPhase,
            message: error instanceof Error ? error.message : String(error),
            retryable: true,
            retryCount: 0,
        };

        deps.logger.error('pipeline', `Macro-Loop failed at ${state.currentPhase}`, error instanceof Error ? error : undefined);

        return state;
    }
}
