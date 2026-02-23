/**
 * AAPM Phoneme Alignment Engine — Type Definitions
 *
 * Data model for the 5-stage Phoneme Alignment Engine (PAE) pipeline:
 *   1. Audio Preprocessing
 *   2. Phoneme Forced Alignment
 *   3. Native Model Generation
 *   4. Feature Vector Comparison
 *   5. Heatmap Generation + Comprehensibility Scoring
 *
 * @module phoneme-engine/types
 * @patentCritical The PAE pipeline is a novel method for real-time
 *   pronunciation assessment that produces actionable articulatory
 *   guidance rather than simple accuracy scores.
 */

// ─── Pipeline Stages ─────────────────────────────────────────

/**
 * Input to the PAE pipeline.
 */
export interface PAEInput {
    /** Raw audio data (WAV or WebM format) */
    audioBuffer: ArrayBuffer;

    /** The text the learner was attempting to say */
    targetText: string;

    /** Target language ISO 639-1 code */
    targetLanguage: string;

    /** Learner's native language (for L1 transfer prediction) */
    nativeLanguage: string;

    /** Sample rate of the audio (default: 16000 Hz) */
    sampleRate: number;

    /** Session context for longitudinal tracking */
    sessionId: string;

    /** Learner ID for profile-based comparison */
    learnerId: string;
}

/**
 * Output of Stage 1: Audio Preprocessing.
 *
 * Noise reduction, normalization, Voice Activity Detection (VAD),
 * and silence trimming to produce clean audio for analysis.
 */
export interface PreprocessedAudio {
    /** Cleaned audio buffer */
    cleanedBuffer: ArrayBuffer;

    /** Detected signal-to-noise ratio */
    snrDb: number;

    /** Detected speech segments (start/end in milliseconds) */
    speechSegments: Array<{ startMs: number; endMs: number }>;

    /** Total speech duration (excluding silence) in milliseconds */
    speechDurationMs: number;

    /** Whether audio quality is sufficient for analysis */
    qualitySufficient: boolean;

    /** If quality is insufficient, the reason */
    qualityIssue?: 'too-quiet' | 'too-noisy' | 'too-short' | 'clipping';
}

/**
 * Output of Stage 2: Phoneme Forced Alignment.
 *
 * Maps the learner's audio to a sequence of phoneme intervals
 * using models like Montreal Forced Aligner or Wav2Vec 2.0.
 */
export interface ForcedAlignmentResult {
    /** Ordered sequence of aligned phonemes */
    phonemes: AlignedPhoneme[];

    /** Word-level alignment */
    words: AlignedWord[];

    /** Overall alignment confidence score */
    alignmentConfidence: number;

    /** Duration of the entire utterance in milliseconds */
    totalDurationMs: number;
}

/**
 * A single phoneme aligned to a time interval in the learner's audio.
 */
export interface AlignedPhoneme {
    /** IPA symbol for the phoneme */
    phoneme: string;

    /** Start time in milliseconds */
    startMs: number;

    /** End time in milliseconds */
    endMs: number;

    /** Duration in milliseconds */
    durationMs: number;

    /** Alignment confidence for this phoneme */
    confidence: number;

    /** The word this phoneme belongs to */
    wordIndex: number;
}

/**
 * A word aligned to a time interval.
 */
export interface AlignedWord {
    /** The word text */
    word: string;

    /** Index in the target text */
    wordIndex: number;

    /** Start time in milliseconds */
    startMs: number;

    /** End time in milliseconds */
    endMs: number;

    /** Phonemes within this word */
    phonemeIndices: number[];
}

/**
 * Output of Stage 3: Native Model Generation.
 *
 * Reference audio generated using Neural TTS (ElevenLabs, Azure)
 * and force-aligned to produce the comparison baseline.
 */
export interface NativeModelReference {
    /** Generated reference audio buffer */
    referenceBuffer: ArrayBuffer;

    /** Force-aligned phoneme sequence from the reference */
    referencePhonemes: AlignedPhoneme[];

    /** Which TTS engine was used */
    ttsEngine: string;

    /** Voice profile used for generation */
    voiceProfile: string;

    /** Speaking rate of the reference (words per minute) */
    referenceWPM: number;
}

/**
 * Output of Stage 4: Feature Vector Comparison.
 *
 * Compares learner's phoneme productions against native reference
 * using acoustic feature extraction (MFCC, formants, F0).
 *
 * @patentCritical The multi-dimensional feature comparison at the
 *   phoneme level, combined with suprasegmental analysis, produces
 *   a richer assessment than single-score pronunciation metrics.
 */
export interface FeatureComparisonResult {
    /** Per-phoneme comparison results */
    phonemeComparisons: PhonemeComparison[];

    /** Suprasegmental (prosodic) analysis */
    suprasegmentalAnalysis: SuprasegmentalAnalysis;

    /** Overall utterance-level similarity score */
    overallSimilarity: number;
}

/**
 * Comparison result for a single phoneme.
 */
export interface PhonemeComparison {
    /** IPA symbol of the target phoneme */
    targetPhoneme: string;

    /** IPA symbol of what the learner actually produced */
    producedPhoneme: string;

    /** Whether the correct phoneme was produced */
    isCorrect: boolean;

    /**
     * Cosine similarity between learner and native feature vectors.
     * Range: 0.0 (completely different) to 1.0 (identical).
     * Threshold for "acceptable": typically 0.7
     */
    cosineSimilarity: number;

    /** MFCC (Mel-Frequency Cepstral Coefficients) distance */
    mfccDistance: number;

    /** Formant comparison (F1, F2, F3) */
    formantComparison: {
        f1Difference: number;
        f2Difference: number;
        f3Difference: number;
    };

    /** Fundamental frequency (F0) difference */
    f0Difference: number;

    /** Duration ratio (learner vs. native) */
    durationRatio: number;

    /** Error classification if incorrect */
    errorType?: PhonemeErrorType;

    /** Whether this phoneme is critical for comprehensibility */
    comprehensibilityCritical: boolean;

    /**
     * Predicted L1 transfer pattern, if applicable.
     * Example: "Spanish /b/ → English /v/ substitution"
     */
    l1TransferPrediction?: string;
}

/**
 * Types of phoneme production errors.
 */
export type PhonemeErrorType =
    | 'substitution'    // Replaced with a different phoneme
    | 'omission'        // Phoneme was not produced
    | 'insertion'       // Extra phoneme was inserted
    | 'distortion';     // Phoneme was attempted but acoustically deviant

/**
 * Suprasegmental (prosodic) analysis — beyond individual phonemes.
 */
export interface SuprasegmentalAnalysis {
    /** Stress pattern accuracy */
    stressAccuracy: number;

    /** Intonation contour similarity */
    intonationSimilarity: number;

    /** Rhythm and timing accuracy */
    rhythmAccuracy: number;

    /** Speech rate comparison to native model */
    speechRateRatio: number;

    /** Pausing pattern naturalness */
    pauseNaturalness: number;

    /** Specific stress errors detected */
    stressErrors: Array<{
        word: string;
        expectedStress: number;
        producedStress: number;
    }>;
}

/**
 * Output of Stage 5: Heatmap + Comprehensibility Report.
 *
 * The final output of the PAE pipeline — a visual phoneme heatmap,
 * overall comprehensibility score, and actionable articulatory guidance.
 */
export interface PAEReport {
    /** Visual phoneme accuracy heatmap data */
    heatmap: PhonemeHeatmapData;

    /**
     * Comprehensibility Score: probability (0.0 to 1.0) that a native
     * speaker would understand this utterance without difficulty.
     *
     * Note: high comprehensibility can coexist with accent. Poor
     * comprehensibility can occur despite few phonemic errors (due
     * to prosodic issues).
     */
    comprehensibilityScore: number;

    /** Phoneme-level accuracy breakdown */
    phonemeAccuracy: PhonemeComparison[];

    /** Suprasegmental analysis */
    suprasegmental: SuprasegmentalAnalysis;

    /** Actionable articulatory guidance for improvement */
    guidance: ArticulatoryGuidance[];

    /** Phonemes to prioritize for practice */
    priorityPhonemes: string[];

    /** Comparison to learner's historical performance */
    historicalComparison?: {
        previousScore: number;
        trend: 'improving' | 'stable' | 'regressing';
        improvedPhonemes: string[];
        regressedPhonemes: string[];
    };
}

/**
 * Data structure for the visual phoneme heatmap.
 */
export interface PhonemeHeatmapData {
    /** All phonemes in the target language inventory */
    inventory: PhonemeHeatmapEntry[];

    /** Color mapping specification */
    colorScale: {
        excellent: string;  // e.g., "#22c55e" (green)
        good: string;       // e.g., "#84cc16" (lime)
        fair: string;       // e.g., "#f59e0b" (amber)
        poor: string;       // e.g., "#ef4444" (red)
        notAttempted: string; // e.g., "#9ca3af" (gray)
    };
}

/**
 * A single entry in the phoneme heatmap.
 */
export interface PhonemeHeatmapEntry {
    /** IPA symbol */
    phoneme: string;

    /** Phoneme category (vowel, consonant, etc.) */
    category: 'vowel' | 'consonant' | 'diphthong' | 'nasal' | 'fricative' | 'plosive' | 'approximant' | 'lateral';

    /** Accuracy score (0.0 to 1.0), null if never attempted */
    accuracy: number | null;

    /** Number of times this phoneme has been produced */
    attemptCount: number;

    /** Whether this phoneme is critical for comprehensibility */
    comprehensibilityCritical: boolean;

    /** Priority marker for practice */
    priorityLevel: 'high' | 'medium' | 'low' | 'mastered';
}

/**
 * Actionable articulatory guidance for a problematic phoneme.
 */
export interface ArticulatoryGuidance {
    /** The target phoneme */
    phoneme: string;

    /** Description of the correct articulation */
    articulationDescription: string;

    /** Common L1 interference pattern for this learner */
    l1Interference: string;

    /** Practice exercises */
    practiceExercises: string[];

    /** Minimal pairs for discrimination practice */
    minimalPairs: Array<{ word1: string; word2: string }>;

    /** Audio URL for reference pronunciation */
    referenceAudioUrl?: string;
}
