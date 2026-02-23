/**
 * Feedback Engine — Public API
 *
 * @module feedback-engine
 */
export type {
    FrictionType,
    FrictionSeverity,
    FrictionContext,
    FrictionAnalysis,
    CurriculumRecommendation,
    RecurrenceData,
    PhonemefrictionData,
    FrictionPoint,
    FrictionExtractionResult,
    MacroLoopPhase,
    PatternClassificationResult,
    CurriculumGenerationResult,
    CurriculumUnit,
    AdaptiveLessonResult,
    ForwardInjectionResult,
    ForwardInjectionSpec,
    MacroLoopPipelineState,
    PipelineError,
    EmotionalState,
    AffectiveSignalVector,
    AffectiveInferenceResult,
    AffectiveCalibrationProfile,
    ScaffoldingEscalation,
    ScaffoldingAction,
    RepairStrategy,
    RepairAttempt,
    RepairCompetenceProfile,
    StrategyUsage,
} from './types';


export { executeMacroLoop } from './pipeline';
export type { MacroLoopDependencies } from './pipeline';
