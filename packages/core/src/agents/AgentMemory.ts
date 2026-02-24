/**
 * Agent Memory — Dual-layer memory system for AAPM agents.
 *
 * Three memory tiers:
 *   1. Working Memory — ring buffer of recent observations/turns
 *   2. Episodic Memory — vector-embedded past interactions, queryable by similarity
 *   3. Semantic Memory — structured facts about the learner
 *
 * Agents use memory to maintain context across turns and sessions.
 * Working memory is ephemeral (session-scoped), episodic and semantic
 * persist via the VectorStore provider.
 *
 * @module agents/AgentMemory
 * @patentCritical Claim 14 — Agent Memory Architecture
 */

import type { MemoryConfig } from './AgentTypes';

// ─── Memory Item Types ────────────────────────────────────────

export interface MemoryItem {
    /** Unique memory ID */
    id: string;
    /** Memory content (human-readable) */
    content: string;
    /** Structured metadata */
    metadata: Record<string, unknown>;
    /** When this memory was created */
    timestamp: number;
    /** Importance score (0.0–1.0), affects retention priority */
    importance: number;
    /** Access count — frequently recalled memories are more important */
    accessCount: number;
}

export interface EpisodicMemory extends MemoryItem {
    /** Session ID this memory is from */
    sessionId: string;
    /** NPC involved (if any) */
    npcId?: string;
    /** Location context */
    locationId?: string;
    /** Embedding vector (null until embedded) */
    embedding?: number[];
}

export interface SemanticFact extends MemoryItem {
    /** Fact category */
    category: 'vocabulary' | 'grammar' | 'pronunciation' | 'cultural' | 'preference' | 'personal';
    /** Confidence in this fact (0.0–1.0) */
    confidence: number;
    /** Source evidence (which sessions/turns established this) */
    evidence: string[];
    /** Whether this fact has been superseded by a newer observation */
    superseded: boolean;
}

// ─── Vector Store Interface ───────────────────────────────────

/**
 * Minimal vector store interface for memory persistence.
 * Mirrors the VectorStoreProvider from feedback-engine but
 * scoped to agent memory operations.
 */
export interface MemoryVectorStore {
    upsert(id: string, embedding: number[], metadata: Record<string, unknown>): Promise<void>;
    query(embedding: number[], topK: number, filter?: Record<string, unknown>): Promise<Array<{
        id: string;
        score: number;
        metadata: Record<string, unknown>;
    }>>;
    delete(ids: string[]): Promise<void>;
}

/**
 * Embedding function — generates vector embeddings for memory items.
 */
export type EmbedFunction = (text: string) => Promise<number[]>;

// ─── Agent Memory Implementation ──────────────────────────────

export interface AgentMemoryInstance {
    /** Add an item to working memory */
    observe(content: string, metadata?: Record<string, unknown>): void;
    /** Store an episodic memory (will be embedded if vector store available) */
    remember(episode: Omit<EpisodicMemory, 'id' | 'accessCount'>): Promise<void>;
    /** Store a semantic fact */
    learn(fact: Omit<SemanticFact, 'id' | 'accessCount'>): void;
    /** Recall episodic memories similar to a query */
    recall(query: string, topK?: number): Promise<EpisodicMemory[]>;
    /** Get all semantic facts, optionally filtered by category */
    getFacts(category?: SemanticFact['category']): SemanticFact[];
    /** Get working memory contents */
    getWorkingMemory(): MemoryItem[];
    /** Get a text summary of current memory state (for prompt injection) */
    summarize(): string;
    /** Forget memories older than a timestamp */
    forget(olderThan: number): void;
    /** Clear all memory */
    clear(): void;
    /** Snapshot for debugging/serialization */
    snapshot(): MemorySnapshot;
}

export interface MemorySnapshot {
    workingMemorySize: number;
    episodicMemorySize: number;
    semanticFactCount: number;
    oldestMemory: number | null;
    newestMemory: number | null;
}

/**
 * Create an agent memory instance.
 */
export function createAgentMemory(
    config: MemoryConfig,
    vectorStore?: MemoryVectorStore,
    embedFn?: EmbedFunction,
): AgentMemoryInstance {
    // ── Working Memory (ring buffer) ──
    const workingMemory: MemoryItem[] = [];
    let workingCounter = 0;

    // ── Episodic Memory ──
    const episodes: Map<string, EpisodicMemory> = new Map();
    let episodeCounter = 0;

    // ── Semantic Memory ──
    const facts: Map<string, SemanticFact> = new Map();
    let factCounter = 0;

    function observe(content: string, metadata: Record<string, unknown> = {}): void {
        const item: MemoryItem = {
            id: `wm-${++workingCounter}`,
            content,
            metadata,
            timestamp: Date.now(),
            importance: 0.5,
            accessCount: 0,
        };

        workingMemory.push(item);

        // Ring buffer: evict oldest when full
        while (workingMemory.length > config.workingMemorySize) {
            workingMemory.shift();
        }
    }

    async function remember(episode: Omit<EpisodicMemory, 'id' | 'accessCount'>): Promise<void> {
        const id = `ep-${++episodeCounter}`;
        const mem: EpisodicMemory = { ...episode, id, accessCount: 0 };

        // Generate embedding if vector store available
        if (vectorStore && embedFn) {
            mem.embedding = await embedFn(episode.content);
            await vectorStore.upsert(id, mem.embedding, {
                agentId: mem.metadata['agentId'] ?? 'unknown',
                sessionId: mem.sessionId,
                npcId: mem.npcId,
                locationId: mem.locationId,
                content: mem.content,
                timestamp: mem.timestamp,
                importance: mem.importance,
            });
        }

        episodes.set(id, mem);

        // Evict least important if over capacity
        if (episodes.size > config.episodicCapacity) {
            let leastImportant: string | null = null;
            let minScore = Infinity;
            for (const [eid, ep] of episodes) {
                const score = ep.importance * (1 + ep.accessCount * 0.1);
                if (score < minScore) {
                    minScore = score;
                    leastImportant = eid;
                }
            }
            if (leastImportant) {
                episodes.delete(leastImportant);
                void vectorStore?.delete([leastImportant]);
            }
        }
    }

    function learn(fact: Omit<SemanticFact, 'id' | 'accessCount'>): void {
        // Check for existing fact in same category with similar content
        for (const [fid, existing] of facts) {
            if (existing.category === fact.category && existing.content === fact.content) {
                // Update existing fact with new confidence/evidence
                facts.set(fid, {
                    ...existing,
                    confidence: Math.max(existing.confidence, fact.confidence),
                    evidence: [...existing.evidence, ...fact.evidence],
                    timestamp: fact.timestamp,
                });
                return;
            }
        }

        const id = `sf-${++factCounter}`;
        facts.set(id, { ...fact, id, accessCount: 0 });
    }

    async function recall(query: string, topK: number = 5): Promise<EpisodicMemory[]> {
        // Try vector-based recall first
        if (vectorStore && embedFn) {
            const queryEmbedding = await embedFn(query);
            const results = await vectorStore.query(queryEmbedding, topK);

            return results
                .filter(r => r.score >= config.recallThreshold)
                .map(r => {
                    const ep = episodes.get(r.id);
                    if (ep) {
                        ep.accessCount++;
                        return ep;
                    }
                    // Reconstruct from metadata if not in local cache
                    return {
                        id: r.id,
                        content: String(r.metadata['content'] ?? ''),
                        metadata: r.metadata,
                        timestamp: Number(r.metadata['timestamp'] ?? 0),
                        importance: Number(r.metadata['importance'] ?? 0.5),
                        accessCount: 1,
                        sessionId: String(r.metadata['sessionId'] ?? ''),
                        npcId: r.metadata['npcId'] as string | undefined,
                        locationId: r.metadata['locationId'] as string | undefined,
                    };
                });
        }

        // Fallback: keyword matching on local episodes
        const queryLower = query.toLowerCase();
        const matches = Array.from(episodes.values())
            .filter(ep => ep.content.toLowerCase().includes(queryLower))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, topK);

        for (const m of matches) m.accessCount++;
        return matches;
    }

    function getFacts(category?: SemanticFact['category']): SemanticFact[] {
        const all = Array.from(facts.values()).filter(f => !f.superseded);
        if (category) return all.filter(f => f.category === category);
        return all;
    }

    function getWorkingMemory(): MemoryItem[] {
        return [...workingMemory];
    }

    function summarize(): string {
        const lines: string[] = [];

        if (workingMemory.length > 0) {
            lines.push(`[Working Memory: ${workingMemory.length} items]`);
            for (const item of workingMemory.slice(-5)) {
                lines.push(`  - ${item.content.slice(0, 100)}`);
            }
        }

        const activeFacts = getFacts();
        if (activeFacts.length > 0) {
            lines.push(`[Known Facts: ${activeFacts.length}]`);
            for (const fact of activeFacts.slice(0, 10)) {
                lines.push(`  - [${fact.category}] ${fact.content} (${(fact.confidence * 100).toFixed(0)}%)`);
            }
        }

        lines.push(`[Episodic Memories: ${episodes.size}]`);

        return lines.join('\n');
    }

    function forget(olderThan: number): void {
        for (const [id, ep] of episodes) {
            if (ep.timestamp < olderThan) {
                episodes.delete(id);
                void vectorStore?.delete([id]);
            }
        }
        for (const [id, fact] of facts) {
            if (fact.timestamp < olderThan) {
                facts.delete(id);
            }
        }
    }

    function clear(): void {
        workingMemory.length = 0;
        episodes.clear();
        facts.clear();
    }

    function snapshot(): MemorySnapshot {
        const allTimestamps = [
            ...workingMemory.map(m => m.timestamp),
            ...Array.from(episodes.values()).map(e => e.timestamp),
            ...Array.from(facts.values()).map(f => f.timestamp),
        ];
        return {
            workingMemorySize: workingMemory.length,
            episodicMemorySize: episodes.size,
            semanticFactCount: getFacts().length,
            oldestMemory: allTimestamps.length > 0 ? Math.min(...allTimestamps) : null,
            newestMemory: allTimestamps.length > 0 ? Math.max(...allTimestamps) : null,
        };
    }

    return {
        observe,
        remember,
        learn,
        recall,
        getFacts,
        getWorkingMemory,
        summarize,
        forget,
        clear,
        snapshot,
    };
}
