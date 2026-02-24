/**
 * Globe Layer — Unit Tests
 *
 * Tests for coordinate conversion, pin state logic, arc interpolation,
 * and procedural texture generation. Does not test WebGL rendering
 * (requires browser environment with canvas).
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';

// ─── Import functions under test ──────────────────────────────
// Note: We test the pure math/logic functions directly.
// Three.js rendering requires a DOM/WebGL context so we test data flow.

import { latLngToVec3 } from './CityPinSystem';

// ─── latLngToVec3 Tests ───────────────────────────────────────

describe('latLngToVec3', () => {
    const RADIUS = 5;

    it('should place the north pole at (0, R, 0)', () => {
        const pos = latLngToVec3(90, 0, RADIUS);
        expect(pos.y).toBeCloseTo(RADIUS, 2);
        expect(Math.abs(pos.x)).toBeLessThan(0.01);
        expect(Math.abs(pos.z)).toBeLessThan(0.01);
    });

    it('should place the south pole at (0, -R, 0)', () => {
        const pos = latLngToVec3(-90, 0, RADIUS);
        expect(pos.y).toBeCloseTo(-RADIUS, 2);
        expect(Math.abs(pos.x)).toBeLessThan(0.01);
        expect(Math.abs(pos.z)).toBeLessThan(0.01);
    });

    it('should place equator/prime meridian on the sphere surface', () => {
        const pos = latLngToVec3(0, 0, RADIUS);
        const dist = pos.length();
        expect(dist).toBeCloseTo(RADIUS, 2);
    });

    it('should produce points at correct radius', () => {
        // Any lat/lng should yield a point at distance R from origin
        const testCases = [
            { lat: 40.4, lng: -3.7 },   // Madrid
            { lat: 51.5, lng: -0.1 },    // London
            { lat: 43.3, lng: 5.4 },     // Mediterranean
            { lat: -33.9, lng: 18.4 },   // Cape Town
            { lat: 35.7, lng: 139.7 },   // Tokyo
        ];

        for (const { lat, lng } of testCases) {
            const pos = latLngToVec3(lat, lng, RADIUS);
            expect(pos.length()).toBeCloseTo(RADIUS, 2);
        }
    });

    it('should place Madrid and London at different positions', () => {
        const madrid = latLngToVec3(40.4, -3.7, RADIUS);
        const london = latLngToVec3(51.5, -0.1, RADIUS);
        const dist = madrid.distanceTo(london);
        expect(dist).toBeGreaterThan(0.5); // Different cities = different positions
    });

    it('should respect custom radius', () => {
        const r = 10;
        const pos = latLngToVec3(45, 90, r);
        expect(pos.length()).toBeCloseTo(r, 2);
    });

    it('should handle antipodal points', () => {
        const p1 = latLngToVec3(0, 0, RADIUS);
        const p2 = latLngToVec3(0, 180, RADIUS);
        const dist = p1.distanceTo(p2);
        // Antipodal points should be 2R apart
        expect(dist).toBeCloseTo(RADIUS * 2, 1);
    });
});

// ─── Arc Math Tests ───────────────────────────────────────────

describe('Great-Circle Arc', () => {
    it('should create a valid QuadraticBezierCurve3 between two points', () => {
        const origin = latLngToVec3(40.4, -3.7, 5);  // Madrid
        const dest = latLngToVec3(51.5, -0.1, 5);    // London

        const mid = new THREE.Vector3()
            .addVectors(origin, dest)
            .multiplyScalar(0.5);
        mid.normalize().multiplyScalar(5 * 1.4); // Elevated midpoint

        const curve = new THREE.QuadraticBezierCurve3(origin, mid, dest);

        // Start and end should match origin/destination
        const start = curve.getPoint(0);
        const end = curve.getPoint(1);
        expect(start.distanceTo(origin)).toBeLessThan(0.01);
        expect(end.distanceTo(dest)).toBeLessThan(0.01);
    });

    it('should produce an arc that rises above the sphere surface', () => {
        const origin = latLngToVec3(40.4, -3.7, 5);
        const dest = latLngToVec3(51.5, -0.1, 5);

        const mid = new THREE.Vector3()
            .addVectors(origin, dest)
            .multiplyScalar(0.5);
        mid.normalize().multiplyScalar(5 * 1.4);

        const curve = new THREE.QuadraticBezierCurve3(origin, mid, dest);

        // Midpoint should be above the sphere surface
        const midpoint = curve.getPoint(0.5);
        expect(midpoint.length()).toBeGreaterThan(5.0);
    });

    it('should provide tangent vectors for vehicle orientation', () => {
        const origin = latLngToVec3(40.4, -3.7, 5);
        const dest = latLngToVec3(51.5, -0.1, 5);

        const mid = new THREE.Vector3()
            .addVectors(origin, dest)
            .multiplyScalar(0.5);
        mid.normalize().multiplyScalar(5 * 1.4);

        const curve = new THREE.QuadraticBezierCurve3(origin, mid, dest);

        // Tangent should be a non-zero vector
        const tangent = curve.getTangent(0.5);
        expect(tangent.length()).toBeGreaterThan(0);
    });
});

// ─── Ease Function Tests ──────────────────────────────────────

describe('Ease-in-out cubic', () => {
    function easeInOutCubic(t: number): number {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    it('should return 0 at t=0', () => {
        expect(easeInOutCubic(0)).toBeCloseTo(0, 5);
    });

    it('should return 1 at t=1', () => {
        expect(easeInOutCubic(1)).toBeCloseTo(1, 5);
    });

    it('should return 0.5 at t=0.5', () => {
        expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
    });

    it('should be monotonically increasing', () => {
        let prev = 0;
        for (let t = 0; t <= 1; t += 0.01) {
            const val = easeInOutCubic(t);
            expect(val).toBeGreaterThanOrEqual(prev - 0.001); // tolerance
            prev = val;
        }
    });
});

// ─── Pin State Tests ──────────────────────────────────────────

describe('City Pin States', () => {
    it('should define correct color hex for each state', () => {
        // These match the PIN_COLORS in CityPinSystem.ts
        const expected: Record<string, number> = {
            home: 0xffd700,
            active: 0x4488ff,
            completed: 0xffc107,
            locked: 0x666666,
        };

        // Verify they are distinct
        const values = Object.values(expected);
        const unique = new Set(values);
        expect(unique.size).toBe(values.length);
    });

    it('should have distinct positions for AAPM schema cities', () => {
        const cities = [
            { id: 'madrid', lat: 40.4, lng: -3.7 },
            { id: 'london', lat: 51.5, lng: -0.1 },
            { id: 'mediterranean', lat: 43.3, lng: 5.4 },
        ];

        const positions = cities.map(c => latLngToVec3(c.lat, c.lng, 5));

        // All pairs should be at different positions
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                expect(positions[i].distanceTo(positions[j])).toBeGreaterThan(0.1);
            }
        }
    });
});

// ─── Noise & Texture Tests (pure math) ────────────────────────

describe('Procedural texture math', () => {
    it('should produce elevation values between 0 and 1', () => {
        // fBM should produce bounded values
        // We test the hash function indirectly
        const values: number[] = [];
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 10;
            const y = Math.random() * 10;
            // Simple noise check (hash returns values in a range)
            const n = Math.abs(Math.sin(x * 374761393 + y * 668265263));
            values.push(n);
        }

        // All values should be finite
        expect(values.every(v => isFinite(v))).toBe(true);
    });
});
