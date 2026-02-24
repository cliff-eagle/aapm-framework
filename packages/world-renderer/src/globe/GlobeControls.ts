/**
 * GlobeControls — Manual orbit, zoom, and interaction controls
 *
 * Replaces OrbitControls (not available in Three.js r128 CDN bundle)
 * with a custom implementation supporting:
 *   - Mouse drag → globe rotation with momentum
 *   - Scroll wheel → camera zoom (min/max clamped)
 *   - Raycaster-based city pin click detection
 *   - Auto-rotate when idle (resumes after 5s)
 *   - Touch support for mobile
 *
 * @module world-renderer/globe
 */

import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────

export interface GlobeControlsOptions {
    /** Target DOM element for event listeners */
    domElement: HTMLElement;
    /** Camera to control */
    camera: THREE.PerspectiveCamera;
    /** The earth group to rotate */
    earthGroup: THREE.Group;
    /** Min camera distance (default: 7) */
    minDistance?: number;
    /** Max camera distance (default: 18) */
    maxDistance?: number;
    /** Rotation sensitivity (default: 0.005) */
    rotationSensitivity?: number;
    /** Momentum decay factor (default: 0.95) */
    momentumDecay?: number;
    /** Auto-rotate speed (default: 0.0003) */
    autoRotateSpeed?: number;
    /** Idle timeout before auto-rotate resumes in ms (default: 5000) */
    idleTimeout?: number;
    /** Raycaster for city pin detection */
    raycaster?: THREE.Raycaster;
    /** Callback when a city pin is clicked */
    onCityClick?: (cityId: string) => void;
    /** Callback when hovering over a city pin */
    onCityHover?: (cityId: string | null) => void;
    /** Pin meshes for raycasting */
    pinMeshes?: THREE.Mesh[];
}

export interface GlobeControlsInstance {
    /** Update per frame */
    update(deltaTime: number): void;
    /** Enable/disable controls */
    setEnabled(enabled: boolean): void;
    /** Get current camera distance */
    getCameraDistance(): number;
    /** Set camera distance with lerp */
    setCameraDistance(distance: number, immediate?: boolean): void;
    /** Update pin meshes for raycasting */
    setPinMeshes(meshes: THREE.Mesh[]): void;
    /** Dispose event listeners */
    dispose(): void;
}

// ─── Factory ──────────────────────────────────────────────────

export function createGlobeControls(
    options: GlobeControlsOptions,
): GlobeControlsInstance {
    const {
        domElement,
        camera,
        earthGroup,
        minDistance = 7,
        maxDistance = 18,
        rotationSensitivity = 0.005,
        momentumDecay = 0.95,
        autoRotateSpeed = 0.0003,
        idleTimeout = 5000,
        onCityClick,
        onCityHover,
    } = options;

    let enabled = true;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let lastInteractionTime = 0;
    let isAutoRotating = true;
    let targetDistance = camera.position.z;
    let pinMeshes: THREE.Mesh[] = options.pinMeshes ?? [];

    const raycaster = options.raycaster ?? new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    // ─── Mouse Events ─────────────────────────────────────────

    function onMouseDown(e: MouseEvent): void {
        if (!enabled) return;
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        velocityX = 0;
        velocityY = 0;
        isAutoRotating = false;
        lastInteractionTime = performance.now();
    }

    function onMouseMove(e: MouseEvent): void {
        if (!enabled) return;

        // Update NDC for hover detection
        const rect = domElement.getBoundingClientRect();
        mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (!isDragging) {
            // Hover detection
            raycaster.setFromCamera(mouseNDC, camera);
            const intersects = raycaster.intersectObjects(pinMeshes, false);
            if (intersects.length > 0) {
                const cityId = intersects[0].object.userData.cityId as string;
                onCityHover?.(cityId);
                domElement.style.cursor = 'pointer';
            } else {
                onCityHover?.(null);
                domElement.style.cursor = 'grab';
            }
            return;
        }

        domElement.style.cursor = 'grabbing';

        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        // Rotate earth group based on mouse delta
        earthGroup.rotation.y += deltaX * rotationSensitivity;
        earthGroup.rotation.x += deltaY * rotationSensitivity;

        // Clamp vertical rotation to avoid over-rotation
        earthGroup.rotation.x = Math.max(
            -Math.PI / 3,
            Math.min(Math.PI / 3, earthGroup.rotation.x),
        );

        // Record velocity for momentum
        velocityX = deltaX * rotationSensitivity;
        velocityY = deltaY * rotationSensitivity;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastInteractionTime = performance.now();
    }

    function onMouseUp(): void {
        isDragging = false;
        domElement.style.cursor = 'grab';
    }

    function onWheel(e: WheelEvent): void {
        if (!enabled) return;
        e.preventDefault();

        targetDistance += e.deltaY * 0.01;
        targetDistance = Math.max(minDistance, Math.min(maxDistance, targetDistance));
        lastInteractionTime = performance.now();
        isAutoRotating = false;
    }

    function onClick(e: MouseEvent): void {
        if (!enabled) return;

        const rect = domElement.getBoundingClientRect();
        mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseNDC, camera);
        const intersects = raycaster.intersectObjects(pinMeshes, false);

        if (intersects.length > 0) {
            const cityId = intersects[0].object.userData.cityId as string;
            onCityClick?.(cityId);
        }
    }

    // ─── Touch Events ─────────────────────────────────────────

    let lastTouchX = 0;
    let lastTouchY = 0;

    function onTouchStart(e: TouchEvent): void {
        if (!enabled || e.touches.length !== 1) return;
        isDragging = true;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        isAutoRotating = false;
        lastInteractionTime = performance.now();
    }

    function onTouchMove(e: TouchEvent): void {
        if (!enabled || !isDragging || e.touches.length !== 1) return;
        e.preventDefault();

        const deltaX = e.touches[0].clientX - lastTouchX;
        const deltaY = e.touches[0].clientY - lastTouchY;

        earthGroup.rotation.y += deltaX * rotationSensitivity;
        earthGroup.rotation.x += deltaY * rotationSensitivity;
        earthGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, earthGroup.rotation.x));

        velocityX = deltaX * rotationSensitivity;
        velocityY = deltaY * rotationSensitivity;

        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        lastInteractionTime = performance.now();
    }

    function onTouchEnd(): void {
        isDragging = false;
    }

    // ─── Register Events ──────────────────────────────────────

    domElement.addEventListener('mousedown', onMouseDown);
    domElement.addEventListener('mousemove', onMouseMove);
    domElement.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('mouseleave', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });
    domElement.addEventListener('click', onClick);
    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    domElement.addEventListener('touchend', onTouchEnd);

    domElement.style.cursor = 'grab';

    // ─── Return ───────────────────────────────────────────────

    return {
        update(deltaTime: number): void {
            if (!enabled) return;

            // Momentum (when not dragging)
            if (!isDragging && (Math.abs(velocityX) > 0.00001 || Math.abs(velocityY) > 0.00001)) {
                earthGroup.rotation.y += velocityX;
                earthGroup.rotation.x += velocityY;
                earthGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, earthGroup.rotation.x));
                velocityX *= momentumDecay;
                velocityY *= momentumDecay;
            }

            // Auto-rotate (resumes after idle timeout)
            const now = performance.now();
            if (!isDragging && now - lastInteractionTime > idleTimeout) {
                isAutoRotating = true;
            }
            if (isAutoRotating) {
                earthGroup.rotation.y += autoRotateSpeed * deltaTime * 60;
            }

            // Smooth zoom
            const currentDist = camera.position.z;
            if (Math.abs(currentDist - targetDistance) > 0.01) {
                camera.position.z += (targetDistance - currentDist) * 0.1;
            }
        },

        setEnabled(value: boolean): void {
            enabled = value;
        },

        getCameraDistance(): number {
            return camera.position.z;
        },

        setCameraDistance(distance: number, immediate?: boolean): void {
            targetDistance = Math.max(minDistance, Math.min(maxDistance, distance));
            if (immediate) {
                camera.position.z = targetDistance;
            }
        },

        setPinMeshes(meshes: THREE.Mesh[]): void {
            pinMeshes = meshes;
        },

        dispose(): void {
            domElement.removeEventListener('mousedown', onMouseDown);
            domElement.removeEventListener('mousemove', onMouseMove);
            domElement.removeEventListener('mouseup', onMouseUp);
            domElement.removeEventListener('mouseleave', onMouseUp);
            domElement.removeEventListener('wheel', onWheel);
            domElement.removeEventListener('click', onClick);
            domElement.removeEventListener('touchstart', onTouchStart);
            domElement.removeEventListener('touchmove', onTouchMove);
            domElement.removeEventListener('touchend', onTouchEnd);
        },
    };
}
