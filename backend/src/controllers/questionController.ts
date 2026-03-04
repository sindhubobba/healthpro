import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database';
import {
  findSimilarQuestions,
  findSimilarKnowledgeBase,
  storeQuestionEmbedding,
  storeAnswerEmbedding,
} from '../services/vectorSearchService';
import { generateAIResponse } from '../services/llmService';

interface Question {
  id: string;
  user_id: string | null;
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
  attribution_type: string | null;
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

    const answers = await query<Answer & { experts: any[] }>(
      `SELECT
        a.*,
        CASE WHEN a.expert_ids IS NOT NULL AND array_length(a.expert_ids, 1) > 0 THEN
          (SELECT json_agg(json_build_object(
            'id', p.id,
            'name', p.name,
            'credentials', p.credentials,
            'specialty', p.specialty,
            'institution', p.institution
          ))
          FROM professionals p
          WHERE p.id = ANY(a.expert_ids))
        ELSE NULL END as experts
       FROM answers a
       WHERE a.question_id = $1
       ORDER BY a.is_ai_generated DESC, (a.upvotes - a.downvotes) DESC, a.created_at ASC`,
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
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: { message: 'Authentication required' } });
      return;
    }

    if (!title || !content) {
      res.status(400).json({ error: { message: 'Title and content are required' } });
      return;
    }

    if (!authorName || typeof authorName !== 'string' || !authorName.trim()) {
      res.status(400).json({ error: { message: 'Author name is required' } });
      return;
    }

    // Create the question
    const question = await queryOne<Question>(
      `INSERT INTO questions (user_id, title, content, author_name, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, title, content, authorName.trim(), tags || []]
    );

    if (!question) {
      throw new Error('Failed to create question');
    }

    const questionText = `${title}\n${content}`;

    // Search for similar questions (for duplicate detection / showing related)
    const similarQuestions = await findSimilarQuestions(questionText, question.id);

    // Search knowledge base for RAG context
    const knowledgeMatches = await findSimilarKnowledgeBase(questionText);

    // Generate AI response using knowledge base as context
    const aiResponse = await generateAIResponse(questionText, knowledgeMatches);

    // Extract expert IDs for storage
    const expertIds = aiResponse.experts.map((e) => e.id);

    // Store AI answer with proper attribution
    const aiAnswer = await queryOne<Answer>(
      `INSERT INTO answers (question_id, content, is_ai_generated, ai_source, attribution_type, source_message_ids, expert_ids)
       VALUES ($1, $2, true, $3, $4, $5, $6)
       RETURNING *`,
      [
        question.id,
        aiResponse.content,
        aiResponse.source,
        aiResponse.attributionType,
        aiResponse.sourceMessageIds,
        expertIds,
      ]
    );

    // TEMPORARILY DISABLED - uncomment when RAG debugging is complete
    // Store embeddings for future searches (async, don't wait)
    // storeQuestionEmbedding(question.id, questionText).catch((err) =>
    //   console.error('Failed to store question embedding:', err)
    // );

    // if (aiAnswer) {
    //   storeAnswerEmbedding(aiAnswer.id, aiResponse.content).catch((err) =>
    //     console.error('Failed to store AI answer embedding:', err)
    //   );
    // }

    res.status(201).json({
      question,
      aiAnswer,
      usedContext: aiResponse.usedContext,
      attributionType: aiResponse.attributionType,
      experts: aiResponse.experts,
      similarQuestions: similarQuestions.slice(0, 3), // Return top 3 similar questions
      knowledgeMatchesCount: knowledgeMatches.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuestion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Check if question exists
    const question = await queryOne<Question>(
      'SELECT * FROM questions WHERE id = $1',
      [id]
    );

    if (!question) {
      res.status(404).json({ error: { message: 'Question not found' } });
      return;
    }

    // Delete the question (answers will be deleted via CASCADE)
    await query('DELETE FROM questions WHERE id = $1', [id]);

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    next(error);
  }
}
