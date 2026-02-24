/**
 * CityPinSystem — Interactive city markers on the globe surface
 *
 * Converts schema city lat/lng coordinates to 3D positions on the sphere.
 * Each pin has three visual states: HOME (gold), ACTIVE (blue), LOCKED (grey).
 * Pins pulse with a glow animation and support raycaster-based click detection.
 *
 * @module world-renderer/globe
 * @patentCritical Claim 13 — WorldState-driven scene rendering
 */

import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────

export type CityPinState = 'home' | 'active' | 'locked' | 'completed';

export interface CityDefinition {
    /** Unique city identifier */
    id: string;
    /** City name in L2 (primary display) */
    nameL2: string;
    /** City name in L1 (secondary display) */
    nameL1: string;
    /** Latitude (-90 to 90) */
    lat: number;
    /** Longitude (-180 to 180) */
    lng: number;
    /** Pin state */
    state: CityPinState;
    /** Schema ID (for location association) */
    schemaId?: string;
}

export interface CityPin {
    /** City definition */
    definition: CityDefinition;
    /** Root Object3D containing pin geometry */
    group: THREE.Group;
    /** Inner ring mesh (for raycasting hit target) */
    ring: THREE.Mesh;
    /** Outer halo mesh */
    halo: THREE.Mesh;
    /** World position on sphere surface */
    position3D: THREE.Vector3;
}

export interface CityPinSystemInstance {
    /** All pin groups to add to scene */
    pinsGroup: THREE.Group;
    /** All city pins */
    pins: CityPin[];
    /** Update per frame (pulse animation) */
    update(time: number): void;
    /** Raycast test against pin meshes — returns hit city or null */
    raycast(raycaster: THREE.Raycaster): CityDefinition | null;
    /** Set a pin state dynamically */
    setPinState(cityId: string, state: CityPinState): void;
    /** Get a city's 3D position on the sphere */
    getCityPosition(cityId: string): THREE.Vector3 | null;
    /** Dispose all geometry/materials */
    dispose(): void;
}

// ─── Pin Colors ───────────────────────────────────────────────

const PIN_COLORS: Record<CityPinState, number> = {
    home: 0xffd700,        // Gold
    active: 0x4488ff,      // Bright blue
    completed: 0xffc107,   // Amber-gold
    locked: 0x666666,      // Grey
};

const HALO_OPACITY: Record<CityPinState, number> = {
    home: 0.5,
    active: 0.4,
    completed: 0.2,
    locked: 0.1,
};

// ─── Coordinate Conversion ────────────────────────────────────

/**
 * Convert latitude/longitude to 3D position on a sphere.
 *
 * Uses standard spherical-to-Cartesian conversion:
 *   phi = (90 - lat) * PI / 180
 *   theta = (lng + 180) * PI / 180
 */
export function latLngToVec3(
    lat: number,
    lng: number,
    radius: number = 5,
): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
    );
}

// ─── Pin Factory ──────────────────────────────────────────────

function createPin(city: CityDefinition, earthRadius: number): CityPin {
    const group = new THREE.Group();
    const position3D = latLngToVec3(city.lat, city.lng, earthRadius);
    const color = PIN_COLORS[city.state];

    // Inner ring — clickable hit target
    const ringGeometry = new THREE.TorusGeometry(0.08, 0.015, 8, 24);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: city.state === 'locked' ? 0.2 : 1.0,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.userData = { cityId: city.id };
    group.add(ring);

    // Outer halo — pulsing glow ring
    const haloGeometry = new THREE.TorusGeometry(0.14, 0.008, 8, 24);
    const haloMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: HALO_OPACITY[city.state],
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    group.add(halo);

    // Center dot — small sphere at pin center
    const dotGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const dotMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: city.state === 'locked' ? 0.15 : 0.8,
    });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    group.add(dot);

    // Position on sphere surface
    group.position.copy(position3D);

    // Orient pin to face outward from sphere center
    group.lookAt(new THREE.Vector3(0, 0, 0));
    group.rotateX(Math.PI / 2); // Align torus flat on surface

    return {
        definition: city,
        group,
        ring,
        halo,
        position3D,
    };
}

// ─── System Factory ───────────────────────────────────────────

/**
 * Create the city pin system from an array of city definitions.
 */
export function createCityPinSystem(
    cities: CityDefinition[],
    earthRadius: number = 5,
): CityPinSystemInstance {
    const pinsGroup = new THREE.Group();
    const pins: CityPin[] = [];

    for (const city of cities) {
        const pin = createPin(city, earthRadius);
        pins.push(pin);
        pinsGroup.add(pin.group);
    }

    return {
        pinsGroup,
        pins,

        update(time: number): void {
            for (const pin of pins) {
                if (pin.definition.state === 'locked') continue;
                if (pin.definition.state === 'completed') continue;

                // Pulse animation: scale oscillation
                const pulse = 1.0 + 0.15 * Math.sin(time * 2 + pin.definition.lat);
                pin.ring.scale.setScalar(pulse);

                // Halo breathe
                const haloPulse = 0.8 + 0.3 * Math.sin(time * 1.5 + pin.definition.lng);
                pin.halo.scale.setScalar(haloPulse);
                (pin.halo.material as THREE.MeshBasicMaterial).opacity =
                    HALO_OPACITY[pin.definition.state] * haloPulse;
            }
        },

        raycast(raycaster: THREE.Raycaster): CityDefinition | null {
            const ringMeshes = pins.map(p => p.ring);
            const intersects = raycaster.intersectObjects(ringMeshes, false);

            if (intersects.length > 0) {
                const cityId = intersects[0].object.userData.cityId as string;
                const pin = pins.find(p => p.definition.id === cityId);
                return pin?.definition ?? null;
            }
            return null;
        },

        setPinState(cityId: string, state: CityPinState): void {
            const pin = pins.find(p => p.definition.id === cityId);
            if (!pin) return;

            pin.definition = { ...pin.definition, state };
            const color = PIN_COLORS[state];
            (pin.ring.material as THREE.MeshBasicMaterial).color.setHex(color);
            (pin.ring.material as THREE.MeshBasicMaterial).opacity = state === 'locked' ? 0.2 : 1.0;
            (pin.halo.material as THREE.MeshBasicMaterial).color.setHex(color);
        },

        getCityPosition(cityId: string): THREE.Vector3 | null {
            const pin = pins.find(p => p.definition.id === cityId);
            return pin?.position3D ?? null;
        },

        dispose(): void {
            for (const pin of pins) {
                pin.ring.geometry.dispose();
                (pin.ring.material as THREE.Material).dispose();
                pin.halo.geometry.dispose();
                (pin.halo.material as THREE.Material).dispose();
            }
        },
    };
}
