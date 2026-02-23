/**
 * Shared types for @aapm/ui components.
 */

/** Refraction level presented to the learner. */
export type RefractionLevel = 'basic' | 'native' | 'formal';

/** Individual phoneme comparison score from the PAE. */
export interface PhonemeScore {
    /** IPA representation of the target phoneme. */
    target: string;
    /** IPA representation of what the learner produced. */
    produced: string;
    /** Cosine similarity between target and produced (0.0–1.0). */
    similarity: number;
    /** Articulatory guidance for improvement. */
    guidance?: string;
}

/** A single card in a generated micro-curriculum. */
export interface CurriculumCard {
    /** Card unique identifier. */
    id: string;
    /** Card type: vocabulary, grammar, pronunciation, cultural. */
    type: 'vocabulary' | 'grammar' | 'pronunciation' | 'cultural';
    /** L2 target form. */
    targetForm: string;
    /** L1 translation or explanation. */
    l1Explanation: string;
    /** Example sentence in L2. */
    exampleSentence: string;
    /** CEFR level of this content. */
    cefrLevel: string;
    /** Whether the learner has completed this card. */
    completed: boolean;
}

/** Current tier state for progress display. */
export interface TierState {
    /** Current tier (1, 2, or 3). */
    currentTier: 1 | 2 | 3;
    /** Progress within current tier (0.0–1.0). */
    progress: number;
    /** Sessions completed in this tier. */
    sessionsCompleted: number;
    /** Estimated sessions remaining. */
    sessionsRemaining: number;
    /** CEFR level at current assessment. */
    cefrLevel: string;
    /** Key milestones achieved. */
    milestones: string[];
}
