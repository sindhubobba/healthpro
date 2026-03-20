import OpenAI from 'openai';
import { config } from '../config/env';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    dimensions: 1536,
    input: text,
  });

  return response.data[0].embedding;
}

export function formatEmbeddingForPgVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
