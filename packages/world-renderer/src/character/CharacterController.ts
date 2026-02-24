/**
 * CharacterController — WASD movement with AABB collision
 *
 * Handles keyboard input, movement velocity, building collision,
 * and ground clamping. The controller updates the character's
 * position and facing direction each frame.
 *
 * @module world-renderer/character
 */

import * as THREE from 'three';
import type { CharacterMesh } from './PlayerCharacter';

// ─── Types ────────────────────────────────────────────────────

export interface CharacterControllerConfig {
    /** Walk speed in units/second */
    walkSpeed?: number;
    /** Run speed in units/second (when holding Shift) */
    runSpeed?: number;
    /** Character collision radius (approximate) */
    collisionRadius?: number;
    /** Collider boxes for buildings */
    colliders?: THREE.Box3[];
    /** World bounds to clamp character within */
    worldBounds?: THREE.Box3;
}

export interface CharacterControllerInstance {
    /** Update position/animation. Call each frame with delta time. */
    update(deltaTime: number, elapsed: number): void;
    /** Get the character's current world position */
    getPosition(): THREE.Vector3;
    /** Teleport the character to a position */
    setPosition(pos: THREE.Vector3): void;
    /** Lock/unlock movement (e.g., during dialogue) */
    setLocked(locked: boolean): void;
    /** Check if the controller is locked */
    isLocked(): boolean;
    /** Get current movement speed (for animation) */
    getSpeed(): number;
    /** Get facing angle (radians) */
    getFacing(): number;
    /** Update colliders (e.g., when city changes) */
    setColliders(colliders: THREE.Box3[]): void;
    /** Dispose input listeners */
    dispose(): void;
}

// ─── Input State ──────────────────────────────────────────────

interface InputState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    sprint: boolean;
}

// ─── Controller ───────────────────────────────────────────────

/**
 * Create a character controller with WASD input and collision.
 */
export function createCharacterController(
    character: CharacterMesh,
    config: CharacterControllerConfig = {},
): CharacterControllerInstance {
    const walkSpeed = config.walkSpeed ?? 5;
    const runSpeed = config.runSpeed ?? 8;
    const collisionRadius = config.collisionRadius ?? 0.4;
    let colliders = config.colliders ?? [];
    const worldBounds = config.worldBounds ?? null;

    let locked = false;
    let currentSpeed = 0;
    let currentFacing = 0;

    // ── Input handling ──
    const input: InputState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
    };

    function onKeyDown(e: KeyboardEvent): void {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': input.forward = true; break;
            case 'KeyS': case 'ArrowDown': input.backward = true; break;
            case 'KeyA': case 'ArrowLeft': input.left = true; break;
            case 'KeyD': case 'ArrowRight': input.right = true; break;
            case 'ShiftLeft': case 'ShiftRight': input.sprint = true; break;
        }
    }

    function onKeyUp(e: KeyboardEvent): void {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': input.forward = false; break;
            case 'KeyS': case 'ArrowDown': input.backward = false; break;
            case 'KeyA': case 'ArrowLeft': input.left = false; break;
            case 'KeyD': case 'ArrowRight': input.right = false; break;
            case 'ShiftLeft': case 'ShiftRight': input.sprint = false; break;
        }
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
    }

    // ── Collision check ──
    function checkCollision(newPos: THREE.Vector3): boolean {
        // Create a small box around the character position
        const charMin = new THREE.Vector3(
            newPos.x - collisionRadius,
            0,
            newPos.z - collisionRadius,
        );
        const charMax = new THREE.Vector3(
            newPos.x + collisionRadius,
            character.height,
            newPos.z + collisionRadius,
        );
        const charBox = new THREE.Box3(charMin, charMax);

        for (const collider of colliders) {
            if (charBox.intersectsBox(collider)) {
                return true;
            }
        }
        return false;
    }

    // ── Clamp to world bounds ──
    function clampToBounds(pos: THREE.Vector3): void {
        if (!worldBounds) return;
        pos.x = Math.max(worldBounds.min.x + 1, Math.min(worldBounds.max.x - 1, pos.x));
        pos.z = Math.max(worldBounds.min.z + 1, Math.min(worldBounds.max.z - 1, pos.z));
    }

    // ── Update ──
    function update(deltaTime: number, elapsed: number): void {
        if (locked) {
            currentSpeed = 0;
            character.animateWalk(0, elapsed);
            return;
        }

        // Compute movement direction
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (input.forward) moveDir.z -= 1;
        if (input.backward) moveDir.z += 1;
        if (input.left) moveDir.x -= 1;
        if (input.right) moveDir.x += 1;

        const isMoving = moveDir.lengthSq() > 0;

        if (isMoving) {
            moveDir.normalize();
            const speed = input.sprint ? runSpeed : walkSpeed;
            currentSpeed = speed;

            // Compute facing direction
            currentFacing = Math.atan2(moveDir.x, moveDir.z);
            character.setFacing(currentFacing);

            // Compute new position
            const velocity = moveDir.multiplyScalar(speed * deltaTime);
            const currentPos = character.root.position.clone();

            // Try X movement
            const tryX = currentPos.clone();
            tryX.x += velocity.x;
            if (!checkCollision(tryX)) {
                character.root.position.x = tryX.x;
            }

            // Try Z movement (separate from X for wall sliding)
            const tryZ = character.root.position.clone();
            tryZ.z += velocity.z;
            if (!checkCollision(tryZ)) {
                character.root.position.z = tryZ.z;
            }

            // Clamp to world bounds
            clampToBounds(character.root.position);
        } else {
            currentSpeed = 0;
        }

        // Ground clamping
        character.root.position.y = 0;

        // Animate
        character.animateWalk(currentSpeed, elapsed);
    }

    return {
        update,
        getPosition: () => character.root.position.clone(),
        setPosition: (pos) => character.root.position.copy(pos),
        setLocked: (l) => { locked = l; },
        isLocked: () => locked,
        getSpeed: () => currentSpeed,
        getFacing: () => currentFacing,
        setColliders: (c) => { colliders = c; },
        dispose() {
            if (typeof window !== 'undefined') {
                window.removeEventListener('keydown', onKeyDown);
                window.removeEventListener('keyup', onKeyUp);
            }
        },
    };
}
