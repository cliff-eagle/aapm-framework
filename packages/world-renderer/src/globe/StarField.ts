/**
 * StarField — Background particle star system
 *
 * 8000 random points in a sphere of radius 400.
 * White PointsMaterial, size 0.15.
 * Slight twinkle via opacity modulation.
 *
 * @module world-renderer/globe
 */

import * as THREE from 'three';

export interface StarFieldOptions {
    /** Number of stars (default: 8000) */
    count?: number;
    /** Sphere radius containing stars (default: 400) */
    radius?: number;
    /** Star point size (default: 0.15) */
    size?: number;
    /** Enable twinkle animation (default: true) */
    twinkle?: boolean;
}

export interface StarFieldSystem {
    /** The Points object to add to scene */
    points: THREE.Points;
    /** Update per frame for twinkle */
    update(time: number): void;
    /** Dispose */
    dispose(): void;
}

/**
 * Create a starfield background as a Three.js Points system.
 */
export function createStarField(
    options: StarFieldOptions = {},
): StarFieldSystem {
    const {
        count = 8000,
        radius = 400,
        size = 0.15,
        twinkle = true,
    } = options;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const baseSizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        // Random point in sphere (uniform distribution)
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * (0.5 + Math.random() * 0.5); // Between 50% and 100% of radius

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Vary star sizes slightly for depth
        const s = size * (0.3 + Math.random() * 1.0);
        sizes[i] = s;
        baseSizes[i] = s;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.9,
    });

    const points = new THREE.Points(geometry, material);

    return {
        points,

        update(time: number): void {
            if (!twinkle) return;

            const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;
            const sizeArr = sizeAttr.array as Float32Array;
            for (let i = 0; i < count; i++) {
                // Subtle twinkle: each star flickers at its own rate
                const phase = i * 0.73; // unique phase per star
                const flicker = 0.7 + 0.3 * Math.sin(time * 1.5 + phase);
                sizeArr[i] = baseSizes[i] * flicker;
            }
            sizeAttr.needsUpdate = true;
        },

        dispose(): void {
            geometry.dispose();
            material.dispose();
        },
    };
}
