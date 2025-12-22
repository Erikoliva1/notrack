/**
 * Redis Service
 * 
 * Provides Redis client for persistent data storage and horizontal scaling
 * 
 * Benefits:
 * 1. Data Persistence - Survives server restarts
 * 2. Horizontal Scaling - Multiple server instances can share state
 * 3. Automatic Expiry - TTL prevents stale data
 * 4. High Performance - In-memory database with persistence
 */

import Redis from 'ioredis';
import { env } from '../config/env';

// ============================================================================
// REDIS CLIENT CONFIGURATION
// ============================================================================

/**
 * Redis client instance
 * Singleton pattern ensures single connection across application
 */
let redisClient: Redis | null = null;

/**
 * In-memory fallback storage when Redis is disabled
 */
const inMemoryStore = new Map<string, { value: string; expiry: number }>();

/**
 * Get Redis client instance
 * Returns null if Redis is not enabled or not initialized
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Close Redis Connection (for graceful shutdown)
 * 
 * Properly closes the Redis connection during application shutdown.
 * Used by graceful shutdown handler to ensure clean exit.
 * 
 * @returns Promise that resolves when Redis is closed
 * 
 * @example
 * ```typescript
 * // In graceful shutdown handler
 * await RedisService.closeRedis();
 * ```
 */
export async function closeRedis(): Promise<void> {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed successfully');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
    // Force disconnect if quit fails
    if (redisClient) {
      redisClient.disconnect();
      redisClient = null;
    }
    throw error;
  }
}

/**
 * Initialize Redis client
 * 
 * Connection options:
 * - Automatic reconnection on failure
 * - Lazy connection (connect on first use)
 * - Error handling with fallback
 */
export function initializeRedis(): Redis {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      db: env.REDIS_DB,
      
      // OPTIMIZATION: Connection pooling settings
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      
      // Connection options
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`Redis reconnection attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      
      // Lazy connect - only connect when needed
      lazyConnect: true,
      
      // Timeouts
      connectTimeout: 10000,
      commandTimeout: 5000,
      
      // Keep alive
      keepAlive: 30000,
      
      // OPTIMIZATION: Reconnection handling
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Reconnect on READONLY errors (Redis failover)
          return true;
        }
        return false;
      },
    });

    // Event listeners
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis ready to accept commands');
    });

    redisClient.on('error', (error) => {
      console.error('❌ Redis error:', error.message);
    });

    redisClient.on('close', () => {
      console.warn('⚠️  Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    return redisClient;
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    throw error;
  }
}

/**
 * PHASE 6 OPTIMIZATION: Set a key-value pair in Redis with optional expiration
 * Uses pipelining for better performance
 */
export async function set(key: string, value: string, expirationSeconds?: number): Promise<void> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  if (expirationSeconds) {
    await redisClient.setex(key, expirationSeconds, value);
  } else {
    await redisClient.set(key, value);
  }
}

/**
 * PHASE 6 OPTIMIZATION: Batch set multiple keys using Redis pipeline
 * Significantly faster than individual set operations
 */
export async function batchSet(entries: Array<{ key: string; value: string; expiration?: number }>): Promise<void> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  const pipeline = redisClient.pipeline();
  
  entries.forEach(({ key, value, expiration }) => {
    if (expiration) {
      pipeline.setex(key, expiration, value);
    } else {
      pipeline.set(key, value);
    }
  });
  
  await pipeline.exec();
}

/**
 * PHASE 6 OPTIMIZATION: Batch get multiple keys using Redis pipeline
 * Significantly faster than individual get operations
 */
export async function batchGet(keys: string[]): Promise<(string | null)[]> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  if (keys.length === 0) {
    return [];
  }
  
  const pipeline = redisClient.pipeline();
  keys.forEach(key => pipeline.get(key));
  
  const results = await pipeline.exec();
  return results ? results.map(([err, value]) => err ? null : value as string) : [];
}

/**
 * Check if Redis is enabled and connected
 */
export function isRedisEnabled(): boolean {
  return env.USE_REDIS && redisClient !== null;
}

// ============================================================================
// USER MAPPING OPERATIONS
// ============================================================================

/**
 * Time to Live (TTL) for user mappings
 * 24 hours = 86400 seconds
 * Prevents stale data from accumulating
 */
const USER_MAPPING_TTL = 86400; // 24 hours in seconds

/**
 * Key patterns for Redis
 */
const KEYS = {
  // user:extension -> socketId
  extensionToSocket: (extension: string) => `user:${extension}`,
  
  // socket:socketId -> extension
  socketToExtension: (socketId: string) => `socket:${socketId}`,
  
  // activity:socketId -> timestamp
  lastActivity: (socketId: string) => `activity:${socketId}`,
};

/**
 * Set extension to socket mapping
 */
export async function setExtensionMapping(
  extension: string,
  socketId: string
): Promise<void> {
  const redis = getRedisClient();
  
  if (!redis) {
    // In-memory fallback
    const expiry = Date.now() + (USER_MAPPING_TTL * 1000);
    inMemoryStore.set(KEYS.extensionToSocket(extension), { value: socketId, expiry });
    inMemoryStore.set(KEYS.socketToExtension(socketId), { value: extension, expiry });
    inMemoryStore.set(KEYS.lastActivity(socketId), { value: Date.now().toString(), expiry });
    return;
  }
  
  // Redis storage
  await Promise.all([
    redis.setex(KEYS.extensionToSocket(extension), USER_MAPPING_TTL, socketId),
    redis.setex(KEYS.socketToExtension(socketId), USER_MAPPING_TTL, extension),
    redis.setex(KEYS.lastActivity(socketId), USER_MAPPING_TTL, Date.now().toString()),
  ]);
}

/**
 * Get socket ID from extension number
 */
export async function getSocketIdByExtension(
  extension: string
): Promise<string | null> {
  const redis = getRedisClient();
  
  if (!redis) {
    // In-memory fallback
    const entry = inMemoryStore.get(KEYS.extensionToSocket(extension));
    if (!entry || Date.now() > entry.expiry) {
      if (entry) inMemoryStore.delete(KEYS.extensionToSocket(extension));
      return null;
    }
    return entry.value;
  }
  
  return await redis.get(KEYS.extensionToSocket(extension));
}

/**
 * Get extension number from socket ID
 */
export async function getExtensionBySocketId(
  socketId: string
): Promise<string | null> {
  const redis = getRedisClient();
  
  if (!redis) {
    // In-memory fallback
    const entry = inMemoryStore.get(KEYS.socketToExtension(socketId));
    if (!entry || Date.now() > entry.expiry) {
      if (entry) inMemoryStore.delete(KEYS.socketToExtension(socketId));
      return null;
    }
    return entry.value;
  }
  
  return await redis.get(KEYS.socketToExtension(socketId));
}

/**
 * Delete user mappings
 * Called when user disconnects
 */
export async function deleteUserMappings(socketId: string): Promise<void> {
  const redis = getRedisClient();
  
  // Get extension first
  const extension = await getExtensionBySocketId(socketId);
  
  if (!redis) {
    // In-memory fallback
    if (extension) {
      inMemoryStore.delete(KEYS.extensionToSocket(extension));
    }
    inMemoryStore.delete(KEYS.socketToExtension(socketId));
    inMemoryStore.delete(KEYS.lastActivity(socketId));
    return;
  }
  
  if (extension) {
    // Delete all related keys
    await redis.del(
      KEYS.extensionToSocket(extension),
      KEYS.socketToExtension(socketId),
      KEYS.lastActivity(socketId)
    );
  } else {
    // If extension not found, just delete socket-related keys
    await redis.del(
      KEYS.socketToExtension(socketId),
      KEYS.lastActivity(socketId)
    );
  }
}

/**
 * Update last activity timestamp
 */
export async function updateLastActivity(socketId: string): Promise<void> {
  const redis = getRedisClient();
  
  if (!redis) {
    // In-memory fallback
    const expiry = Date.now() + (USER_MAPPING_TTL * 1000);
    inMemoryStore.set(KEYS.lastActivity(socketId), { value: Date.now().toString(), expiry });
    return;
  }
  
  await redis.setex(
    KEYS.lastActivity(socketId),
    USER_MAPPING_TTL,
    Date.now().toString()
  );
}

/**
 * Get last activity timestamp
 */
export async function getLastActivity(socketId: string): Promise<number | null> {
  const redis = getRedisClient();
  
  if (!redis) {
    // In-memory fallback
    const entry = inMemoryStore.get(KEYS.lastActivity(socketId));
    if (!entry || Date.now() > entry.expiry) {
      if (entry) inMemoryStore.delete(KEYS.lastActivity(socketId));
      return null;
    }
    return parseInt(entry.value, 10);
  }
  
  const timestamp = await redis.get(KEYS.lastActivity(socketId));
  return timestamp ? parseInt(timestamp, 10) : null;
}

/**
 * Check if extension is already in use
 */
export async function isExtensionInUse(extension: string): Promise<boolean> {
  const redis = getRedisClient();
  
  if (!redis) {
    // In-memory fallback
    const entry = inMemoryStore.get(KEYS.extensionToSocket(extension));
    if (!entry || Date.now() > entry.expiry) {
      if (entry) inMemoryStore.delete(KEYS.extensionToSocket(extension));
      return false;
    }
    return true;
  }
  
  const exists = await redis.exists(KEYS.extensionToSocket(extension));
  return exists === 1;
}

/**
 * Get all active extensions
 * Useful for monitoring and debugging
 */
export async function getAllActiveExtensions(): Promise<string[]> {
  const redis = getRedisClient();
  
  if (!redis) {
    // In-memory fallback
    const extensions: string[] = [];
    const now = Date.now();
    for (const [key, entry] of inMemoryStore.entries()) {
      if (key.startsWith('user:') && now <= entry.expiry) {
        extensions.push(key.replace('user:', ''));
      } else if (now > entry.expiry) {
        inMemoryStore.delete(key);
      }
    }
    return extensions;
  }
  
  const keys = await redis.keys('user:*');
  return keys.map(key => key.replace('user:', ''));
}

/**
 * Get total active users count
 */
export async function getActiveUsersCount(): Promise<number> {
  const redis = getRedisClient();
  
  if (!redis) {
    // In-memory fallback
    let count = 0;
    const now = Date.now();
    for (const [key, entry] of inMemoryStore.entries()) {
      if (key.startsWith('user:')) {
        if (now <= entry.expiry) {
          count++;
        } else {
          inMemoryStore.delete(key);
        }
      }
    }
    return count;
  }
  
  const keys = await redis.keys('user:*');
  return keys.length;
}

/**
 * Clean up stale connections
 * Removes mappings for disconnected users that weren't properly cleaned up
 */
export async function cleanupStaleConnections(
  timeoutMs: number = 1800000 // 30 minutes default
): Promise<number> {
  const redis = getRedisClient();
  const now = Date.now();
  let cleanedCount = 0;
  
  if (!redis) {
    // In-memory fallback cleanup
    for (const [key, entry] of inMemoryStore.entries()) {
      if (key.startsWith('activity:')) {
        const timestamp = parseInt(entry.value, 10);
        if (now - timestamp > timeoutMs) {
          const socketId = key.replace('activity:', '');
          await deleteUserMappings(socketId);
          cleanedCount++;
        }
      }
    }
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} stale connection(s) from memory`);
    }
    return cleanedCount;
  }
  
  // Get all socket IDs
  const socketKeys = await redis.keys('socket:*');
  
  for (const socketKey of socketKeys) {
    const socketId = socketKey.replace('socket:', '');
    const lastActivity = await getLastActivity(socketId);
    
    if (lastActivity && (now - lastActivity > timeoutMs)) {
      // Stale connection - clean up
      await deleteUserMappings(socketId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} stale connection(s)`);
  }
  
  return cleanedCount;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check Redis connection health
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return false; // Redis not enabled
    }
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

/**
 * Get Redis info for monitoring
 */
export async function getRedisInfo(): Promise<{
  connected: boolean;
  activeUsers: number;
  memoryUsed: string;
  uptime: string;
}> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      // Return in-memory stats
      const activeUsers = await getActiveUsersCount();
      return {
        connected: false,
        activeUsers,
        memoryUsed: 'In-Memory',
        uptime: 'N/A',
      };
    }
    
    const info = await redis.info('server');
    const activeUsers = await getActiveUsersCount();
    
    // Parse info string
    const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    
    return {
      connected: true,
      activeUsers,
      memoryUsed: memoryMatch ? memoryMatch[1].trim() : 'N/A',
      uptime: uptimeMatch ? `${Math.floor(parseInt(uptimeMatch[1]) / 3600)}h` : 'N/A',
    };
  } catch (error) {
    return {
      connected: false,
      activeUsers: 0,
      memoryUsed: 'N/A',
      uptime: 'N/A',
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initializeRedis,
  getRedisClient,
  closeRedis,
  setExtensionMapping,
  getSocketIdByExtension,
  getExtensionBySocketId,
  deleteUserMappings,
  updateLastActivity,
  getLastActivity,
  isExtensionInUse,
  getAllActiveExtensions,
  getActiveUsersCount,
  cleanupStaleConnections,
  checkRedisHealth,
  getRedisInfo,
};
