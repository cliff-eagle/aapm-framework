/**
 * GlobeRenderer — Main entry point for Layer 1 of the AAPM World Stack
 *
 * Orchestrates all globe sub-systems:
 *   - WebGLRenderer with ACES tone mapping and PCFSoft shadows
 *   - Earth sphere (PBR surface + atmosphere + clouds)
 *   - Star field particle system
 *   - City pin system with interactive markers
 *   - Travel arc animation between cities
 *   - Manual orbit controls with momentum and auto-rotate
 *   - Sun directional lighting
 *
 * The globe scene NEVER unmounts during the application lifecycle.
 * Layer 2 (City) and Layer 3 (Location) render as children or overlays.
 *
 * @module world-renderer/globe
 * @patentCritical Claim 13 — WorldState-driven scene rendering
 */

import * as THREE from 'three';
import { createEarthSphere, type EarthSphereOptions, type EarthSphereGroup } from './EarthSphere';
import { createStarField, type StarFieldSystem } from './StarField';
import { createCityPinSystem, type CityDefinition, type CityPinSystemInstance } from './CityPinSystem';
import { createTravelArc, type TravelConfig, type TravelArcInstance, type VehicleType } from './TravelArc';
import { createGlobeControls, type GlobeControlsInstance, type GlobeControlsOptions } from './GlobeControls';

// ─── Types ────────────────────────────────────────────────────

export interface GlobeRendererConfig {
    /** Container DOM element (the renderer canvas is appended here) */
    container: HTMLElement;
    /** Cities to pin on the globe */
    cities: CityDefinition[];
    /** Earth sphere options (textures, radius, etc.) */
    earthOptions?: EarthSphereOptions;
    /** Initial camera distance (default: 12) */
    initialCameraDistance?: number;
    /** Callbacks */
    callbacks?: {
        /** Called when a city pin is clicked */
        onCityClick?: (city: CityDefinition) => void;
        /** Called when hovering over a city pin  */
        onCityHover?: (city: CityDefinition | null) => void;
        /** Called when travel arrives at destination */
        onTravelArrival?: (cityId: string) => void;
        /** Called at airborne midpoint during travel */
        onAirborneMidpoint?: (cityId: string, t: number) => void;
    };
}

export interface GlobeRendererInstance {
    /** Start the render loop */
    start(): void;
    /** Stop the render loop */
    stop(): void;
    /** Trigger travel animation to a city */
    travelTo(cityId: string, vehicleType?: VehicleType): void;
    /** Update a city pin's state */
    setCityState(cityId: string, state: 'home' | 'active' | 'locked' | 'completed'): void;
    /** Get the current city ID the player is at (last arrival) */
    getCurrentCity(): string | null;
    /** Set camera to zoom-out distance (for travel viewing) */
    setTravelView(): void;
    /** Set camera to normal distance */
    setNormalView(): void;
    /** Resize to fit container */
    resize(): void;
    /** Full cleanup */
    dispose(): void;
}

// ─── Factory ──────────────────────────────────────────────────

/**
 * Create and initialize the globe renderer.
 *
 * This is the primary entry point for Layer 1 of the AAPM world stack.
 * Mount it to a full-screen container; the canvas fills the container.
 */
export function createGlobeRenderer(
    config: GlobeRendererConfig,
): GlobeRendererInstance {
    const {
        container,
        cities,
        earthOptions = {},
        initialCameraDistance = 12,
        callbacks = {},
    } = config;

    // ─── Renderer Setup ───────────────────────────────────────

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // ─── Scene ────────────────────────────────────────────────

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814); // Deep space black-blue

    // ─── Camera ───────────────────────────────────────────────

    const camera = new THREE.PerspectiveCamera(
        45,
        width / height,
        0.1,
        1000,
    );
    camera.position.set(0, 0, initialCameraDistance);
    camera.lookAt(0, 0, 0);

    // ─── Lighting ─────────────────────────────────────────────

    // Sun — primary directional light
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(50, 0, 30);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Ambient fill — prevents fully dark hemisphere
    const ambientLight = new THREE.AmbientLight(0x222244, 0.3);
    scene.add(ambientLight);

    // ─── Globe Group (rotates as one unit) ────────────────────

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // ─── Earth ────────────────────────────────────────────────

    const earth: EarthSphereGroup = createEarthSphere(earthOptions);
    globeGroup.add(earth.group);

    // ─── Star Field ───────────────────────────────────────────

    const stars: StarFieldSystem = createStarField();
    scene.add(stars.points); // Stars don't rotate with globe

    // ─── City Pins ────────────────────────────────────────────

    const pinSystem: CityPinSystemInstance = createCityPinSystem(
        cities,
        earthOptions.radius ?? 5,
    );
    globeGroup.add(pinSystem.pinsGroup);

    // ─── Controls ─────────────────────────────────────────────

    const controlsConfig: GlobeControlsOptions = {
        domElement: renderer.domElement,
        camera,
        earthGroup: globeGroup,
        pinMeshes: pinSystem.pins.map(p => p.ring),
        onCityClick: (cityId: string) => {
            const city = cities.find(c => c.id === cityId);
            if (city) callbacks.onCityClick?.(city);
        },
        onCityHover: (cityId: string | null) => {
            if (cityId) {
                const city = cities.find(c => c.id === cityId);
                callbacks.onCityHover?.(city ?? null);
            } else {
                callbacks.onCityHover?.(null);
            }
        },
    };
    const controls: GlobeControlsInstance = createGlobeControls(controlsConfig);

    // ─── State ────────────────────────────────────────────────

    let animationFrameId: number | null = null;
    let currentCity: string | null = cities.find(c => c.state === 'home')?.id ?? null;
    let activeTravelArc: TravelArcInstance | null = null;
    let travelDestination: string | null = null;
    const clock = new THREE.Clock();

    // ─── Animation Loop ───────────────────────────────────────

    function animate(): void {
        animationFrameId = requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        // Update sub-systems
        earth.update(delta);
        stars.update(elapsed);
        pinSystem.update(elapsed);
        controls.update(delta);

        // Travel arc animation
        if (activeTravelArc) {
            const traveling = activeTravelArc.update(delta);

            // Camera follows vehicle during travel
            const vehiclePos = activeTravelArc.getVehiclePosition();
            const camTarget = vehiclePos.clone().normalize().multiplyScalar(15);
            camera.position.lerp(camTarget, 0.02);
            camera.lookAt(0, 0, 0);

            if (!traveling) {
                // Arrival — clean up arc
                globeGroup.remove(activeTravelArc.group);
                activeTravelArc.dispose();
                activeTravelArc = null;

                if (travelDestination) {
                    currentCity = travelDestination;
                    callbacks.onTravelArrival?.(travelDestination);
                    travelDestination = null;
                }

                // Return camera to normal
                controls.setCameraDistance(initialCameraDistance);
            }
        }

        // Render
        renderer.render(scene, camera);
    }

    // ─── Resize Observer ──────────────────────────────────────

    const resizeObserver = new ResizeObserver(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    // ─── Public API ───────────────────────────────────────────

    return {
        start(): void {
            clock.start();
            animate();
        },

        stop(): void {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        },

        travelTo(cityId: string, vehicleType: VehicleType = 'aircraft'): void {
            if (!currentCity) return;
            const originPos = pinSystem.getCityPosition(currentCity);
            const destPos = pinSystem.getCityPosition(cityId);
            if (!originPos || !destPos) return;

            // Cancel any existing travel
            if (activeTravelArc) {
                globeGroup.remove(activeTravelArc.group);
                activeTravelArc.dispose();
            }

            travelDestination = cityId;

            // Zoom out for travel viewing
            controls.setCameraDistance(16);
            controls.setEnabled(false); // Disable manual control during travel

            const travelConfig: TravelConfig = {
                origin: originPos,
                destination: destPos,
                vehicleType,
                duration: 4,
                onArrival: () => {
                    controls.setEnabled(true);
                },
                onAirbornePoint: (t: number) => {
                    callbacks.onAirborneMidpoint?.(cityId, t);
                },
            };

            activeTravelArc = createTravelArc(travelConfig);
            globeGroup.add(activeTravelArc.group);
        },

        setCityState(cityId: string, state: 'home' | 'active' | 'locked' | 'completed'): void {
            pinSystem.setPinState(cityId, state);
        },

        getCurrentCity(): string | null {
            return currentCity;
        },

        setTravelView(): void {
            controls.setCameraDistance(16);
        },

        setNormalView(): void {
            controls.setCameraDistance(initialCameraDistance);
        },

        resize(): void {
            const w = container.clientWidth;
            const h = container.clientHeight;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        },

        dispose(): void {
            // Stop animation
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }
            resizeObserver.disconnect();

            // Dispose sub-systems
            controls.dispose();
            earth.dispose();
            stars.dispose();
            pinSystem.dispose();
            if (activeTravelArc) activeTravelArc.dispose();

            // Dispose renderer
            renderer.dispose();
            if (renderer.domElement.parentElement) {
                renderer.domElement.parentElement.removeChild(renderer.domElement);
            }
        },
    };
}
