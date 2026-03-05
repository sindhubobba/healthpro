import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env';
import { KnowledgeBaseMatch } from './vectorSearchService';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
  timeout: 120000,
});

export interface AIResponse {
  content: string;
  source: 'anthropic';
  usedContext: boolean;
  sourceMessageIds: string[];
  attributionType: 'expert' | 'ai_only';
  experts: Array<{
    id: string;
    name: string;
    credentials: string;
    specialty: string;
    institution: string;
  }>;
}

interface JudgeResult {
  sufficient: boolean;
  reason: string;
}

const SYSTEM_PROMPT = `
<system_instructions>
  You are a medical AI assistant helping health professionals find answers to their clinical questions.
  Your answers must strictly follow the rules below.

  <rules>
    <rule id="1" condition="context_available">
      Answer ONLY using the information within the <context> tags.
      Do not supplement, infer beyond, or mix in outside knowledge.
      If the context partially answers the question, use only what is available
      and explicitly state what remains unanswered.
    </rule>

    <rule id="2">
      Never mix context-based answers with general knowledge.
      Context always takes full priority when present.
      Never generate medical advice from your own training data.
    </rule>
  </rules>
</system_instructions>


<context>
{{RAG_CONTEXT}}
</context>


<user_query>
  {{USER_QUESTION}}
</user_query>


<output_format>
  Write your entire response as natural, flowing conversation. No tags,
  no headers, no bullet labels unless the content genuinely calls for a list.

  Answer conversationally from the context. Close with a note like:
  "This comes from expert knowledge captured in our system, so you can feel
  confident in this answer."
</output_format>
`;

const INSUFFICIENT_CONTEXT_MESSAGE =
  "The knowledge available in the system isn't sufficient to fully answer this question. Please wait for a health professional to respond.";

const NO_CONTEXT_MESSAGE =
  "Knowledge about this question isn't available in the system yet. Please wait for a health professional to respond.";

/**
 * Format knowledge base matches into a readable context string
 */
function formatKnowledgeMatches(knowledgeMatches: KnowledgeBaseMatch[]): string {
  if (knowledgeMatches.length === 0) return '';

  let contextSection = '';
  for (const match of knowledgeMatches) {
    const expertInfo = match.professional
      ? `[${match.professional.name}, ${match.professional.credentials} - ${match.professional.specialty}, ${match.professional.institution}]`
      : '[Medical Professional]';

    contextSection += `**${match.role}** ${expertInfo}:\n`;
    contextSection += `${match.content}\n\n`;
    contextSection += '---\n\n';
  }

  return contextSection.trim();
}

/**
 * Inject RAG context and user question into the system prompt template
 */
function buildSystemPrompt(ragContext: string, userQuestion: string): string {
  return SYSTEM_PROMPT
    .replace('{{RAG_CONTEXT}}', ragContext)
    .replace('{{USER_QUESTION}}', userQuestion);
}

/**
 * LLM-as-judge: uses gpt-4o to decide if RAG context is sufficient to answer
 * the question before invoking the answer LLM.
 */
async function judgeContextSufficiency(
  ragContext: string,
  userQuestion: string
): Promise<JudgeResult> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    max_tokens: 150,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a medical context evaluator. Decide whether the provided context contains enough information to meaningfully answer the clinical question.

Respond with JSON only: {"sufficient": true/false, "reason": "one sentence"}

Rules:
- sufficient=true only if the context directly and specifically addresses the question
- sufficient=false if context is tangential, too vague, or covers a different condition/scenario
- Do NOT answer the question itself`,
      },
      {
        role: 'user',
        content: `Question: ${userQuestion}\n\nContext:\n${ragContext}`,
      },
    ],
  });

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    return {
      sufficient: Boolean(parsed.sufficient),
      reason: parsed.reason || '',
    };
  } catch {
    console.error('[Judge] Failed to parse response, defaulting to sufficient=true');
    return { sufficient: true, reason: 'parse error' };
  }
}

/**
 * Generate answer using Anthropic claude-sonnet, strictly from RAG context
 */
async function generateWithAnthropic(
  userQuestion: string,
  ragContext: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(ragContext, userQuestion);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userQuestion }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}

export async function generateAIResponse(
  question: string,
  knowledgeMatches: KnowledgeBaseMatch[]
): Promise<AIResponse> {
  const sourceMessageIds = knowledgeMatches.map((m) => m.messageId);

  const expertsMap = new Map<string, AIResponse['experts'][0]>();
  for (const match of knowledgeMatches) {
    if (match.professional && !expertsMap.has(match.professional.id)) {
      expertsMap.set(match.professional.id, match.professional);
    }
  }
  const experts = Array.from(expertsMap.values());
  const attributionType = experts.length > 0 ? 'expert' : 'ai_only';

  const ragContext = formatKnowledgeMatches(knowledgeMatches);

  // Step 1: No RAG matches — skip LLM entirely
  if (!ragContext) {
    console.log('[LLM] No RAG context, returning static message');
    return {
      content: NO_CONTEXT_MESSAGE,
      source: 'anthropic',
      usedContext: false,
      sourceMessageIds: [],
      attributionType: 'ai_only',
      experts: [],
    };
  }

  // Step 2: Judge — is the context sufficient to answer?
  console.log('[LLM] Step 1: Calling judge (gpt-4o)...');
  const judgeResult = await judgeContextSufficiency(ragContext, question);
  console.log(`[LLM] Judge result: sufficient=${judgeResult.sufficient}, reason="${judgeResult.reason}"`);

  if (!judgeResult.sufficient) {
    return {
      content: INSUFFICIENT_CONTEXT_MESSAGE,
      source: 'anthropic',
      usedContext: false,
      sourceMessageIds: [],
      attributionType: 'ai_only',
      experts: [],
    };
  }

  // Step 3: Context is sufficient — generate answer with Anthropic
  console.log('[LLM] Step 2: Calling Anthropic for answer...');
  const content = await generateWithAnthropic(question, ragContext);
  console.log('[LLM] Anthropic response received, length:', content.length);

  return {
    content,
    source: 'anthropic',
    usedContext: true,
    sourceMessageIds,
    attributionType,
    experts,
  };
}
