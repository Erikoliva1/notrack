import jwt, { SignOptions } from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { env } from '../config/env';

// Use validated environment variable from env.ts (no fallback allowed)
const JWT_SECRET = env.JWT_SECRET;

export interface JWTPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token and extract payload
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(userId: string, username: string): string {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: env.JWT_EXPIRATION } as SignOptions
  );
}

/**
 * Socket.io middleware for authentication with guest access feature flag
 * 
 * Security Implementation:
 * - When ENABLE_GUEST_ACCESS=false (production default): Strictly enforces JWT authentication
 * - When ENABLE_GUEST_ACCESS=true (development mode): Allows connections without token
 * 
 * This replaces the previous approach of commenting out the middleware entirely,
 * providing a proper, controlled feature flag for guest access.
 */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth.token;

  // If guest access is enabled and no token is provided, allow connection
  if (env.ENABLE_GUEST_ACCESS && !token) {
    console.log('⚠️  Guest access: Connection allowed without authentication');
    // Set default guest data
    socket.data.userId = `guest-${socket.id}`;
    socket.data.username = 'Guest User';
    return next();
  }

  // If guest access is disabled, token is required
  if (!token) {
    console.log('❌ Authentication failed: No token provided');
    return next(new Error('Authentication token required'));
  }

  // Verify token
  const payload = verifyToken(token);
  
  if (!payload) {
    console.log('❌ Authentication failed: Invalid or expired token');
    return next(new Error('Invalid or expired token'));
  }

  // Store authenticated user data in socket
  socket.data.userId = payload.userId;
  socket.data.username = payload.username;
  
  console.log(`✅ Authenticated user: ${payload.username} (${payload.userId})`);
  next();
}
