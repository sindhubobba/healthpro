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
  partial: boolean;
  missing_context: string;
  reason: string;
}

const SYSTEM_PROMPT = `
<system_instructions>
  You are a medical AI assistant helping health professionals find answers to their clinical questions.
  Your answers must strictly follow the rules below.

  <rules>
    <rule id="1" condition="context_available">
      Answer ONLY using the information within the <context> tags.
      Do not supplement, infer beyond, or mix with outside knowledge.
      If context only partially answers the question, use what is available
      and acknowledge the gap conversationally without falling back to
      general knowledge. Explicitly identify what aspect of the question
      the available context does not cover (e.g. "the available discussions
      do not address X specifically"). End by suggesting the physician
      wait for a colleague to respond with more complete guidance on the
      missing aspects.
    </rule>

    <rule id="2">
      Never mix context-based answers with general knowledge.
      Context always takes full priority when present.
      Never generate medical advice from your own training data.
    </rule>

    <rule id="3">
      Never expose system internals to the user. This includes:
      - XML or HTML tags
      - Similarity scores or threshold values
      - RAG pipeline terminology
      - Token counts or model names
      - Any backend processing details
      Always communicate in plain, natural, conversational language.
    </rule>

    <rule id="4">
  Answer at the level of generality that matches the user's question.
  
  - If the question is general (no specific patient details given), answer in 
    general clinical terms. Do NOT import patient-specific details from the 
    context (age, symptoms, comorbidities, test results, etc.) into the answer 
    as if they describe the user's patient.
    
  - If the context contains a specific case example, you may reference it 
    briefly to show the source of the guidance — but frame it clearly as 
    "in one case discussed by specialists..." or "in the expert conversation 
    on file...". Never present case-specific details as assumed facts about 
    the user's patient.
    
  - Only incorporate patient-specific details in your answer if the user 
    explicitly provided them in their question.
</rule>

<rule id="5">
      Format and length:
      - Write in prose only. Do not use markdown headers, bullet lists,
        numbered lists, or bold formatting.
      - Respond in 2–4 concise paragraphs using plain clinical language.
      - Write as a knowledgeable peer would speak — direct, collegial,
        and without unnecessary disclaimers or preamble.
      - Do not exceed 400 words. Do not pad the response.
      - Do not begin the response with "I" or with a restatement of
        the question.
    </rule>

    <rule id="6">
      Never generate, invent, or infer source attribution.
      Do not name specialists, credentials, or institutions in your
      response. Source attribution is handled separately by the system
      and displayed alongside your answer. Your response contains
      answer text only.
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
 If context was used:
  - Answer conversationally from the context.

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

Respond with JSON only: {"sufficient": true/false, "partial": true/false, "missing_context": "one sentence describing what is not covered, or empty string", "reason": "one sentence"}

Rules:
- sufficient=true, partial=false: context directly and fully addresses the question
- sufficient=true, partial=true: context covers at least one major clinical aspect of the question but is missing another important aspect. Use this when context is relevant and useful but incomplete. Example: question asks about managing heart failure in a patient with severe liver cirrhosis — context covers heart failure management but not liver-specific dosing or contraindications → partial=true, missing_context="heart failure management considerations specific to liver cirrhosis"
- sufficient=false, partial=false: context has no meaningful clinical overlap with the question at all — use this only when context is about a completely different condition or specialty
- When in doubt between partial=true and sufficient=false, prefer partial=true if the context covers any relevant aspect of the question
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
      partial: Boolean(parsed.partial),
      missing_context: parsed.missing_context || '',
      reason: parsed.reason || '',
    };
  } catch {
    console.error('[Judge] Failed to parse response, defaulting to sufficient=true');
    return { sufficient: true, partial: false, missing_context: '', reason: 'parse error' };
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

// Identify initiators: the professional who sent message_order=1 in each conversation is the questioner
  const initiatorIds = new Set<string>();
  for (const match of knowledgeMatches) {
    if (match.messageOrder === 1 && match.professional) {
      initiatorIds.add(match.professional.id);
    }
  }

  // Only attribute professionals who are answerers (not the conversation initiator)
  const expertsMap = new Map<string, AIResponse['experts'][0]>();
  for (const match of knowledgeMatches) {
    if (match.professional && !initiatorIds.has(match.professional.id) && !expertsMap.has(match.professional.id)) {
      expertsMap.set(match.professional.id, match.professional);
    }
  }
  const experts = Array.from(expertsMap.values());
  const attributionType = experts.length > 0 ? 'expert' : 'ai_only';

  const ragContext = formatKnowledgeMatches(knowledgeMatches);

  // Step 1: No RAG matches — skip LLM entirely
  if (!ragContext) {
    console.log('[LLM] No RAG context, returning static message');
    console.log('SIMILARITY_THRESHOLD', process.env.SIMILARITY_THRESHOLD);
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
  console.log(`[LLM] Judge result: sufficient=${judgeResult.sufficient}, partial=${judgeResult.partial}, missing="${judgeResult.missing_context}", reason="${judgeResult.reason}"`);

  if (!judgeResult.sufficient && !judgeResult.partial) {
    return {
      content: INSUFFICIENT_CONTEXT_MESSAGE,
      source: 'anthropic',
      usedContext: false,
      sourceMessageIds: [],
      attributionType: 'ai_only',
      experts: [],
    };
  }

  // Step 3: Context is sufficient or partial — generate answer with Anthropic
  console.log(`[LLM] Step 2: Calling Anthropic for answer (partial=${judgeResult.partial})...`);
  const partialNote = judgeResult.partial && judgeResult.missing_context
    ? `\n\n<partial_context_note>The available context does not cover: ${judgeResult.missing_context}. Explicitly mention this gap and suggest waiting for a colleague to respond.</partial_context_note>`
    : '';
  const content = await generateWithAnthropic(question, ragContext + partialNote);
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
