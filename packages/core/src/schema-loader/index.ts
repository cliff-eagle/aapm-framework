/**
 * Schema Loader — Public API
 *
 * @module schema-loader
 */
export type {
    ValidationResult,
    ValidationError,
    ValidationWarning,
    LoadedPersonaSchema,
    VocabularyDomain,
    NPCDefinition,
    LocationDefinition,
    ScenarioDefinition,
    CompanionDefinition,
} from './validator';

export { validatePersonaSchema } from './validator';

export type {
    SchemaVersion,
    SchemaVersionEntry,
    MigrationFunction,
    MigrationStep,
    MigrationResult,
} from './migrations';

export {
    SCHEMA_VERSION_REGISTRY,
    CURRENT_SCHEMA_VERSION,
    MIGRATION_STEPS,
    detectSchemaVersion,
    needsMigration,
    findMigrationPath,
    migrateSchema,
} from './migrations';
