/**
 * EarthSphere — PBR Earth mesh with atmosphere and cloud layer
 *
 * Creates three nested spheres:
 *   1. Earth surface (PBR material with procedural or loaded texture)
 *   2. Cloud layer (semi-transparent, counter-rotating)
 *   3. Atmosphere glow (Fresnel shader, additive blending, BackSide)
 *
 * @module world-renderer/globe
 */

import * as THREE from 'three';
import { generateEarthTexture, generateCloudTexture } from './ProceduralEarthTexture';

// ─── Atmosphere Shaders ───────────────────────────────────────

const ATMOSPHERE_VERTEX_SHADER = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 glowColor;
uniform float intensity;
uniform float power;

void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, power) * intensity;
    gl_FragColor = vec4(glowColor, fresnel);
}
`;

// ─── Configuration ────────────────────────────────────────────

export interface EarthSphereOptions {
    /** Earth radius (default: 5) */
    radius?: number;
    /** Geometry segments (default: 64) */
    segments?: number;
    /** Use loaded textures instead of procedural (paths to files) */
    textures?: {
        day?: string;
        normal?: string;
        specular?: string;
        clouds?: string;
    };
    /** Atmosphere glow color (default: blue) */
    atmosphereColor?: THREE.Color;
    /** Atmosphere intensity (default: 0.6) */
    atmosphereIntensity?: number;
}

export interface EarthSphereGroup {
    /** The parent group containing all three spheres */
    group: THREE.Group;
    /** Earth surface mesh (for rotation control) */
    earth: THREE.Mesh;
    /** Cloud layer mesh (for counter-rotation) */
    clouds: THREE.Mesh;
    /** Atmosphere mesh (static) */
    atmosphere: THREE.Mesh;
    /** Update called per frame — handles rotation */
    update(deltaTime: number): void;
    /** Dispose all geometries and materials */
    dispose(): void;
}

// ─── Factory ──────────────────────────────────────────────────

/**
 * Create the three-layer Earth sphere group.
 */
export function createEarthSphere(
    options: EarthSphereOptions = {},
): EarthSphereGroup {
    const {
        radius = 5,
        segments = 64,
        textures,
        atmosphereColor = new THREE.Color(0x4488ff),
        atmosphereIntensity = 0.6,
    } = options;

    const group = new THREE.Group();
    const textureLoader = new THREE.TextureLoader();

    // ─── Earth Surface ────────────────────────────────────────

    const earthGeometry = new THREE.SphereGeometry(radius, segments, segments);

    // Day texture: loaded or procedural
    let dayMap: THREE.Texture;
    if (textures?.day) {
        dayMap = textureLoader.load(textures.day);
    } else {
        dayMap = generateEarthTexture({ width: 2048, height: 1024 });
    }

    const earthMaterial = new THREE.MeshStandardMaterial({
        map: dayMap,
        roughness: 0.8,
        metalness: 0.0,
    });

    // Optional normal and specular maps
    if (textures?.normal) {
        earthMaterial.normalMap = textureLoader.load(textures.normal);
        earthMaterial.normalScale = new THREE.Vector2(0.5, 0.5);
    }
    if (textures?.specular) {
        earthMaterial.roughnessMap = textureLoader.load(textures.specular);
    }

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    group.add(earth);

    // ─── Cloud Layer ──────────────────────────────────────────

    const cloudGeometry = new THREE.SphereGeometry(radius * 1.01, segments, segments);

    let cloudMap: THREE.Texture;
    if (textures?.clouds) {
        cloudMap = textureLoader.load(textures.clouds);
    } else {
        cloudMap = generateCloudTexture({ width: 1024, height: 512 });
    }

    const cloudMaterial = new THREE.MeshStandardMaterial({
        map: cloudMap,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    group.add(clouds);

    // ─── Atmosphere Glow ──────────────────────────────────────

    const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.03, segments, segments);
    const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERTEX_SHADER,
        fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
        uniforms: {
            glowColor: { value: atmosphereColor },
            intensity: { value: atmosphereIntensity },
            power: { value: 3.5 },
        },
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
    });

    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    group.add(atmosphere);

    // ─── Update & Dispose ─────────────────────────────────────

    return {
        group,
        earth,
        clouds,
        atmosphere,

        update(deltaTime: number): void {
            // Slow earth rotation
            earth.rotation.y += 0.0003 * deltaTime * 60;
            // Cloud counter-rotation (slightly slower)
            clouds.rotation.y += 0.00015 * deltaTime * 60;
        },

        dispose(): void {
            earthGeometry.dispose();
            earthMaterial.dispose();
            dayMap.dispose();
            cloudGeometry.dispose();
            cloudMaterial.dispose();
            cloudMap.dispose();
            atmosphereGeometry.dispose();
            atmosphereMaterial.dispose();
        },
    };
}
