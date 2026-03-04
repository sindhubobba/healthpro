import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env';
import { KnowledgeBaseMatch } from './vectorSearchService';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
  timeout: 120000, // 120 second timeout (2 minutes)
});

export interface AIResponse {
  content: string;
  source: 'openai' | 'anthropic' | 'openai+anthropic';
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

const SYSTEM_PROMPT = `

<system_instructions>
  You are a knowledgeable medical AI assistant helping health professionals find answers to their clinical and medical questions.
  Your answers must strictly follow the rules defined below based on whether context is available or not.

  <rules>
    <rule id="1" condition="context_available">
      Answer ONLY using the information within the <context> tags.
      Do not supplement, infer beyond, or mix in outside knowledge.
      If the context partially answers the question, use only what is available
      and explicitly state what remains unanswered.
    </rule>

    <rule id="2" condition="context_insufficient">
      If the <context> block exists but lacks enough information to answer,
      respond with:
      "The provided context does not contain sufficient information to answer 
      this question." 
      Do not attempt to fill gaps with general knowledge.
    </rule>

    <rule id="3" condition="no_context">
      If no <context> block is provided, or it is empty, answer using your 
      general knowledge as a frontier language model.
      Always prefix your response with:
      "[General Knowledge]" 
      to signal that no retrieved context was used.
    </rule>

    <rule id="4">
      Never mix context-based answers with general knowledge.
      Context always takes full priority when present.
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

  If context was used:
  - Answer conversationally from the context
  - Close with a note like: "This comes from expert knowledge captured in our 
    system, so you can feel confident in this answer."

  If no context was provided:
  - Open with a clear, friendly disclaimer that this is AI general knowledge, 
    not from any expert or specialist in the system
  - Then answer naturally

  If context was present but insufficient:
  - Conversationally let the user know the expert knowledge base didn't have 
    enough to fully answer, and suggest they reach out to a specialist
</output_format>


`;

/**
 * Format knowledge base matches into a readable context string
 */
function formatKnowledgeMatches(knowledgeMatches: KnowledgeBaseMatch[]): string {
  if (knowledgeMatches.length === 0) {
    return '';
  }

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
 * Inject dynamic variables into the system prompt template
 */
function buildSystemPrompt(ragContext: string, userQuestion: string): string {
  return SYSTEM_PROMPT
    .replace('{{RAG_CONTEXT}}', ragContext || '')
    .replace('{{USER_QUESTION}}', userQuestion);
}

async function generateWithOpenAI(
  userQuestion: string,
  ragContext: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(ragContext, userQuestion);

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuestion },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content || '';
}

async function generateWithAnthropic(
  userQuestion: string,
  ragContext: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(ragContext, userQuestion);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userQuestion },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}

async function refineWithAnthropic(
  userQuestion: string,
  openaiResponse: string
): Promise<string> {
  // For refinement: RAG_CONTEXT = OpenAI's response, USER_QUESTION = original question
  const systemPrompt = buildSystemPrompt(openaiResponse, userQuestion);
  console.log('[LLM] refineWithAnthropic: System prompt length:', systemPrompt.length);
  console.log('[LLM] refineWithAnthropic: OpenAI response length:', openaiResponse.length);
  console.log('[LLM] refineWithAnthropic: Calling Anthropic API...');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      { role: 'user', content: 'Please review and refine the response in the context for medical accuracy, completeness, and clarity. Output only the refined response.' },
    ],
  });

  console.log('[LLM] refineWithAnthropic: Anthropic response received');
  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}

export async function generateAIResponse(
  question: string,
  knowledgeMatches: KnowledgeBaseMatch[]
): Promise<AIResponse> {
  const usedContext = knowledgeMatches.length > 0;
  const sourceMessageIds = knowledgeMatches.map((m) => m.messageId);

  // Extract unique experts from knowledge matches
  const expertsMap = new Map<string, AIResponse['experts'][0]>();
  for (const match of knowledgeMatches) {
    if (match.professional && !expertsMap.has(match.professional.id)) {
      expertsMap.set(match.professional.id, match.professional);
    }
  }
  const experts = Array.from(expertsMap.values());
  const attributionType = experts.length > 0 ? 'expert' : 'ai_only';

  // Format knowledge matches into RAG context string
  const ragContext = formatKnowledgeMatches(knowledgeMatches);

  // Step 1: Try to generate with OpenAI
  // RAG_CONTEXT = knowledge base matches, USER_QUESTION = posted question
  let openaiResponse: string | null = null;
  try {
    console.log('[LLM] Step 1: Calling OpenAI...');
    openaiResponse = await generateWithOpenAI(question, ragContext);
    console.log('[LLM] OpenAI response received, length:', openaiResponse?.length || 0);
  } catch (openaiError) {
    console.error('[LLM] OpenAI failed:', openaiError);
  }

  // Step 2: If OpenAI succeeded, refine with Anthropic
  // RAG_CONTEXT = OpenAI response, USER_QUESTION = posted question
  if (openaiResponse) {
    try {
      console.log('[LLM] Step 2: Calling Anthropic for refinement...');
      const refinedContent = await refineWithAnthropic(question, openaiResponse);
      console.log('[LLM] Anthropic refinement complete, length:', refinedContent?.length || 0);
      return {
        content: refinedContent,
        source: 'openai+anthropic',
        usedContext,
        sourceMessageIds,
        attributionType,
        experts,
      };
    } catch (anthropicError) {
      // Anthropic refinement failed, return OpenAI's unrefined response
      console.error('[LLM] Anthropic refinement failed:', anthropicError);
      return {
        content: openaiResponse,
        source: 'openai',
        usedContext,
        sourceMessageIds,
        attributionType,
        experts,
      };
    }
  }

  // Step 3: OpenAI failed, try Anthropic alone
  // RAG_CONTEXT = knowledge base matches, USER_QUESTION = posted question
  try {
    console.log('[LLM] Step 3: OpenAI failed, calling Anthropic as fallback...');
    const content = await generateWithAnthropic(question, ragContext);
    console.log('[LLM] Anthropic fallback complete, length:', content?.length || 0);
    return {
      content,
      source: 'anthropic',
      usedContext,
      sourceMessageIds,
      attributionType,
      experts,
    };
  } catch (anthropicError) {
    console.error('[LLM] Anthropic also failed:', anthropicError);
    throw new Error('Both AI providers failed to generate a response');
  }
}
