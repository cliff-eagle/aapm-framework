/**
 * ProceduralEarthTexture — Canvas-based Earth texture generator
 *
 * Generates a procedural day texture for the globe using noise-based
 * terrain mapping. Serves as development placeholder until real 8K
 * NASA textures are sourced from visibleearth.nasa.gov.
 *
 * @module world-renderer/globe
 */

import * as THREE from 'three';

// ─── Noise Implementation (Simplex-inspired value noise) ──────

function hash(x: number, y: number): number {
    let n = x * 374761393 + y * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return (n ^ (n >> 16)) / 2147483648;
}

function smoothNoise(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = hash(ix, iy);
    const n10 = hash(ix + 1, iy);
    const n01 = hash(ix, iy + 1);
    const n11 = hash(ix + 1, iy + 1);

    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;

    return nx0 * (1 - sy) + nx1 * sy;
}

function fbm(x: number, y: number, octaves: number = 6): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    for (let i = 0; i < octaves; i++) {
        value += amplitude * smoothNoise(x * frequency, y * frequency);
        amplitude *= 0.5;
        frequency *= 2;
    }
    return value;
}

// ─── Color Palettes ───────────────────────────────────────────

const DEEP_OCEAN: [number, number, number] = [10, 30, 80];
const SHALLOW_OCEAN: [number, number, number] = [20, 60, 140];
const COAST: [number, number, number] = [40, 90, 170];
const BEACH: [number, number, number] = [194, 178, 128];
const LOWLAND: [number, number, number] = [34, 139, 34];
const FOREST: [number, number, number] = [20, 90, 20];
const HIGHLAND: [number, number, number] = [139, 119, 42];
const MOUNTAIN: [number, number, number] = [139, 137, 112];
const SNOW: [number, number, number] = [240, 240, 255];
const ICE: [number, number, number] = [200, 220, 255];

function lerp3(
    a: [number, number, number],
    b: [number, number, number],
    t: number,
): [number, number, number] {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ];
}

function elevationToColor(
    elevation: number,
    latitude: number,
): [number, number, number] {
    const absLat = Math.abs(latitude);

    // Polar ice caps
    if (absLat > 75) {
        return lerp3(SNOW, ICE, (absLat - 75) / 15);
    }

    // Ocean
    if (elevation < 0.38) {
        if (elevation < 0.25) return DEEP_OCEAN;
        if (elevation < 0.33) return lerp3(DEEP_OCEAN, SHALLOW_OCEAN, (elevation - 0.25) / 0.08);
        return lerp3(SHALLOW_OCEAN, COAST, (elevation - 0.33) / 0.05);
    }

    // Shoreline
    if (elevation < 0.42) return lerp3(COAST, BEACH, (elevation - 0.38) / 0.04);

    // Land biomes (latitude-adjusted)
    const tropicalFactor = Math.max(0, 1 - absLat / 45);

    if (elevation < 0.55) {
        const base = lerp3(LOWLAND, FOREST, tropicalFactor * 0.7);
        return base;
    }
    if (elevation < 0.65) return lerp3(FOREST, HIGHLAND, (elevation - 0.55) / 0.1);
    if (elevation < 0.78) return lerp3(HIGHLAND, MOUNTAIN, (elevation - 0.65) / 0.13);

    // High altitude snow (latitude-boosted)
    const snowLine = 0.78 - absLat * 0.002;
    if (elevation > snowLine) {
        return lerp3(MOUNTAIN, SNOW, Math.min(1, (elevation - snowLine) / 0.15));
    }

    return MOUNTAIN;
}

// ─── Texture Generation ───────────────────────────────────────

export interface ProceduralTextureOptions {
    /** Texture width in pixels (default: 2048) */
    width?: number;
    /** Texture height in pixels (default: 1024) */
    height?: number;
    /** Noise scale factor (default: 8) */
    noiseScale?: number;
    /** Seed offset for variation (default: 0) */
    seed?: number;
}

/**
 * Generate a procedural Earth day texture as a Three.js CanvasTexture.
 *
 * Uses fractional Brownian motion (fBM) noise to create realistic
 * land/ocean distribution with latitude-dependent biomes.
 */
export function generateEarthTexture(
    options: ProceduralTextureOptions = {},
): THREE.CanvasTexture {
    const {
        width = 2048,
        height = 1024,
        noiseScale = 8,
        seed = 42,
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
        const latitude = 90 - (y / height) * 180; // +90 top, -90 bottom

        for (let x = 0; x < width; x++) {
            const nx = (x / width) * noiseScale + seed;
            const ny = (y / height) * noiseScale + seed;

            // Multi-octave noise for terrain elevation
            const elevation = fbm(nx, ny, 6);

            // Add continental-scale variation
            const continental = fbm(nx * 0.3 + 100, ny * 0.3 + 100, 3);
            const combined = elevation * 0.7 + continental * 0.3;

            const color = elevationToColor(combined, latitude);

            const idx = (y * width + x) * 4;
            data[idx] = Math.min(255, Math.max(0, color[0]));
            data[idx + 1] = Math.min(255, Math.max(0, color[1]));
            data[idx + 2] = Math.min(255, Math.max(0, color[2]));
            data[idx + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

/**
 * Generate a procedural cloud texture.
 */
export function generateCloudTexture(
    options: ProceduralTextureOptions = {},
): THREE.CanvasTexture {
    const { width = 1024, height = 512, seed = 7 } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const nx = (x / width) * 6 + seed;
            const ny = (y / height) * 6 + seed;

            const noise = fbm(nx, ny, 4);
            // Clouds: threshold noise to create patchy coverage
            const cloudDensity = Math.max(0, (noise - 0.4) * 3);
            const alpha = Math.min(1, cloudDensity) * 180;

            const idx = (y * width + x) * 4;
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = alpha;
        }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}
