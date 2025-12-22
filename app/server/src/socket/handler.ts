/**
 * Socket.IO Event Handlers
 * 
 * Refactored to use Redis for persistent storage and horizontal scaling
 * Enhanced with security: Rate limiting and input sanitization (Phase 2)
 */

import { Server, Socket } from 'socket.io';
import { validateSocketData } from '../utils/validation';
import * as Redis from '../services/redis';
import { env } from '../config/env';
import { checkRateLimit } from '../middleware/socketRateLimit';
import { secureSocketData } from '../utils/sanitize';

// ============================================================================
// REDIS-BASED USER MAPPING (Replaces in-memory Maps)
// ============================================================================

/**
 * Generate a unique 6-digit extension number in format "XXX-XXX"
 * Now checks Redis instead of in-memory Map
 */
async function generateExtensionNumber(): Promise<string> {
  let extensionNumber: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    const num1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const num2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    extensionNumber = `${num1}-${num2}`;
    attempts++;

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique extension number');
    }
  } while (await Redis.isExtensionInUse(extensionNumber));

  return extensionNumber;
}

// ============================================================================
// SOCKET EVENT HANDLERS
// ============================================================================

/**
 * Setup Socket.IO event handlers
 * All handlers are now async to support Redis operations
 * Enhanced with security: Token bucket rate limiting + input sanitization
 */
export function setupSocketHandlers(io: Server): void {
  io.on('connection', async (socket: Socket) => {
    console.log('════════════════════════════════════════════════');
    console.log(`[${new Date().toISOString()}] 🔌 New connection`);
    console.log(`   Socket ID: ${socket.id}`);
    console.log(`   User ID: ${socket.data.userId || 'N/A'}`);
    console.log(`   Username: ${socket.data.username || 'N/A'}`);

    // Generate and assign unique extension number
    try {
      const extensionNumber = await generateExtensionNumber();
      
      // Store mappings in Redis
      await Redis.setExtensionMapping(extensionNumber, socket.id);

      const activeUsers = await Redis.getActiveUsersCount();
      console.log(`   Extension: ${extensionNumber}`);
      console.log(`   Total Users: ${activeUsers}`);
      console.log('════════════════════════════════════════════════');

      // Send extension number to client
      socket.emit('extension-assigned', { extensionNumber });
    } catch (error) {
      console.error('Error generating extension number:', error);
      socket.emit('error', { message: 'Failed to assign extension number' });
      socket.disconnect();
      return;
    }

    /**
     * Heartbeat/ping handler to keep connection alive
     */
    socket.on('ping', async () => {
      await Redis.updateLastActivity(socket.id);
      socket.emit('pong');
    });

    /**
     * Handle user join event
     */
    socket.on('join', async (data: any) => {
      await Redis.updateLastActivity(socket.id);
      
      // Rate limiting check (Token Bucket Algorithm)
      if (!checkRateLimit(socket.id, 'join')) {
        console.warn(`⚠️  Rate limit exceeded for socket ${socket.id} on 'join'`);
        socket.emit('error', { 
          message: 'Too many requests. Please slow down.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
        return;
      }
      
      const extensionNumber = await Redis.getExtensionBySocketId(socket.id);
      console.log(`[${new Date().toISOString()}] 📞 JOIN event`);
      console.log(`   Extension: ${extensionNumber}`);
    });

    /**
     * Handle call-user event (initiate call)
     * SECURITY: Token bucket rate limiting + input sanitization
     */
    socket.on('call-user', async (data: { targetExtension: string; offer: any }) => {
      await Redis.updateLastActivity(socket.id);
      
      // SECURITY: Rate limiting check (Token Bucket Algorithm)
      // Allows 5 calls per second with burst capacity of 10
      if (!checkRateLimit(socket.id, 'call-user')) {
        console.warn(`⚠️  Rate limit exceeded for socket ${socket.id} on 'call-user'`);
        socket.emit('error', { 
          message: 'Too many call attempts. Please slow down.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
        return;
      }

      // SECURITY: Sanitize and validate input (XSS, injection prevention)
      const secureData = secureSocketData('call-user', data);
      if (!secureData) {
        console.warn(`⚠️  Security check failed for call-user from socket ${socket.id}`);
        socket.emit('error', { 
          message: 'Invalid request data',
          code: 'INVALID_DATA'
        });
        return;
      }

      // Additional validation
      const validation = validateSocketData('call-user', secureData);
      if (!validation.valid) {
        console.log(`   ❌ Validation failed: ${validation.error}`);
        socket.emit('error', { message: validation.error });
        return;
      }

      const callerExtension = await Redis.getExtensionBySocketId(socket.id);
      const { targetExtension, offer } = secureData;

      console.log(`[${new Date().toISOString()}] 📞 CALL-USER event`);
      console.log(`   From: ${callerExtension}`);
      console.log(`   To: ${targetExtension}`);

      const targetSocketId = await Redis.getSocketIdByExtension(targetExtension);

      if (!targetSocketId) {
        console.log(`   ❌ Target extension not found or offline`);
        socket.emit('call-failed', { message: 'User not found or offline' });
        return;
      }

      // Forward call to target user
      io.to(targetSocketId).emit('incoming-call', {
        callerExtension,
        offer
      });

      console.log(`   ✅ Call forwarded to ${targetExtension}`);
    });

    /**
     * Handle answer-call event (accept call)
     * SECURITY: Token bucket rate limiting + input sanitization
     */
    socket.on('answer-call', async (data: { callerExtension: string; answer: any }) => {
      await Redis.updateLastActivity(socket.id);
      
      // SECURITY: Rate limiting check (Token Bucket Algorithm)
      // Allows 3 answers per second with burst capacity of 6
      if (!checkRateLimit(socket.id, 'answer-call')) {
        console.warn(`⚠️  Rate limit exceeded for socket ${socket.id} on 'answer-call'`);
        socket.emit('error', { 
          message: 'Too many requests. Please slow down.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
        return;
      }

      // SECURITY: Sanitize and validate input
      const secureData = secureSocketData('answer-call', data);
      if (!secureData) {
        console.warn(`⚠️  Security check failed for answer-call from socket ${socket.id}`);
        socket.emit('error', { 
          message: 'Invalid request data',
          code: 'INVALID_DATA'
        });
        return;
      }

      // Additional validation
      const validation = validateSocketData('answer-call', secureData);
      if (!validation.valid) {
        console.log(`   ❌ Validation failed: ${validation.error}`);
        socket.emit('error', { message: validation.error });
        return;
      }

      const calleeExtension = await Redis.getExtensionBySocketId(socket.id);
      const { callerExtension, answer } = secureData;

      console.log(`[${new Date().toISOString()}] ✅ ANSWER-CALL event`);
      console.log(`   Callee: ${calleeExtension}`);
      console.log(`   Caller: ${callerExtension}`);

      const callerSocketId = await Redis.getSocketIdByExtension(callerExtension);

      if (!callerSocketId) {
        console.log(`   ❌ Caller not found`);
        socket.emit('error', { message: 'Caller not found' });
        return;
      }

      // Forward answer to caller
      io.to(callerSocketId).emit('call-answered', {
        calleeExtension,
        answer
      });

      console.log(`   ✅ Answer forwarded to ${callerExtension}`);
    });

    /**
     * Handle ice-candidate event (WebRTC ICE candidates)
     * SECURITY: Token bucket rate limiting + input sanitization
     */
    socket.on('ice-candidate', async (data: { targetExtension: string; candidate: any }) => {
      await Redis.updateLastActivity(socket.id);
      
      // SECURITY: Rate limiting check (Token Bucket Algorithm)
      // Allows 20 ICE candidates per second with burst capacity of 40
      // Higher limit because ICE candidates are sent frequently
      if (!checkRateLimit(socket.id, 'ice-candidate')) {
        console.warn(`⚠️  Rate limit exceeded for socket ${socket.id} on 'ice-candidate'`);
        socket.emit('error', { 
          message: 'Too many ICE candidates. Please slow down.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
        return;
      }

      // SECURITY: Sanitize and validate input
      const secureData = secureSocketData('ice-candidate', data);
      if (!secureData) {
        console.warn(`⚠️  Security check failed for ice-candidate from socket ${socket.id}`);
        socket.emit('error', { 
          message: 'Invalid ICE candidate data',
          code: 'INVALID_DATA'
        });
        return;
      }

      // Additional validation
      const validation = validateSocketData('ice-candidate', secureData);
      if (!validation.valid) {
        console.log(`   ❌ Validation failed: ${validation.error}`);
        socket.emit('error', { message: validation.error });
        return;
      }

      const senderExtension = await Redis.getExtensionBySocketId(socket.id);
      const { targetExtension, candidate } = secureData;

      console.log(`[${new Date().toISOString()}] 🧊 ICE-CANDIDATE event`);
      console.log(`   From: ${senderExtension}`);
      console.log(`   To: ${targetExtension}`);

      const targetSocketId = await Redis.getSocketIdByExtension(targetExtension);

      if (!targetSocketId) {
        console.log(`   ❌ Target not found`);
        return;
      }

      // Forward ICE candidate to target
      io.to(targetSocketId).emit('ice-candidate', {
        senderExtension,
        candidate
      });

      console.log(`   ✅ ICE candidate forwarded`);
    });

    /**
     * Handle hangup event (end call)
     */
    socket.on('hangup', async (data: { targetNumber: string }) => {
      await Redis.updateLastActivity(socket.id);
      
      // SECURITY: Rate limiting
      if (!checkRateLimit(socket.id, 'hangup')) {
        console.warn(`⚠️  Rate limit exceeded for socket ${socket.id} on 'hangup'`);
        return; // Silently ignore (less critical than call initiation)
      }
      
      // Validate input
      const validation = validateSocketData('hangup', data);
      if (!validation.valid) {
        console.log(`   ❌ Validation failed: ${validation.error}`);
        socket.emit('error', { message: validation.error });
        return;
      }

      const callerExtension = await Redis.getExtensionBySocketId(socket.id);
      const { targetNumber } = data;

      console.log(`[${new Date().toISOString()}] 📴 HANGUP event`);
      console.log(`   From: ${callerExtension}`);
      console.log(`   To: ${targetNumber}`);

      const targetSocketId = await Redis.getSocketIdByExtension(targetNumber);

      if (targetSocketId) {
        io.to(targetSocketId).emit('hangup', {
          from: callerExtension
        });
        console.log(`   ✅ Hangup forwarded to ${targetNumber}`);
      }
    });

    /**
     * Handle reject event (reject incoming call)
     */
    socket.on('reject', async (data: { callerExtension: string }) => {
      await Redis.updateLastActivity(socket.id);
      
      // SECURITY: Rate limiting
      if (!checkRateLimit(socket.id, 'reject')) {
        console.warn(`⚠️  Rate limit exceeded for socket ${socket.id} on 'reject'`);
        return;
      }
      
      // Validate input
      const validation = validateSocketData('reject', data);
      if (!validation.valid) {
        console.log(`   ❌ Validation failed: ${validation.error}`);
        socket.emit('error', { message: validation.error });
        return;
      }

      const calleeExtension = await Redis.getExtensionBySocketId(socket.id);
      const { callerExtension } = data;

      console.log(`[${new Date().toISOString()}] ❌ REJECT event`);
      console.log(`   From: ${calleeExtension}`);
      console.log(`   To: ${callerExtension}`);

      const callerSocketId = await Redis.getSocketIdByExtension(callerExtension);

      if (callerSocketId) {
        io.to(callerSocketId).emit('call-failed', {
          message: 'Call rejected by user'
        });
        console.log(`   ✅ Rejection forwarded to ${callerExtension}`);
      }
    });

    /**
     * Handle disconnect event
     */
    socket.on('disconnect', async () => {
      const extensionNumber = await Redis.getExtensionBySocketId(socket.id);
      
      console.log('════════════════════════════════════════════════');
      console.log(`[${new Date().toISOString()}] 🔌 Disconnect`);
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Extension: ${extensionNumber}`);

      // Clean up mappings in Redis
      await Redis.deleteUserMappings(socket.id);

      const activeUsers = await Redis.getActiveUsersCount();
      console.log(`   Total Users: ${activeUsers}`);
      console.log('════════════════════════════════════════════════');
    });
  });
}

/**
 * Cleanup stale connections using Redis
 * Runs periodically to remove inactive users
 */
export async function cleanupStaleConnections(io: Server): Promise<void> {
  const timeout = env.CONNECTION_TIMEOUT_MS;
  const cleanedCount = await Redis.cleanupStaleConnections(timeout);
  
  if (cleanedCount > 0) {
    console.log(`[CLEANUP] Cleaned up ${cleanedCount} stale connection(s) from Redis`);
  }
}
