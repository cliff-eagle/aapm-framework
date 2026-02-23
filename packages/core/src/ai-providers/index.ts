/**
 * @module ai-providers
 * @description AI Provider configuration — public API.
 *
 * Provides the provider catalog, configuration types, and
 * validation utilities for the AI provider selection system.
 */

export type {
    AICapability,
    AIModelOption,
    AIProviderDefinition,
    AIProviderId,
    AIProviderEntry,
    AIProviderConfig,
} from './types';

export {
    AI_PROVIDER_CATALOG,
    REQUIRED_CAPABILITIES,
    OPTIONAL_CAPABILITIES,
    CAPABILITY_LABELS,
} from './types';

import type { AIProviderConfig, AICapability, AIProviderId } from './types';
import { AI_PROVIDER_CATALOG, REQUIRED_CAPABILITIES } from './types';

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate that a provider configuration covers all required capabilities.
 *
 * Returns an object with `valid` boolean and a list of missing capabilities
 * if the configuration is incomplete.
 *
 * @param config - The provider configuration to validate
 * @returns Validation result with missing capabilities
 */
export function validateProviderConfig(config: AIProviderConfig): {
    valid: boolean;
    missingCapabilities: AICapability[];
    warnings: string[];
} {
    const missingCapabilities: AICapability[] = [];
    const warnings: string[] = [];

    // Check required capabilities are routed
    for (const cap of REQUIRED_CAPABILITIES) {
        if (!config.capabilityRouting[cap]) {
            missingCapabilities.push(cap);
        }
    }

    // Check that routed providers have valid, enabled entries
    for (const [capability, providerId] of Object.entries(config.capabilityRouting)) {
        const entry = config.providers.find(p => p.providerId === providerId);
        if (!entry) {
            warnings.push(`Capability '${capability}' routed to unknown provider '${providerId}'.`);
        } else if (!entry.enabled) {
            warnings.push(`Capability '${capability}' routed to disabled provider '${providerId}'.`);
        } else if (!entry.keyValidated) {
            warnings.push(`Provider '${providerId}' has not been validated. Test your API key.`);
        }
    }

    return {
        valid: missingCapabilities.length === 0,
        missingCapabilities,
        warnings,
    };
}

/**
 * Create a default AIProviderConfig with no providers configured.
 *
 * Used during onboarding initialization.
 */
export function createEmptyProviderConfig(): AIProviderConfig {
    return {
        providers: [],
        capabilityRouting: {},
        lastModifiedAt: new Date().toISOString(),
        isComplete: false,
    };
}

/**
 * Create a provider entry with default model selections.
 *
 * When a user selects a provider, this pre-fills sensible defaults
 * for all capabilities that provider supports.
 *
 * @param providerId - The provider to create an entry for
 * @param apiKey - The user's API key
 * @returns A ready-to-use provider entry
 */
export function createProviderEntry(providerId: AIProviderId, apiKey: string): {
    entry: AIProviderConfig['providers'][0];
    capabilities: AICapability[];
} | null {
    const definition = AI_PROVIDER_CATALOG.find(p => p.id === providerId);
    if (!definition) return null;

    // Auto-select default model for each capability
    const selectedModels: Partial<Record<AICapability, string>> = {};
    for (const model of definition.models) {
        if (model.isDefault) {
            selectedModels[model.capability] = model.id;
        }
    }

    return {
        entry: {
            providerId,
            apiKey,
            keyValidated: false,
            selectedModels,
            enabled: true,
        },
        capabilities: [...definition.capabilities],
    };
}

/**
 * Look up a provider definition from the catalog by ID.
 */
export function getProviderDefinition(providerId: AIProviderId) {
    return AI_PROVIDER_CATALOG.find(p => p.id === providerId) ?? null;
}
