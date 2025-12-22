/**
 * Redis Pub/Sub Service
 * 
 * Enables horizontal scaling by synchronizing WebSocket events across multiple server instances.
 * 
 * How it works:
 * 1. Each server instance subscribes to Redis channels
 * 2. When a WebSocket event occurs on Server A, it publishes to Redis
 * 3. All other servers (B, C, D) receive the event via Redis Pub/Sub
 * 4. Each server forwards the event to their connected clients
 * 
 * Benefits:
 * - True horizontal scaling (10,000+ concurrent connections)
 * - Load balancing across multiple servers
 * - Automatic failover (if one server dies, others continue)
 * - Shared state across all instances
 * 
 * Usage:
 * ```typescript
 * import { initializePubSub, publishCallEvent } from './redisPubSub';
 * 
 * // Initialize on server start
 * await initializePubSub(io);
 * 
 * // Publish events
 * await publishCallEvent('incoming-call', { targetExtension: '123-456', data });
 * ```
 */

import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/env';
import { logger, logError } from '../utils/logger';

// ============================================================================
// REDIS PUB/SUB CLIENTS
// ============================================================================

let publishClient: Redis | null = null;
let subscribeClient: Redis | null = null;
let io: SocketIOServer | null = null;

// ============================================================================
// CHANNEL NAMES
// ============================================================================

const CHANNELS = {
  // WebSocket events forwarding
  INCOMING_CALL: 'webrtc:incoming-call',
  CALL_ANSWERED: 'webrtc:call-answered',
  ICE_CANDIDATE: 'webrtc:ice-candidate',
  CALL_FAILED: 'webrtc:call-failed',
  HANGUP: 'webrtc:hangup',
  
  // Server coordination
  SERVER_HEALTH: 'server:health',
  USER_CONNECTED: 'server:user-connected',
  USER_DISCONNECTED: 'server:user-disconnected',
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize Redis Pub/Sub for horizontal scaling
 * 
 * Creates two separate Redis clients:
 * - Publisher: Sends events to other servers
 * - Subscriber: Receives events from other servers
 */
export async function initializePubSub(socketIOServer: SocketIOServer): Promise<void> {
  if (!env.USE_REDIS) {
    logger.info('Redis Pub/Sub disabled (USE_REDIS=false)');
    return;
  }

  if (publishClient && subscribeClient) {
    logger.warn('Redis Pub/Sub already initialized');
    return;
  }

  try {
    io = socketIOServer;

    // Create publisher client
    publishClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      db: env.REDIS_DB,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    // Create subscriber client (must be separate from publisher)
    subscribeClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      db: env.REDIS_DB,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    // Subscribe to all channels
    await subscribeClient.subscribe(
      CHANNELS.INCOMING_CALL,
      CHANNELS.CALL_ANSWERED,
      CHANNELS.ICE_CANDIDATE,
      CHANNELS.CALL_FAILED,
      CHANNELS.HANGUP,
      CHANNELS.USER_CONNECTED,
      CHANNELS.USER_DISCONNECTED
    );

    // Handle incoming messages
    subscribeClient.on('message', handlePubSubMessage);

    // Event listeners
    publishClient.on('connect', () => {
      logger.info('✅ Redis Publisher connected');
    });

    subscribeClient.on('connect', () => {
      logger.info('✅ Redis Subscriber connected');
    });

    publishClient.on('error', (error) => {
      logError('Redis Publisher error', error);
    });

    subscribeClient.on('error', (error) => {
      logError('Redis Subscriber error', error);
    });

    logger.info('🚀 Redis Pub/Sub initialized successfully for horizontal scaling');
  } catch (error) {
    logError('Failed to initialize Redis Pub/Sub', error);
    throw error;
  }
}

/**
 * Close Redis Pub/Sub connections
 */
export async function closePubSub(): Promise<void> {
  if (subscribeClient) {
    await subscribeClient.quit();
    subscribeClient = null;
  }
  if (publishClient) {
    await publishClient.quit();
    publishClient = null;
  }
  io = null;
  logger.info('✅ Redis Pub/Sub connections closed');
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Handle incoming Pub/Sub messages from other servers
 */
async function handlePubSubMessage(channel: string, message: string): Promise<void> {
  if (!io) {
    logger.error('Socket.IO server not initialized');
    return;
  }

  try {
    const data = JSON.parse(message);
    
    // Ignore messages from this server instance (avoid loops)
    if (data.serverId === process.pid) {
      return;
    }

    logger.debug(`📨 Received Pub/Sub message on ${channel}`, {
      from: data.serverId,
      to: data.targetSocketId,
    });

    // Forward the event to the appropriate socket
    switch (channel) {
      case CHANNELS.INCOMING_CALL:
        if (data.targetSocketId) {
          io.to(data.targetSocketId).emit('incoming-call', data.payload);
        }
        break;

      case CHANNELS.CALL_ANSWERED:
        if (data.targetSocketId) {
          io.to(data.targetSocketId).emit('call-answered', data.payload);
        }
        break;

      case CHANNELS.ICE_CANDIDATE:
        if (data.targetSocketId) {
          io.to(data.targetSocketId).emit('ice-candidate', data.payload);
        }
        break;

      case CHANNELS.CALL_FAILED:
        if (data.targetSocketId) {
          io.to(data.targetSocketId).emit('call-failed', data.payload);
        }
        break;

      case CHANNELS.HANGUP:
        if (data.targetSocketId) {
          io.to(data.targetSocketId).emit('hangup', data.payload);
        }
        break;

      case CHANNELS.USER_CONNECTED:
        logger.info(`User connected on another server: ${data.extension}`);
        break;

      case CHANNELS.USER_DISCONNECTED:
        logger.info(`User disconnected on another server: ${data.extension}`);
        break;

      default:
        logger.warn(`Unknown Pub/Sub channel: ${channel}`);
    }
  } catch (error) {
    logError('Error handling Pub/Sub message', error, { channel, message });
  }
}

// ============================================================================
// PUBLISHING FUNCTIONS
// ============================================================================

/**
 * Publish incoming call event to other servers
 */
export async function publishIncomingCall(
  targetSocketId: string,
  payload: { callerExtension: string; offer: any }
): Promise<void> {
  await publish(CHANNELS.INCOMING_CALL, {
    targetSocketId,
    payload,
  });
}

/**
 * Publish call answered event to other servers
 */
export async function publishCallAnswered(
  targetSocketId: string,
  payload: { calleeExtension: string; answer: any }
): Promise<void> {
  await publish(CHANNELS.CALL_ANSWERED, {
    targetSocketId,
    payload,
  });
}

/**
 * Publish ICE candidate event to other servers
 */
export async function publishIceCandidate(
  targetSocketId: string,
  payload: { senderExtension: string; candidate: any }
): Promise<void> {
  await publish(CHANNELS.ICE_CANDIDATE, {
    targetSocketId,
    payload,
  });
}

/**
 * Publish call failed event to other servers
 */
export async function publishCallFailed(
  targetSocketId: string,
  payload: { message: string }
): Promise<void> {
  await publish(CHANNELS.CALL_FAILED, {
    targetSocketId,
    payload,
  });
}

/**
 * Publish hangup event to other servers
 */
export async function publishHangup(
  targetSocketId: string,
  payload: { from: string }
): Promise<void> {
  await publish(CHANNELS.HANGUP, {
    targetSocketId,
    payload,
  });
}

/**
 * Publish user connection event
 */
export async function publishUserConnected(
  socketId: string,
  extension: string
): Promise<void> {
  await publish(CHANNELS.USER_CONNECTED, {
    socketId,
    extension,
  });
}

/**
 * Publish user disconnection event
 */
export async function publishUserDisconnected(
  socketId: string,
  extension: string
): Promise<void> {
  await publish(CHANNELS.USER_DISCONNECTED, {
    socketId,
    extension,
  });
}

/**
 * Generic publish function
 * Adds server ID to prevent message loops
 */
async function publish(channel: string, data: any): Promise<void> {
  if (!publishClient || !env.USE_REDIS) {
    return; // Pub/Sub not enabled
  }

  try {
    const message = JSON.stringify({
      ...data,
      serverId: process.pid, // Identify the source server
      timestamp: Date.now(),
    });

    await publishClient.publish(channel, message);
    
    logger.debug(`📤 Published to ${channel}`, {
      serverId: process.pid,
      targetSocketId: data.targetSocketId,
    });
  } catch (error) {
    logError('Failed to publish message', error, { channel, data });
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if Pub/Sub is enabled and connected
 */
export function isPubSubEnabled(): boolean {
  return env.USE_REDIS && publishClient !== null && subscribeClient !== null;
}

/**
 * Get Pub/Sub statistics
 */
export async function getPubSubStats(): Promise<{
  enabled: boolean;
  publisherConnected: boolean;
  subscriberConnected: boolean;
  channels: string[];
}> {
  return {
    enabled: env.USE_REDIS,
    publisherConnected: publishClient?.status === 'ready',
    subscriberConnected: subscribeClient?.status === 'ready',
    channels: Object.values(CHANNELS),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initializePubSub,
  closePubSub,
  publishIncomingCall,
  publishCallAnswered,
  publishIceCandidate,
  publishCallFailed,
  publishHangup,
  publishUserConnected,
  publishUserDisconnected,
  isPubSubEnabled,
  getPubSubStats,
};
