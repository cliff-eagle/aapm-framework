/**
 * ThirdPersonCamera — Smooth follow camera behind the character
 *
 * Orbits behind and above the player character. Mouse drag to
 * orbit, scroll to zoom. Smooth lerp follow with building
 * occlusion pull-forward.
 *
 * @module world-renderer/character
 */

import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────

export interface ThirdPersonCameraConfig {
    /** Distance behind character */
    distance?: number;
    /** Height above character */
    height?: number;
    /** Minimum zoom distance */
    minDistance?: number;
    /** Maximum zoom distance */
    maxDistance?: number;
    /** Follow smoothing (0 = instant, 1 = very slow) */
    smoothing?: number;
    /** Camera look-at Y offset (how high above character feet to look) */
    lookAtHeight?: number;
    /** Building colliders for occlusion pull-forward */
    colliders?: THREE.Box3[];
}

export interface ThirdPersonCameraInstance {
    /** The Three.js camera */
    camera: THREE.PerspectiveCamera;
    /** Update camera position each frame */
    update(targetPosition: THREE.Vector3, targetFacing: number, deltaTime: number): void;
    /** Handle window resize */
    resize(width: number, height: number): void;
    /** Update colliders */
    setColliders(colliders: THREE.Box3[]): void;
    /** Dispose mouse listeners */
    dispose(): void;
}

// ─── Camera ───────────────────────────────────────────────────

/**
 * Create a smooth third-person follow camera.
 */
export function createThirdPersonCamera(
    config: ThirdPersonCameraConfig = {},
): ThirdPersonCameraInstance {
    const distance = config.distance ?? 6;
    const height = config.height ?? 3;
    const minDist = config.minDistance ?? 3;
    const maxDist = config.maxDistance ?? 15;
    const smoothing = config.smoothing ?? 0.92;
    const lookAtHeight = config.lookAtHeight ?? 1.5;
    let colliders = config.colliders ?? [];

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);

    // ── State ──
    let currentDistance = distance;
    let orbitAngleX = 0;     // horizontal orbit offset (mouse drag)
    let orbitAngleY = 0.3;   // vertical angle (slight above)
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Smooth position tracker
    const smoothPos = new THREE.Vector3();
    let initialized = false;

    // ── Mouse orbit ──
    function onMouseDown(e: MouseEvent): void {
        if (e.button === 0 || e.button === 2) {
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    }

    function onMouseUp(): void {
        isDragging = false;
    }

    function onMouseMove(e: MouseEvent): void {
        if (!isDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        orbitAngleX -= dx * 0.005;
        orbitAngleY = Math.max(-0.2, Math.min(1.2, orbitAngleY + dy * 0.005));
    }

    function onWheel(e: WheelEvent): void {
        currentDistance += e.deltaY * 0.01;
        currentDistance = Math.max(minDist, Math.min(maxDist, currentDistance));
    }

    function onContextMenu(e: Event): void {
        e.preventDefault();
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('wheel', onWheel);
        window.addEventListener('contextmenu', onContextMenu);
    }

    // ── Raycaster for occlusion ──
    const raycaster = new THREE.Raycaster();

    function update(
        targetPosition: THREE.Vector3,
        targetFacing: number,
        _deltaTime: number,
    ): void {
        // Initialize smooth position on first frame
        if (!initialized) {
            smoothPos.copy(targetPosition);
            initialized = true;
        }

        // Smooth follow the target
        smoothPos.lerp(targetPosition, 1 - smoothing);

        // Compute camera offset from character
        const totalAngle = targetFacing + Math.PI + orbitAngleX;
        const vertAngle = orbitAngleY;

        const offsetX = Math.sin(totalAngle) * currentDistance * Math.cos(vertAngle);
        const offsetZ = Math.cos(totalAngle) * currentDistance * Math.cos(vertAngle);
        const offsetY = height + Math.sin(vertAngle) * currentDistance * 0.5;

        const idealPos = new THREE.Vector3(
            smoothPos.x + offsetX,
            offsetY,
            smoothPos.z + offsetZ,
        );

        // Occlusion: if a building is between camera and character, pull forward
        const lookAt = new THREE.Vector3(smoothPos.x, lookAtHeight, smoothPos.z);
        const dir = idealPos.clone().sub(lookAt).normalize();
        const maxCamDist = idealPos.distanceTo(lookAt);

        // Simple box intersection check along camera ray
        let pullDistance = maxCamDist;
        const rayOrigin = lookAt.clone();
        const step = 0.5;
        for (let d = step; d < maxCamDist; d += step) {
            const testPoint = rayOrigin.clone().add(dir.clone().multiplyScalar(d));
            const testBox = new THREE.Box3(
                testPoint.clone().subScalar(0.2),
                testPoint.clone().addScalar(0.2),
            );
            let occluded = false;
            for (const collider of colliders) {
                if (testBox.intersectsBox(collider)) {
                    occluded = true;
                    break;
                }
            }
            if (occluded) {
                pullDistance = Math.max(minDist * 0.5, d - step);
                break;
            }
        }

        const finalPos = lookAt.clone().add(dir.multiplyScalar(pullDistance));
        finalPos.y = Math.max(1.5, finalPos.y); // Never go underground

        camera.position.copy(finalPos);
        camera.lookAt(lookAt);
    }

    function resize(width: number, height: number): void {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    return {
        camera,
        update,
        resize,
        setColliders: (c) => { colliders = c; },
        dispose() {
            if (typeof window !== 'undefined') {
                window.removeEventListener('mousedown', onMouseDown);
                window.removeEventListener('mouseup', onMouseUp);
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('wheel', onWheel);
                window.removeEventListener('contextmenu', onContextMenu);
            }
        },
    };
}
