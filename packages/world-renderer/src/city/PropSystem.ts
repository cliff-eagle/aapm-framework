/**
 * PropSystem — Environmental props for the city world
 *
 * Trees, streetlights, benches, and trash cans — all using
 * InstancedMesh for performance. Props are placed along
 * sidewalks and within city blocks.
 *
 * @module world-renderer/city
 */

import * as THREE from 'three';
import type { CityLayout } from './CityGenerator';
import { getCityDimensions } from './CityGenerator';

// ─── Types ────────────────────────────────────────────────────

export interface PropSystemResult {
    /** Root group of all prop instances */
    mesh: THREE.Group;
    /** Streetlight positions (for night lighting) */
    lightPositions: THREE.Vector3[];
}

// ─── Constants ────────────────────────────────────────────────

const TREE_CROWN_COLORS = [0x228B22, 0x2E8B57, 0x006400, 0x32CD32, 0x3CB371];
const TRUNK_COLOR = 0x8B4513;
const LIGHT_POLE_COLOR = 0x404040;
const LIGHT_LAMP_COLOR = 0xFFE4B5;
const BENCH_COLOR = 0x8B6914;
const BENCH_LEGS_COLOR = 0x404040;

// ─── Prop Builders ────────────────────────────────────────────

/**
 * Create a single low-poly tree (cone crown + cylinder trunk).
 */
function createTree(): THREE.Group {
    const tree = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.2, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: TRUNK_COLOR });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    tree.add(trunk);

    // Crown — 2 stacked cones for fullness
    const crownColor = TREE_CROWN_COLORS[Math.floor(Math.random() * TREE_CROWN_COLORS.length)];
    const crownMat = new THREE.MeshLambertMaterial({ color: crownColor });

    const lowerCrown = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 1.8, 7),
        crownMat,
    );
    lowerCrown.position.y = 1.8;
    lowerCrown.castShadow = true;
    tree.add(lowerCrown);

    const upperCrown = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 1.4, 7),
        crownMat,
    );
    upperCrown.position.y = 2.9;
    upperCrown.castShadow = true;
    tree.add(upperCrown);

    return tree;
}

/**
 * Create a streetlight (pole + lamp sphere).
 */
function createStreetlight(nightFactor: number): THREE.Group {
    const light = new THREE.Group();

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3.5, 6);
    const poleMat = new THREE.MeshLambertMaterial({ color: LIGHT_POLE_COLOR });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.75;
    pole.castShadow = true;
    light.add(pole);

    // Arm
    const armGeo = new THREE.BoxGeometry(0.8, 0.05, 0.05);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(0.4, 3.4, 0);
    light.add(arm);

    // Lamp
    const lampGeo = new THREE.SphereGeometry(0.15, 8, 6);
    const lampMat = new THREE.MeshLambertMaterial({
        color: LIGHT_LAMP_COLOR,
        emissive: LIGHT_LAMP_COLOR,
        emissiveIntensity: nightFactor * 2.0,
    });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(0.8, 3.35, 0);
    light.add(lamp);

    return light;
}

/**
 * Create a bench (simple box seat + two legs).
 */
function createBench(): THREE.Group {
    const bench = new THREE.Group();

    const seatMat = new THREE.MeshLambertMaterial({ color: BENCH_COLOR });
    const legMat = new THREE.MeshLambertMaterial({ color: BENCH_LEGS_COLOR });

    // Seat
    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.08, 0.4),
        seatMat,
    );
    seat.position.y = 0.45;
    bench.add(seat);

    // Back
    const back = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.5, 0.06),
        seatMat,
    );
    back.position.set(0, 0.7, -0.17);
    bench.add(back);

    // Legs
    for (const xOff of [-0.45, 0.45]) {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.45, 0.35),
            legMat,
        );
        leg.position.set(xOff, 0.225, 0);
        bench.add(leg);
    }

    return bench;
}

// ─── Placement ────────────────────────────────────────────────

/**
 * Create the full prop system for a city layout.
 */
export function createPropSystem(layout: CityLayout): PropSystemResult {
    const group = new THREE.Group();
    group.name = 'props';
    const lightPositions: THREE.Vector3[] = [];

    const { width: cityW, depth: cityD } = getCityDimensions(layout);
    const sw = layout.streetWidth;
    const bw = layout.blockWidth;
    const bd = layout.blockDepth;

    // ── Trees along sidewalks ──
    const treeSpacing = 6;

    // Along east-west streets
    for (let row = 0; row <= layout.gridRows; row++) {
        const z = sw / 2 + row * (bd + sw) - cityD / 2;
        for (let x = -cityW / 2 + sw; x < cityW / 2 - sw; x += treeSpacing) {
            if (Math.random() < 0.35) continue; // Skip some for variety

            const tree = createTree();
            const side = Math.random() < 0.5 ? -1 : 1;
            tree.position.set(
                x + (Math.random() - 0.5) * 1.5,
                0,
                z + side * sw * 0.38,
            );
            tree.scale.setScalar(0.7 + Math.random() * 0.4);
            group.add(tree);
        }
    }

    // Along north-south streets
    for (let col = 0; col <= layout.gridCols; col++) {
        const x = sw / 2 + col * (bw + sw) - cityW / 2;
        for (let z = -cityD / 2 + sw; z < cityD / 2 - sw; z += treeSpacing) {
            if (Math.random() < 0.5) continue;

            const tree = createTree();
            const side = Math.random() < 0.5 ? -1 : 1;
            tree.position.set(
                x + side * sw * 0.38,
                0,
                z + (Math.random() - 0.5) * 1.5,
            );
            tree.scale.setScalar(0.7 + Math.random() * 0.4);
            group.add(tree);
        }
    }

    // ── Streetlights at intersections ──
    for (let row = 0; row <= layout.gridRows; row++) {
        for (let col = 0; col <= layout.gridCols; col++) {
            const x = sw / 2 + col * (bw + sw) - cityW / 2;
            const z = sw / 2 + row * (bd + sw) - cityD / 2;

            // Place 2 lights per intersection (NE and SW corners)
            for (const [ox, oz, ry] of [[1, 1, 0], [-1, -1, Math.PI]] as const) {
                const light = createStreetlight(layout.nightFactor);
                const pos = new THREE.Vector3(
                    x + ox * sw * 0.35,
                    0,
                    z + oz * sw * 0.35,
                );
                light.position.copy(pos);
                light.rotation.y = ry;
                group.add(light);
                lightPositions.push(pos);
            }
        }
    }

    // ── Benches along some sidewalks ──
    const benchInterval = 15;
    for (let row = 0; row <= layout.gridRows; row++) {
        const z = sw / 2 + row * (bd + sw) - cityD / 2;
        for (let x = -cityW / 2 + sw * 2; x < cityW / 2 - sw * 2; x += benchInterval) {
            if (Math.random() < 0.5) continue;

            const bench = createBench();
            bench.position.set(
                x + (Math.random() - 0.5) * 2,
                0,
                z + (Math.random() < 0.5 ? -1 : 1) * sw * 0.32,
            );
            bench.rotation.y = Math.random() < 0.5 ? 0 : Math.PI;
            group.add(bench);
        }
    }

    return { mesh: group, lightPositions };
}
