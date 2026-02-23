/**
 * Evaluation Framework — Public API
 *
 * @module evaluation
 */
export type {
    AAPMOutcomeMetrics,
    MetricValue,
    SessionEvaluationReport,
    LongitudinalProgressReport,
    MetricTrajectory,
    EvaluationRubric,
    ScoringCriteria,
    ABTestConfig,
    ABTestResults,
    LexicalAvailabilityIndex,
    LexicalRetrievalEvent,
    CommunicativePressureState,
    PressureComponent,
    PressureAdjustmentEvent,
} from './types';

export {
    calculateTaskCompletionRate,
    calculateFrictionRecurrenceRate,
    calculateComprehensibilityScore,
    calculateRegisterAccuracyScore,
    calculateCodeSwitchReductionRate,
    calculateForwardInjectionHitRate,
    calculateSocialReputationTrajectory,
    calculateNegotiationSuccessRate,
    generateSessionReport,
    generateLongitudinalReport,
} from './metrics';
