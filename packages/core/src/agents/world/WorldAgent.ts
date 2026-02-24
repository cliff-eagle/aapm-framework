/**
 * World Agent — Narrative and environment manager.
 *
 * The World Agent manages the dynamic world state:
 *   - Generates ambient events driven by learner progress
 *   - Moves NPCs between locations based on narrative + schedule
 *   - Creates multi-session story arcs targeting competencies
 *   - Scales world complexity with tier advancement
 *
 * Integrates with:
 *   - WorldEngine (state reads/writes, navigation, events)
 *   - AgentOrchestrator (NPC coordination)
 *   - Inter-agent: receives progress updates from Tutor/Evaluation
 *
 * @module agents/world/WorldAgent
 * @patentCritical Claim 14 — World Agent Architecture
 */

import type { AgentConfig, AgentDecision, AgentMessage } from '../AgentTypes';
import type { AgentEvent, AgentInstance, AgentHandlers } from '../AgentBase';
import { createAgentBase, createMessage } from '../AgentBase';
import type { AgentMemoryInstance } from '../AgentMemory';
import type { AgentToolkitInstance } from '../AgentToolkit';

// ─── World Agent Config ───────────────────────────────────────

export interface WorldAgentConfig {
    /** Available location IDs in the world */
    locationIds: string[];
    /** Available NPC IDs */
    npcIds: string[];
    /** Current tier (affects world complexity) */
    currentTier: 1 | 2 | 3;
    /** Available event templates */
    eventTemplates: EventTemplate[];
    /** Tick interval for event checking (in seconds) */
    eventCheckInterval: number;
}

export interface EventTemplate {
    /** Event ID */
    id: string;
    /** Event type */
    type: 'festival' | 'emergency' | 'weather' | 'social' | 'market' | 'cultural';
    /** Human-readable description */
    description: string;
    /** Required CEFR level to trigger */
    minLevel: string;
    /** Competencies this event exercises */
    targetCompetencies: string[];
    /** Duration in seconds */
    duration: number;
    /** NPCs involved */
    involvedNpcs: string[];
    /** Location where event occurs */
    locationId: string;
}

// ─── Internal State ───────────────────────────────────────────

interface WorldState {
    /** Current active events */
    activeEvents: ActiveEvent[];
    /** NPC locations (npcId → locationId) */
    npcLocations: Map<string, string>;
    /** Active narrative arcs */
    narrativeArcs: NarrativeArc[];
    /** Elapsed seconds since session start */
    elapsedSeconds: number;
    /** Last event check time */
    lastEventCheck: number;
    /** Learner's current assessed competencies (from Evaluation Agent) */
    learnerCompetencies: string[];
}

interface ActiveEvent {
    template: EventTemplate;
    startTime: number;
    endTime: number;
}

interface NarrativeArc {
    id: string;
    title: string;
    encounters: NarrativeEncounter[];
    currentEncounter: number;
    status: 'active' | 'completed' | 'abandoned';
}

interface NarrativeEncounter {
    npcId: string;
    locationId: string;
    competency: string;
    completed: boolean;
}

// ─── World Agent Implementation ───────────────────────────────

export function createWorldAgent(
    worldConfig: WorldAgentConfig,
    toolkit: AgentToolkitInstance,
): AgentInstance {
    const state: WorldState = {
        activeEvents: [],
        npcLocations: new Map(worldConfig.npcIds.map((id, i) =>
            [id, worldConfig.locationIds[i % worldConfig.locationIds.length]]
        )),
        narrativeArcs: [],
        elapsedSeconds: 0,
        lastEventCheck: 0,
        learnerCompetencies: [],
    };

    const agentConfig: AgentConfig = {
        id: 'world-main',
        role: 'world',
        name: 'World Agent',
        maxReasoningSteps: 3,
        strategy: 'reactive',
        memory: {
            workingMemorySize: 30,
            episodicCapacity: 50,
            recallThreshold: 0.5,
            enableSemantic: false,
        },
    };

    const handlers: AgentHandlers = {
        onObserve(event: AgentEvent, memory: AgentMemoryInstance): void {
            if (event.type === 'tick') {
                state.elapsedSeconds = Number(event.data['elapsedSeconds'] ?? state.elapsedSeconds);
                memory.observe(`Tick at ${state.elapsedSeconds}s`, { elapsed: state.elapsedSeconds });
            }

            if (event.type === 'dialogue_end') {
                // Check if this dialogue completes a narrative encounter
                const npcId = String(event.data['npcId'] ?? '');
                const outcome = String(event.data['outcome'] ?? '');
                for (const arc of state.narrativeArcs) {
                    if (arc.status !== 'active') continue;
                    const encounter = arc.encounters[arc.currentEncounter];
                    if (encounter && encounter.npcId === npcId && !encounter.completed) {
                        encounter.completed = outcome === 'success' || outcome === 'completed';
                        if (encounter.completed) {
                            arc.currentEncounter++;
                            if (arc.currentEncounter >= arc.encounters.length) {
                                arc.status = 'completed';
                            }
                        }
                    }
                }

                memory.observe(
                    `Dialogue with ${npcId} ended: ${outcome}`,
                    { npcId, outcome },
                );
            }

            if (event.type === 'location_enter') {
                memory.observe(
                    `Learner entered ${event.data['locationId']}`,
                    { locationId: event.data['locationId'] },
                );
            }
        },

        async onThink(
            memory: AgentMemoryInstance,
            tk: AgentToolkitInstance,
            inbox: AgentMessage[],
        ): Promise<AgentDecision[]> {
            const decisions: AgentDecision[] = [];

            // Process messages from Tutor/Evaluation
            for (const msg of inbox) {
                if (msg.type === 'broadcast' && msg.payload?.['competencies']) {
                    state.learnerCompetencies = msg.payload['competencies'] as string[];
                }
            }

            // ── Event Expiry ──
            const now = state.elapsedSeconds;
            state.activeEvents = state.activeEvents.filter(e => now < e.endTime);

            // ── Event Triggering ──
            if (now - state.lastEventCheck >= worldConfig.eventCheckInterval) {
                state.lastEventCheck = now;

                // Find eligible event templates
                const eligible = worldConfig.eventTemplates.filter(t => {
                    // Not already active
                    if (state.activeEvents.some(a => a.template.id === t.id)) return false;
                    // Max 2 events at a time
                    if (state.activeEvents.length >= 2) return false;
                    return true;
                });

                if (eligible.length > 0) {
                    // Pick the event that best matches current learner competencies
                    const best = eligible.reduce((a, b) => {
                        const aRelevance = a.targetCompetencies.filter(c =>
                            !state.learnerCompetencies.includes(c)
                        ).length;
                        const bRelevance = b.targetCompetencies.filter(c =>
                            !state.learnerCompetencies.includes(c)
                        ).length;
                        return aRelevance >= bRelevance ? a : b;
                    });

                    state.activeEvents.push({
                        template: best,
                        startTime: now,
                        endTime: now + best.duration,
                    });

                    decisions.push({
                        type: 'fire_event',
                        agentId: agentConfig.id,
                        confidence: 0.7,
                        reasoning: `Firing "${best.description}" event targeting unmastered competencies: ${best.targetCompetencies.join(', ')}`,
                        payload: {
                            eventId: best.id,
                            eventType: best.type,
                            description: best.description,
                            locationId: best.locationId,
                            duration: best.duration,
                            involvedNpcs: best.involvedNpcs,
                        },
                        priority: 5,
                        timestamp: Date.now(),
                    });
                }
            }

            // ── NPC Movement ──
            // Every 60 seconds, randomly reassign one NPC to create variety
            if (now > 0 && Math.floor(now) % 60 === 0 && worldConfig.npcIds.length > 1) {
                const randomNpc = worldConfig.npcIds[Math.floor(Math.random() * worldConfig.npcIds.length)];
                const currentLoc = state.npcLocations.get(randomNpc);
                const otherLocations = worldConfig.locationIds.filter(l => l !== currentLoc);
                if (otherLocations.length > 0) {
                    const newLoc = otherLocations[Math.floor(Math.random() * otherLocations.length)];
                    state.npcLocations.set(randomNpc, newLoc);

                    decisions.push({
                        type: 'move_npc',
                        agentId: agentConfig.id,
                        confidence: 0.6,
                        reasoning: `Moving NPC ${randomNpc} from ${currentLoc} to ${newLoc} for world variety.`,
                        payload: {
                            npcId: randomNpc,
                            fromLocation: currentLoc,
                            toLocation: newLoc,
                        },
                        priority: 3,
                        timestamp: Date.now(),
                    });
                }
            }

            // ── Narrative Arc Check ──
            // Generate a narrative arc if none active and learner has enough competencies
            if (state.narrativeArcs.filter(a => a.status === 'active').length === 0) {
                if (worldConfig.npcIds.length >= 2 && worldConfig.locationIds.length >= 2) {
                    const arc = generateNarrativeArc(worldConfig, state);
                    state.narrativeArcs.push(arc);

                    decisions.push({
                        type: 'fire_event',
                        agentId: agentConfig.id,
                        confidence: 0.65,
                        reasoning: `Starting narrative arc "${arc.title}" with ${arc.encounters.length} encounters.`,
                        payload: {
                            arcId: arc.id,
                            title: arc.title,
                            encounters: arc.encounters,
                        },
                        priority: 4,
                        timestamp: Date.now(),
                    });
                }
            }

            return decisions;
        },

        onReflect(decisions: AgentDecision[], memory: AgentMemoryInstance): void {
            for (const d of decisions) {
                if (d.type === 'fire_event') {
                    memory.observe(
                        `Fired event: ${d.payload['description'] ?? d.payload['title']}`,
                        { eventId: d.payload['eventId'] ?? d.payload['arcId'] },
                    );
                }
            }
        },
    };

    return createAgentBase(agentConfig, toolkit, handlers);
}

// ─── Helpers ──────────────────────────────────────────────────

let arcCounter = 0;

function generateNarrativeArc(config: WorldAgentConfig, state: WorldState): NarrativeArc {
    // Create a 3-encounter arc across different NPCs and locations
    const encounterCount = Math.min(3, config.npcIds.length, config.locationIds.length);
    const encounters: NarrativeEncounter[] = [];

    const shuffledNpcs = [...config.npcIds].sort(() => Math.random() - 0.5);
    const shuffledLocs = [...config.locationIds].sort(() => Math.random() - 0.5);

    const competencies = ['greetings', 'transactions', 'directions', 'complaints', 'negotiations'];
    for (let i = 0; i < encounterCount; i++) {
        encounters.push({
            npcId: shuffledNpcs[i],
            locationId: shuffledLocs[i],
            competency: competencies[i % competencies.length],
            completed: false,
        });
    }

    return {
        id: `arc-${++arcCounter}`,
        title: `Journey through the city`,
        encounters,
        currentEncounter: 0,
        status: 'active',
    };
}
