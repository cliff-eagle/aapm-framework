/**
 * @aapm/world-renderer — Three.js 3D World Stack for the AAPM Framework
 *
 * Five-module rendering architecture:
 *   Globe:     Rotating Earth with city pins and travel arcs
 *   City:      Procedural Roblox-style 3D city from schema
 *   Character: Third-person player with WASD movement
 *   NPC:       Interactive NPCs with dialogue triggers
 *   Scene:     Globe ↔ City transition manager
 *
 * @module world-renderer
 */

// ─── Globe ────────────────────────────────────────────────────

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

export { schemaToCityDefinitions, resolveCityCoordinates, KNOWN_COORDINATES } from './globe/schema-adapter';
export type { SchemaLocation, SchemaCity, SchemaToGlobeConfig } from './globe/schema-adapter';

// ─── City ─────────────────────────────────────────────────────

export { createBuilding, createRandomBuilding, CITY_PALETTES } from './city/BuildingFactory';
export type { BuildingArchetype, BuildingConfig, CityPalette, BuildingResult } from './city/BuildingFactory';

export { generateCity, getCityDimensions, gridToWorld, CITY_LAYOUTS } from './city/CityGenerator';
export type { CityLayout, PlacedBuilding, GeneratedCity } from './city/CityGenerator';

export { createStreetSystem } from './city/StreetSystem';
export type { StreetSystemResult } from './city/StreetSystem';

export { createPropSystem } from './city/PropSystem';
export type { PropSystemResult } from './city/PropSystem';

export { createCityScene } from './city/CityScene';
export type { CitySceneConfig, CitySceneInstance } from './city/CityScene';

// ─── Character ────────────────────────────────────────────────

export { createPlayerCharacter, DEFAULT_APPEARANCES } from './character/PlayerCharacter';
export type { CharacterAppearance, CharacterMesh } from './character/PlayerCharacter';

export { createCharacterController } from './character/CharacterController';
export type { CharacterControllerConfig, CharacterControllerInstance } from './character/CharacterController';

export { createThirdPersonCamera } from './character/ThirdPersonCamera';
export type { ThirdPersonCameraConfig, ThirdPersonCameraInstance } from './character/ThirdPersonCamera';

// ─── NPC ──────────────────────────────────────────────────────

export { createNPCEntity } from './npc/NPCEntity';
export type { NPCDefinition, NPCState, NPCEntityInstance } from './npc/NPCEntity';

export { createNPCManager } from './npc/NPCManager';
export type { NPCManagerConfig, NPCManagerInstance } from './npc/NPCManager';

// ─── Scene ────────────────────────────────────────────────────

export { createSceneManager } from './scene/SceneManager';
export type { SceneMode, SceneManagerConfig, SceneManagerInstance } from './scene/SceneManager';

