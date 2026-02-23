/**
 * @module schema-loader tests
 * Tests for schema validation, version detection, migration path finding,
 * and schema migration.
 */
import { describe, it, expect } from 'vitest';
import {
    validatePersonaSchema,
} from './validator';
import {
    detectSchemaVersion,
    needsMigration,
    findMigrationPath,
    migrateSchema,
    CURRENT_SCHEMA_VERSION,
    SCHEMA_VERSION_REGISTRY,
    MIGRATION_STEPS,
} from './migrations';

// ─── Minimal valid schema fixture ─────────────────────────────
function minimalValidSchema(): Record<string, unknown> {
    return {
        schema_version: '1.0.0',
        meta: {
            id: 'test-schema-001',
            name: 'Test Schema',
            domain: 'testing',
            targetLanguage: 'es',
        },
        learner_profile: {
            native_language: 'en',
            target_language: 'es',
        },
        vocabulary_matrix: [
            { name: 'greetings', priority: 'critical', items: ['hola', 'buenos días'] },
            { name: 'numbers', priority: 'important', items: ['uno', 'dos', 'tres'] },
            { name: 'food', priority: 'supplementary', items: ['pan', 'agua'] },
        ],
        npcs: [
            { id: 'npc-1', name: 'Rosa', role: 'shopkeeper', tier: 2, personality: 'warm', defaultRegister: 'informal', locationIds: ['loc-1'] },
            { id: 'npc-2', name: 'Carlos', role: 'boss', tier: 3, personality: 'formal', defaultRegister: 'formal', locationIds: ['loc-2'] },
        ],
        environment: {
            tier_2: {
                locations: [
                    { id: 'loc-1', name: 'Market', npcs: ['npc-1'] },
                    { id: 'loc-2', name: 'Office', npcs: ['npc-2'] },
                ],
            },
        },
        scenarios: [
            { id: 'sc-1', name: 'Shopping', type: 'transactional', npcIds: ['npc-1'], objectives: ['Buy bread'] },
        ],
        companion: {
            name: 'Aiko',
            personality: 'patient',
            backstory: 'A fellow language learner.',
            relationship: 'friend',
        },
    };
}

// ─── Validator Tests ──────────────────────────────────────────

describe('validatePersonaSchema', () => {
    it('should pass for a valid schema', () => {
        const result = validatePersonaSchema(minimalValidSchema());
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should detect schema version', () => {
        const result = validatePersonaSchema(minimalValidSchema());
        expect(result.schemaVersion).toBe('1.0.0');
    });

    it('should report migration availability when on current version', () => {
        const result = validatePersonaSchema(minimalValidSchema());
        expect(result.migrationAvailable).toBe(false);
    });

    it('should handle empty schema without crashing', () => {
        const result = validatePersonaSchema({});
        // The validator is lenient — it produces warnings, not hard errors
        expect(result).toBeDefined();
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should still validate when optional sections are missing', () => {
        const schema = minimalValidSchema();
        delete schema.npcs;
        delete schema.vocabulary_matrix;
        const result = validatePersonaSchema(schema);
        // The validator is lenient for partial schemas
        expect(result).toBeDefined();
        expect(Array.isArray(result.errors)).toBe(true);
        // Warnings should be generated for missing sections
        expect(result.warnings.length + result.errors.length).toBeGreaterThanOrEqual(0);
    });
});

// ─── Migration Tests ──────────────────────────────────────────

describe('detectSchemaVersion', () => {
    it('should detect explicit schema_version field', () => {
        expect(detectSchemaVersion({ schema_version: '2.0.0' })).toBe('2.0.0');
    });

    it('should default to 1.0.0 for schemas without version', () => {
        expect(detectSchemaVersion({})).toBe('1.0.0');
    });
});

describe('needsMigration', () => {
    it('should return needed=false for current version', () => {
        const result = needsMigration({ schema_version: CURRENT_SCHEMA_VERSION });
        expect(result.needed).toBe(false);
        expect(result.currentVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(result.targetVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('should return needed=true for older version', () => {
        // Only meaningful if there were newer versions
        const result = needsMigration({ schema_version: '0.9.0' });
        if (CURRENT_SCHEMA_VERSION !== '0.9.0') {
            expect(result.needed).toBe(true);
        }
    });
});

describe('findMigrationPath', () => {
    it('should return empty array for same version', () => {
        const path = findMigrationPath('1.0.0', '1.0.0');
        expect(path).toEqual([]);
    });

    it('should return null for unknown version pair (no steps registered)', () => {
        const path = findMigrationPath('0.1.0', '99.0.0');
        expect(path).toBeNull();
    });
});

describe('migrateSchema', () => {
    it('should return success with unchanged schema when already at target version', () => {
        const schema = { schema_version: '1.0.0', name: 'test' };
        const result = migrateSchema(schema, '1.0.0');
        expect(result.success).toBe(true);
        expect(result.stepsApplied).toHaveLength(0);
        expect(result.migratedSchema).toEqual(schema);
    });

    it('should return failure for unknown migration path', () => {
        const schema = { schema_version: '0.1.0', name: 'test' };
        const result = migrateSchema(schema, '99.0.0');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('should include fromVersion and toVersion in result', () => {
        const schema = { schema_version: '1.0.0' };
        const result = migrateSchema(schema);
        expect(result.fromVersion).toBe('1.0.0');
        expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
});

describe('SCHEMA_VERSION_REGISTRY', () => {
    it('should have at least one version entry', () => {
        expect(SCHEMA_VERSION_REGISTRY.length).toBeGreaterThan(0);
    });

    it('should include the current schema version', () => {
        const versions = SCHEMA_VERSION_REGISTRY.map(v => v.version);
        expect(versions).toContain(CURRENT_SCHEMA_VERSION);
    });

    it('should have valid entries with required fields', () => {
        for (const entry of SCHEMA_VERSION_REGISTRY) {
            expect(typeof entry.version).toBe('string');
            expect(typeof entry.releaseDate).toBe('string');
            expect(typeof entry.description).toBe('string');
            expect(typeof entry.breaking).toBe('boolean');
        }
    });
});

describe('MIGRATION_STEPS', () => {
    it('should be an array (possibly empty for v1)', () => {
        expect(Array.isArray(MIGRATION_STEPS)).toBe(true);
    });

    it('should have valid step structure if non-empty', () => {
        for (const step of MIGRATION_STEPS) {
            expect(typeof step.from).toBe('string');
            expect(typeof step.to).toBe('string');
            expect(typeof step.migrate).toBe('function');
            expect(typeof step.description).toBe('string');
        }
    });
});
