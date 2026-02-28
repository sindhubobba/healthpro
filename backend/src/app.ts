import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import questionRoutes from './routes/questions';
import answerRoutes from './routes/answers';
import voteRoutes from './routes/votes';
import debugRoutes from './routes/debug';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Trust proxy for accurate IP addresses (for voting)
app.set('trust proxy', true);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/debug', debugRoutes);  // TODO: Remove in production

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});

export default app;
