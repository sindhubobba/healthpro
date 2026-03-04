import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../services/authService';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Middleware to verify JWT and attach user to request
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: { message: 'Authentication required' } });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

// Optional auth - attaches user if token present, but doesn't require it
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;

  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = payload;
    } catch {
      // Token invalid, but that's okay - just don't attach user
    }
  }

  next();
}
