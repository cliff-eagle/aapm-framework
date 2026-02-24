/**
 * TravelArc — Animated great-circle travel between cities on the globe
 *
 * When a player selects a destination city, a vehicle (aircraft/boat/train)
 * animates along a QuadraticBezierCurve3 arc from origin to destination.
 * The arc midpoint is elevated above the sphere surface to simulate altitude.
 *
 * The camera auto-zooms out to view the full arc, follows the vehicle
 * with slight lag, and returns to normal zoom on arrival.
 *
 * @module world-renderer/globe
 */

import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────

export type VehicleType = 'aircraft' | 'boat' | 'train' | 'car';

export interface TravelConfig {
    /** Origin position on sphere */
    origin: THREE.Vector3;
    /** Destination position on sphere */
    destination: THREE.Vector3;
    /** Vehicle type (determines geometry) */
    vehicleType: VehicleType;
    /** Arc elevation multiplier above sphere (default: 1.4) */
    arcElevation?: number;
    /** Travel duration in seconds (default: 4) */
    duration?: number;
    /** Airborne location midpoint trigger (default: 0.5) */
    airborneT?: number;
    /** Callback when travel completes */
    onArrival?: () => void;
    /** Callback at airborne midpoint (for boarding prompt) */
    onAirbornePoint?: (t: number) => void;
}

export interface TravelArcInstance {
    /** Root group containing arc line + vehicle */
    group: THREE.Group;
    /** Update per frame — returns true while animating, false when complete */
    update(deltaTime: number): boolean;
    /** Current t parameter [0, 1] along the arc */
    getProgress(): number;
    /** Get current vehicle world position (for camera tracking) */
    getVehiclePosition(): THREE.Vector3;
    /** Cancel the animation */
    cancel(): void;
    /** Dispose */
    dispose(): void;
}

// ─── Vehicle Builders ─────────────────────────────────────────

function createAircraft(): THREE.Group {
    const aircraft = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.5, roughness: 0.4 });

    // Fuselage
    const fuselage = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.025, 0.35, 8),
        bodyMat,
    );
    fuselage.rotation.z = Math.PI / 2;
    aircraft.add(fuselage);

    // Wings
    const wings = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.008, 0.4),
        wingMat,
    );
    aircraft.add(wings);

    // Tail fin (vertical)
    const tailV = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.08, 0.06),
        wingMat,
    );
    tailV.position.set(-0.15, 0.04, 0);
    aircraft.add(tailV);

    // Tail fin (horizontal)
    const tailH = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.008, 0.12),
        wingMat,
    );
    tailH.position.set(-0.15, 0.01, 0);
    aircraft.add(tailH);

    // Engine glow (emissive dots under wings)
    const engineGlow = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const eng1 = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 4), engineGlow);
    eng1.position.set(0.03, -0.015, 0.12);
    aircraft.add(eng1);
    const eng2 = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 4), engineGlow);
    eng2.position.set(0.03, -0.015, -0.12);
    aircraft.add(eng2);

    return aircraft;
}

function createBoat(): THREE.Group {
    const boat = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.7 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.8 });

    // Hull
    const hull = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.04, 0.08),
        hullMat,
    );
    boat.add(hull);

    // Cabin
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.04, 0.05),
        deckMat,
    );
    cabin.position.set(-0.02, 0.04, 0);
    boat.add(cabin);

    return boat;
}

function createTrain(): THREE.Group {
    const train = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6 });

    // Main car
    const car = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.06, 0.06),
        bodyMat,
    );
    train.add(car);

    // Roof
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.5 });
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.015, 0.065),
        roofMat,
    );
    roof.position.set(0, 0.037, 0);
    train.add(roof);

    return train;
}

function createCar(): THREE.Group {
    const car = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.4 });

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.04, 0.06),
        bodyMat,
    );
    car.add(body);

    // Cabin
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.03, 0.055),
        new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.7 }),
    );
    cabin.position.set(0, 0.03, 0);
    car.add(cabin);

    return car;
}

function buildVehicle(type: VehicleType): THREE.Group {
    switch (type) {
        case 'aircraft': return createAircraft();
        case 'boat': return createBoat();
        case 'train': return createTrain();
        case 'car': return createCar();
        default: return createAircraft();
    }
}

// ─── Arc Math ─────────────────────────────────────────────────

/**
 * Create a great-circle arc between two points on a sphere.
 * The control point is elevated above the sphere surface.
 */
function buildArc(
    origin: THREE.Vector3,
    destination: THREE.Vector3,
    elevationMultiplier: number,
): THREE.QuadraticBezierCurve3 {
    // Midpoint between origin and destination
    const mid = new THREE.Vector3()
        .addVectors(origin, destination)
        .multiplyScalar(0.5);

    // Elevate the midpoint above the sphere
    const midLen = mid.length();
    if (midLen > 0.001) {
        mid.normalize().multiplyScalar(origin.length() * elevationMultiplier);
    }

    return new THREE.QuadraticBezierCurve3(origin, mid, destination);
}

/**
 * Ease-in-out cubic easing function.
 */
function easeInOutCubic(t: number): number {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Arc Line Visualization ──────────────────────────────────

function createArcLine(curve: THREE.QuadraticBezierCurve3): THREE.Line {
    const points = curve.getPoints(64);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.4,
    });
    return new THREE.Line(geometry, material);
}

// ─── Factory ──────────────────────────────────────────────────

/**
 * Create and start a travel arc animation.
 */
export function createTravelArc(config: TravelConfig): TravelArcInstance {
    const {
        origin,
        destination,
        vehicleType,
        arcElevation = 1.4,
        duration = 4,
        airborneT = 0.5,
        onArrival,
        onAirbornePoint,
    } = config;

    const group = new THREE.Group();
    let t = 0;
    let active = true;
    let airborneTriggered = false;

    // Build arc curve
    const curve = buildArc(origin, destination, arcElevation);

    // Arc visualization line
    const arcLine = createArcLine(curve);
    group.add(arcLine);

    // Vehicle
    const vehicle = buildVehicle(vehicleType);
    vehicle.position.copy(origin);
    group.add(vehicle);

    // Trail particles (simple fading dots behind vehicle)
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(30 * 3); // 30 trail particles
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMaterial = new THREE.PointsMaterial({
        color: vehicleType === 'aircraft' ? 0xffffff : 0x88ccff,
        size: 0.02,
        transparent: true,
        opacity: 0.4,
    });
    const trail = new THREE.Points(trailGeometry, trailMaterial);
    group.add(trail);

    // Trail history
    const trailHistory: THREE.Vector3[] = [];

    return {
        group,

        update(deltaTime: number): boolean {
            if (!active) return false;

            // Advance t
            t += deltaTime / duration;

            if (t >= 1.0) {
                t = 1.0;
                active = false;
                vehicle.position.copy(destination);
                onArrival?.();
                return false;
            }

            // Ease the progress
            const easedT = easeInOutCubic(t);

            // Position vehicle on curve
            const point = curve.getPoint(easedT);
            vehicle.position.copy(point);

            // Orient vehicle along tangent
            const tangent = curve.getTangent(easedT);
            const lookTarget = point.clone().add(tangent);
            vehicle.lookAt(lookTarget);

            // Airborne midpoint trigger
            if (!airborneTriggered && t >= airborneT) {
                airborneTriggered = true;
                onAirbornePoint?.(t);
            }

            // Update trail
            trailHistory.push(point.clone());
            if (trailHistory.length > 30) trailHistory.shift();

            const trailAttr = trail.geometry.getAttribute('position') as THREE.BufferAttribute;
            const trailArr = trailAttr.array as Float32Array;
            for (let i = 0; i < 30; i++) {
                if (i < trailHistory.length) {
                    const tp = trailHistory[trailHistory.length - 1 - i];
                    trailArr[i * 3] = tp.x;
                    trailArr[i * 3 + 1] = tp.y;
                    trailArr[i * 3 + 2] = tp.z;
                }
            }
            trailAttr.needsUpdate = true;

            return true;
        },

        getProgress(): number {
            return t;
        },

        getVehiclePosition(): THREE.Vector3 {
            return vehicle.position.clone();
        },

        cancel(): void {
            active = false;
        },

        dispose(): void {
            arcLine.geometry.dispose();
            (arcLine.material as THREE.Material).dispose();
            trailGeometry.dispose();
            trailMaterial.dispose();
            // Vehicle primitives auto-dispose with group
            vehicle.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (child.material instanceof THREE.Material) {
                        child.material.dispose();
                    }
                }
            });
        },
    };
}
