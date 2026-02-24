/**
 * CityGenerator — Procedural grid-based city layout
 *
 * Generates a city on a grid of blocks separated by streets.
 * Each block contains 1-4 buildings placed with random offsets.
 * The grid size, block dimensions, and building density are
 * configurable per city.
 *
 * @module world-renderer/city
 */

import * as THREE from 'three';
import { createRandomBuilding, createBuilding, CITY_PALETTES } from './BuildingFactory';
import type { CityPalette, BuildingArchetype, BuildingResult } from './BuildingFactory';

// ─── Types ────────────────────────────────────────────────────

export interface CityLayout {
    /** Grid columns (east-west blocks) */
    gridCols: number;
    /** Grid rows (north-south blocks) */
    gridRows: number;
    /** Block width (meters) */
    blockWidth: number;
    /** Block depth (meters) */
    blockDepth: number;
    /** Street width between blocks */
    streetWidth: number;
    /** City theme palette */
    palette: CityPalette;
    /** Night factor 0-1 */
    nightFactor: number;
}

export interface PlacedBuilding {
    result: BuildingResult;
    worldPosition: THREE.Vector3;
    boundingBox: THREE.Box3;
}

export interface GeneratedCity {
    /** Root group containing all city geometry */
    root: THREE.Group;
    /** All placed buildings with world-space bounding boxes */
    buildings: PlacedBuilding[];
    /** Total city extent (for camera/spawn bounds) */
    bounds: THREE.Box3;
    /** Spawn point (center of city at ground level) */
    spawnPoint: THREE.Vector3;
    /** Layout config used to generate */
    layout: CityLayout;
}

// ─── Default Layouts ──────────────────────────────────────────

export const CITY_LAYOUTS: Record<string, CityLayout> = {
    madrid: {
        gridCols: 5,
        gridRows: 5,
        blockWidth: 22,
        blockDepth: 18,
        streetWidth: 8,
        palette: CITY_PALETTES.madrid,
        nightFactor: 0,
    },
    mexico_city: {
        gridCols: 6,
        gridRows: 5,
        blockWidth: 20,
        blockDepth: 16,
        streetWidth: 9,
        palette: CITY_PALETTES.mexico_city,
        nightFactor: 0,
    },
    barcelona: {
        gridCols: 5,
        gridRows: 5,
        blockWidth: 24,
        blockDepth: 20,
        streetWidth: 7,
        palette: CITY_PALETTES.barcelona,
        nightFactor: 0,
    },
    default: {
        gridCols: 4,
        gridRows: 4,
        blockWidth: 20,
        blockDepth: 16,
        streetWidth: 8,
        palette: CITY_PALETTES.default,
        nightFactor: 0,
    },
};

// ─── Generator ────────────────────────────────────────────────

/**
 * Get the total city dimensions for a given layout.
 */
export function getCityDimensions(layout: CityLayout): { width: number; depth: number } {
    const width = layout.gridCols * layout.blockWidth + (layout.gridCols + 1) * layout.streetWidth;
    const depth = layout.gridRows * layout.blockDepth + (layout.gridRows + 1) * layout.streetWidth;
    return { width, depth };
}

/**
 * Convert grid coordinates (col, row) to world position (center of block).
 */
export function gridToWorld(
    col: number,
    row: number,
    layout: CityLayout,
): THREE.Vector3 {
    const { width, depth } = getCityDimensions(layout);
    const x = layout.streetWidth + col * (layout.blockWidth + layout.streetWidth) + layout.blockWidth / 2 - width / 2;
    const z = layout.streetWidth + row * (layout.blockDepth + layout.streetWidth) + layout.blockDepth / 2 - depth / 2;
    return new THREE.Vector3(x, 0, z);
}

/**
 * Decide which building archetypes go in a block based on position.
 * Center blocks get offices/apartments, edges get shops/cafes/markets.
 */
function selectArchetypesForBlock(
    col: number,
    row: number,
    layout: CityLayout,
): BuildingArchetype[] {
    const isEdge = col === 0 || col === layout.gridCols - 1 ||
        row === 0 || row === layout.gridRows - 1;
    const isCenter = col >= 1 && col < layout.gridCols - 1 &&
        row >= 1 && row < layout.gridRows - 1;

    if (isCenter) {
        // Inner blocks: taller buildings
        const pool: BuildingArchetype[] = ['apartment', 'office', 'apartment', 'office'];
        const count = 1 + Math.floor(Math.random() * 2);
        return pool.slice(0, count);
    } else if (isEdge) {
        // Edge blocks: mixed commercial
        const pool: BuildingArchetype[] = ['shop', 'cafe', 'market', 'apartment', 'shop'];
        const count = 2 + Math.floor(Math.random() * 2);
        return pool.slice(0, count);
    }
    return ['apartment', 'shop'];
}

/**
 * Place buildings within a single city block.
 */
function populateBlock(
    blockCenter: THREE.Vector3,
    archetypes: BuildingArchetype[],
    layout: CityLayout,
    cityGroup: THREE.Group,
): PlacedBuilding[] {
    const placed: PlacedBuilding[] = [];
    const maxW = layout.blockWidth;
    const maxD = layout.blockDepth;

    // Simple placement: divide block into sub-plots
    const plotCount = archetypes.length;
    const plotWidth = maxW / Math.min(plotCount, 2);

    for (let i = 0; i < archetypes.length; i++) {
        const result = createBuilding(archetypes[i], layout.palette, layout.nightFactor);

        // Position within bloc
        const offsetX = (i % 2 === 0 ? -1 : 1) * plotWidth * 0.25;
        const offsetZ = (i < 2 ? -1 : 1) * maxD * 0.2;
        const jitterX = (Math.random() - 0.5) * 1.5;
        const jitterZ = (Math.random() - 0.5) * 1.5;

        const pos = new THREE.Vector3(
            blockCenter.x + offsetX + jitterX,
            0,
            blockCenter.z + offsetZ + jitterZ,
        );

        result.mesh.position.copy(pos);
        result.mesh.rotation.y = Math.random() < 0.3 ? Math.PI / 2 : 0;
        cityGroup.add(result.mesh);

        // Compute world-space bounding box
        const worldBB = new THREE.Box3().setFromObject(result.mesh);

        placed.push({
            result,
            worldPosition: pos,
            boundingBox: worldBB,
        });
    }

    return placed;
}

/**
 * Generate a complete procedural city.
 */
export function generateCity(layout?: CityLayout): GeneratedCity {
    const cfg = layout ?? CITY_LAYOUTS.default;
    const root = new THREE.Group();
    root.name = `city-${cfg.palette.name}`;

    const allBuildings: PlacedBuilding[] = [];

    // Place buildings block by block
    for (let row = 0; row < cfg.gridRows; row++) {
        for (let col = 0; col < cfg.gridCols; col++) {
            const center = gridToWorld(col, row, cfg);
            const archetypes = selectArchetypesForBlock(col, row, cfg);
            const placed = populateBlock(center, archetypes, cfg, root);
            allBuildings.push(...placed);
        }
    }

    // Compute city bounds
    const { width, depth } = getCityDimensions(cfg);
    const bounds = new THREE.Box3(
        new THREE.Vector3(-width / 2, 0, -depth / 2),
        new THREE.Vector3(width / 2, 50, depth / 2),
    );

    // Spawn at center of the city
    const spawnPoint = new THREE.Vector3(0, 0, 0);

    return {
        root,
        buildings: allBuildings,
        bounds,
        spawnPoint,
        layout: cfg,
    };
}
