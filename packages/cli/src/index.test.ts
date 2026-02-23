/**
 * @aapm/cli — validate-schema unit tests
 *
 * Tests the schema validation logic against known-good and known-bad
 * YAML inputs to ensure correct error detection.
 */

import { describe, it, expect } from 'vitest';
import { validateSchema } from './index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/** Helper: write a temp YAML file and return its path. */
function writeTempYaml(content: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aapm-test-'));
    const filePath = path.join(dir, 'test.yaml');
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
}

describe('validateSchema', () => {
    // ── Valid Schema ──────────────────────────────────────────

    it('accepts a fully valid persona schema', () => {
        const yaml = `
persona:
  id: test-persona
  name: Test Persona
  age: 25
  nationality: US
  native_language: en
  target_language: es
  cefr_level: B1
learner_profile:
  goals: [conversational-fluency]
  interests: [travel]
  challenges: [verb-conjugation]
vocabulary_matrix:
  tier_1_essentials:
    - greetings
  tier_2_domain:
    - food
  tier_3_professional:
    - negotiations
environment:
  tier_2:
    setting: Test city
    locations: []
  tier_3:
    scenarios: []
companion:
  personality: Friendly
  shared_interests: [coding]
  cultural_bridge: Explains things well
retention_profile:
  preferred_format: organic-social
  engagement_triggers: []
evaluation:
  success_metrics:
    - comprehension
`;
        const result = validateSchema(writeTempYaml(yaml));
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    // ── Missing Top-Level Keys ───────────────────────────────

    it('detects missing required top-level keys', () => {
        const yaml = `
persona:
  id: incomplete
`;
        const result = validateSchema(writeTempYaml(yaml));
        expect(result.valid).toBe(false);

        const missingKeys = result.errors
            .filter((e) => e.message.includes('Missing required top-level key'))
            .map((e) => e.path);
        expect(missingKeys).toContain('$.learner_profile');
        expect(missingKeys).toContain('$.vocabulary_matrix');
        expect(missingKeys).toContain('$.environment');
        expect(missingKeys).toContain('$.companion');
        expect(missingKeys).toContain('$.retention_profile');
        expect(missingKeys).toContain('$.evaluation');
    });

    // ── CEFR Validation ──────────────────────────────────────

    it('rejects invalid CEFR levels', () => {
        const yaml = `
persona:
  id: bad-cefr
  cefr_level: D3
learner_profile:
  native_language: en
vocabulary_matrix: {}
environment: {}
companion: {}
retention_profile: {}
evaluation: {}
`;
        const result = validateSchema(writeTempYaml(yaml));

        const cefrErrors = result.errors.filter((e) =>
            e.message.includes('CEFR'),
        );
        expect(cefrErrors.length).toBeGreaterThan(0);
    });

    it('accepts valid CEFR levels', () => {
        const yaml = `
persona:
  id: good-cefr
  cefr_level: B2
learner_profile:
  native_language: en
vocabulary_matrix: {}
environment: {}
companion: {}
retention_profile: {}
evaluation: {}
`;
        const result = validateSchema(writeTempYaml(yaml));

        const cefrErrors = result.errors.filter((e) =>
            e.message.includes('CEFR'),
        );
        expect(cefrErrors).toHaveLength(0);
    });

    // ── Age Validation ───────────────────────────────────────

    it('warns about unusual ages', () => {
        const yaml = `
persona:
  id: old-age
  age: 150
learner_profile:
  native_language: en
vocabulary_matrix: {}
environment: {}
companion: {}
retention_profile: {}
evaluation: {}
`;
        const result = validateSchema(writeTempYaml(yaml));

        const ageWarnings = result.warnings.filter((w) =>
            w.message.includes('age'),
        );
        expect(ageWarnings.length).toBeGreaterThan(0);
    });

    it('accepts normal ages without warning', () => {
        const yaml = `
persona:
  id: normal-age
  age: 30
learner_profile:
  native_language: en
vocabulary_matrix: {}
environment: {}
companion: {}
retention_profile: {}
evaluation: {}
`;
        const result = validateSchema(writeTempYaml(yaml));

        const ageWarnings = result.warnings.filter((w) =>
            w.message.includes('age'),
        );
        expect(ageWarnings).toHaveLength(0);
    });

    // ── Stats Counting ───────────────────────────────────────

    it('counts stats correctly', () => {
        const yaml = `
persona:
  id: stats-test
  name: Stats
  age: 25
learner_profile:
  native_language: en
vocabulary_matrix:
  tier_1:
    - hello
    - goodbye
    - thanks
environment: {}
companion: {}
retention_profile: {}
evaluation: {}
`;
        const result = validateSchema(writeTempYaml(yaml));
        expect(result.stats.topLevelKeys).toBeGreaterThan(0);
        expect(result.stats.totalFields).toBeGreaterThan(0);
    });

    // ── File Not Found ───────────────────────────────────────

    it('handles missing files gracefully', () => {
        const result = validateSchema('/nonexistent/path/schema.yaml');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    // ── Invalid YAML ─────────────────────────────────────────

    it('handles malformed YAML gracefully', () => {
        const yaml = `
this is: [not: valid: yaml:
  deeply: [broken
`;
        const result = validateSchema(writeTempYaml(yaml));
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    // ── Real Schema Files ────────────────────────────────────

    it('can process real example schema files', () => {
        const schemasDir = path.resolve(
            __dirname,
            '../../../schemas/examples',
        );
        if (!fs.existsSync(schemasDir)) return; // Skip if not in monorepo

        const files = fs
            .readdirSync(schemasDir)
            .filter((f) => f.endsWith('.yaml') && !f.startsWith('._'));

        expect(files.length).toBeGreaterThan(0);

        for (const file of files) {
            const result = validateSchema(path.join(schemasDir, file));
            // Should parse and return a result (even if not "valid" per strict rules)
            expect(result).toHaveProperty('valid');
            expect(result).toHaveProperty('errors');
            expect(result).toHaveProperty('stats');
            expect(result.stats.totalFields).toBeGreaterThan(0);
        }
    });
});
