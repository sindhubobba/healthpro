import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database';
import {
  findSimilarQuestions,
  findSimilarAnswers,
  storeQuestionEmbedding,
  storeAnswerEmbedding,
} from '../services/vectorSearchService';
import { generateAIResponse } from '../services/llmService';

interface Question {
  id: string;
  author_name: string | null;
  title: string;
  content: string;
  tags: string[];
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface Answer {
  id: string;
  question_id: string;
  author_name: string | null;
  content: string;
  is_ai_generated: boolean;
  ai_source: string | null;
  upvotes: number;
  downvotes: number;
  created_at: Date;
}

export async function listQuestions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const questions = await query<Question & { answer_count: number }>(
      `SELECT q.*,
        (SELECT COUNT(*) FROM answers WHERE question_id = q.id) as answer_count
       FROM questions q
       ORDER BY q.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM questions'
    );
    const total = parseInt(totalResult?.count || '0', 10);

    res.json({
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuestion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const question = await queryOne<Question>(
      'SELECT * FROM questions WHERE id = $1',
      [id]
    );

    if (!question) {
      res.status(404).json({ error: { message: 'Question not found' } });
      return;
    }

    const answers = await query<Answer>(
      `SELECT * FROM answers
       WHERE question_id = $1
       ORDER BY is_ai_generated DESC, (upvotes - downvotes) DESC, created_at ASC`,
      [id]
    );

    res.json({ question, answers });
  } catch (error) {
    next(error);
  }
}

export async function createQuestion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, content, authorName, tags } = req.body;

    if (!title || !content) {
      res.status(400).json({ error: { message: 'Title and content are required' } });
      return;
    }

    // Create the question
    const question = await queryOne<Question>(
      `INSERT INTO questions (title, content, author_name, tags)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, content, authorName || null, tags || []]
    );

    if (!question) {
      throw new Error('Failed to create question');
    }

    const questionText = `${title}\n${content}`;

    // Search for similar questions (for duplicate detection / showing related)
    const similarQuestions = await findSimilarQuestions(questionText, question.id);

    // Search for similar answers (for RAG context)
    const similarAnswers = await findSimilarAnswers(questionText);

    // Generate AI response using similar answers as context
    const aiResponse = await generateAIResponse(questionText, similarAnswers);

    // Store AI answer
    const aiAnswer = await queryOne<Answer>(
      `INSERT INTO answers (question_id, content, is_ai_generated, ai_source, source_answer_ids)
       VALUES ($1, $2, true, $3, $4)
       RETURNING *`,
      [question.id, aiResponse.content, aiResponse.source, aiResponse.sourceAnswerIds]
    );

    // Store embeddings for future searches (async, don't wait)
    storeQuestionEmbedding(question.id, questionText).catch((err) =>
      console.error('Failed to store question embedding:', err)
    );

    if (aiAnswer) {
      storeAnswerEmbedding(aiAnswer.id, aiResponse.content).catch((err) =>
        console.error('Failed to store AI answer embedding:', err)
      );
    }

    res.status(201).json({
      question,
      aiAnswer,
      usedContext: aiResponse.usedContext,
      similarQuestions: similarQuestions.slice(0, 3), // Return top 3 similar questions
      sourceAnswersCount: similarAnswers.length,
    });
  } catch (error) {
    next(error);
  }
}
