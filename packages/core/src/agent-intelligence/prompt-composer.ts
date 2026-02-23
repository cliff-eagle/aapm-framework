/**
 * AAPM Prompt Composer
 *
 * Composes the 4-layer NPC prompt stack from:
 *   Layer 1: Base System Prompt (from prompts/system/)
 *   Layer 2: Persona Schema Injection (from active schema)
 *   Layer 3: Session Context (from persistence layer)
 *   Layer 4: Real-Time State (from current interaction)
 *
 * @module agent-intelligence/prompt-composer
 */

import type {
  PersonaSchema,
  SessionContext,
  RealTimeState,
  ComposedPrompt,
  TierType,
  NPCConfig,
} from '../types';

/**
 * Compose a complete 4-layer NPC prompt.
 *
 * @param tier - Which tier (1, 2, or 3)
 * @param npcConfig - NPC role, personality, register
 * @param schema - Active Persona Schema
 * @param sessionContext - Session-level context from persistence layer
 * @param realTimeState - Current interaction state
 * @returns Fully composed prompt ready for LLM inference
 */
export function composePrompt(
  tier: TierType,
  npcConfig: NPCConfig,
  schema: PersonaSchema,
  sessionContext: SessionContext,
  realTimeState: RealTimeState
): ComposedPrompt {
  // Layer 1: Base System Prompt
  const basePrompt = loadBasePrompt(tier, npcConfig);

  // Layer 2: Persona Schema Injection
  const schemaContext = extractSchemaContext(schema, tier, npcConfig);

  // Layer 3: Session Context
  const sessionData = formatSessionContext(sessionContext);

  // Layer 4: Real-Time State
  const liveState = formatRealTimeState(realTimeState);

  return {
    system: [basePrompt, schemaContext, sessionData, liveState].join('\n\n---\n\n'),
    tier,
    npcId: npcConfig.id,
    metadata: {
      schemaId: schema.persona.id,
      l2Ratio: sessionContext.codeSwitchRatio,
      reputationScore: sessionContext.socialReputation,
      forwardInjection: sessionContext.forwardInjectionDirectives,
    },
  };
}

/**
 * Load the base system prompt template for a given tier and NPC type.
 */
function loadBasePrompt(tier: TierType, npcConfig: NPCConfig): string {
  // TODO: Load from prompts/system/tier{n}-{type}.md
  // Template variable substitution with NPC config
  throw new Error('Not implemented — load from prompts/system/ directory');
}

/**
 * Extract relevant context from the Persona Schema for prompt injection.
 */
function extractSchemaContext(
  schema: PersonaSchema,
  tier: TierType,
  npcConfig: NPCConfig
): string {
  // TODO: Extract domain vocabulary, cultural parameters,
  // environment description, and NPC-specific context from schema
  throw new Error('Not implemented');
}

/**
 * Format session context for prompt injection.
 * Includes relationship history, forward injection directives,
 * and social reputation data.
 */
function formatSessionContext(context: SessionContext): string {
  // TODO: Query persistence layer, format relationship summary,
  // inject forward injection directives
  throw new Error('Not implemented');
}

/**
 * Format real-time interaction state for prompt injection.
 * Includes current interlanguage assessment and scaffolding triggers.
 */
function formatRealTimeState(state: RealTimeState): string {
  // TODO: Format current turn data, interlanguage assessment,
  // active scaffolding triggers
  throw new Error('Not implemented');
}
