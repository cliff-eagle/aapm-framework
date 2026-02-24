/**
 * SchemaAdapter — Bridges @aapm/core SchemaEnvironment to CityDefinition[]
 *
 * Converts the persona schema's location/city definitions into the
 * world-renderer's CityDefinition format for globe pin placement.
 *
 * This adapter is the ONLY coupling point between @aapm/core and
 * @aapm/world-renderer. All schema data flows through this adapter.
 *
 * @module world-renderer/globe
 * @patentCritical Claim 13 — WorldState-driven scene rendering
 */

import type { CityDefinition, CityPinState } from './CityPinSystem';

// ─── Schema Types (mirrored from @aapm/core to avoid circular dep) ────

/**
 * Minimal schema location shape — matches the `locations` array of a
 * persona schema environment. We mirror the types rather than importing
 * @aapm/core to avoid circular dependency in the build.
 */
export interface SchemaLocation {
    id: string;
    type: string;
    name: string;
    description?: string;
    /** NPCs at this location */
    npcs?: readonly { npc_id: string }[];
    /** Connected location IDs */
    connections?: readonly string[];
    /** Access time constraints */
    available_times?: readonly string[];
}

export interface SchemaCity {
    /** Unique city identifier */
    id: string;
    /** City display name (L2) */
    nameL2: string;
    /** City display name (L1) */
    nameL1: string;
    /** Geographic latitude */
    lat: number;
    /** Geographic longitude  */
    lng: number;
    /** Locations within this city */
    locationIds: string[];
}

export interface SchemaToGlobeConfig {
    /** Schema cities with their geographic coordinates */
    cities: SchemaCity[];
    /** Currently active city ID (player's location) */
    activeCityId?: string;
    /** Home/base city ID */
    homeCityId?: string;
    /** City IDs that have been completed */
    completedCityIds?: string[];
    /** City IDs that are locked/unavailable */
    lockedCityIds?: string[];
}

// ─── Coordinate Database ──────────────────────────────────────

/**
 * Well-known city coordinates for the AAPM schema cities.
 * Extendable at runtime via the schema adapter config.
 */
export const KNOWN_COORDINATES: Record<string, { lat: number; lng: number }> = {
    // Spain
    'madrid': { lat: 40.4168, lng: -3.7038 },
    'barcelona': { lat: 41.3874, lng: 2.1686 },
    'seville': { lat: 37.3886, lng: -5.9823 },
    'valencia': { lat: 39.4699, lng: -0.3763 },
    'malaga': { lat: 36.7213, lng: -4.4214 },

    // Mexico
    'mexico_city': { lat: 19.4326, lng: -99.1332 },
    'cancun': { lat: 21.1619, lng: -86.8515 },
    'guadalajara': { lat: 20.6597, lng: -103.3496 },
    'oaxaca': { lat: 17.0732, lng: -96.7266 },

    // Mediterranean
    'nice': { lat: 43.7102, lng: 7.2620 },
    'marseille': { lat: 43.2965, lng: 5.3698 },
    'naples': { lat: 40.8518, lng: 14.2681 },
    'rome': { lat: 41.9028, lng: 12.4964 },
    'athens': { lat: 37.9838, lng: 23.7275 },
    'istanbul': { lat: 41.0082, lng: 28.9784 },
    'dubrovnik': { lat: 42.6507, lng: 18.0944 },

    // Other common destinations
    'london': { lat: 51.5074, lng: -0.1278 },
    'paris': { lat: 48.8566, lng: 2.3522 },
    'berlin': { lat: 52.5200, lng: 13.4050 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'new_york': { lat: 40.7128, lng: -74.0060 },
    'los_angeles': { lat: 34.0522, lng: -118.2437 },
    'miami': { lat: 25.7617, lng: -80.1918 },
    'buenos_aires': { lat: -34.6037, lng: -58.3816 },
    'cairo': { lat: 30.0444, lng: 31.2357 },
    'cape_town': { lat: -33.9249, lng: 18.4241 },
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'seoul': { lat: 37.5665, lng: 126.9780 },
    'bangkok': { lat: 13.7563, lng: 100.5018 },
    'dubai': { lat: 25.2048, lng: 55.2708 },
};

// ─── Adapter ──────────────────────────────────────────────────

/**
 * Determine the pin state for a city based on the schema config.
 */
function resolveState(
    cityId: string,
    config: SchemaToGlobeConfig,
): CityPinState {
    if (config.homeCityId === cityId) return 'home';
    if (config.completedCityIds?.includes(cityId)) return 'completed';
    if (config.lockedCityIds?.includes(cityId)) return 'locked';
    if (config.activeCityId === cityId) return 'active';
    return 'active'; // Default: available
}

/**
 * Convert schema city definitions to CityDefinition[] for the globe.
 *
 * This is the bridge between @aapm/core and @aapm/world-renderer.
 * All schema → renderer data flows through this single function.
 */
export function schemaToCityDefinitions(
    config: SchemaToGlobeConfig,
): CityDefinition[] {
    return config.cities.map(city => ({
        id: city.id,
        nameL2: city.nameL2,
        nameL1: city.nameL1,
        lat: city.lat,
        lng: city.lng,
        state: resolveState(city.id, config),
        schemaId: city.id,
    }));
}

/**
 * Resolve city coordinates from a city name/ID.
 * Tries the known coordinates database, then falls back to the
 * explicit lat/lng if provided.
 */
export function resolveCityCoordinates(
    cityId: string,
    explicitLat?: number,
    explicitLng?: number,
): { lat: number; lng: number } | null {
    // Normalize ID for lookup
    const normalized = cityId.toLowerCase().replace(/[\s-]+/g, '_');

    if (KNOWN_COORDINATES[normalized]) {
        return KNOWN_COORDINATES[normalized];
    }
    if (explicitLat !== undefined && explicitLng !== undefined) {
        return { lat: explicitLat, lng: explicitLng };
    }
    return null;
}
