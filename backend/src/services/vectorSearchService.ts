import { query } from '../config/database';
import { generateEmbedding, formatEmbeddingForPgVector } from './embeddingService';
import { config } from '../config/env';

export interface SimilarQuestion {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

export interface SimilarAnswer {
  id: string;
  question_id: string;
  question_title: string;
  content: string;
  is_ai_generated: boolean;
  author_name: string | null;
  upvotes: number;
  downvotes: number;
  similarity: number;
}

export interface KnowledgeBaseMatch {
  messageId: string;
  conversationId: string;
  content: string;
  role: string;
  similarity: number;
  professional: {
    id: string;
    name: string;
    credentials: string;
    specialty: string;
    institution: string;
  } | null;
}

export async function findSimilarQuestions(
  questionText: string,
  excludeQuestionId?: string
): Promise<SimilarQuestion[]> {
  const embedding = await generateEmbedding(questionText);
  const embeddingStr = formatEmbeddingForPgVector(embedding);

  let sql = `
    SELECT
      q.id,
      q.title,
      q.content,
      1 - (q.embedding <=> $1::vector) as similarity
    FROM questions q
    WHERE q.embedding IS NOT NULL
  `;

  const params: any[] = [embeddingStr];

  if (excludeQuestionId) {
    sql += ` AND q.id != $2`;
    params.push(excludeQuestionId);
  }

  sql += `
    ORDER BY q.embedding <=> $1::vector
    LIMIT $${params.length + 1}
  `;
  params.push(config.topKResults);

  const questions = await query<SimilarQuestion>(sql, params);

  // Filter by similarity threshold
  return questions.filter((q) => q.similarity >= config.similarityThreshold);
}

export async function findSimilarAnswers(
  questionText: string
): Promise<SimilarAnswer[]> {
  const embedding = await generateEmbedding(questionText);
  const embeddingStr = formatEmbeddingForPgVector(embedding);

  const sql = `
    SELECT
      a.id,
      a.question_id,
      q.title as question_title,
      a.content,
      a.is_ai_generated,
      a.author_name,
      a.upvotes,
      a.downvotes,
      1 - (a.embedding <=> $1::vector) as similarity
    FROM answers a
    JOIN questions q ON a.question_id = q.id
    WHERE a.embedding IS NOT NULL
    ORDER BY a.embedding <=> $1::vector
    LIMIT $2
  `;

  const answers = await query<SimilarAnswer>(sql, [embeddingStr, config.topKResults]);

  // Filter by similarity threshold
  return answers.filter((a) => a.similarity >= config.similarityThreshold);
}

export async function findSimilarKnowledgeBase(
  questionText: string,
  limit: number = 5
): Promise<KnowledgeBaseMatch[]> {
  const embedding = await generateEmbedding(questionText);
  const embeddingStr = formatEmbeddingForPgVector(embedding);

  const sql = `
    SELECT
      cm.id as message_id,
      cm.conversation_id,
      cm.content,
      cm.role,
      1 - (cm.embedding <=> $1::vector) as similarity,
      p.id as professional_id,
      p.name as professional_name,
      p.credentials,
      p.specialty,
      p.institution
    FROM conversation_messages cm
    LEFT JOIN professionals p ON cm.professional_id = p.id
    WHERE cm.embedding IS NOT NULL
    ORDER BY cm.embedding <=> $1::vector
    LIMIT $2
  `;

  const results = await query<{
    message_id: string;
    conversation_id: string;
    content: string;
    role: string;
    similarity: number;
    professional_id: string | null;
    professional_name: string | null;
    credentials: string | null;
    specialty: string | null;
    institution: string | null;
  }>(sql, [embeddingStr, limit]);

  // Filter by similarity threshold and map to interface
  return results
    .filter((row) => row.similarity >= config.similarityThreshold)
    .map((row) => ({
      messageId: row.message_id,
      conversationId: row.conversation_id,
      content: row.content,
      role: row.role,
      similarity: row.similarity,
      professional: row.professional_id
        ? {
            id: row.professional_id,
            name: row.professional_name!,
            credentials: row.credentials || '',
            specialty: row.specialty || '',
            institution: row.institution || '',
          }
        : null,
    }));
}

export async function storeQuestionEmbedding(
  questionId: string,
  questionText: string
): Promise<void> {
  const embedding = await generateEmbedding(questionText);
  const embeddingStr = formatEmbeddingForPgVector(embedding);

  await query(
    `UPDATE questions SET embedding = $1::vector WHERE id = $2`,
    [embeddingStr, questionId]
  );
}

export async function storeAnswerEmbedding(
  answerId: string,
  answerContent: string
): Promise<void> {
  const embedding = await generateEmbedding(answerContent);
  const embeddingStr = formatEmbeddingForPgVector(embedding);

  await query(
    `UPDATE answers SET embedding = $1::vector WHERE id = $2`,
    [embeddingStr, answerId]
  );
}
