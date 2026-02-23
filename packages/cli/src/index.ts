#!/usr/bin/env node
/**
 * @aapm/cli — Command-line tools for the AAPM Framework.
 *
 * Commands:
 *   validate-schema <file>   Validate a persona schema YAML file
 *
 * @module cli
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// ─── Persona Schema Validator ────────────────────────────────

/**
 * Required top-level keys in a valid AAPM persona schema.
 *
 * These correspond to the sections defined in the persona schema
 * specification (docs/schema.md).
 */
const REQUIRED_TOP_LEVEL_KEYS = [
    'persona',
    'learner_profile',
    'vocabulary_matrix',
    'environment',
    'companion',
    'retention_profile',
    'evaluation',
] as const;

/**
 * Required sub-keys within each top-level section.
 */
const REQUIRED_SUB_KEYS: Record<string, string[]> = {
    persona: ['name', 'age', 'nationality', 'native_language', 'target_language', 'cefr_level'],
    learner_profile: ['goals', 'interests', 'challenges'],
    vocabulary_matrix: ['tier_1_essentials', 'tier_2_domain', 'tier_3_professional'],
    environment: ['tier_2', 'tier_3'],
    companion: ['personality', 'shared_interests', 'cultural_bridge'],
    retention_profile: ['preferred_format', 'engagement_triggers'],
    evaluation: ['success_metrics'],
};

/**
 * Validation error with path information.
 */
interface ValidationError {
    path: string;
    message: string;
    severity: 'error' | 'warning';
}

/**
 * Validation result for a persona schema.
 */
interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    stats: {
        topLevelKeys: number;
        totalFields: number;
        vocabTerms: number;
    };
}

/**
 * Validate a persona schema YAML file.
 *
 * @param filePath - Absolute or relative path to the YAML file
 * @returns Validation result with errors, warnings, and stats
 */
export function validateSchema(filePath: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // ── Step 1: Read and parse YAML ──
    let raw: string;
    try {
        raw = fs.readFileSync(path.resolve(filePath), 'utf-8');
    } catch {
        return {
            valid: false,
            errors: [{ path: filePath, message: 'File not found or unreadable', severity: 'error' }],
            warnings: [],
            stats: { topLevelKeys: 0, totalFields: 0, vocabTerms: 0 },
        };
    }

    let doc: Record<string, unknown>;
    try {
        doc = yaml.load(raw) as Record<string, unknown>;
    } catch (e) {
        return {
            valid: false,
            errors: [{ path: filePath, message: `YAML parse error: ${e instanceof Error ? e.message : String(e)}`, severity: 'error' }],
            warnings: [],
            stats: { topLevelKeys: 0, totalFields: 0, vocabTerms: 0 },
        };
    }

    if (!doc || typeof doc !== 'object') {
        return {
            valid: false,
            errors: [{ path: filePath, message: 'Schema must be a YAML mapping (not a scalar or array)', severity: 'error' }],
            warnings: [],
            stats: { topLevelKeys: 0, totalFields: 0, vocabTerms: 0 },
        };
    }

    // ── Step 2: Check required top-level keys ──
    const docKeys = Object.keys(doc);
    for (const key of REQUIRED_TOP_LEVEL_KEYS) {
        if (!(key in doc)) {
            errors.push({
                path: `$.${key}`,
                message: `Missing required top-level key: '${key}'`,
                severity: 'error',
            });
        }
    }

    // ── Step 3: Check required sub-keys ──
    for (const [section, requiredKeys] of Object.entries(REQUIRED_SUB_KEYS)) {
        if (section in doc && typeof doc[section] === 'object' && doc[section] !== null) {
            const sectionObj = doc[section] as Record<string, unknown>;
            for (const subKey of requiredKeys) {
                if (!(subKey in sectionObj)) {
                    errors.push({
                        path: `$.${section}.${subKey}`,
                        message: `Missing required key: '${section}.${subKey}'`,
                        severity: 'error',
                    });
                }
            }
        }
    }

    // ── Step 4: Validate persona fields ──
    if ('persona' in doc && typeof doc.persona === 'object' && doc.persona !== null) {
        const persona = doc.persona as Record<string, unknown>;

        // CEFR level validation
        if ('cefr_level' in persona) {
            const validCEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
            if (!validCEFR.includes(String(persona.cefr_level))) {
                errors.push({
                    path: '$.persona.cefr_level',
                    message: `Invalid CEFR level '${persona.cefr_level}'. Must be one of: ${validCEFR.join(', ')}`,
                    severity: 'error',
                });
            }
        }

        // Age validation
        if ('age' in persona && typeof persona.age === 'number') {
            if (persona.age < 5 || persona.age > 100) {
                warnings.push({
                    path: '$.persona.age',
                    message: `Unusual age ${persona.age}. Expected 5-100.`,
                    severity: 'warning',
                });
            }
        }
    }

    // ── Step 5: Validate environment tiers ──
    if ('environment' in doc && typeof doc.environment === 'object' && doc.environment !== null) {
        const env = doc.environment as Record<string, unknown>;

        for (const tier of ['tier_2', 'tier_3']) {
            if (tier in env && typeof env[tier] === 'object' && env[tier] !== null) {
                const tierObj = env[tier] as Record<string, unknown>;
                if (!('scenarios' in tierObj) && !('location' in tierObj) && !('locations' in tierObj)) {
                    warnings.push({
                        path: `$.environment.${tier}`,
                        message: `Tier section '${tier}' has no scenarios or locations defined`,
                        severity: 'warning',
                    });
                }
            }
        }
    }

    // ── Step 6: Compute stats ──
    const countFields = (obj: unknown, depth = 0): number => {
        if (depth > 10) return 0;
        if (!obj || typeof obj !== 'object') return 1;
        if (Array.isArray(obj)) return obj.reduce((acc: number, item) => acc + countFields(item, depth + 1), 0);
        return Object.values(obj).reduce((acc: number, val) => acc + countFields(val, depth + 1), 0);
    };

    let vocabTerms = 0;
    if ('vocabulary_matrix' in doc && typeof doc.vocabulary_matrix === 'object' && doc.vocabulary_matrix !== null) {
        const vocab = doc.vocabulary_matrix as Record<string, unknown>;
        for (const tier of Object.values(vocab)) {
            if (Array.isArray(tier)) vocabTerms += tier.length;
            else if (typeof tier === 'object' && tier !== null) {
                for (const v of Object.values(tier)) {
                    if (Array.isArray(v)) vocabTerms += v.length;
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        stats: {
            topLevelKeys: docKeys.length,
            totalFields: countFields(doc),
            vocabTerms,
        },
    };
}

// ─── CLI Entry Point ─────────────────────────────────────────

function main(): void {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
        console.log(`
  @aapm/cli — AAPM Framework CLI Tools

  USAGE:
    aapm validate-schema <file.yaml>     Validate a persona schema
    aapm validate-schema <dir/>          Validate all .yaml files in directory

  OPTIONS:
    --help, -h                           Show this help message
    --json                               Output results as JSON
        `);
        process.exit(0);
    }

    if (command === 'validate-schema') {
        const target = args[1];
        const jsonOutput = args.includes('--json');

        if (!target) {
            console.error('Error: Please specify a file or directory to validate.');
            process.exit(1);
        }

        const resolvedPath = path.resolve(target);
        let files: string[];

        if (fs.statSync(resolvedPath).isDirectory()) {
            files = fs.readdirSync(resolvedPath)
                .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
                .map(f => path.join(resolvedPath, f));
        } else {
            files = [resolvedPath];
        }

        let allValid = true;

        for (const file of files) {
            const result = validateSchema(file);

            if (jsonOutput) {
                console.log(JSON.stringify({ file: path.basename(file), ...result }, null, 2));
            } else {
                const icon = result.valid ? '✅' : '❌';
                console.log(`\n${icon} ${path.basename(file)}`);

                if (result.errors.length > 0) {
                    console.log('  Errors:');
                    for (const err of result.errors) {
                        console.log(`    ✗ ${err.path}: ${err.message}`);
                    }
                }

                if (result.warnings.length > 0) {
                    console.log('  Warnings:');
                    for (const warn of result.warnings) {
                        console.log(`    ⚠ ${warn.path}: ${warn.message}`);
                    }
                }

                console.log(`  Stats: ${result.stats.topLevelKeys} sections, ${result.stats.totalFields} fields, ${result.stats.vocabTerms} vocab terms`);
            }

            if (!result.valid) allValid = false;
        }

        process.exit(allValid ? 0 : 1);
    } else {
        console.error(`Unknown command: ${command}. Use --help for usage.`);
        process.exit(1);
    }
}

main();
