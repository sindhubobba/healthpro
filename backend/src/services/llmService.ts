import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env';
import { SimilarAnswer } from './vectorSearchService';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

export interface AIResponse {
  content: string;
  source: 'openai' | 'anthropic' | 'openai+anthropic';
  usedContext: boolean;
  sourceAnswerIds: string[];
}

const SYSTEM_PROMPT = `
#Instructions
You are a knowledgeable medical AI assistant helping health professionals find answers to their clinical and medical questions.

#Rules
- Provide accurate, evidence-based information
- Cite sources or guidelines when relevant
- Acknowledge uncertainty when appropriate
- Encourage consultation with specialists for complex cases
- Be concise but thorough
- Do not include any other text than the answer to the question
- Do not hallucinate information
- Do not make up information
- Use professional medical terminology appropriately`;

function buildPromptWithContext(
  question: string,
  similarAnswers: SimilarAnswer[]
): string {
  if (similarAnswers.length === 0) {
    return question;
  }

  let contextSection = 'Here are relevant answers from our knowledge base that may help:\n\n';

  for (const answer of similarAnswers) {
    const source = answer.is_ai_generated ? '[AI Response]' : '[Professional Response]';
    const author = answer.author_name ? ` by ${answer.author_name}` : '';
    contextSection += `**Related Question:** ${answer.question_title}\n`;
    contextSection += `${source}${author} (Score: +${answer.upvotes}/-${answer.downvotes}):\n`;
    contextSection += `${answer.content}\n\n`;
    contextSection += '---\n\n';
  }

  return `${contextSection}\nBased on the above context and your medical knowledge, please answer the following question:\n\n${question}`;
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content || '';
}

async function generateWithAnthropic(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}

const REFINEMENT_SYSTEM_PROMPT = `You are a medical accuracy reviewer. Your task is to review and refine a medical response for accuracy, completeness, and clarity.

Guidelines for refinement:
- Correct any medical inaccuracies or outdated information
- Add important missing information that health professionals should know
- Improve clarity while maintaining professional terminology
- Ensure evidence-based recommendations are properly emphasized
- Add appropriate caveats or contraindications if missing
- Keep the response concise but thorough

Output only the refined response, do not include meta-commentary about your changes.`;

async function refineWithAnthropic(
  originalQuestion: string,
  openaiResponse: string
): Promise<string> {
  const refinementPrompt = `Original question from a health professional:
${originalQuestion}

Initial AI response to review and refine:
${openaiResponse}

Please review this response for medical accuracy and completeness, then provide a refined version.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1500,
    system: REFINEMENT_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: refinementPrompt },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}

export async function generateAIResponse(
  question: string,
  similarAnswers: SimilarAnswer[]
): Promise<AIResponse> {
  const usedContext = similarAnswers.length > 0;
  const sourceAnswerIds = similarAnswers.map((a) => a.id);
  const prompt = buildPromptWithContext(question, similarAnswers);

  // Step 1: Try to generate with OpenAI
  let openaiResponse: string | null = null;
  try {
    openaiResponse = await generateWithOpenAI(prompt);
  } catch (openaiError) {
    console.error('OpenAI failed:', openaiError);
  }

  // Step 2: If OpenAI succeeded, refine with Anthropic
  if (openaiResponse) {
    try {
      const refinedContent = await refineWithAnthropic(question, openaiResponse);
      return {
        content: refinedContent,
        source: 'openai+anthropic',
        usedContext,
        sourceAnswerIds,
      };
    } catch (anthropicError) {
      // Anthropic refinement failed, return OpenAI's unrefined response
      console.error('Anthropic refinement failed, using OpenAI response:', anthropicError);
      return {
        content: openaiResponse,
        source: 'openai',
        usedContext,
        sourceAnswerIds,
      };
    }
  }

  // Step 3: OpenAI failed, try Anthropic alone
  try {
    const content = await generateWithAnthropic(prompt);
    return {
      content,
      source: 'anthropic',
      usedContext,
      sourceAnswerIds,
    };
  } catch (anthropicError) {
    console.error('Anthropic also failed:', anthropicError);
    throw new Error('Both AI providers failed to generate a response');
  }
}
