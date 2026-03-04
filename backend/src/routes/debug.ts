import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { findSimilarKnowledgeBase } from '../services/vectorSearchService';
import { config } from '../config/env';

const router = Router();

// GET /api/debug/conversations - List all synthetic conversations with messages
router.get('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get all conversations with message count
    const conversations = await query<{
      id: string;
      title: string;
      specialty: string;
      sub_specialty: string | null;
      scenario_type: string;
      conditions: string[];
      guidelines_referenced: string[];
      complexity: string;
      source_type: string;
      created_at: Date;
      message_count: number;
    }>(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM conversation_messages WHERE conversation_id = c.id) as message_count
      FROM conversations c
      ORDER BY c.created_at DESC
    `);

    res.json({ conversations });
  } catch (error) {
    next(error);
  }
});

// GET /api/debug/conversations/:id - Get single conversation with all messages and professionals
router.get('/conversations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get conversation
    const conversation = await query<{
      id: string;
      title: string;
      specialty: string;
      sub_specialty: string | null;
      scenario_type: string;
      patient_demographics: Record<string, any>;
      conditions: string[];
      medications_discussed: string[];
      guidelines_referenced: string[];
      key_topics: string[];
      complexity: string;
      source_type: string;
      validation_status: string;
      created_at: Date;
    }>(`SELECT * FROM conversations WHERE id = $1`, [id]);

    if (conversation.length === 0) {
      res.status(404).json({ error: { message: 'Conversation not found' } });
      return;
    }

    // Get messages with professional details
    const messages = await query<{
      id: string;
      role: string;
      content: string;
      message_order: number;
      has_embedding: boolean;
      professional_name: string;
      professional_credentials: string;
      professional_specialty: string;
      professional_institution: string;
    }>(`
      SELECT
        cm.id,
        cm.role,
        cm.content,
        cm.message_order,
        (cm.embedding IS NOT NULL) as has_embedding,
        p.name as professional_name,
        p.credentials as professional_credentials,
        p.specialty as professional_specialty,
        p.institution as professional_institution
      FROM conversation_messages cm
      LEFT JOIN professionals p ON cm.professional_id = p.id
      WHERE cm.conversation_id = $1
      ORDER BY cm.message_order
    `, [id]);

    res.json({
      conversation: conversation[0],
      messages,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/debug/stats - Get knowledge base statistics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await query<{
      conversations_count: string;
      messages_count: string;
      messages_with_embeddings: string;
      professionals_count: string;
      specialties: string[];
    }>(`
      SELECT
        (SELECT COUNT(*) FROM conversations) as conversations_count,
        (SELECT COUNT(*) FROM conversation_messages) as messages_count,
        (SELECT COUNT(*) FROM conversation_messages WHERE embedding IS NOT NULL) as messages_with_embeddings,
        (SELECT COUNT(*) FROM professionals) as professionals_count,
        (SELECT ARRAY_AGG(DISTINCT specialty) FROM conversations) as specialties
    `);

    res.json(stats[0] || {});
  } catch (error) {
    next(error);
  }
});

// GET /api/debug/professionals - List all professionals
router.get('/professionals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const professionals = await query<{
      id: string;
      name: string;
      credentials: string;
      specialty: string;
      sub_specialty: string | null;
      institution: string;
      is_verified: boolean;
      message_count: number;
    }>(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM conversation_messages WHERE professional_id = p.id) as message_count
      FROM professionals p
      ORDER BY p.specialty, p.name
    `);

    res.json({ professionals });
  } catch (error) {
    next(error);
  }
});

// GET /api/debug/search-test - Test vector search against knowledge base
router.get('/search-test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: { message: 'Query parameter "q" is required' } });
      return;
    }

    const searchLimit = parseInt(limit as string) || 10;
    const results = await findSimilarKnowledgeBase(q, searchLimit);

    res.json({
      query: q,
      threshold: config.similarityThreshold,
      matchCount: results.length,
      results: results.map((r) => ({
        messageId: r.messageId,
        conversationId: r.conversationId,
        role: r.role,
        similarity: r.similarity.toFixed(4),
        contentPreview: r.content.substring(0, 200) + (r.content.length > 200 ? '...' : ''),
        professional: r.professional
          ? `${r.professional.name}, ${r.professional.credentials} - ${r.professional.specialty}`
          : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
