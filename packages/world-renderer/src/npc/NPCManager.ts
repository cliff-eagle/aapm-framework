/**
 * NPCManager — Spawns and manages all NPCs in the city world
 *
 * Handles NPC placement from schema data, proximity detection,
 * interaction prompts, and dialogue trigger callbacks.
 *
 * @module world-renderer/npc
 */

import * as THREE from 'three';
import { createNPCEntity } from './NPCEntity';
import type { NPCDefinition, NPCEntityInstance } from './NPCEntity';

// ─── Types ────────────────────────────────────────────────────

export interface NPCManagerConfig {
    /** NPC definitions to spawn */
    npcs: NPCDefinition[];
    /** Callback when player interacts with an NPC */
    onInteract?: (npcId: string) => void;
    /** Callback when player enters NPC range */
    onEnterRange?: (npcId: string) => void;
    /** Callback when player leaves NPC range */
    onLeaveRange?: (npcId: string) => void;
}

export interface NPCManagerInstance {
    /** Root group containing all NPCs */
    root: THREE.Group;
    /** All NPC entities */
    npcs: NPCEntityInstance[];
    /** Update all NPCs each frame */
    update(deltaTime: number, elapsed: number, playerPos: THREE.Vector3): void;
    /** Handle interaction key press (E key) */
    handleInteract(playerPos: THREE.Vector3): string | null;
    /** Get NPC currently in range (closest) */
    getNearestInRange(playerPos: THREE.Vector3): NPCEntityInstance | null;
    /** Start dialogue with specific NPC */
    startDialogue(npcId: string, playerPos: THREE.Vector3): boolean;
    /** End dialogue with specific NPC */
    endDialogue(npcId: string): void;
    /** Add an NPC at runtime */
    addNPC(def: NPCDefinition): NPCEntityInstance;
    /** Remove an NPC at runtime */
    removeNPC(npcId: string): void;
    /** Dispose all NPCs */
    dispose(): void;
}

// ─── Manager ──────────────────────────────────────────────────

/**
 * Create the NPC manager for a city scene.
 */
export function createNPCManager(config: NPCManagerConfig): NPCManagerInstance {
    const root = new THREE.Group();
    root.name = 'npc-manager';

    const npcs: NPCEntityInstance[] = [];
    const inRangeSet = new Set<string>();
    let interactKeyDown = false;

    // ── Key listener for E interaction ──
    function onKeyDown(e: KeyboardEvent): void {
        if (e.code === 'KeyE') {
            interactKeyDown = true;
        }
    }

    function onKeyUp(e: KeyboardEvent): void {
        if (e.code === 'KeyE') {
            interactKeyDown = false;
        }
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
    }

    // ── Spawn initial NPCs ──
    config.npcs.forEach((def, i) => {
        const entity = createNPCEntity(def, i);
        npcs.push(entity);
        root.add(entity.mesh);
    });

    // ── Update ──
    function update(deltaTime: number, elapsed: number, playerPos: THREE.Vector3): void {
        for (const npc of npcs) {
            npc.update(deltaTime, elapsed, playerPos);

            const inRange = npc.isPlayerInRange(playerPos);
            const wasInRange = inRangeSet.has(npc.id);

            if (inRange && !wasInRange) {
                inRangeSet.add(npc.id);
                config.onEnterRange?.(npc.id);
            } else if (!inRange && wasInRange) {
                inRangeSet.delete(npc.id);
                config.onLeaveRange?.(npc.id);
            }
        }

        // Auto-interact on E press
        if (interactKeyDown) {
            handleInteract(playerPos);
            interactKeyDown = false;
        }
    }

    function getNearestInRange(playerPos: THREE.Vector3): NPCEntityInstance | null {
        let nearest: NPCEntityInstance | null = null;
        let nearestDist = Infinity;

        for (const npc of npcs) {
            if (!npc.isPlayerInRange(playerPos)) continue;
            if (npc.state === 'talking') continue;

            const dx = npc.mesh.position.x - playerPos.x;
            const dz = npc.mesh.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = npc;
            }
        }

        return nearest;
    }

    function handleInteract(playerPos: THREE.Vector3): string | null {
        const nearest = getNearestInRange(playerPos);
        if (!nearest) return null;

        nearest.startTalking(playerPos);
        config.onInteract?.(nearest.id);
        return nearest.id;
    }

    function startDialogue(npcId: string, playerPos: THREE.Vector3): boolean {
        const npc = npcs.find(n => n.id === npcId);
        if (!npc) return false;
        npc.startTalking(playerPos);
        return true;
    }

    function endDialogue(npcId: string): void {
        const npc = npcs.find(n => n.id === npcId);
        if (npc) npc.stopTalking();
    }

    function addNPC(def: NPCDefinition): NPCEntityInstance {
        const entity = createNPCEntity(def, npcs.length);
        npcs.push(entity);
        root.add(entity.mesh);
        return entity;
    }

    function removeNPC(npcId: string): void {
        const idx = npcs.findIndex(n => n.id === npcId);
        if (idx === -1) return;
        const npc = npcs[idx];
        root.remove(npc.mesh);
        npc.dispose();
        npcs.splice(idx, 1);
        inRangeSet.delete(npcId);
    }

    function dispose(): void {
        for (const npc of npcs) npc.dispose();
        npcs.length = 0;
        inRangeSet.clear();
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        }
    }

    return {
        root,
        npcs,
        update,
        handleInteract,
        getNearestInRange,
        startDialogue,
        endDialogue,
        addNPC,
        removeNPC,
        dispose,
    };
}
