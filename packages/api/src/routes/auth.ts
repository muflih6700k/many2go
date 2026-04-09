import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { validate } from '../middleware/validate';
import { UserRole } from '../types';
import { AuthenticatedRequest } from '../middleware/jwt';

const router = express.Router();

// Register
router.post(
 '/register',
 validate([
 body('name').trim().notEmpty().withMessage('Name is required'),
 body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
 body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
 body('role').optional().isIn(['CUSTOMER', 'AGENT', 'ADMIN']).withMessage('Invalid role'),
 ]),
 async (req: AuthenticatedRequest, res) => {
 try {
 const { name, email, password, role } = req.body;

 // Determine effective role: ADMIN can set any role, otherwise default to CUSTOMER
 let effectiveRole: UserRole = 'CUSTOMER';
 if (req.user?.role === 'ADMIN') {
 effectiveRole = (role as UserRole) || 'CUSTOMER';
 } else if (role === 'CUSTOMER') {
 effectiveRole = 'CUSTOMER';
 }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'Email already registered' },
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

 // Create user
 const user = await prisma.user.create({
 data: {
 name,
 email,
 passwordHash,
 role: effectiveRole,
 },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const tokens = generateTokens(user.id, user.email, user.role);

// Set refresh token as httpOnly cookie
 res.cookie('refreshToken', tokens.refreshToken, {
 httpOnly: true,
 secure: true,
 sameSite: 'none',
 maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
 });

      return res.status(201).json({
        success: true,
        data: {
          user,
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create account' },
      });
    }
  }
);

// Login
router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        });
      }

      // Remove passwordHash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      // Generate tokens
      const tokens = generateTokens(user.id, user.email, user.role);

// Set refresh token as httpOnly cookie
 res.cookie('refreshToken', tokens.refreshToken, {
 httpOnly: true,
 secure: true,
 sameSite: 'none',
 maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
 });

      return res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to login' },
      });
    }
  }
);

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token required' },
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id, user.email, user.role);

// Set new refresh token
 res.cookie('refreshToken', tokens.refreshToken, {
 httpOnly: true,
 secure: true,
 sameSite: 'none',
 maxAge: 7 * 24 * 60 * 60 * 1000,
 });

    return res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    // Clear invalid cookie
    res.clearCookie('refreshToken');
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'Invalid refresh token' },
    });
  }
});

// Get current user (me)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' },
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'Invalid token' },
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  return res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
});

// Token generation helper
function generateTokens(userId: string, email: string, role: UserRole) {
  const accessToken = jwt.sign(
    { userId, email, role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

export default router;
