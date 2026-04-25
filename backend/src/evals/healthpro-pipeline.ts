import { findSimilarKnowledgeBase } from '../services/vectorSearchService';
import { generateAIResponse } from '../services/llmService';
import { EvalQuestion } from './dataset';

export interface PipelineResult {
  id: string;
  question: string;
  answer: string;           // "FALLBACK" sentinel when usedContext=false
  contexts: string[];       // retrieved chunk texts (empty on fallback)
  ground_truth: string;
  should_fallback: boolean;
  is_fallback: boolean;
}

export async function runHealthProPipeline(q: EvalQuestion): Promise<PipelineResult> {
  const matches = await findSimilarKnowledgeBase(q.question, 5);
  const response = await generateAIResponse(q.question, matches);

  const isFallback = !response.usedContext;

  return {
    id: q.id,
    question: q.question,
    answer: isFallback ? 'FALLBACK' : response.content,
    contexts: isFallback ? [] : matches.map((m) => m.content),
    ground_truth: q.ground_truth,
    should_fallback: q.should_fallback,
    is_fallback: isFallback,
  };
}
