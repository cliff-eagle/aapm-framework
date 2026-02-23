/**
 * @module world-engine/npc-behavior tests
 * Tests for the Big Five behavioral variation matrix, mood dynamics,
 * and reputation descriptors.
 */
import { describe, it, expect } from 'vitest';
import {
    computeNPCBehavior,
    computeMoodShift,
    shouldDecayMood,
    getReputationBehaviorDescriptor,
} from './npc-behavior';
import type { BigFiveProfile, CulturalOverlay } from './world-runtime';

// ─── Test Fixtures ────────────────────────────────────────────

const friendly: BigFiveProfile = {
    openness: 0.8,
    conscientiousness: 0.5,
    extraversion: 0.7,
    agreeableness: 0.9,
    neuroticism: 0.2,
};

const demanding: BigFiveProfile = {
    openness: 0.2,
    conscientiousness: 0.7,
    extraversion: 0.7,
    agreeableness: 0.1,
    neuroticism: 0.6,
};

const culturalFormal: CulturalOverlay = {
    communicative_directness: 0.3,
    formality_default: 0.9,
    power_distance_sensitivity: 0.8,
    emotional_expressiveness: 0.3,
};

const culturalCasual: CulturalOverlay = {
    communicative_directness: 0.8,
    formality_default: 0.2,
    power_distance_sensitivity: 0.2,
    emotional_expressiveness: 0.9,
};

// ─── computeNPCBehavior ───────────────────────────────────────

describe('computeNPCBehavior', () => {
    it('should return all modifier fields', () => {
        const result = computeNPCBehavior(friendly, 'neutral', 0.0, culturalCasual, 0.8);

        expect(result).toHaveProperty('responseLength');
        expect(result).toHaveProperty('patience');
        expect(result).toHaveProperty('helpfulness');
        expect(result).toHaveProperty('registerStrictness');
        expect(result).toHaveProperty('topicInitiative');
        expect(result).toHaveProperty('expressiveness');
        expect(result).toHaveProperty('silenceToleranceSeconds');
        expect(result).toHaveProperty('escalationTendency');
    });

    it('should compute higher patience for friendly NPC', () => {
        const friendlyResult = computeNPCBehavior(friendly, 'neutral', 0.0, culturalCasual, 0.8);
        const demandingResult = computeNPCBehavior(demanding, 'neutral', 0.0, culturalCasual, 0.3);

        expect(friendlyResult.patience).toBeGreaterThan(demandingResult.patience);
    });

    it('should compute higher helpfulness with higher reputation', () => {
        const lowRep = computeNPCBehavior(friendly, 'neutral', -0.5, culturalCasual, 0.8);
        const highRep = computeNPCBehavior(friendly, 'neutral', 1.0, culturalCasual, 0.8);

        expect(highRep.helpfulness).toBeGreaterThan(lowRep.helpfulness);
    });

    it('should compute higher register strictness for formal cultural overlay', () => {
        const formal = computeNPCBehavior(friendly, 'neutral', 0.0, culturalFormal, 0.8);
        const casual = computeNPCBehavior(friendly, 'neutral', 0.0, culturalCasual, 0.8);

        expect(formal.registerStrictness).toBeGreaterThan(casual.registerStrictness);
    });

    it('should reduce patience when NPC is irritated', () => {
        const neutral = computeNPCBehavior(demanding, 'neutral', 0.0, culturalCasual, 0.3);
        const irritated = computeNPCBehavior(demanding, 'irritated', 0.0, culturalCasual, 0.3);

        expect(irritated.patience).toBeLessThan(neutral.patience);
    });

    it('should clamp all values between 0 and 1', () => {
        const result = computeNPCBehavior(demanding, 'panicking', -0.5, culturalFormal, 0.0);

        for (const [key, val] of Object.entries(result)) {
            if (key === 'silenceToleranceSeconds') continue;
            expect(val).toBeGreaterThanOrEqual(0.0);
            expect(val).toBeLessThanOrEqual(1.0);
        }
    });

    it('should compute silence tolerance between 3 and 15 seconds', () => {
        const patient = computeNPCBehavior(friendly, 'pleased', 1.0, culturalCasual, 0.95);
        const impatient = computeNPCBehavior(demanding, 'irritated', -0.5, culturalFormal, 0.1);

        expect(patient.silenceToleranceSeconds).toBeGreaterThanOrEqual(3);
        expect(patient.silenceToleranceSeconds).toBeLessThanOrEqual(15);
        expect(impatient.silenceToleranceSeconds).toBeGreaterThanOrEqual(3);
        expect(impatient.silenceToleranceSeconds).toBeLessThanOrEqual(15);
        expect(patient.silenceToleranceSeconds).toBeGreaterThan(impatient.silenceToleranceSeconds);
    });

    it('should compute higher escalation tendency for low-agreeableness NPC', () => {
        const result = computeNPCBehavior(demanding, 'irritated', -0.5, culturalFormal, 0.1);

        expect(result.escalationTendency).toBeGreaterThan(0.5);
    });
});

// ─── computeMoodShift ─────────────────────────────────────────

describe('computeMoodShift', () => {
    it('should shift to pleased on successful communication with high agreeableness', () => {
        const result = computeMoodShift('neutral', 'successful-communication', friendly);
        expect(result).toBe('pleased');
    });

    it('should shift to irritated on register violation with high neuroticism', () => {
        const result = computeMoodShift('neutral', 'register-violation', demanding);
        expect(result).toBe('irritated');
    });

    it('should shift to warm on repair attempt with high openness', () => {
        const result = computeMoodShift('cold', 'repair-attempt', friendly);
        expect(result).toBe('warm');
    });

    it('should handle cultural insensitivity', () => {
        const result = computeMoodShift('neutral', 'cultural-insensitivity', demanding);
        expect(['cold', 'irritated']).toContain(result);
    });
});

// ─── shouldDecayMood ──────────────────────────────────────────

describe('shouldDecayMood', () => {
    it('should not decay neutral mood', () => {
        expect(shouldDecayMood('neutral', 5)).toBe(false);
    });

    it('should decay mood after 10+ turns', () => {
        expect(shouldDecayMood('irritated', 10)).toBe(true);
    });

    it('should not decay mood before 10 turns (deterministic past threshold)', () => {
        expect(shouldDecayMood('irritated', 5)).toBe(false);
    });
});

// ─── getReputationBehaviorDescriptor ──────────────────────────

describe('getReputationBehaviorDescriptor', () => {
    it('should return warm descriptor for high reputation', () => {
        const desc = getReputationBehaviorDescriptor(0.7);
        expect(desc).toContain('Warm');
    });

    it('should return professional descriptor for neutral reputation', () => {
        const desc = getReputationBehaviorDescriptor(0.2);
        expect(desc).toContain('Friendly');
    });

    it('should return cool descriptor for negative reputation', () => {
        const desc = getReputationBehaviorDescriptor(-0.2);
        expect(desc).toContain('cool');
    });

    it('should return cold descriptor for very negative reputation', () => {
        const desc = getReputationBehaviorDescriptor(-0.5);
        expect(desc).toContain('Cold');
    });
});
