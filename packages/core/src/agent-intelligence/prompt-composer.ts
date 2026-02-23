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

// ─── Prompt Template Registry ────────────────────────────────

/**
 * Prompt templates keyed by tier and NPC type.
 *
 * In production deployment, these are loaded from the `prompts/system/`
 * directory at startup. The PromptRegistry abstraction allows test
 * environments to inject templates without filesystem access.
 */
export interface PromptRegistry {
  getTemplate(tier: TierType, npcType: string): string;
}

/**
 * Default prompt registry that reads from the `prompts/system/` directory.
 *
 * Template selection logic:
 *   Tier 1 → `prompts/system/tier1-companion.md`
 *   Tier 2 → `prompts/system/tier2-immersion-npc.md`
 *   Tier 3 → `prompts/system/tier3-authority.md`
 */
const TIER_PROMPT_MAP: Record<TierType, string> = {
  1: 'tier1-companion',
  2: 'tier2-immersion-npc',
  3: 'tier3-authority',
};

/**
 * In-memory prompt registry — templates injected at initialization.
 *
 * Precondition: `init()` must be called before any `composePrompt()` calls.
 * Postcondition: Registry contains at least one template per tier.
 */
export class InMemoryPromptRegistry implements PromptRegistry {
  private readonly templates = new Map<string, string>();

  register(tier: TierType, npcType: string, template: string): void {
    this.templates.set(`${tier}:${npcType}`, template);
  }

  getTemplate(tier: TierType, npcType: string): string {
    const key = `${tier}:${npcType}`;
    const template = this.templates.get(key);
    if (template) return template;

    // Fallback to tier-level default
    const fallbackKey = `${tier}:${TIER_PROMPT_MAP[tier]}`;
    const fallback = this.templates.get(fallbackKey);
    if (fallback) return fallback;

    return `You are a Tier ${tier} NPC with role: ${npcType}. Respond in character.`;
  }
}

/** Module-level registry — set via `initPromptRegistry()` */
let activeRegistry: PromptRegistry = new InMemoryPromptRegistry();

/**
 * Initialize the prompt registry with loaded templates.
 *
 * Called once at application startup after reading prompt files from disk.
 */
export function initPromptRegistry(registry: PromptRegistry): void {
  activeRegistry = registry;
}

// ─── Prompt Composition ──────────────────────────────────────

/**
 * Compose a complete 4-layer NPC prompt.
 *
 * @precondition Prompt registry must be initialized via `initPromptRegistry()`
 * @precondition `schema.persona.id` must be a valid persona identifier
 * @postcondition Returns a ComposedPrompt with all 4 layers merged
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
 *
 * Retrieves the template from the active PromptRegistry and performs
 * variable substitution with NPC configuration values.
 *
 * Template variables:
 *   {{NPC_NAME}} — NPC display name
 *   {{NPC_ROLE}} — NPC's professional / social role
 *   {{NPC_PERSONALITY}} — Personality description
 *   {{NPC_REGISTER}} — Expected register level
 *   {{VOCABULARY_FOCUS}} — Comma-separated vocabulary domains
 */
function loadBasePrompt(tier: TierType, npcConfig: NPCConfig): string {
  const template = activeRegistry.getTemplate(tier, npcConfig.role);

  return template
    .replace(/\{\{NPC_NAME\}\}/g, npcConfig.name)
    .replace(/\{\{NPC_ROLE\}\}/g, npcConfig.role)
    .replace(/\{\{NPC_PERSONALITY\}\}/g, npcConfig.personality)
    .replace(/\{\{NPC_REGISTER\}\}/g, npcConfig.register)
    .replace(/\{\{VOCABULARY_FOCUS\}\}/g, npcConfig.vocabulary_focus.join(', '));
}

/**
 * Extract relevant context from the Persona Schema for prompt injection.
 *
 * Generates a structured context block containing:
 * - Domain vocabulary and cultural parameters
 * - Environment description for the active tier
 * - NPC-specific context from the roster
 * - Cultural norms governing interaction
 */
function extractSchemaContext(
  schema: PersonaSchema,
  tier: TierType,
  npcConfig: NPCConfig
): string {
  const persona = schema.persona;
  const sections: string[] = [];

  // Domain context
  sections.push(`## Domain Context
- Domain: ${persona.learner_profile.domain}
- Learner L1: ${persona.learner_profile.native_language}
- Target L2: ${persona.learner_profile.target_languages.join(', ')}
- Proficiency: ${persona.learner_profile.proficiency_baseline}
- Objective: ${persona.learner_profile.objective}`);

  // Vocabulary matrix
  if (persona.vocabulary_matrix) {
    sections.push(`## Priority Vocabulary Domains
${persona.vocabulary_matrix.priority_domains.map(d => `- ${d}`).join('\n')}${persona.vocabulary_matrix.excluded_generic
        ? `\n\n### Excluded Generic Terms\n${persona.vocabulary_matrix.excluded_generic.map(t => `- ${t}`).join('\n')}`
        : ''
      }`);
  }

  // Tier-specific environment
  if (tier === 2 && persona.environment.tier_2) {
    const t2 = persona.environment.tier_2;
    sections.push(`## Tier 2 Environment
- Setting: ${t2.setting}
- Locations: ${t2.locations.map(l => typeof l === 'string' ? l : l.name).join(', ')}`);

    if (t2.cultural_parameters) {
      const cp = t2.cultural_parameters;
      sections.push(`## Cultural Parameters
- Greeting norms: ${cp.greeting_norms ?? 'standard'}
- Formality level: ${cp.formality_level ?? 'standard'}
- Taboo topics: ${cp.taboo_topics?.join(', ') ?? 'none specified'}`);
    }

    // NPC roster context for this specific NPC
    if (t2.npc_roster) {
      const rosterEntry = t2.npc_roster.find(n => n.role === npcConfig.role);
      if (rosterEntry) {
        sections.push(`## Your NPC Profile (from schema)
- Role: ${rosterEntry.role}
- Register: ${rosterEntry.register}
- Personality: ${rosterEntry.personality ?? npcConfig.personality}
- Vocabulary focus: ${rosterEntry.vocabulary_focus?.join(', ') ?? 'general'}`);
      }
    }
  }

  if (tier === 3 && persona.environment.tier_3) {
    const scenarios = persona.environment.tier_3.scenarios;
    const matchingScenario = scenarios.find(s => s.authority === npcConfig.role);
    if (matchingScenario) {
      sections.push(`## Tier 3 Scenario
- Type: ${matchingScenario.type}
- Stakes: ${matchingScenario.stakes}
- Authority role: ${matchingScenario.authority}
${matchingScenario.description ? `- Description: ${matchingScenario.description}` : ''}`);

      if (matchingScenario.evaluation_weight) {
        const w = matchingScenario.evaluation_weight;
        sections.push(`## Evaluation Weights
- Linguistic Accuracy: ${w.linguistic_accuracy}
- Pragmatic Appropriateness: ${w.pragmatic_appropriateness}
- Register Alignment: ${w.register_alignment}
- Cultural Intelligence: ${w.cultural_intelligence}`);
      }
    }
  }

  // Companion context for Tier 1
  if (tier === 1 && persona.companion) {
    sections.push(`## Companion Profile
- Personality: ${persona.companion.personality}
- Shared interests: ${persona.companion.shared_interests.join(', ')}
- Cultural bridge: ${persona.companion.cultural_bridge}`);
  }

  return sections.join('\n\n');
}

/**
 * Format session context for prompt injection.
 *
 * Includes relationship history, forward injection directives,
 * and social reputation data.
 */
function formatSessionContext(context: SessionContext): string {
  const sections: string[] = [];

  sections.push(`## Session Context
- Session: ${context.sessionId}
- Learner: ${context.learnerId}
- Code-switch ratio: ${(context.codeSwitchRatio * 100).toFixed(0)}% L2
- Social reputation: ${context.socialReputation.toFixed(2)}`);

  // Relationship history
  if (context.npcRelationshipHistory) {
    sections.push(`## Relationship History
${context.npcRelationshipHistory}`);
  }

  // Forward injection — invisible to learner, visible to NPC
  if (context.forwardInjectionDirectives.length > 0) {
    sections.push(`## FORWARD INJECTION DIRECTIVES (invisible to learner)
These are learning targets you must naturally embed in the conversation.
Do NOT explicitly teach these — create situations where the learner must use them.

${context.forwardInjectionDirectives.map((d, i) => `${i + 1}. Target: ${d.targetForm}
   Type: ${d.frictionType}
   Method: ${d.injectionMethod}
   Constraint: ${d.constraint}`).join('\n')}`);
  }

  // Upcoming challenges
  if (context.upcomingChallenges.length > 0) {
    sections.push(`## Upcoming Challenges
${context.upcomingChallenges.map(c => `- ${c}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Format real-time interaction state for prompt injection.
 *
 * Includes current interlanguage assessment, emotional state,
 * and active scaffolding triggers.
 */
function formatRealTimeState(state: RealTimeState): string {
  const sections: string[] = [];

  sections.push(`## Real-Time State (Turn ${state.currentTurn})
- Last utterance: "${state.lastUtterance}"
- Detected emotional state: ${state.detectedEmotionalState}
- Learner confidence: ${(state.interlanguageAssessment.currentConfidence * 100).toFixed(0)}%
- Recent friction count: ${state.interlanguageAssessment.recentFrictionCount}`);

  // Interlanguage errors
  if (state.interlanguageAssessment.systematicErrors.length > 0) {
    sections.push(`## Detected Interlanguage Patterns
${state.interlanguageAssessment.systematicErrors.map(e =>
      `- [${e.type}] "${e.pattern}" (frequency: ${e.frequency})`
    ).join('\n')}`);
  }

  // Scaffolding triggers
  if (state.activeScaffoldingTriggers.length > 0) {
    sections.push(`## Active Scaffolding Triggers
${state.activeScaffoldingTriggers.map(t => `- ${t}`).join('\n')}

If the learner shows signs of difficulty, use scaffolding strategies
appropriate to these triggers. Reduce complexity, offer choices,
or recast the learner's utterance in correct form.`);
  }

  // Emotional state guidance
  if (state.detectedEmotionalState === 'frustrated' || state.detectedEmotionalState === 'anxious') {
    sections.push(`## ⚠️ AFFECTIVE FILTER ALERT
The learner appears ${state.detectedEmotionalState}. PRIORITY: reduce pressure.
- Shorten your responses
- Increase warmth and encouragement
- Accept approximations
- Do NOT correct errors explicitly right now
- If Tier 1: increase L1 code-switching temporarily`);
  }

  return sections.join('\n\n');
}
