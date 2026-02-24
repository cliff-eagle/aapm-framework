/**
 * WorldBridge — Connects @aapm/core session lifecycle to @aapm/world-renderer
 *
 * This is the **top-level integration point** between the two packages.
 * It listens to session orchestrator events and drives the world renderer's
 * scene manager, NPC spawning, and dialogue transitions.
 *
 * Architecture:
 *   SessionOrchestrator → (events) → WorldBridge → SceneManager / NPCManager
 *   SceneManager → (callbacks) → WorldBridge → SessionOrchestrator
 *
 * The WorldBridge is the ONLY place where both @aapm/core types and
 * @aapm/world-renderer types are referenced together, keeping the two
 * packages decoupled from each other.
 *
 * @module world-renderer/scene
 * @patentCritical Claim 13 — World ↔ Session integration
 */

import * as THREE from 'three';
import type { SceneManagerInstance } from './SceneManager';
import type { NPCManagerInstance } from '../npc/NPCManager';
import type { CharacterControllerInstance } from '../character/CharacterController';

// ─── Core Type Mirrors (structural compatibility) ─────────────

/** Mirrors core/WorldState — runtime world data */
export interface WorldStateSnapshot {
    schemaId: string;
    learnerLocation: string;
    npcStates: Record<string, {
        npcId: string;
        currentLocation: string;
        available: boolean;
        mood: string;
        reputationWithLearner: number;
    }>;
    timeSystem: {
        currentTimeOfDay: string;
        enabled: boolean;
    };
    activeEvents: string[];
}

/** Mirrors core/SessionLifecycleEvent */
export interface SessionEvent {
    sessionId: string;
    timestamp: number;
    schemaId: string;
}

/** Mirrors core/DialogueEvent */
export interface DialogueEvent {
    sessionId: string;
    npcId: string;
    locationId: string;
}

// ─── Bridge Types ─────────────────────────────────────────────

export interface WorldBridgeConfig {
    /** Scene manager to drive transitions */
    sceneManager: SceneManagerInstance;
    /** NPC manager for spawning/updating NPCs */
    npcManager?: NPCManagerInstance;
    /** Character controller to lock/unlock during dialogue */
    controller?: CharacterControllerInstance;
    /** Callback: request the core engine to start dialogue */
    onRequestDialogue?: (npcId: string, locationId: string) => void;
    /** Callback: request navigation to a location */
    onRequestNavigation?: (locationId: string) => void;
    /** Callback: city selection from globe */
    onCitySelected?: (cityId: string) => void;
}

export interface WorldBridgeInstance {
    /** Core → Renderer: session started, initialize world */
    onSessionStart(event: SessionEvent, worldState: WorldStateSnapshot): void;
    /** Core → Renderer: world state updated (NPC moved, time changed, etc.) */
    onWorldStateUpdate(worldState: WorldStateSnapshot): void;
    /** Core → Renderer: dialogue started with NPC */
    onDialogueStart(event: DialogueEvent): void;
    /** Core → Renderer: dialogue ended */
    onDialogueEnd(event: DialogueEvent, outcome: string): void;
    /** Core → Renderer: session ended */
    onSessionEnd(event: SessionEvent): void;
    /** Renderer → Core: player requested NPC interaction */
    handleNPCInteraction(npcId: string): void;
    /** Renderer → Core: player selected city on globe */
    handleCitySelection(cityId: string): void;
    /** Get the current world bridge state */
    getState(): WorldBridgeState;
    /** Dispose */
    dispose(): void;
}

export interface WorldBridgeState {
    sessionActive: boolean;
    currentCityId: string | null;
    dialogueActive: boolean;
    dialogueNpcId: string | null;
}

// ─── Bridge Implementation ────────────────────────────────────

/**
 * Create the WorldBridge that connects core session events to the
 * world renderer's scene lifecycle.
 */
export function createWorldBridge(config: WorldBridgeConfig): WorldBridgeInstance {
    const { sceneManager, npcManager, controller } = config;

    const state: WorldBridgeState = {
        sessionActive: false,
        currentCityId: null,
        dialogueActive: false,
        dialogueNpcId: null,
    };

    function onSessionStart(event: SessionEvent, worldState: WorldStateSnapshot): void {
        state.sessionActive = true;

        // Update NPC availability from world state
        if (npcManager) {
            for (const npc of npcManager.npcs) {
                const npcState = worldState.npcStates[npc.id];
                if (npcState && !npcState.available) {
                    npcManager.removeNPC(npc.id);
                }
            }
        }
    }

    function onWorldStateUpdate(worldState: WorldStateSnapshot): void {
        if (!state.sessionActive) return;

        // Sync NPC availability
        if (npcManager) {
            for (const npc of npcManager.npcs) {
                const npcState = worldState.npcStates[npc.id];
                if (npcState && !npcState.available) {
                    // NPC became unavailable — remove from scene
                    npcManager.removeNPC(npc.id);
                }
            }
        }

        // Handle time-of-day changes (night mode)
        // This could drive CityScene's nightFactor but would require
        // scene rebuild — for now, update lighting if available
    }

    function onDialogueStart(event: DialogueEvent): void {
        state.dialogueActive = true;
        state.dialogueNpcId = event.npcId;

        // Lock player movement during dialogue
        controller?.setLocked(true);

        // Tell NPC to face the player and enter talking state
        if (npcManager && controller) {
            npcManager.startDialogue(event.npcId, controller.getPosition());
        }
    }

    function onDialogueEnd(event: DialogueEvent, _outcome: string): void {
        state.dialogueActive = false;
        state.dialogueNpcId = null;

        // Unlock player movement
        controller?.setLocked(false);

        // Tell NPC to resume idle/patrol
        npcManager?.endDialogue(event.npcId);
    }

    function onSessionEnd(_event: SessionEvent): void {
        state.sessionActive = false;
        state.dialogueActive = false;
        state.dialogueNpcId = null;

        // Return to globe view
        sceneManager.returnToGlobe();
    }

    function handleNPCInteraction(npcId: string): void {
        if (state.dialogueActive) return; // Already in dialogue

        const currentLocation = state.currentCityId ?? 'unknown';
        config.onRequestDialogue?.(npcId, currentLocation);
    }

    function handleCitySelection(cityId: string): void {
        state.currentCityId = cityId;
        sceneManager.enterCity(cityId);
        config.onCitySelected?.(cityId);
    }

    return {
        onSessionStart,
        onWorldStateUpdate,
        onDialogueStart,
        onDialogueEnd,
        onSessionEnd,
        handleNPCInteraction,
        handleCitySelection,
        getState: () => ({ ...state }),
        dispose() {
            state.sessionActive = false;
        },
    };
}
