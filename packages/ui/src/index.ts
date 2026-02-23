/**
 * @aapm/ui — Component Library for the AAPM Framework
 *
 * Provides React components for learner-facing interfaces including
 * the Companion Chat, Tri-Refraction Panel, Phoneme Heatmap,
 * and curriculum delivery.
 *
 * @packageDocumentation
 */

// ─── Core Session Components ────────────────────────────────────
export { CompanionChat } from './components/CompanionChat';
export type { CompanionChatProps, ChatMessage } from './components/CompanionChat';

export { RefractionPanel } from './components/RefractionPanel';
export type { RefractionPanelProps } from './components/RefractionPanel';

export { PhonemeHeatmap } from './components/PhonemeHeatmap';
export type { PhonemeHeatmapProps } from './components/PhonemeHeatmap';

export { OutputScaffold } from './components/OutputScaffold';
export type { OutputScaffoldProps } from './components/OutputScaffold';

// ─── Curriculum & Progress Components ───────────────────────────
export { MicroCurriculum } from './components/MicroCurriculum';
export type { MicroCurriculumProps } from './components/MicroCurriculum';

export { TierProgress } from './components/TierProgress';
export type { TierProgressProps } from './components/TierProgress';

// ─── Onboarding & Settings ─────────────────────────────────────
export { OnboardingWizard } from './components/OnboardingWizard';
export type { OnboardingWizardProps, OnboardingData } from './components/OnboardingWizard';

export { AIProviderSettings } from './components/AIProviderSettings';
export type { AIProviderSettingsProps } from './components/AIProviderSettings';

// ─── Shared Types ───────────────────────────────────────────────
export type {
    RefractionLevel,
    PhonemeScore,
    CurriculumCard,
    TierState,
} from './types';

