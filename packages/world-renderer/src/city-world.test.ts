/**
 * Tests for the city world, character, and NPC systems.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';

// ─── City Generator ───────────────────────────────────────────

import {
    generateCity,
    getCityDimensions,
    gridToWorld,
    CITY_LAYOUTS,
} from './city/CityGenerator';

describe('CityGenerator', () => {
    it('getCityDimensions returns positive dimensions', () => {
        const layout = CITY_LAYOUTS.madrid;
        const { width, depth } = getCityDimensions(layout);
        expect(width).toBeGreaterThan(0);
        expect(depth).toBeGreaterThan(0);
    });

    it('getCityDimensions accounts for grid + streets', () => {
        const layout = { ...CITY_LAYOUTS.default, gridCols: 3, gridRows: 2, blockWidth: 10, blockDepth: 8, streetWidth: 5 };
        const { width, depth } = getCityDimensions(layout);
        // width = 3 blocks * 10 + 4 streets * 5 = 30 + 20 = 50
        expect(width).toBe(50);
        // depth = 2 blocks * 8 + 3 streets * 5 = 16 + 15 = 31
        expect(depth).toBe(31);
    });

    it('gridToWorld maps (0,0) to top-left block, not origin', () => {
        const layout = CITY_LAYOUTS.default;
        const pos = gridToWorld(0, 0, layout);
        expect(pos.x).toBeLessThan(0); // top-left is negative x
        expect(pos.z).toBeLessThan(0); // top-left is negative z
    });

    it('gridToWorld center block is near origin', () => {
        const layout = { ...CITY_LAYOUTS.default, gridCols: 3, gridRows: 3 };
        const pos = gridToWorld(1, 1, layout); // center block
        expect(Math.abs(pos.x)).toBeLessThan(layout.blockWidth);
        expect(Math.abs(pos.z)).toBeLessThan(layout.blockDepth);
    });

    it('generateCity returns buildings and valid bounds', () => {
        const city = generateCity(CITY_LAYOUTS.default);
        expect(city.buildings.length).toBeGreaterThan(0);
        expect(city.root.children.length).toBeGreaterThan(0);
        expect(city.bounds.min.x).toBeLessThan(0);
        expect(city.bounds.max.x).toBeGreaterThan(0);
        expect(city.spawnPoint.x).toBe(0);
        expect(city.spawnPoint.z).toBe(0);
    });

    it('all 4 preset layouts generate valid cities', () => {
        for (const key of ['madrid', 'mexico_city', 'barcelona', 'default']) {
            const city = generateCity(CITY_LAYOUTS[key]);
            expect(city.buildings.length).toBeGreaterThan(0);
        }
    });

    it('building bounding boxes are non-degenerate', () => {
        const city = generateCity(CITY_LAYOUTS.default);
        for (const b of city.buildings) {
            const size = new THREE.Vector3();
            b.boundingBox.getSize(size);
            expect(size.x).toBeGreaterThan(0);
            expect(size.y).toBeGreaterThan(0);
            expect(size.z).toBeGreaterThan(0);
        }
    });
});

// ─── Building Factory ─────────────────────────────────────────

import {
    createBuilding,
    createRandomBuilding,
    CITY_PALETTES,
} from './city/BuildingFactory';
import type { BuildingArchetype } from './city/BuildingFactory';

describe('BuildingFactory', () => {
    const archetypes: BuildingArchetype[] = ['apartment', 'shop', 'office', 'cafe', 'market', 'warehouse'];

    it('creates all 6 archetypes without errors', () => {
        for (const arch of archetypes) {
            const result = createBuilding(arch, CITY_PALETTES.default);
            expect(result.mesh).toBeInstanceOf(THREE.Group);
            expect(result.archetype).toBe(arch);
        }
    });

    it('createRandomBuilding returns valid building', () => {
        const result = createRandomBuilding(CITY_PALETTES.madrid, 0.5);
        expect(result.mesh.children.length).toBeGreaterThan(0);
        expect(archetypes).toContain(result.archetype);
    });

    it('bounding boxes have positive volume', () => {
        for (const arch of archetypes) {
            const result = createBuilding(arch, CITY_PALETTES.default);
            const size = new THREE.Vector3();
            result.boundingBox.getSize(size);
            expect(size.x).toBeGreaterThan(0);
            expect(size.y).toBeGreaterThan(1); // buildings should be taller than 1m
        }
    });

    it('all 4 palettes work with all archetypes', () => {
        for (const paletteKey of Object.keys(CITY_PALETTES)) {
            for (const arch of archetypes) {
                const result = createBuilding(arch, CITY_PALETTES[paletteKey]);
                expect(result.mesh).toBeInstanceOf(THREE.Group);
            }
        }
    });
});

// ─── Character ────────────────────────────────────────────────

import { createPlayerCharacter, DEFAULT_APPEARANCES } from './character/PlayerCharacter';

describe('PlayerCharacter', () => {
    it('creates a character with expected parts', () => {
        const char = createPlayerCharacter();
        expect(char.root).toBeInstanceOf(THREE.Group);
        expect(char.parts.head).toBeInstanceOf(THREE.Mesh);
        expect(char.parts.torso).toBeInstanceOf(THREE.Mesh);
        expect(char.parts.leftArm).toBeInstanceOf(THREE.Group);
        expect(char.parts.rightArm).toBeInstanceOf(THREE.Group);
        expect(char.parts.leftLeg).toBeInstanceOf(THREE.Group);
        expect(char.parts.rightLeg).toBeInstanceOf(THREE.Group);
        expect(char.height).toBeGreaterThan(1);
    });

    it('animateWalk does not throw', () => {
        const char = createPlayerCharacter();
        expect(() => char.animateWalk(0, 0)).not.toThrow();
        expect(() => char.animateWalk(5, 1.5)).not.toThrow();
    });

    it('setFacing does not throw', () => {
        const char = createPlayerCharacter();
        expect(() => char.setFacing(1.0)).not.toThrow();
        expect(() => char.setFacing(-Math.PI)).not.toThrow();
    });

    it('creates characters from all preset appearances', () => {
        for (const key of Object.keys(DEFAULT_APPEARANCES)) {
            const char = createPlayerCharacter(DEFAULT_APPEARANCES[key]);
            expect(char.root.children.length).toBeGreaterThan(0);
        }
    });

    it('dispose removes geometry', () => {
        const char = createPlayerCharacter();
        expect(() => char.dispose()).not.toThrow();
    });
});

// ─── Character Controller ─────────────────────────────────────

import { createCharacterController } from './character/CharacterController';

describe('CharacterController', () => {
    it('initializes with position at origin', () => {
        const char = createPlayerCharacter();
        const ctrl = createCharacterController(char);
        const pos = ctrl.getPosition();
        expect(pos.x).toBe(0);
        expect(pos.z).toBe(0);
        ctrl.dispose();
    });

    it('setPosition updates position', () => {
        const char = createPlayerCharacter();
        const ctrl = createCharacterController(char);
        ctrl.setPosition(new THREE.Vector3(5, 0, 10));
        const pos = ctrl.getPosition();
        expect(pos.x).toBe(5);
        expect(pos.z).toBe(10);
        ctrl.dispose();
    });

    it('lock prevents movement', () => {
        const char = createPlayerCharacter();
        const ctrl = createCharacterController(char);
        ctrl.setLocked(true);
        expect(ctrl.isLocked()).toBe(true);
        ctrl.update(0.016, 1.0);
        expect(ctrl.getSpeed()).toBe(0);
        ctrl.dispose();
    });

    it('collision detection works', () => {
        const char = createPlayerCharacter();
        // Place a building collider at (5, 0, 5)
        const collider = new THREE.Box3(
            new THREE.Vector3(4, 0, 4),
            new THREE.Vector3(6, 10, 6),
        );
        const ctrl = createCharacterController(char, { colliders: [collider] });
        // Teleport into the building
        ctrl.setPosition(new THREE.Vector3(5, 0, 5));
        // Should not crash
        ctrl.update(0.016, 1.0);
        ctrl.dispose();
    });
});

// ─── NPC Manager ──────────────────────────────────────────────

import { createNPCManager } from './npc/NPCManager';

describe('NPCManager', () => {
    it('spawns NPCs from definitions', () => {
        const mgr = createNPCManager({
            npcs: [
                { id: 'npc1', name: 'María', position: new THREE.Vector3(5, 0, 5) },
                { id: 'npc2', name: 'Carlos', position: new THREE.Vector3(-5, 0, -5) },
            ],
        });

        expect(mgr.npcs.length).toBe(2);
        expect(mgr.root.children.length).toBe(2);
        mgr.dispose();
    });

    it('detects nearest NPC in range', () => {
        const mgr = createNPCManager({
            npcs: [
                { id: 'npc1', name: 'María', position: new THREE.Vector3(2, 0, 0), interactionRadius: 5 },
                { id: 'npc2', name: 'Carlos', position: new THREE.Vector3(20, 0, 0), interactionRadius: 5 },
            ],
        });

        const nearest = mgr.getNearestInRange(new THREE.Vector3(0, 0, 0));
        expect(nearest).not.toBeNull();
        expect(nearest!.id).toBe('npc1');

        const farAway = mgr.getNearestInRange(new THREE.Vector3(100, 0, 100));
        expect(farAway).toBeNull();
        mgr.dispose();
    });

    it('calls onEnterRange / onLeaveRange callbacks', () => {
        const entered: string[] = [];
        const left: string[] = [];

        const mgr = createNPCManager({
            npcs: [{ id: 'npc1', name: 'Test', position: new THREE.Vector3(0, 0, 0), interactionRadius: 3 }],
            onEnterRange: (id) => entered.push(id),
            onLeaveRange: (id) => left.push(id),
        });

        // Walk into range
        mgr.update(0.016, 0, new THREE.Vector3(1, 0, 0));
        expect(entered).toContain('npc1');

        // Walk out of range
        mgr.update(0.016, 0.1, new THREE.Vector3(50, 0, 50));
        expect(left).toContain('npc1');
        mgr.dispose();
    });

    it('addNPC and removeNPC work at runtime', () => {
        const mgr = createNPCManager({ npcs: [] });
        expect(mgr.npcs.length).toBe(0);

        mgr.addNPC({ id: 'dynamic', name: 'Dynamic NPC', position: new THREE.Vector3(0, 0, 0) });
        expect(mgr.npcs.length).toBe(1);

        mgr.removeNPC('dynamic');
        expect(mgr.npcs.length).toBe(0);
        mgr.dispose();
    });
});
