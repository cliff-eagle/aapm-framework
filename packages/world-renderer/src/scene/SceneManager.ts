/**
 * SceneManager — Manages transitions between Globe and City views
 *
 * The globe and city share a single WebGL renderer. The scene manager
 * handles switching between them with camera transitions.
 *
 * @module world-renderer/scene
 */

import * as THREE from 'three';
import type { GlobeRendererInstance } from '../globe/GlobeRenderer';
import type { CitySceneInstance } from '../city/CityScene';
import type { CharacterControllerInstance } from '../character/CharacterController';
import type { ThirdPersonCameraInstance } from '../character/ThirdPersonCamera';
import type { NPCManagerInstance } from '../npc/NPCManager';

// ─── Types ────────────────────────────────────────────────────

export type SceneMode = 'globe' | 'city' | 'transitioning';

export interface SceneManagerConfig {
    /** WebGL renderer (shared between scenes) */
    renderer: THREE.WebGLRenderer;
    /** Container element for the canvas */
    container: HTMLElement;
    /** Callback when city is entered */
    onCityEnter?: (cityId: string) => void;
    /** Callback when returning to globe */
    onGlobeReturn?: () => void;
    /** Callback when NPC interaction starts */
    onNPCInteract?: (npcId: string) => void;
}

export interface SceneManagerInstance {
    /** Current scene mode */
    mode: SceneMode;
    /** Show the globe view */
    showGlobe(): void;
    /** Transition to a city */
    enterCity(cityId: string): void;
    /** Return to globe from city */
    returnToGlobe(): void;
    /** Set the globe renderer  */
    setGlobe(globe: GlobeRendererInstance): void;
    /** Set the city scene */
    setCity(city: CitySceneInstance): void;
    /** Set character systems */
    setCharacter(
        controller: CharacterControllerInstance,
        camera: ThirdPersonCameraInstance,
    ): void;
    /** Set NPC manager */
    setNPCManager(npcManager: NPCManagerInstance): void;
    /** Animation loop update */
    update(deltaTime: number, elapsed: number): void;
    /** Handle window resize */
    resize(width: number, height: number): void;
    /** Dispose everything */
    dispose(): void;
}

// ─── Scene Manager ────────────────────────────────────────────

/**
 * Create a scene manager that orchestrates globe ↔ city transitions.
 */
export function createSceneManager(config: SceneManagerConfig): SceneManagerInstance {
    const { renderer, container } = config;

    let mode: SceneMode = 'globe';
    let globe: GlobeRendererInstance | null = null;
    let city: CitySceneInstance | null = null;
    let controller: CharacterControllerInstance | null = null;
    let tpCamera: ThirdPersonCameraInstance | null = null;
    let npcManager: NPCManagerInstance | null = null;
    let currentCityId = '';

    // Transition state
    let transitionProgress = 0;
    let transitionTarget: SceneMode = 'globe';
    const TRANSITION_SPEED = 2.0; // transitions per second

    // ── Overlay for fade transitions ──
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: #000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        z-index: 1000;
    `;
    container.style.position = 'relative';
    container.appendChild(overlay);

    function showGlobe(): void {
        mode = 'globe';
        // Lock character during globe view
        controller?.setLocked(true);
    }

    function enterCity(cityId: string): void {
        if (mode === 'transitioning') return;

        currentCityId = cityId;
        mode = 'transitioning';
        transitionTarget = 'city';
        transitionProgress = 0;

        // Fade to black
        overlay.style.opacity = '1';

        // After fade, switch scenes
        setTimeout(() => {
            mode = 'city';
            controller?.setLocked(false);

            // Fade back in
            overlay.style.opacity = '0';
            config.onCityEnter?.(cityId);
        }, 400);
    }

    function returnToGlobe(): void {
        if (mode === 'transitioning') return;

        mode = 'transitioning';
        transitionTarget = 'globe';
        transitionProgress = 0;

        controller?.setLocked(true);

        // Fade to black
        overlay.style.opacity = '1';

        setTimeout(() => {
            mode = 'globe';
            overlay.style.opacity = '0';
            config.onGlobeReturn?.();
        }, 400);
    }

    function update(deltaTime: number, elapsed: number): void {
        switch (mode) {
            case 'globe':
                // Globe has its own animation loop
                break;

            case 'city':
                if (!city || !tpCamera) break;

                // Update character
                if (controller) {
                    controller.update(deltaTime, elapsed);
                    const pos = controller.getPosition();
                    const facing = controller.getFacing();
                    tpCamera.update(pos, facing, deltaTime);
                }

                // Update NPCs
                if (npcManager && controller) {
                    npcManager.update(deltaTime, elapsed, controller.getPosition());
                }

                // Render city scene
                renderer.render(city.scene, tpCamera.camera);
                break;

            case 'transitioning':
                // During transition, keep rendering current scene dimmed
                break;
        }
    }

    function resize(width: number, height: number): void {
        renderer.setSize(width, height);
        tpCamera?.resize(width, height);
    }

    function dispose(): void {
        controller?.dispose();
        tpCamera?.dispose();
        npcManager?.dispose();
        city?.dispose();
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    return {
        get mode() { return mode; },
        showGlobe,
        enterCity,
        returnToGlobe,
        setGlobe: (g) => { globe = g; },
        setCity: (c) => { city = c; },
        setCharacter: (ctrl, cam) => { controller = ctrl; tpCamera = cam; },
        setNPCManager: (mgr) => { npcManager = mgr; },
        update,
        resize,
        dispose,
    };
}
