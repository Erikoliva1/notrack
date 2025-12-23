/**
 * Socket Rate Limiter
 * 
 * Prevents DoS attacks by limiting the rate of socket events per connection.
 * Uses a token bucket algorithm for flexible rate limiting.
 * 
 * Token Bucket Algorithm:
 * - Each socket starts with a bucket of tokens
 * - Each event consumes 1 token
 * - Tokens refill at a constant rate
 * - If no tokens available, request is rate limited
 * 
 * Benefits:
 * - Allows burst traffic (using accumulated tokens)
 * - Fair across all connections
 * - Configurable per event type
 * - Memory efficient
 */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;      // Maximum tokens in bucket
  refillRate: number;     // Tokens added per second
  costPerRequest: number; // Tokens consumed per request
}

/**
 * Rate limit configurations per event type
 * 
 * call-user: 5 requests per second (burst of 10)
 * answer-call: 3 requests per second (burst of 6)
 * ice-candidate: 20 requests per second (burst of 40)
 * join: 1 request per second (burst of 2)
 */
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  'call-user': {
    maxTokens: 10,
    refillRate: 5, // 5 tokens per second
    costPerRequest: 1,
  },
  'answer-call': {
    maxTokens: 6,
    refillRate: 3,
    costPerRequest: 1,
  },
  'ice-candidate': {
    maxTokens: 40,
    refillRate: 20,
    costPerRequest: 1,
  },
  'hangup': {
    maxTokens: 5,
    refillRate: 2,
    costPerRequest: 1,
  },
  'reject': {
    maxTokens: 5,
    refillRate: 2,
    costPerRequest: 1,
  },
  'join': {
    maxTokens: 2,
    refillRate: 1,
    costPerRequest: 1,
  },
  'heartbeat': {
    maxTokens: 60,
    refillRate: 30,
    costPerRequest: 1,
  },
};

/**
 * In-memory storage for token buckets
 * Key format: `${socketId}:${eventName}`
 */
const buckets = new Map<string, TokenBucket>();

/**
 * Get or create token bucket for socket + event combination
 */
function getBucket(
  socketId: string,
  eventName: string,
  config: RateLimitConfig
): TokenBucket {
  const key = `${socketId}:${eventName}`;
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = {
      tokens: config.maxTokens,
      lastRefill: Date.now(),
    };
    buckets.set(key, bucket);
  }

  return bucket;
}

/**
 * Refill tokens based on time elapsed since last refill
 */
function refillTokens(
  bucket: TokenBucket,
  config: RateLimitConfig
): void {
  const now = Date.now();
  const timePassed = (now - bucket.lastRefill) / 1000; // Convert to seconds

  if (timePassed > 0) {
    const tokensToAdd = timePassed * config.refillRate;
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }
}

/**
 * Check if request should be rate limited
 * 
 * @param socketId - Socket ID making the request
 * @param eventName - Name of the socket event
 * @param customConfig - Optional custom rate limit configuration
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  socketId: string,
  eventName: string,
  customConfig?: Partial<RateLimitConfig>
): boolean {
  // Get configuration (custom or default)
  const defaultConfig = DEFAULT_CONFIGS[eventName] || DEFAULT_CONFIGS['call-user'];
  const config: RateLimitConfig = customConfig
    ? { ...defaultConfig, ...customConfig }
    : defaultConfig;

  // Get or create bucket
  const bucket = getBucket(socketId, eventName, config);

  // Refill tokens based on time elapsed
  refillTokens(bucket, config);

  // Check if enough tokens available
  if (bucket.tokens >= config.costPerRequest) {
    bucket.tokens -= config.costPerRequest;
    return true; // Request allowed
  }

  // Rate limited
  return false;
}

/**
 * Get current rate limit status for debugging
 */
export function getRateLimitStatus(
  socketId: string,
  eventName: string
): {
  tokens: number;
  maxTokens: number;
  refillRate: number;
  isRateLimited: boolean;
} {
  const config = DEFAULT_CONFIGS[eventName] || DEFAULT_CONFIGS['call-user'];
  const bucket = getBucket(socketId, eventName, config);
  
  refillTokens(bucket, config);

  return {
    tokens: Math.floor(bucket.tokens),
    maxTokens: config.maxTokens,
    refillRate: config.refillRate,
    isRateLimited: bucket.tokens < config.costPerRequest,
  };
}

/**
 * Clean up old buckets to prevent memory leaks
 * Call this periodically (e.g., every 5 minutes)
 */
export function cleanupOldBuckets(maxAgeMs: number = 300000): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > maxAgeMs) {
      buckets.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} old rate limit bucket(s)`);
  }

  return cleaned;
}

/**
 * Reset rate limit for a specific socket
 * Useful for testing or administrative purposes
 */
export function resetRateLimit(socketId: string, eventName?: string): void {
  if (eventName) {
    const key = `${socketId}:${eventName}`;
    buckets.delete(key);
  } else {
    // Reset all events for this socket
    for (const key of buckets.keys()) {
      if (key.startsWith(`${socketId}:`)) {
        buckets.delete(key);
      }
    }
  }
}

/**
 * Get total number of active rate limit buckets
 */
export function getActiveBucketCount(): number {
  return buckets.size;
}

/**
 * Middleware wrapper for socket events
 * Usage: socket.on('event', rateLimitMiddleware('event', handler))
 */
export function rateLimitMiddleware<T = any>(
  eventName: string,
  handler: (data: T) => void | Promise<void>,
  customConfig?: Partial<RateLimitConfig>
): (data: T) => void | Promise<void> {
  return function (this: any, data: T) {
    const socket = this; // 'this' is the socket instance
    
    // Check rate limit
    if (!checkRateLimit(socket.id, eventName, customConfig)) {
      console.warn(`⚠️  Rate limit exceeded for socket ${socket.id} on event '${eventName}'`);
      
      // Emit error to client
      socket.emit('error', {
        message: 'Rate limit exceeded. Please slow down.',
        code: 'RATE_LIMIT_EXCEEDED',
        event: eventName,
      });
      
      return;
    }

    // Execute handler if rate limit passed
    return handler.call(socket, data);
  };
}

/**
 * Express-style middleware for rate limiting
 * Can be used with Socket.IO middleware
 */
export function socketRateLimitMiddleware() {
  return (socket: any, next: (err?: Error) => void) => {
    // Set up cleanup interval for this socket
    const cleanupInterval = setInterval(() => {
      cleanupOldBuckets();
    }, 300000); // Every 5 minutes

    // Clean up on disconnect
    socket.on('disconnect', () => {
      clearInterval(cleanupInterval);
      
      // Clean up this socket's buckets after a delay
      setTimeout(() => {
        resetRateLimit(socket.id);
      }, 60000); // 1 minute after disconnect
    });

    next();
  };
}

/**
 * Get rate limit statistics for monitoring
 */
export function getRateLimitStats(): {
  totalBuckets: number;
  bucketsPerSocket: Map<string, number>;
  topOffenders: Array<{ socketId: string; eventCount: number }>;
} {
  const bucketsPerSocket = new Map<string, number>();

  for (const key of buckets.keys()) {
    const socketId = key.split(':')[0];
    bucketsPerSocket.set(socketId, (bucketsPerSocket.get(socketId) || 0) + 1);
  }

  const topOffenders = Array.from(bucketsPerSocket.entries())
    .map(([socketId, eventCount]) => ({ socketId, eventCount }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 10);

  return {
    totalBuckets: buckets.size,
    bucketsPerSocket,
    topOffenders,
  };
}

export default {
  checkRateLimit,
  getRateLimitStatus,
  cleanupOldBuckets,
  resetRateLimit,
  getActiveBucketCount,
  rateLimitMiddleware,
  socketRateLimitMiddleware,
  getRateLimitStats,
};
