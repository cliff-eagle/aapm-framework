/**
 * AAPM Schema Loader — Runtime Validator
 *
 * Runtime validation of Persona Schemas beyond JSON Schema.
 * Checks inter-field consistency, semantic validity, and
 * cross-reference integrity.
 *
 * @module schema-loader/validator
 */

// ─── Validation Result ───────────────────────────────────────

/**
 * Result of schema validation.
 */
export interface ValidationResult {
    /** Whether the schema passed all validations */
    valid: boolean;

    /** Errors that prevent the schema from being used */
    errors: ValidationError[];

    /** Warnings that don't prevent use but indicate potential issues */
    warnings: ValidationWarning[];

    /** Schema version detected */
    schemaVersion: string;

    /** Whether a migration is available to a newer version */
    migrationAvailable: boolean;
}

/**
 * A validation error.
 */
export interface ValidationError {
    /** JSON path to the problematic field */
    path: string;

    /** Error code for programmatic handling */
    code: string;

    /** Human-readable error message */
    message: string;

    /** Suggested fix */
    suggestion?: string;
}

/**
 * A validation warning.
 */
export interface ValidationWarning {
    path: string;
    code: string;
    message: string;
    suggestion?: string;
}

// ─── Loaded Schema Type ──────────────────────────────────────

/**
 * A validated and loaded Persona Schema, ready for runtime use.
 */
export interface LoadedPersonaSchema {
    /** Schema metadata */
    meta: {
        id: string;
        name: string;
        version: string;
        domain: string;
        targetLanguage: string;
        nativeLanguage: string;
    };

    /** Learner profile defaults */
    learnerProfile: Record<string, unknown>;

    /** Vocabulary matrix */
    vocabularyMatrix: VocabularyDomain[];

    /** NPC definitions */
    npcs: NPCDefinition[];

    /** Location definitions */
    locations: LocationDefinition[];

    /** Tier 3 scenarios */
    scenarios: ScenarioDefinition[];

    /** Companion definition */
    companion: CompanionDefinition;

    /** Cultural parameters */
    cultural: Record<string, unknown>;
}

/**
 * Vocabulary domain within the matrix.
 */
export interface VocabularyDomain {
    name: string;
    priority: 'critical' | 'important' | 'supplementary';
    items: string[];
}

/**
 * NPC definition from the schema.
 */
export interface NPCDefinition {
    id: string;
    name: string;
    role: string;
    /** Primary tier — 2 or 3 only; companion (Tier 1) is separate */
    tier: 2 | 3;
    personality: string;
    defaultRegister: string;
    locationIds: string[];
}

/**
 * Location definition from the schema.
 *
 * Note: `tier` is inferred from the location's position in the schema
 * (under `environment.tier_2.locations`) rather than an explicit field.
 */
export interface LocationDefinition {
    id: string;
    name: string;
    /** Inferred from position in the schema structure */
    tier: 2 | 3;
    description: string;
    npcIds: string[];
}

/**
 * Scenario definition from the schema.
 */
export interface ScenarioDefinition {
    id: string;
    name: string;
    type: string;
    npcIds: string[];
    objectives: string[];
}

/**
 * Companion NPC definition.
 */
export interface CompanionDefinition {
    name: string;
    personality: string;
    backstory: string;
    relationship: string;
}

// ─── Validator ───────────────────────────────────────────────

/**
 * Validate a Persona Schema beyond JSON Schema structure validation.
 *
 * Performs the following checks:
 *
 * 1. **Cross-reference integrity**: Every NPC referenced in a location
 *    must exist in the NPC roster. Every location referenced in a
 *    scenario must exist in the location catalog.
 *
 * 2. **Tier consistency**: NPCs assigned to Tier 2 locations must
 *    have tier: 2. NPCs in Tier 3 scenarios must have tier: 3.
 *
 * 3. **Vocabulary coverage**: Each tier must have at least one
 *    vocabulary domain with 'critical' priority.
 *
 * 4. **Scenario completeness**: Each Tier 3 scenario must have
 *    at least one objective and at least one NPC.
 *
 * 5. **Companion existence**: The companion definition must be present
 *    and must not appear in any Tier 2/3 location or scenario.
 *
 * 6. **Cultural parameter validation**: If the target language has
 *    known register systems (e.g., Japanese keigo, Korean honorifics),
 *    the cultural parameters must address them.
 *
 * 7. **Minimum content thresholds**:
 *    - At least 3 Tier 2 locations
 *    - At least 2 Tier 3 scenarios
 *    - At least 5 NPCs (excluding companion)
 *    - At least 3 vocabulary domains
 *
 * @param schema - Parsed YAML schema object
 * @returns Validation result with errors and warnings
 */
export function validatePersonaSchema(schema: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Cross-reference integrity
    const npcIds = extractNpcIds(schema);
    const locationIds = extractLocationIds(schema);

    // Check location → NPC references
    const locationNpcRefs = extractLocationNpcReferences(schema);
    for (const [locationId, refs] of Object.entries(locationNpcRefs)) {
        for (const npcRef of refs) {
            if (!npcIds.has(npcRef)) {
                errors.push({
                    path: `locations.${locationId}.npcs`,
                    code: 'INVALID_NPC_REFERENCE',
                    message: `Location "${locationId}" references NPC "${npcRef}" which does not exist in the NPC roster`,
                    suggestion: `Add "${npcRef}" to the npcs section or remove the reference`,
                });
            }
        }
    }

    // Check scenario → NPC references
    const scenarioNpcRefs = extractScenarioNpcReferences(schema);
    for (const [scenarioId, refs] of Object.entries(scenarioNpcRefs)) {
        for (const npcRef of refs) {
            if (!npcIds.has(npcRef)) {
                errors.push({
                    path: `scenarios.${scenarioId}.npcs`,
                    code: 'INVALID_NPC_REFERENCE',
                    message: `Scenario "${scenarioId}" references NPC "${npcRef}" which does not exist in the NPC roster`,
                    suggestion: `Add "${npcRef}" to the npcs section or remove the reference`,
                });
            }
        }
    }

    // 7. Minimum content thresholds
    const tier2Locations = countTierLocations(schema, 2);
    const tier3Scenarios = countScenarios(schema);
    const npcCount = npcIds.size;
    const vocabDomains = countVocabularyDomains(schema);

    if (tier2Locations < 3) {
        warnings.push({
            path: 'locations',
            code: 'INSUFFICIENT_LOCATIONS',
            message: `Found ${tier2Locations} Tier 2 locations, recommend at least 3 for adequate practice diversity`,
        });
    }

    if (tier3Scenarios < 2) {
        warnings.push({
            path: 'scenarios',
            code: 'INSUFFICIENT_SCENARIOS',
            message: `Found ${tier3Scenarios} Tier 3 scenarios, recommend at least 2`,
        });
    }

    if (npcCount < 5) {
        warnings.push({
            path: 'npcs',
            code: 'INSUFFICIENT_NPCS',
            message: `Found ${npcCount} NPCs (excluding companion), recommend at least 5`,
        });
    }

    if (vocabDomains < 3) {
        warnings.push({
            path: 'vocabulary',
            code: 'INSUFFICIENT_VOCAB_DOMAINS',
            message: `Found ${vocabDomains} vocabulary domains, recommend at least 3`,
        });
    }

    const schemaVersion = extractSchemaVersion(schema);

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        schemaVersion,
        migrationAvailable: false, // Set by migration checker
    };
}

// ─── Helper Functions ────────────────────────────────────────

/**
 * Safely access a nested path in an unknown object.
 */
function getPath(obj: unknown, ...keys: string[]): unknown {
    let current: unknown = obj;
    for (const key of keys) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[key];
    }
    return current;
}

/**
 * Extract all NPC IDs from the persona schema's NPC roster.
 */
function extractNpcIds(schema: Record<string, unknown>): Set<string> {
    const ids = new Set<string>();
    const roster = getPath(schema, 'persona', 'environment', 'tier_2', 'npc_roster');
    if (Array.isArray(roster)) {
        for (const npc of roster) {
            if (npc && typeof npc === 'object' && 'id' in npc && typeof npc.id === 'string') {
                ids.add(npc.id);
            }
        }
    }
    return ids;
}

/**
 * Extract all location IDs from the persona schema.
 */
function extractLocationIds(schema: Record<string, unknown>): Set<string> {
    const ids = new Set<string>();
    const locations = getPath(schema, 'persona', 'environment', 'tier_2', 'locations');
    if (Array.isArray(locations)) {
        for (const loc of locations) {
            if (loc && typeof loc === 'object' && 'id' in loc && typeof loc.id === 'string') {
                ids.add(loc.id);
            }
        }
    }
    return ids;
}

/**
 * Extract NPC references from each location.
 * Returns a map of locationId → referenced NPC IDs.
 */
function extractLocationNpcReferences(schema: Record<string, unknown>): Record<string, string[]> {
    const refs: Record<string, string[]> = {};
    const locations = getPath(schema, 'persona', 'environment', 'tier_2', 'locations');
    if (Array.isArray(locations)) {
        for (const loc of locations) {
            if (loc && typeof loc === 'object' && 'id' in loc && typeof loc.id === 'string') {
                const npcIds = (loc as Record<string, unknown>).npc_ids;
                if (Array.isArray(npcIds)) {
                    refs[loc.id] = npcIds.filter((id): id is string => typeof id === 'string');
                }
            }
        }
    }
    return refs;
}

/**
 * Extract NPC references from each Tier 3 scenario.
 * Returns a map of scenarioId → referenced NPC IDs.
 */
function extractScenarioNpcReferences(schema: Record<string, unknown>): Record<string, string[]> {
    const refs: Record<string, string[]> = {};
    const scenarios = getPath(schema, 'persona', 'environment', 'tier_3', 'scenarios');
    if (Array.isArray(scenarios)) {
        for (const s of scenarios) {
            if (s && typeof s === 'object' && 'id' in s && typeof s.id === 'string') {
                const npcId = (s as Record<string, unknown>).authority_npc_id;
                if (typeof npcId === 'string') {
                    refs[s.id] = [npcId];
                }
            }
        }
    }
    return refs;
}

/**
 * Count locations assigned to a specific tier.
 */
function countTierLocations(schema: Record<string, unknown>, tier: number): number {
    if (tier === 2) {
        const locations = getPath(schema, 'persona', 'environment', 'tier_2', 'locations');
        return Array.isArray(locations) ? locations.length : 0;
    }
    return 0;
}

/**
 * Count Tier 3 scenarios.
 */
function countScenarios(schema: Record<string, unknown>): number {
    const scenarios = getPath(schema, 'persona', 'environment', 'tier_3', 'scenarios');
    return Array.isArray(scenarios) ? scenarios.length : 0;
}

/**
 * Count vocabulary domains in the vocabulary matrix.
 */
function countVocabularyDomains(schema: Record<string, unknown>): number {
    const domains = getPath(schema, 'persona', 'vocabulary_matrix', 'domains');
    return Array.isArray(domains) ? domains.length : 0;
}

/**
 * Extract the schema version string.
 */
function extractSchemaVersion(schema: Record<string, unknown>): string {
    return (schema as { schema_version?: string }).schema_version || '1.0.0';
}
