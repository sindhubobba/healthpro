import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database';
import { storeAnswerEmbedding } from '../services/vectorSearchService';

interface Answer {
  id: string;
  question_id: string;
  author_name: string | null;
  content: string;
  is_ai_generated: boolean;
  upvotes: number;
  downvotes: number;
  created_at: Date;
}

export async function createAnswer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { questionId, content, authorName } = req.body;

    if (!questionId || !content) {
      res.status(400).json({ error: { message: 'questionId and content are required' } });
      return;
    }

    // Verify question exists
    const question = await queryOne(
      'SELECT id FROM questions WHERE id = $1',
      [questionId]
    );

    if (!question) {
      res.status(404).json({ error: { message: 'Question not found' } });
      return;
    }

    const answer = await queryOne<Answer>(
      `INSERT INTO answers (question_id, content, author_name, is_ai_generated)
       VALUES ($1, $2, $3, false)
       RETURNING *`,
      [questionId, content, authorName || null]
    );

    // Store embedding for future RAG searches (async, don't wait)
    if (answer) {
      storeAnswerEmbedding(answer.id, content).catch((err) =>
        console.error('Failed to store answer embedding:', err)
      );
    }

    res.status(201).json({ answer });
  } catch (error) {
    next(error);
  }
}

export async function getAnswers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { questionId } = req.params;

    const answers = await query<Answer>(
      `SELECT * FROM answers
       WHERE question_id = $1
       ORDER BY is_ai_generated DESC, (upvotes - downvotes) DESC, created_at ASC`,
      [questionId]
    );

    res.json({ answers });
  } catch (error) {
    next(error);
  }
}
