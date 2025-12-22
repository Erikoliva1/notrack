import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';
import { isValidUsername, isValidPassword, sanitizeString } from '../utils/validation';

const router = express.Router();

// In-memory user storage (for development - use database in production)
interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

const users: Map<string, User> = new Map();

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Sanitize username
    const sanitizedUsername = sanitizeString(username, 20);

    // Validate username format
    if (!isValidUsername(sanitizedUsername)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be 3-20 characters, alphanumeric and underscores only' 
      });
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters with letters and numbers' 
      });
    }

    // Check if user already exists
    if (users.has(sanitizedUsername)) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newUser: User = {
      id: userId,
      username: sanitizedUsername,
      passwordHash,
      createdAt: new Date()
    };

    users.set(sanitizedUsername, newUser);

    // Generate JWT token
    const token = generateToken(userId, sanitizedUsername);

    console.log(`[AUTH] User registered: ${sanitizedUsername} (ID: ${userId})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId,
        username: sanitizedUsername,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during registration' 
    });
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Sanitize username
    const sanitizedUsername = sanitizeString(username, 20);

    // Find user
    const user = users.get(sanitizedUsername);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.username);

    console.log(`[AUTH] User logged in: ${user.username} (ID: ${user.id})`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user.id,
        username: user.username,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during login' 
    });
  }
});

/**
 * Get current user info (requires authentication)
 * GET /api/auth/me
 */
router.get('/me', (req: Request, res: Response) => {
  // This would need authentication middleware in production
  res.json({
    success: true,
    message: 'User info endpoint - implement authentication middleware'
  });
});

/**
 * Guest login (no authentication required)
 * POST /api/auth/guest
 */
router.post('/guest', (req: Request, res: Response) => {
  try {
    // Generate random guest ID
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const guestUsername = `Guest_${Math.floor(Math.random() * 10000)}`;

    // Generate token for guest
    const token = generateToken(guestId, guestUsername);

    console.log(`[AUTH] Guest user created: ${guestUsername} (ID: ${guestId})`);

    res.json({
      success: true,
      message: 'Guest access granted',
      data: {
        userId: guestId,
        username: guestUsername,
        token,
        isGuest: true
      }
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during guest login' 
    });
  }
});

export { router as authRouter, users };
