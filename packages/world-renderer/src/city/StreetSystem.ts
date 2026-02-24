/**
 * StreetSystem — Roads, sidewalks, crosswalks for the city grid
 *
 * Generates flat geometry for streets between building blocks.
 * Roads are dark grey, sidewalks are lighter and slightly raised,
 * crosswalks are striped decals at intersections.
 *
 * @module world-renderer/city
 */

import * as THREE from 'three';
import type { CityLayout } from './CityGenerator';
import { getCityDimensions } from './CityGenerator';

// ─── Types ────────────────────────────────────────────────────

export interface StreetSystemResult {
    /** Root group of all street geometry */
    mesh: THREE.Group;
    /** Walkable areas for NPC patrol paths */
    sidewalkPositions: THREE.Vector3[];
}

// ─── Materials ────────────────────────────────────────────────

function createRoadMaterial(): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color: 0x3C3C3C });
}

function createSidewalkMaterial(groundColor: number): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color: groundColor });
}

function createCrosswalkMaterial(): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color: 0xEEEEEE });
}

function createLaneMaterial(): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color: 0xCCCC00 });
}

// ─── Generator ────────────────────────────────────────────────

/**
 * Generate the complete street system for a city layout.
 */
export function createStreetSystem(layout: CityLayout): StreetSystemResult {
    const group = new THREE.Group();
    group.name = 'streets';
    const sidewalkPositions: THREE.Vector3[] = [];

    const { width: cityW, depth: cityD } = getCityDimensions(layout);

    const roadMat = createRoadMaterial();
    const sidewalkMat = createSidewalkMaterial(layout.palette.ground);
    const crosswalkMat = createCrosswalkMaterial();
    const laneMat = createLaneMaterial();

    const sw = layout.streetWidth;
    const bw = layout.blockWidth;
    const bd = layout.blockDepth;

    // Ground plane (entire city area)
    const groundGeo = new THREE.PlaneGeometry(cityW + 20, cityD + 20);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x5A5A5A });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    group.add(ground);

    // ── East-West streets (horizontal) ──
    for (let row = 0; row <= layout.gridRows; row++) {
        const z = sw / 2 + row * (bd + sw) - cityD / 2;

        // Road surface
        const roadGeo = new THREE.PlaneGeometry(cityW, sw * 0.6);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.01, z);
        road.receiveShadow = true;
        group.add(road);

        // Center lane marking
        const laneGeo = new THREE.PlaneGeometry(cityW * 0.9, 0.12);
        const lane = new THREE.Mesh(laneGeo, laneMat);
        lane.rotation.x = -Math.PI / 2;
        lane.position.set(0, 0.02, z);
        group.add(lane);

        // North sidewalk
        const nsGeo = new THREE.BoxGeometry(cityW, 0.12, sw * 0.18);
        const ns = new THREE.Mesh(nsGeo, sidewalkMat);
        ns.position.set(0, 0.06, z - sw * 0.3);
        ns.receiveShadow = true;
        group.add(ns);

        // South sidewalk
        const ss = ns.clone();
        ss.position.set(0, 0.06, z + sw * 0.3);
        group.add(ss);

        // Collect sidewalk positions for NPC patrol
        for (let ix = -3; ix <= 3; ix++) {
            sidewalkPositions.push(new THREE.Vector3(ix * (bw + sw) * 0.5, 0.12, z - sw * 0.3));
            sidewalkPositions.push(new THREE.Vector3(ix * (bw + sw) * 0.5, 0.12, z + sw * 0.3));
        }
    }

    // ── North-South streets (vertical) ──
    for (let col = 0; col <= layout.gridCols; col++) {
        const x = sw / 2 + col * (bw + sw) - cityW / 2;

        const roadGeo = new THREE.PlaneGeometry(sw * 0.6, cityD);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(x, 0.01, 0);
        road.receiveShadow = true;
        group.add(road);

        // Center lane
        const laneGeo = new THREE.PlaneGeometry(0.12, cityD * 0.9);
        const lane = new THREE.Mesh(laneGeo, laneMat);
        lane.rotation.x = -Math.PI / 2;
        lane.position.set(x, 0.02, 0);
        group.add(lane);

        // West sidewalk
        const wsGeo = new THREE.BoxGeometry(sw * 0.18, 0.12, cityD);
        const ws = new THREE.Mesh(wsGeo, sidewalkMat);
        ws.position.set(x - sw * 0.3, 0.06, 0);
        group.add(ws);

        // East sidewalk
        const es = ws.clone();
        es.position.set(x + sw * 0.3, 0.06, 0);
        group.add(es);
    }

    // ── Crosswalks at intersections ──
    for (let row = 0; row <= layout.gridRows; row++) {
        for (let col = 0; col <= layout.gridCols; col++) {
            const x = sw / 2 + col * (bw + sw) - cityW / 2;
            const z = sw / 2 + row * (bd + sw) - cityD / 2;

            // Four crosswalk stripes per intersection
            const stripeW = 0.3;
            const stripeL = sw * 0.5;
            for (let s = 0; s < 4; s++) {
                const stripe = new THREE.Mesh(
                    new THREE.PlaneGeometry(stripeW, stripeL),
                    crosswalkMat,
                );
                stripe.rotation.x = -Math.PI / 2;
                stripe.position.set(
                    x + (s - 1.5) * stripeW * 1.5,
                    0.025,
                    z,
                );
                group.add(stripe);
            }
        }
    }

    // ── Sidewalk block surfaces (raised platforms inside blocks) ──
    for (let row = 0; row < layout.gridRows; row++) {
        for (let col = 0; col < layout.gridCols; col++) {
            const x = sw + col * (bw + sw) + bw / 2 - cityW / 2;
            const z = sw + row * (bd + sw) + bd / 2 - cityD / 2;

            const blockGeo = new THREE.BoxGeometry(bw, 0.1, bd);
            const block = new THREE.Mesh(blockGeo, sidewalkMat);
            block.position.set(x, 0.05, z);
            block.receiveShadow = true;
            group.add(block);
        }
    }

    return { mesh: group, sidewalkPositions };
}
