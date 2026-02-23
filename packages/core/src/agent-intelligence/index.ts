/**
 * @module agent-intelligence
 *
 * Agent Intelligence — the prompt composition and NPC reasoning layer.
 *
 * Exports:
 *   - composePrompt: 4-layer NPC prompt composer
 *   - initPromptRegistry: Initialize prompt template source
 *   - InMemoryPromptRegistry: In-memory template storage
 *   - PromptRegistry: Interface for template sources
 */

export {
    composePrompt,
    initPromptRegistry,
    InMemoryPromptRegistry,
} from './prompt-composer';

export type { PromptRegistry } from './prompt-composer';
