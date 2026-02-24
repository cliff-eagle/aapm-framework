/**
 * @aapm/world-renderer — Three.js 3D World Stack for the AAPM Framework
 *
 * Three-layer rendering architecture:
 *   Layer 1: Globe (rotating Earth with city pins and travel arcs)
 *   Layer 2: City World (procedural 3D city from schema) — Phase 2
 *   Layer 3: Location Scene (interior with NPC presence) — Phase 3
 *
 * @module world-renderer
 */

// ─── Globe (Layer 1) ──────────────────────────────────────────

export { createGlobeRenderer } from './globe/GlobeRenderer';
export type { GlobeRendererConfig, GlobeRendererInstance } from './globe/GlobeRenderer';

export { createEarthSphere } from './globe/EarthSphere';
export type { EarthSphereOptions, EarthSphereGroup } from './globe/EarthSphere';

export { createStarField } from './globe/StarField';
export type { StarFieldOptions, StarFieldSystem } from './globe/StarField';

export { createCityPinSystem, latLngToVec3 } from './globe/CityPinSystem';
export type { CityDefinition, CityPinState, CityPin, CityPinSystemInstance } from './globe/CityPinSystem';

export { createTravelArc } from './globe/TravelArc';
export type { TravelConfig, TravelArcInstance, VehicleType } from './globe/TravelArc';

export { createGlobeControls } from './globe/GlobeControls';
export type { GlobeControlsOptions, GlobeControlsInstance } from './globe/GlobeControls';

export { generateEarthTexture, generateCloudTexture } from './globe/ProceduralEarthTexture';
export type { ProceduralTextureOptions } from './globe/ProceduralEarthTexture';
