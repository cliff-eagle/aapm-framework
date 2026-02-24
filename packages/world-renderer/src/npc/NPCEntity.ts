/**
 * NPCEntity — Visible NPC in the city world
 *
 * Same humanoid model as the player character but with different
 * colors per NPC personality. Includes floating name label (sprite),
 * idle/patrol animation, and interaction zone detection.
 *
 * @module world-renderer/npc
 */

import * as THREE from 'three';
import { createPlayerCharacter, DEFAULT_APPEARANCES } from '../character/PlayerCharacter';
import type { CharacterAppearance, CharacterMesh } from '../character/PlayerCharacter';

// ─── Types ────────────────────────────────────────────────────

export interface NPCDefinition {
    id: string;
    name: string;
    /** Position in the city world */
    position: THREE.Vector3;
    /** Character appearance */
    appearance?: CharacterAppearance;
    /** Interaction radius */
    interactionRadius?: number;
    /** Patrol waypoints (optional, for walking NPCs) */
    patrolPoints?: THREE.Vector3[];
    /** Facing direction (radians) when idle */
    idleFacing?: number;
}

export type NPCState = 'idle' | 'patrol' | 'talking';

export interface NPCEntityInstance {
    id: string;
    name: string;
    /** Root mesh group */
    mesh: THREE.Group;
    /** Character mesh with animation */
    character: CharacterMesh;
    /** Current NPC state */
    state: NPCState;
    /** Name label sprite */
    nameLabel: THREE.Sprite;
    /** Interaction radius */
    interactionRadius: number;
    /** Check if player is in interaction range */
    isPlayerInRange(playerPos: THREE.Vector3): boolean;
    /** Update NPC animation + patrol */
    update(deltaTime: number, elapsed: number, playerPos: THREE.Vector3): void;
    /** Start talking (face player, stop moving) */
    startTalking(playerPos: THREE.Vector3): void;
    /** Stop talking (resume idle/patrol) */
    stopTalking(): void;
    /** Dispose */
    dispose(): void;
}

// ─── Name Label ───────────────────────────────────────────────

function createNameSprite(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Background pill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const radius = 16;
    ctx.beginPath();
    ctx.moveTo(radius, 4);
    ctx.lineTo(256 - radius, 4);
    ctx.quadraticCurveTo(252, 4, 252, 4 + radius);
    ctx.lineTo(252, 60 - radius);
    ctx.quadraticCurveTo(252, 60, 252 - radius, 60);
    ctx.lineTo(radius, 60);
    ctx.quadraticCurveTo(4, 60, 4, 60 - radius);
    ctx.lineTo(4, 4 + radius);
    ctx.quadraticCurveTo(4, 4, 4 + radius, 4);
    ctx.closePath();
    ctx.fill();

    // Text
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.0, 0.5, 1);
    return sprite;
}

/**
 * Create a fallback name label for non-DOM environments (tests).
 */
function createFallbackLabel(_name: string): THREE.Sprite {
    const material = new THREE.SpriteMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0 });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.0, 0.5, 1);
    return sprite;
}

// ─── Appearance by personality ────────────────────────────────

const NPC_APPEARANCE_POOL: CharacterAppearance[] = [
    DEFAULT_APPEARANCES.npc_friendly,
    DEFAULT_APPEARANCES.npc_formal,
    DEFAULT_APPEARANCES.npc_casual,
    { skinColor: 0xC68642, shirtColor: 0x006400, pantsColor: 0x4A4A4A, hairColor: 0x2C1608, hasHair: true },
    { skinColor: 0xFFDBB4, shirtColor: 0x800080, pantsColor: 0x2F2F2F, hairColor: 0xB8860B, hasHair: true },
    { skinColor: 0xD2A06F, shirtColor: 0x008080, pantsColor: 0x1A1A1A, hairColor: 0x3D2B1F, hasHair: true },
];

function getAppearanceForNPC(index: number): CharacterAppearance {
    return NPC_APPEARANCE_POOL[index % NPC_APPEARANCE_POOL.length];
}

// ─── NPC Entity ───────────────────────────────────────────────

/**
 * Create an NPC entity in the city world.
 */
export function createNPCEntity(
    def: NPCDefinition,
    npcIndex: number = 0,
): NPCEntityInstance {
    const appearance = def.appearance ?? getAppearanceForNPC(npcIndex);
    const character = createPlayerCharacter(appearance);
    const interactionRadius = def.interactionRadius ?? 3;

    const mesh = new THREE.Group();
    mesh.name = `npc-${def.id}`;
    mesh.add(character.root);
    mesh.position.copy(def.position);

    // Name label
    let nameLabel: THREE.Sprite;
    if (typeof document !== 'undefined') {
        nameLabel = createNameSprite(def.name);
    } else {
        nameLabel = createFallbackLabel(def.name);
    }
    nameLabel.position.y = character.height + 0.5;
    mesh.add(nameLabel);

    // State
    let state: NPCState = def.patrolPoints && def.patrolPoints.length > 0 ? 'patrol' : 'idle';
    let patrolIndex = 0;
    let idleFacing = def.idleFacing ?? 0;

    // Interaction prompt sprite (hidden by default)
    let promptSprite: THREE.Sprite | null = null;
    if (typeof document !== 'undefined') {
        const promptCanvas = document.createElement('canvas');
        promptCanvas.width = 256;
        promptCanvas.height = 48;
        const pctx = promptCanvas.getContext('2d')!;
        pctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
        pctx.roundRect(4, 4, 248, 40, 10);
        pctx.fill();
        pctx.font = 'bold 18px sans-serif';
        pctx.fillStyle = '#FFD700';
        pctx.textAlign = 'center';
        pctx.textBaseline = 'middle';
        pctx.fillText('Press E to talk', 128, 24);

        const promptTex = new THREE.CanvasTexture(promptCanvas);
        const promptMat = new THREE.SpriteMaterial({ map: promptTex, transparent: true, depthWrite: false });
        promptSprite = new THREE.Sprite(promptMat);
        promptSprite.scale.set(1.8, 0.35, 1);
        promptSprite.position.y = character.height + 1.0;
        promptSprite.visible = false;
        mesh.add(promptSprite);
    }

    function isPlayerInRange(playerPos: THREE.Vector3): boolean {
        const dx = mesh.position.x - playerPos.x;
        const dz = mesh.position.z - playerPos.z;
        return Math.sqrt(dx * dx + dz * dz) < interactionRadius;
    }

    function update(deltaTime: number, elapsed: number, playerPos: THREE.Vector3): void {
        const inRange = isPlayerInRange(playerPos);
        if (promptSprite) {
            promptSprite.visible = inRange && state !== 'talking';
        }

        // Name label always faces camera (sprites do this automatically)
        nameLabel.position.y = character.height + 0.5;

        switch (state) {
            case 'idle':
                character.setFacing(idleFacing);
                character.animateWalk(0, elapsed);
                break;

            case 'patrol': {
                if (!def.patrolPoints || def.patrolPoints.length === 0) {
                    state = 'idle';
                    break;
                }
                const target = def.patrolPoints[patrolIndex];
                const dx = target.x - mesh.position.x;
                const dz = target.z - mesh.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < 0.5) {
                    // Reached waypoint, go to next
                    patrolIndex = (patrolIndex + 1) % def.patrolPoints.length;
                } else {
                    // Move toward waypoint
                    const speed = 1.5;
                    const facing = Math.atan2(dx, dz);
                    character.setFacing(facing);
                    mesh.position.x += (dx / dist) * speed * deltaTime;
                    mesh.position.z += (dz / dist) * speed * deltaTime;
                    character.animateWalk(speed, elapsed);
                }
                break;
            }

            case 'talking': {
                // Face the player
                const dx = playerPos.x - mesh.position.x;
                const dz = playerPos.z - mesh.position.z;
                const facing = Math.atan2(dx, dz);
                character.setFacing(facing);
                character.animateWalk(0, elapsed);
                break;
            }
        }
    }

    function startTalking(playerPos: THREE.Vector3): void {
        state = 'talking';
        if (promptSprite) promptSprite.visible = false;
        // Face player
        const dx = playerPos.x - mesh.position.x;
        const dz = playerPos.z - mesh.position.z;
        character.setFacing(Math.atan2(dx, dz));
    }

    function stopTalking(): void {
        state = def.patrolPoints && def.patrolPoints.length > 0 ? 'patrol' : 'idle';
    }

    function dispose(): void {
        character.dispose();
        if (nameLabel.material instanceof THREE.SpriteMaterial && nameLabel.material.map) {
            nameLabel.material.map.dispose();
            nameLabel.material.dispose();
        }
    }

    return {
        id: def.id,
        name: def.name,
        mesh,
        character,
        state,
        nameLabel,
        interactionRadius,
        isPlayerInRange,
        update,
        startTalking,
        stopTalking,
        dispose,
    };
}
