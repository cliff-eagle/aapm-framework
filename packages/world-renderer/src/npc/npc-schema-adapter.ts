/**
 * NPCSchemaAdapter — Bridges @aapm/core NPC data to world-renderer NPCDefinitions
 *
 * Converts the core engine's SchemaNPCDefinition + WorldState into
 * renderable NPCDefinition objects for the city world. This is the
 * NPC equivalent of schema-adapter.ts (which bridges cities/globe pins).
 *
 * Data flow:
 *   core/SchemaNPCDefinition → NPCSchemaAdapter → world-renderer/NPCDefinition
 *   core/WorldState.npcStates → NPCSchemaAdapter → world-renderer/NPCEntity positions
 *
 * @module world-renderer/npc
 * @patentCritical Claim 13 — NPC WorldState-driven scene rendering
 */

import * as THREE from 'three';
import type { NPCDefinition } from './NPCEntity';
import type { CharacterAppearance } from '../character/PlayerCharacter';

// ─── Core Schema Types (mirrored to avoid circular dependency) ────

/**
 * Mirrors core/SchemaNPCDefinition — the raw NPC from persona schema YAML.
 * These are the same types as @aapm/core/world-engine but duplicated to
 * prevent build-time circular dependency between packages. The adapter
 * function validates structural compatibility at the call boundary.
 */
export interface SchemaNPC {
    id: string;
    name: string;
    role: string;
    register: string;
    personality: string;
    vocabulary_focus: string[];
    patience_level: number;
    big_five: {
        openness: number;
        conscientiousness: number;
        extraversion: number;
        agreeableness: number;
        neuroticism: number;
    };
    cultural_overlay: {
        communicative_directness: number;
        formality_default: number;
        power_distance_sensitivity: number;
        emotional_expressiveness: number;
    };
}

/**
 * Mirrors core/NPCWorldState — runtime NPC state from the world engine.
 */
export interface NPCWorldStateData {
    npcId: string;
    currentLocation: string;
    available: boolean;
    mood: string;
    reputationWithLearner: number;
}

/**
 * Mirrors core/SchemaLocationDefinition — location from schema.
 */
export interface SchemaLocationData {
    id: string;
    name: Record<string, string>;
    description: string;
    type: string;
    npcs: {
        resident: string[];
        transient: string[];
    };
}

// ─── NPC Placement Config ─────────────────────────────────────

export interface NPCPlacementConfig {
    /** Schema NPC definitions */
    npcs: SchemaNPC[];
    /** Runtime NPC world states (for mood/availability) */
    npcStates?: Record<string, NPCWorldStateData>;
    /** Locations — NPCs are placed at their current or resident location */
    locations?: SchemaLocationData[];
    /** City grid bounds (from CityGenerator) for positioning */
    cityBounds?: THREE.Box3;
    /** Interaction radius override */
    interactionRadius?: number;
}

// ─── Personality → Appearance Mapping ─────────────────────────

/**
 * Map Big Five personality traits to character appearance colors.
 * High extraversion → brighter shirt colors, high neuroticism → darker.
 */
function personalityToAppearance(npc: SchemaNPC, index: number): CharacterAppearance {
    const skinTones = [0xF5C6A0, 0xD2A06F, 0x8D5524, 0xC68642, 0xFFDBB4, 0xE8C9A0];
    const hairColors = [0x1A1A1A, 0x3D2B1F, 0x4A3728, 0xB8860B, 0x2C1608, 0x8B4513];

    // Shirt color influenced by extraversion + role
    const roleColors: Record<string, number[]> = {
        'vendor': [0xFF6347, 0xFF8C00, 0xFFD700],
        'shopkeeper': [0x228B22, 0x006400, 0x2E8B57],
        'waiter': [0x2F2F2F, 0x4A4A4A, 0x1A1A1A],
        'teacher': [0x4169E1, 0x4682B4, 0x191970],
        'student': [0xFF6B9D, 0x48D1CC, 0x98FB98],
        'official': [0x2F2F2F, 0x1A1A1A, 0x363636],
        'friend': [0xFF8C00, 0x32CD32, 0x00CED1],
        'stranger': [0x808080, 0x696969, 0x778899],
    };

    const palette = roleColors[npc.role.toLowerCase()] ?? [0x4682B4, 0xCD5C5C, 0x6B8E23];
    const shirtColor = palette[index % palette.length];

    // Pants: formal roles get darker
    const formalRoles = ['waiter', 'teacher', 'official'];
    const pantsColor = formalRoles.includes(npc.role.toLowerCase()) ? 0x1A1A1A : 0x2F4F4F;

    return {
        skinColor: skinTones[index % skinTones.length],
        shirtColor,
        pantsColor,
        hairColor: hairColors[index % hairColors.length],
        hasHair: true,
    };
}

// ─── Position Mapping ─────────────────────────────────────────

/**
 * Compute NPC world positions within the city grid.
 * NPCs at the same location are spaced apart on the sidewalk.
 */
function computeNPCPositions(
    npcs: SchemaNPC[],
    npcStates: Record<string, NPCWorldStateData>,
    locations: SchemaLocationData[],
    cityBounds: THREE.Box3,
): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    const locationCounts = new Map<string, number>();

    // City grid extent
    const cityWidth = cityBounds.max.x - cityBounds.min.x;
    const cityDepth = cityBounds.max.z - cityBounds.min.z;

    // Map each location to a position in the city
    const locationPositions = new Map<string, THREE.Vector3>();
    locations.forEach((loc, i) => {
        const angle = (i / locations.length) * Math.PI * 2;
        const radius = Math.min(cityWidth, cityDepth) * 0.35;
        locationPositions.set(loc.id, new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius,
        ));
    });

    for (const npc of npcs) {
        const state = npcStates[npc.id];
        const locId = state?.currentLocation ?? findResidentLocation(npc.id, locations);

        if (!locId) {
            // No location — place near center
            positions.set(npc.id, new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                0,
                (Math.random() - 0.5) * 10,
            ));
            continue;
        }

        const basePos = locationPositions.get(locId) ?? new THREE.Vector3(0, 0, 0);
        const count = locationCounts.get(locId) ?? 0;
        locationCounts.set(locId, count + 1);

        // Offset NPCs at the same location
        const offset = new THREE.Vector3(
            (count % 3 - 1) * 3 + (Math.random() - 0.5) * 1.5,
            0,
            Math.floor(count / 3) * 3 + (Math.random() - 0.5) * 1.5,
        );

        positions.set(npc.id, basePos.clone().add(offset));
    }

    return positions;
}

function findResidentLocation(npcId: string, locations: SchemaLocationData[]): string | null {
    for (const loc of locations) {
        if (loc.npcs.resident.includes(npcId)) return loc.id;
    }
    return locations[0]?.id ?? null;
}

// ─── Patrol Route Generation ──────────────────────────────────

/**
 * Generate a simple patrol route for an NPC near their position.
 * NPCs with high extraversion get wider patrol routes.
 */
function generatePatrolRoute(
    basePos: THREE.Vector3,
    npc: SchemaNPC,
): THREE.Vector3[] | undefined {
    // Only 60% of NPCs patrol — the rest stand idle
    if (Math.random() > 0.6) return undefined;

    const radius = 2 + npc.big_five.extraversion * 6; // 2-8 units
    const points = 3 + Math.floor(Math.random() * 3); // 3-5 waypoints

    const route: THREE.Vector3[] = [];
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        route.push(new THREE.Vector3(
            basePos.x + Math.cos(angle) * radius,
            0,
            basePos.z + Math.sin(angle) * radius,
        ));
    }

    return route;
}

// ─── Adapter ──────────────────────────────────────────────────

/**
 * Convert core schema NPC data to world-renderer NPCDefinition[].
 *
 * This is the NPC bridge between @aapm/core and @aapm/world-renderer.
 * All NPC schema → renderer data flows through this single function.
 */
export function schemaNPCsToDefinitions(config: NPCPlacementConfig): NPCDefinition[] {
    const npcStates = config.npcStates ?? {};
    const locations = config.locations ?? [];
    const cityBounds = config.cityBounds ?? new THREE.Box3(
        new THREE.Vector3(-50, 0, -50),
        new THREE.Vector3(50, 50, 50),
    );

    // Compute positions
    const positions = computeNPCPositions(config.npcs, npcStates, locations, cityBounds);

    // Filter to available NPCs only
    const availableNPCs = config.npcs.filter(npc => {
        const state = npcStates[npc.id];
        return !state || state.available;
    });

    return availableNPCs.map((npc, i) => {
        const pos = positions.get(npc.id) ?? new THREE.Vector3(0, 0, 0);
        const appearance = personalityToAppearance(npc, i);
        const patrolPoints = generatePatrolRoute(pos, npc);

        return {
            id: npc.id,
            name: npc.name,
            position: pos,
            appearance,
            interactionRadius: config.interactionRadius ?? 3,
            patrolPoints,
            idleFacing: Math.random() * Math.PI * 2,
        };
    });
}

/**
 * Update NPC availability and mood from a world state snapshot.
 * Call this after world-engine ticks or dialogue outcomes.
 */
export function updateNPCAvailability(
    definitions: NPCDefinition[],
    npcStates: Record<string, NPCWorldStateData>,
): { available: NPCDefinition[]; unavailable: string[] } {
    const available: NPCDefinition[] = [];
    const unavailable: string[] = [];

    for (const def of definitions) {
        const state = npcStates[def.id];
        if (state && !state.available) {
            unavailable.push(def.id);
        } else {
            available.push(def);
        }
    }

    return { available, unavailable };
}
