import { Router } from 'express';
import { listQuestions, getQuestion, createQuestion } from '../controllers/questionController';

const router = Router();

router.get('/', listQuestions);
router.get('/:id', getQuestion);
router.post('/', createQuestion);

export default router;
