import { Router } from 'express';
import { listQuestions, getQuestion, createQuestion, deleteQuestion } from '../controllers/questionController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', listQuestions);
router.get('/:id', getQuestion);
router.post('/', authenticate, createQuestion);
router.delete('/:id', deleteQuestion);

export default router;
