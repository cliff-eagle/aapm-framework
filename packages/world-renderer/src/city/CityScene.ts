/**
 * CityScene — Orchestrator that assembles the complete city world
 *
 * Combines CityGenerator, StreetSystem, PropSystem into a single
 * renderable scene with toon lighting, fog, and sky.
 *
 * @module world-renderer/city
 */

import * as THREE from 'three';
import { generateCity, CITY_LAYOUTS } from './CityGenerator';
import type { CityLayout, GeneratedCity, PlacedBuilding } from './CityGenerator';
import { createStreetSystem } from './StreetSystem';
import type { StreetSystemResult } from './StreetSystem';
import { createPropSystem } from './PropSystem';
import type { PropSystemResult } from './PropSystem';

// ─── Types ────────────────────────────────────────────────────

export interface CitySceneConfig {
    /** City layout to use (or a city name key like 'madrid') */
    layout?: CityLayout | string;
    /** Night factor 0-1 */
    nightFactor?: number;
    /** Enable fog */
    fog?: boolean;
    /** Fog density */
    fogDensity?: number;
    /** Sky color */
    skyColor?: number;
}

export interface CitySceneInstance {
    /** The Three.js scene */
    scene: THREE.Scene;
    /** All building bounding boxes for collision */
    colliders: THREE.Box3[];
    /** Sidewalk positions for NPC patrol */
    sidewalkPositions: THREE.Vector3[];
    /** Streetlight positions for point lights */
    lightPositions: THREE.Vector3[];
    /** Spawn point for the player */
    spawnPoint: THREE.Vector3;
    /** City bounds for camera clamping */
    bounds: THREE.Box3;
    /** Generated city data */
    city: GeneratedCity;
    /** Dispose all resources */
    dispose(): void;
}

// ─── Scene Builder ────────────────────────────────────────────

/**
 * Create a complete city scene ready for rendering.
 */
export function createCityScene(config: CitySceneConfig = {}): CitySceneInstance {
    const scene = new THREE.Scene();

    // ── Resolve layout ──
    const nightFactor = config.nightFactor ?? 0;
    let layout: CityLayout;
    if (typeof config.layout === 'string') {
        layout = { ...(CITY_LAYOUTS[config.layout] ?? CITY_LAYOUTS.default), nightFactor };
    } else if (config.layout) {
        layout = { ...config.layout, nightFactor };
    } else {
        layout = { ...CITY_LAYOUTS.default, nightFactor };
    }

    // ── Sky ──
    const skyColor = config.skyColor ?? (nightFactor > 0.5 ? 0x0A0A2E : 0x87CEEB);
    scene.background = new THREE.Color(skyColor);

    // ── Fog ──
    if (config.fog !== false) {
        const fogColor = nightFactor > 0.5 ? 0x1A1A3E : 0xC8D8E8;
        scene.fog = new THREE.FogExp2(fogColor, config.fogDensity ?? 0.008);
    }

    // ── Lighting ──

    // Ambient (warm fill)
    const ambientIntensity = nightFactor > 0.5 ? 0.15 : 0.5;
    const ambient = new THREE.AmbientLight(0xFFF5E6, ambientIntensity);
    scene.add(ambient);

    // Directional sun/moon
    const sunColor = nightFactor > 0.5 ? 0x4466AA : 0xFFEECC;
    const sunIntensity = nightFactor > 0.5 ? 0.3 : 1.0;
    const sun = new THREE.DirectionalLight(sunColor, sunIntensity);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    scene.add(sun);

    // Hemisphere for sky/ground color tinting
    const hemiSky = nightFactor > 0.5 ? 0x2233AA : 0x87CEEB;
    const hemiGround = nightFactor > 0.5 ? 0x222222 : 0xD2B48C;
    const hemi = new THREE.HemisphereLight(hemiSky, hemiGround, 0.3);
    scene.add(hemi);

    // ── Generate city components ──
    const city = generateCity(layout);
    scene.add(city.root);

    const streets = createStreetSystem(layout);
    scene.add(streets.mesh);

    const props = createPropSystem(layout);
    scene.add(props.mesh);

    // ── Night point lights at streetlamp positions ──
    if (nightFactor > 0.3) {
        const maxLights = Math.min(props.lightPositions.length, 30);
        for (let i = 0; i < maxLights; i++) {
            const pos = props.lightPositions[i];
            const light = new THREE.PointLight(0xFFE4B5, nightFactor * 1.5, 15, 2);
            light.position.set(pos.x + 0.8, 3.5, pos.z);
            scene.add(light);
        }
    }

    // ── Colliders from building bounding boxes ──
    const colliders = city.buildings.map(b => b.boundingBox);

    return {
        scene,
        colliders,
        sidewalkPositions: streets.sidewalkPositions,
        lightPositions: props.lightPositions,
        spawnPoint: city.spawnPoint.clone(),
        bounds: city.bounds.clone(),
        city,
        dispose() {
            scene.traverse(obj => {
                if (obj instanceof THREE.Mesh) {
                    obj.geometry.dispose();
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
        },
    };
}
