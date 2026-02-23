/**
 * AAPM Schema Loader — Migration System
 *
 * Manages schema version evolution. When the Persona Schema definition
 * changes, existing schemas must be migrated to the new version.
 *
 * @module schema-loader/migrations
 */

// ─── Version Registry ────────────────────────────────────────

/**
 * Schema version identifier (semver).
 */
export type SchemaVersion = string;

/**
 * Registry of all known schema versions and their migration paths.
 */
export const SCHEMA_VERSION_REGISTRY: SchemaVersionEntry[] = [
    {
        version: '1.0.0',
        releaseDate: '2025-02-23',
        description: 'Initial schema version',
        breaking: false,
    },
];

/**
 * Current schema version — the latest supported version.
 */
export const CURRENT_SCHEMA_VERSION: SchemaVersion = '1.0.0';

/**
 * Entry in the schema version registry.
 */
export interface SchemaVersionEntry {
    /** Semver version string */
    version: SchemaVersion;

    /** When this version was released */
    releaseDate: string;

    /** What changed in this version */
    description: string;

    /** Whether this version contains breaking changes */
    breaking: boolean;

    /** If breaking, what specifically broke */
    breakingChanges?: string[];
}

// ─── Migration Function Type ─────────────────────────────────

/**
 * A migration function that transforms a schema from one version to another.
 *
 * @param schema - The schema in the source version format
 * @returns The schema transformed to the target version format
 */
export type MigrationFunction = (schema: Record<string, unknown>) => Record<string, unknown>;

/**
 * A migration step from one version to the next.
 */
export interface MigrationStep {
    /** Source version */
    from: SchemaVersion;

    /** Target version */
    to: SchemaVersion;

    /** The migration function */
    migrate: MigrationFunction;

    /** Description of what this migration does */
    description: string;

    /** Whether this migration is reversible */
    reversible: boolean;

    /** Reverse migration function, if reversible */
    reverse?: MigrationFunction;
}

// ─── Migration Registry ──────────────────────────────────────

/**
 * All registered migration steps.
 * Migrations are applied sequentially: 1.0.0 → 1.1.0 → 2.0.0
 */
export const MIGRATION_STEPS: MigrationStep[] = [
    // Future migrations will be added here as the schema evolves.
    // Example:
    // {
    //   from: '1.0.0',
    //   to: '1.1.0',
    //   description: 'Add schema_version field, rename companion to tier1_companion',
    //   reversible: true,
    //   migrate: (schema) => ({
    //     ...schema,
    //     schema_version: '1.1.0',
    //     tier1_companion: schema.companion,
    //   }),
    //   reverse: (schema) => ({
    //     ...schema,
    //     schema_version: '1.0.0',
    //     companion: (schema as any).tier1_companion,
    //   }),
    // },
];

// ─── Migration Engine ────────────────────────────────────────

/**
 * Result of a migration attempt.
 */
export interface MigrationResult {
    /** Whether migration succeeded */
    success: boolean;

    /** The migrated schema (only if successful) */
    migratedSchema?: Record<string, unknown>;

    /** Source version */
    fromVersion: SchemaVersion;

    /** Target version */
    toVersion: SchemaVersion;

    /** Migration steps applied (in order) */
    stepsApplied: string[];

    /** Error message if migration failed */
    error?: string;
}

/**
 * Detect the version of a schema.
 *
 * Checks for an explicit `schema_version` field first.
 * If absent, infers version from structural characteristics.
 *
 * @param schema - The schema to detect version for
 * @returns Detected schema version
 */
export function detectSchemaVersion(schema: Record<string, unknown>): SchemaVersion {
    if (typeof schema.schema_version === 'string') {
        return schema.schema_version;
    }

    // Default: assume version 1.0.0 for schemas without explicit version
    return '1.0.0';
}

/**
 * Check if a schema needs migration to the current version.
 *
 * @param schema - The schema to check
 * @returns Whether migration is needed and to which version
 */
export function needsMigration(schema: Record<string, unknown>): {
    needed: boolean;
    currentVersion: SchemaVersion;
    targetVersion: SchemaVersion;
} {
    const currentVersion = detectSchemaVersion(schema);
    return {
        needed: currentVersion !== CURRENT_SCHEMA_VERSION,
        currentVersion,
        targetVersion: CURRENT_SCHEMA_VERSION,
    };
}

/**
 * Find the migration path from one version to another.
 *
 * Returns an ordered list of migration steps that, when applied
 * sequentially, will transform the schema from the source version
 * to the target version.
 *
 * @param from - Source version
 * @param to - Target version
 * @returns Ordered migration steps, or null if no path exists
 */
export function findMigrationPath(
    from: SchemaVersion,
    to: SchemaVersion,
): MigrationStep[] | null {
    if (from === to) return [];

    const path: MigrationStep[] = [];
    let current = from;

    while (current !== to) {
        const nextStep = MIGRATION_STEPS.find(s => s.from === current);
        if (!nextStep) return null; // No path found

        path.push(nextStep);
        current = nextStep.to;

        // Safety: prevent infinite loops
        if (path.length > 100) return null;
    }

    return path;
}

/**
 * Migrate a schema from its current version to the target version.
 *
 * Applies migration steps sequentially. If any step fails, the
 * migration is rolled back and an error is returned.
 *
 * @param schema - The schema to migrate
 * @param targetVersion - Target version (defaults to CURRENT_SCHEMA_VERSION)
 * @returns Migration result with the migrated schema or error
 */
export function migrateSchema(
    schema: Record<string, unknown>,
    targetVersion: SchemaVersion = CURRENT_SCHEMA_VERSION,
): MigrationResult {
    const fromVersion = detectSchemaVersion(schema);

    if (fromVersion === targetVersion) {
        return {
            success: true,
            migratedSchema: schema,
            fromVersion,
            toVersion: targetVersion,
            stepsApplied: [],
        };
    }

    const path = findMigrationPath(fromVersion, targetVersion);

    if (!path) {
        return {
            success: false,
            fromVersion,
            toVersion: targetVersion,
            stepsApplied: [],
            error: `No migration path found from ${fromVersion} to ${targetVersion}`,
        };
    }

    let current = { ...schema };
    const stepsApplied: string[] = [];

    try {
        for (const step of path) {
            current = step.migrate(current);
            stepsApplied.push(`${step.from} → ${step.to}: ${step.description}`);
        }

        return {
            success: true,
            migratedSchema: current,
            fromVersion,
            toVersion: targetVersion,
            stepsApplied,
        };
    } catch (error) {
        return {
            success: false,
            fromVersion,
            toVersion: targetVersion,
            stepsApplied,
            error: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
