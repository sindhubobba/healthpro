import { Router } from 'express';
import { vote } from '../controllers/voteController';

const router = Router();

router.post('/', vote);

export default router;
