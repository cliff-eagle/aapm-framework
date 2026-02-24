/**
 * AAPM Bridge Protocol — Shared message types for Unity ↔ AAPM communication.
 *
 * Every message has a `type` and `payload`. The bridge server receives
 * messages from Unity and responds with the appropriate AAPM engine output.
 *
 * The protocol is designed so that Unity only needs to:
 *   1. Connect via WebSocket
 *   2. Send JSON messages
 *   3. Handle responses
 *
 * All game logic lives in the AAPM TypeScript brain.
 *
 * @module bridge/protocol
 */

// ─── Base Message ─────────────────────────────────────────────

export interface BridgeMessage<T extends string = string, P = unknown> {
    /** Message type identifier */
    type: T;
    /** Unique message ID for request/response correlation */
    id: string;
    /** Payload data */
    payload: P;
    /** Timestamp (ms since epoch) */
    timestamp: number;
}

// ─── Client → Server (Unity → AAPM) ──────────────────────────

/** Initialize a session with a persona schema */
export interface SessionInitRequest {
    schemaId: string;
    learnerId: string;
    learnerL1: string;
    learnerL2: string;
    cefrLevel: string;
}

/** Player approached an NPC in Unity */
export interface NPCApproachRequest {
    npcId: string;
    locationId: string;
}

/** Start a dialogue with the approached NPC */
export interface DialogueStartRequest {
    npcId: string;
    goal: string;
    injectionTargets?: string[];
}

/** Player said something during dialogue */
export interface DialogueTurnRequest {
    text: string;
    /** Optional audio data (base64) for pronunciation analysis */
    audioBase64?: string;
}

/** Player ended the dialogue */
export interface DialogueEndRequest {
    goalAchieved: boolean;
}

/** Player navigated to a new location */
export interface NavigateRequest {
    targetLocationId: string;
}

/** Player requested visible NPCs at current location */
export interface GetNPCsRequest {
    // no payload needed
}

/** Player requested navigable locations */
export interface GetLocationsRequest {
    // no payload needed
}

// ─── Server → Client (AAPM → Unity) ──────────────────────────

/** Session initialized successfully */
export interface SessionInitResponse {
    sessionId: string;
    worldState: {
        currentLocation: string;
        timeOfDay: number;
        locations: Array<{
            id: string;
            name: string;
            description: string;
        }>;
    };
    availableNPCs: NPCInfo[];
}

/** NPC info for Unity to render */
export interface NPCInfo {
    id: string;
    name: string;
    role: string;
    mood: string;
    moodValence: number;
    reputation: number;
    /** Current location ID */
    locationId: string;
    /** Personality description for Unity animation system */
    personality: string;
    /** Register level (informal/formal/etc) */
    register: string;
}

/** Dialogue started — Unity should show dialogue UI */
export interface DialogueStartResponse {
    dialogueId: string;
    npcId: string;
    npcName: string;
    npcMood: string;
    /** Opening line from the NPC */
    npcGreeting: string;
    /** The NPC's prompt context (for TTS voice selection) */
    npcRegister: string;
    /** Dialogue goal description */
    goal: string;
}

/** NPC response to player's turn */
export interface DialogueTurnResponse {
    /** NPC's reply text */
    npcText: string;
    /** Updated NPC mood */
    npcMood: string;
    /** Friction events detected in the player's speech */
    frictionEvents: Array<{
        type: string;
        description: string;
        severity: number;
        targetForm?: string;
        learnerProduction?: string;
    }>;
    /** Cultural violation alerts */
    culturalAlerts: Array<{
        violationType: string;
        severity: string;
        suggestion: string;
    }>;
    /** Alternative phrasings the player could try */
    refractions: string[];
    /** Turn number */
    turnNumber: number;
}

/** Dialogue ended — results */
export interface DialogueEndResponse {
    outcome: {
        goalAchieved: boolean;
        totalTurns: number;
        reputationDelta: number;
        frictionCount: number;
        registerAccuracy: number;
        finalMood: string;
    };
    /** Items scheduled for spaced repetition */
    retentionItems: Array<{
        form: string;
        nextReviewTime: number;
    }>;
    /** Tier progression result */
    tierProgression: {
        currentTier: number;
        shouldTransition: boolean;
        targetTier?: number;
        reason?: string;
    } | null;
}

/** Navigation result */
export interface NavigateResponse {
    success: boolean;
    newLocationId: string;
    newLocationName: string;
    availableNPCs: NPCInfo[];
    navigableLocations: Array<{
        id: string;
        name: string;
        accessible: boolean;
    }>;
}

/** Error response */
export interface ErrorResponse {
    code: string;
    message: string;
}

// ─── Scenario Chain (Yacht Captain) ───────────────────────────

/** Start a port scenario chain */
export interface ScenarioStartRequest {
    /** City name to dock at */
    cityName: string;
    /** Location ID of the port */
    locationId: string;
}

/** Advance to the next step in a scenario chain */
export interface ScenarioAdvanceRequest {
    /** Skip optional steps? */
    skipOptional?: boolean;
}

/** Request current scenario chain status */
export interface ScenarioStatusRequest {
    // no payload needed
}

/** Scenario chain status response */
export interface ScenarioChainResponse {
    /** Is a scenario chain active? */
    active: boolean;
    /** City name */
    cityName: string;
    /** Current step */
    currentStep: {
        id: string;
        step: number;
        name: string;
        npcRole: string | null;
        register: string;
        goal: string;
        required: boolean;
        phase: string;
    } | null;
    /** Completed step IDs */
    completedSteps: string[];
    /** Total steps in chain */
    totalSteps: number;
    /** Are all required steps done? */
    allRequiredComplete: boolean;
}

// ─── Message Type Map ─────────────────────────────────────────

/** All client → server message types */
export type ClientMessageType =
    | 'session/init'
    | 'npc/approach'
    | 'dialogue/start'
    | 'dialogue/turn'
    | 'dialogue/end'
    | 'navigate'
    | 'get/npcs'
    | 'get/locations'
    | 'scenario/start'
    | 'scenario/advance'
    | 'scenario/status'
    | 'ping';

/** All server → client message types */
export type ServerMessageType =
    | 'session/ready'
    | 'npc/info'
    | 'dialogue/started'
    | 'dialogue/npc-turn'
    | 'dialogue/ended'
    | 'navigate/result'
    | 'npcs/list'
    | 'locations/list'
    | 'scenario/chain'
    | 'error'
    | 'pong';

