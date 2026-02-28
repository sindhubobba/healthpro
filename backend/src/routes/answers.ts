import { Router } from 'express';
import { createAnswer, getAnswers } from '../controllers/answerController';

const router = Router();

router.post('/', createAnswer);
router.get('/question/:questionId', getAnswers);

export default router;
