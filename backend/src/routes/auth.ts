import { Router, Request, Response, NextFunction } from 'express';
import { queryOne } from '../config/database';
import { hashPassword, verifyPassword, generateToken } from '../services/authService';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  created_at: Date;
}

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: { message: 'Email and password are required' } });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: { message: 'Password must be at least 6 characters' } });
      return;
    }

    // Check if user exists
    const existingUser = await queryOne<User>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser) {
      res.status(400).json({ error: { message: 'Email already registered' } });
      return;
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await queryOne<User>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email.toLowerCase(), passwordHash, name || null]
    );

    if (!user) {
      throw new Error('Failed to create user');
    }

    // Generate token and set cookie
    const token = generateToken({ userId: user.id, email: user.email });
    res.cookie('token', token, cookieOptions);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: { message: 'Email and password are required' } });
      return;
    }

    // Find user
    const user = await queryOne<User>(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) {
      res.status(401).json({ error: { message: 'Invalid email or password' } });
      return;
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: { message: 'Invalid email or password' } });
      return;
    }

    // Generate token and set cookie
    const token = generateToken({ userId: user.id, email: user.email });
    res.cookie('token', token, cookieOptions);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await queryOne<User>(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );

    if (!user) {
      res.status(404).json({ error: { message: 'User not found' } });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
