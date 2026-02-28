import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database';

export async function vote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { answerId, voteType } = req.body;
    const voterIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!answerId || !voteType) {
      res.status(400).json({ error: { message: 'answerId and voteType are required' } });
      return;
    }

    if (!['upvote', 'downvote'].includes(voteType)) {
      res.status(400).json({ error: { message: 'voteType must be "upvote" or "downvote"' } });
      return;
    }

    // Check if answer exists
    const answer = await queryOne<{ id: string; upvotes: number; downvotes: number }>(
      'SELECT id, upvotes, downvotes FROM answers WHERE id = $1',
      [answerId]
    );

    if (!answer) {
      res.status(404).json({ error: { message: 'Answer not found' } });
      return;
    }

    // Check for existing vote
    const existingVote = await queryOne<{ id: string; vote_type: string }>(
      'SELECT id, vote_type FROM votes WHERE answer_id = $1 AND voter_ip = $2',
      [answerId, voterIp]
    );

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove vote (toggle off)
        await query('DELETE FROM votes WHERE id = $1', [existingVote.id]);

        // Update answer vote count
        const column = voteType === 'upvote' ? 'upvotes' : 'downvotes';
        await query(
          `UPDATE answers SET ${column} = ${column} - 1 WHERE id = $1`,
          [answerId]
        );

        const updated = await queryOne<{ upvotes: number; downvotes: number }>(
          'SELECT upvotes, downvotes FROM answers WHERE id = $1',
          [answerId]
        );

        res.json({ message: 'Vote removed', ...updated });
        return;
      } else {
        // Change vote
        await query(
          'UPDATE votes SET vote_type = $1 WHERE id = $2',
          [voteType, existingVote.id]
        );

        // Update answer vote counts
        const increment = voteType === 'upvote' ? 'upvotes' : 'downvotes';
        const decrement = voteType === 'upvote' ? 'downvotes' : 'upvotes';
        await query(
          `UPDATE answers SET ${increment} = ${increment} + 1, ${decrement} = ${decrement} - 1 WHERE id = $1`,
          [answerId]
        );

        const updated = await queryOne<{ upvotes: number; downvotes: number }>(
          'SELECT upvotes, downvotes FROM answers WHERE id = $1',
          [answerId]
        );

        res.json({ message: 'Vote changed', ...updated });
        return;
      }
    }

    // Create new vote
    await query(
      'INSERT INTO votes (answer_id, voter_ip, vote_type) VALUES ($1, $2, $3)',
      [answerId, voterIp, voteType]
    );

    // Update answer vote count
    const column = voteType === 'upvote' ? 'upvotes' : 'downvotes';
    await query(
      `UPDATE answers SET ${column} = ${column} + 1 WHERE id = $1`,
      [answerId]
    );

    const updated = await queryOne<{ upvotes: number; downvotes: number }>(
      'SELECT upvotes, downvotes FROM answers WHERE id = $1',
      [answerId]
    );

    res.json({ message: 'Vote recorded', ...updated });
  } catch (error) {
    next(error);
  }
}
