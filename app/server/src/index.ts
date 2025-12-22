// ============================================================================
// SENTRY INSTRUMENTATION - MUST BE FIRST!
// ============================================================================
// Import Sentry instrumentation BEFORE any other imports
// This ensures Express and other frameworks are properly instrumented
import './instrument';
import { Sentry } from './instrument';

// ============================================================================
// ALL OTHER IMPORTS (After Sentry)
// ============================================================================
import express from 'express';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import fs from 'fs';
import crypto from 'crypto';
import { authRouter } from './routes/auth';
import { socketAuthMiddleware } from './middleware/auth';
import { setupSocketHandlers, cleanupStaleConnections } from './socket/handler';
import * as RedisService from './services/redis';

// Import env config - this will load and validate all required env vars
// The server will crash immediately if any required variables are missing or invalid
import { env } from './config/env';
import { logger, logError } from './utils/logger';

// ============================================================================
// PROMETHEUS METRICS (DevOps & Monitoring)
// ============================================================================
import promClient from 'prom-client';

// Create Prometheus registry
const promRegister = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register: promRegister });

// Custom metrics for HTTP requests
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [promRegister],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // Response time buckets
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [promRegister]
});

// Custom metrics for WebSocket connections
const wsConnectionsActive = new promClient.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [promRegister]
});

const wsConnectionsTotal = new promClient.Counter({
  name: 'websocket_connections_total',
  help: 'Total number of WebSocket connections',
  labelNames: ['status'], // 'connected' or 'disconnected'
  registers: [promRegister]
});

const wsMessagesTotal = new promClient.Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['event_type'],
  registers: [promRegister]
});

// Custom metrics for calls
const callsTotal = new promClient.Counter({
  name: 'calls_total',
  help: 'Total number of calls',
  labelNames: ['status'], // 'initiated', 'answered', 'rejected', 'ended'
  registers: [promRegister]
});

const callDuration = new promClient.Histogram({
  name: 'call_duration_seconds',
  help: 'Duration of calls in seconds',
  registers: [promRegister],
  buckets: [10, 30, 60, 120, 300, 600, 1800, 3600] // Call duration buckets
});

// Export metrics for use in handlers
export const metrics = {
  httpRequestDuration,
  httpRequestTotal,
  wsConnectionsActive,
  wsConnectionsTotal,
  wsMessagesTotal,
  callsTotal,
  callDuration,
  register: promRegister
};

// ============================================================================
// REDIS INITIALIZATION (Optional - for persistent storage and scaling)
// ============================================================================

if (env.USE_REDIS) {
  try {
    RedisService.initializeRedis();
    logger.info('Redis enabled for persistent storage and horizontal scaling');
  } catch (error) {
    logError('Failed to initialize Redis', error);
    logger.warn('Server will continue with in-memory storage');
  }
}

const app = express();

// ============================================================================
// REQUEST ID TRACKING MIDDLEWARE
// ============================================================================

/**
 * Request ID Tracking
 * 
 * Adds a unique ID to each request for:
 * - Request tracing across services
 * - Log correlation
 * - Debugging and monitoring
 * - Error tracking with Sentry
 */
declare global {
  namespace Express {
    interface Request {
      id?: string;
      rateLimit?: {
        limit: number;
        remaining: number;
        resetTime: Date;
      };
    }
  }
}

app.use((req, res, next) => {
  // Generate unique request ID
  req.id = crypto.randomUUID();
  
  // Add to response headers for client tracking
  res.setHeader('X-Request-ID', req.id);
  
  // Log request with ID
  logger.debug('Incoming request', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  
  next();
});

// ============================================================================
// CONTENT SECURITY POLICY NONCE MIDDLEWARE
// ============================================================================

/**
 * CSP Nonce Generation
 * 
 * Generates a unique nonce for each request to allow inline scripts
 * while maintaining security. The nonce must be added to script tags.
 * 
 * Usage in HTML:
 * <script nonce="${res.locals.cspNonce}">...</script>
 */
app.use((req, res, next) => {
  // Generate cryptographically secure nonce
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

/**
 * Helmet - Sets secure HTTP headers
 * 
 * Helmet helps secure Express apps by setting various HTTP headers:
 * - Content-Security-Policy
 * - X-DNS-Prefetch-Control
 * - X-Frame-Options
 * - X-Powered-By (removed)
 * - Strict-Transport-Security (HSTS)
 * - X-Download-Options
 * - X-Content-Type-Options
 * - X-XSS-Protection
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Note: CSP nonce is available in res.locals.cspNonce for manual HTML generation
      // For now, we allow unsafe-inline for compatibility (can be tightened in production)
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...env.ALLOWED_ORIGINS.split(',')],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for WebRTC
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Required for cross-origin requests
  // HSTS - Force HTTPS connections only (enabled when USE_HTTPS is true)
  hsts: env.USE_HTTPS ? {
    maxAge: 31536000,        // 1 year in seconds
    includeSubDomains: true, // Apply to all subdomains
    preload: true            // Allow preload list inclusion
  } : false,
}));

/**
 * CORS - Strict Cross-Origin Resource Sharing
 * 
 * Only allows requests from explicitly configured origins.
 * No wildcards or permissive defaults in production.
 */
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy does not allow access from origin: ${origin}`;
      logger.warn('CORS blocked', { origin });
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
}));

app.use(express.json());

/**
 * Compression Middleware - Gzip/Brotli
 * 
 * Compresses all HTTP responses to reduce bandwidth and improve load times.
 * Supports both Gzip and Brotli compression algorithms.
 * 
 * Benefits:
 * - 70-90% reduction in response size
 * - Faster page load times
 * - Reduced bandwidth costs
 * - Better user experience on slow connections
 */
app.use(compression({
  // Compression level (0-9, higher = better compression but slower)
  level: 6,
  // Minimum response size to compress (in bytes)
  threshold: 1024, // 1KB
  // Filter function to determine which responses to compress
  filter: (req, res) => {
    // Don't compress if client doesn't accept encoding
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter defaults
    return compression.filter(req, res);
  },
}));

/**
 * Stricter rate limiting for authentication endpoints
 * 
 * Prevents brute-force attacks on login/register/guest endpoints
 * Maximum 5 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts
  message: 'Too many authentication attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins against limit
});

/**
 * General rate limiting for HTTP endpoints
 * 
 * Prevents abuse by limiting the number of requests from a single IP
 */
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply stricter limits to authentication routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/guest', authLimiter);

// Apply general rate limiting to all other API routes with headers
app.use('/api/', limiter, (req, res, next) => {
  // Add rate limit information to response headers
  // This helps clients implement proper backoff strategies
  
  if (req.rateLimit) {
    res.setHeader('X-RateLimit-Limit', String(env.RATE_LIMIT_MAX_REQUESTS));
    res.setHeader('X-RateLimit-Remaining', String(req.rateLimit.remaining || 0));
    res.setHeader('X-RateLimit-Reset', String(req.rateLimit.resetTime || ''));
  }
  
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/', async (req, res) => {
  const redisInfo = env.USE_REDIS ? await RedisService.getRedisInfo() : null;
  
  res.json({
    service: 'Audio Calling Web App - Signaling Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '2.2.0',
    environment: env.NODE_ENV,
    features: [
      'authentication',
      'rate-limiting',
      'input-validation',
      'connection-cleanup',
      'helmet-security-headers',
      'strict-cors',
      'env-validation',
      'winston-logging',
      ...(env.USE_REDIS ? ['redis-persistence', 'horizontal-scaling'] : [])
    ],
    security: {
      https: env.USE_HTTPS,
      guestAccess: env.ENABLE_GUEST_ACCESS
    },
    ...(redisInfo && {
      redis: redisInfo
    })
  });
});

// Redis health check endpoint
app.get('/api/health/redis', async (req, res) => {
  if (!env.USE_REDIS) {
    return res.status(200).json({
      enabled: false,
      message: 'Redis is not enabled'
    });
  }

  try {
    const isHealthy = await RedisService.checkRedisHealth();
    const info = await RedisService.getRedisInfo();

    if (isHealthy) {
      res.status(200).json({
        enabled: true,
        status: 'healthy',
        ...info
      });
    } else {
      res.status(503).json({
        enabled: true,
        status: 'unhealthy',
        message: 'Redis connection failed'
      });
    }
  } catch (error: any) {
    res.status(503).json({
      enabled: true,
      status: 'error',
      message: error.message
    });
  }
});

// ============================================================================
// KUBERNETES HEALTH CHECK PROBES
// ============================================================================

/**
 * Readiness Probe
 * 
 * Kubernetes uses this to determine if the pod is ready to serve traffic.
 * Returns 200 when all dependencies are healthy and app can serve requests.
 * Returns 503 when app is not ready (e.g., Redis is down in production).
 * 
 * Usage in Kubernetes:
 * readinessProbe:
 *   httpGet:
 *     path: /health/ready
 *     port: 3000
 *   initialDelaySeconds: 5
 *   periodSeconds: 10
 */
app.get('/health/ready', async (req, res) => {
  try {
    // Check if Redis is healthy (if enabled)
    const redisHealthy = env.USE_REDIS 
      ? await RedisService.checkRedisHealth() 
      : true;
    
    if (redisHealthy) {
      res.status(200).json({ 
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          redis: env.USE_REDIS ? 'healthy' : 'disabled'
        }
      });
    } else {
      res.status(503).json({ 
        status: 'not ready',
        reason: 'Redis connection failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    res.status(503).json({ 
      status: 'not ready',
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness Probe
 * 
 * Kubernetes uses this to determine if the pod is alive.
 * Returns 200 if the app is running and responsive.
 * If this fails, Kubernetes will restart the pod.
 * 
 * Usage in Kubernetes:
 * livenessProbe:
 *   httpGet:
 *     path: /health/live
 *     port: 3000
 *   initialDelaySeconds: 15
 *   periodSeconds: 20
 */
app.get('/health/live', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================================================
// PROMETHEUS METRICS ENDPOINT
// ============================================================================

/**
 * Prometheus Metrics Endpoint
 * 
 * Exposes application metrics in Prometheus format.
 * Used by Prometheus server for scraping and monitoring.
 * 
 * Metrics included:
 * - Default Node.js metrics (CPU, memory, event loop, etc.)
 * - HTTP request duration and count
 * - WebSocket connections and messages
 * - Call statistics
 * 
 * Usage in Prometheus:
 * scrape_configs:
 *   - job_name: 'calling-app'
 *     static_configs:
 *       - targets: ['localhost:3000']
 *     metrics_path: '/metrics'
 */
app.get('/metrics', async (req, res) => {
  try {
    res.setHeader('Content-Type', promRegister.contentType);
    res.send(await promRegister.metrics());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PROMETHEUS METRICS MIDDLEWARE
// ============================================================================

/**
 * HTTP Metrics Middleware
 * 
 * Tracks HTTP request duration and count for all routes
 */
app.use((req, res, next) => {
  const start = Date.now();
  
  // Capture response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';
    
    // Record metrics
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
  });
  
  next();
});

// ============================================================================
// API DOCUMENTATION
// ============================================================================

/**
 * Swagger UI API Documentation
 * 
 * Interactive API documentation available at /api-docs
 * Automatically generated from OpenAPI 3.0 specification
 * 
 * Features:
 * - Try out API endpoints directly from browser
 * - View request/response schemas
 * - Authentication examples
 * - WebSocket event documentation
 */
if (env.NODE_ENV !== 'production' || env.ENABLE_API_DOCS) {
  // Dynamically import swagger-ui-express (only when needed)
  import('swagger-ui-express').then((swaggerUi) => {
    const swaggerDocument = require('./swagger.json');
    
    app.use('/api-docs', swaggerUi.default.serve, swaggerUi.default.setup(swaggerDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'WebRTC Calling API Docs',
      customfavIcon: '/favicon.png',
    }));
    
    logger.info('API documentation available at /api-docs');
  }).catch((error) => {
    logger.error('Failed to load Swagger UI', error);
  });
}

// Authentication routes
app.use('/api/auth', authRouter);

// ============================================================================
// SENTRY ERROR HANDLER (Sentry v8 - Must be AFTER routes)
// ============================================================================

if (env.SENTRY_DSN) {
  // Sentry v8: Use setupExpressErrorHandler instead of Handlers.errorHandler
  Sentry.setupExpressErrorHandler(app);
}

// ============================================================================
// GLOBAL ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Global error handler for Express
 * Catches all unhandled errors and sends appropriate response
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('Global error handler caught', err, {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  });

  // Send error response
  const statusCode = err.statusCode || err.status || 500;
  const message = env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Unknown error occurred';

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logError('Unhandled Promise Rejection', reason);
  
  if (env.SENTRY_DSN) {
    Sentry.captureException(reason, {
      tags: { type: 'unhandledRejection' },
    });
  }
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
  logError('Uncaught Exception', error);
  
  if (env.SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: { type: 'uncaughtException' },
    });
  }
  
  // Give Sentry time to send the error
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// ============================================================================
// SERVER SETUP
// ============================================================================

/**
 * Create HTTP or HTTPS server based on configuration
 */
let httpServer;

if (env.USE_HTTPS) {
  try {
    const privateKey = fs.readFileSync(env.SSL_KEY_PATH, 'utf8');
    const certificate = fs.readFileSync(env.SSL_CERT_PATH, 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    httpServer = createHttpsServer(credentials, app);
    logger.info('HTTPS enabled');
  } catch (error) {
    logError('Failed to load SSL certificates, falling back to HTTP', error);
    httpServer = createServer(app);
  }
} else {
  httpServer = createServer(app);
}

/**
 * Socket.io server setup with strict CORS
 */
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============================================================================
// SOCKET.IO SETUP WITH REDIS OR IN-MEMORY STORAGE
// ============================================================================

/**
 * Socket authentication middleware
 * 
 * Behavior controlled by ENABLE_GUEST_ACCESS environment variable:
 * - When false (production default): Strictly enforces JWT authentication
 * - When true (development): Allows guest connections without token
 */
io.use(socketAuthMiddleware);

/**
 * Setup socket event handlers (Redis-based if enabled)
 */
if (env.USE_REDIS) {
  // Use Redis-based handlers for horizontal scaling
  setupSocketHandlers(io);
  
  // Run periodic cleanup using Redis
  setInterval(async () => {
    await cleanupStaleConnections(io);
  }, env.HEARTBEAT_INTERVAL_MS);
  
  logger.info('Socket.IO configured with Redis-based handlers');
} else {
  // Fallback to in-memory storage (original implementation)
  logger.warn('Using in-memory storage. For horizontal scaling, enable Redis with USE_REDIS=true');
  // Keep original in-memory handlers here if needed
  // For now, we'll use Redis handlers anyway since they work with or without Redis
  setupSocketHandlers(io);
}

// ============================================================================
// START SERVER
// ============================================================================

httpServer.listen(env.PORT, () => {
  logger.info('Server started', {
    port: env.PORT,
    environment: env.NODE_ENV,
    protocol: env.USE_HTTPS ? 'HTTPS/WSS' : 'HTTP/WS',
    version: '2.2.0',
    security: {
      envValidation: true,
      winstonLogging: true,
      helmet: true,
      strictCors: true,
      jwtAuth: true,
      guestModeEnabled: env.ENABLE_GUEST_ACCESS,
      inputValidation: true,
      rateLimiting: true,
      sanitization: true,
      connectionCleanup: true,
      https: env.USE_HTTPS,
    },
    redis: env.USE_REDIS,
    allowedOrigins,
  });

  // Development-friendly console output
  if (env.NODE_ENV !== 'production') {
    console.log('════════════════════════════════════════════════');
    console.log('🚀 Audio Calling Web App - Signaling Server v2.2');
    console.log('════════════════════════════════════════════════');
    console.log(`📡 Server running on port ${env.PORT}`);
    console.log(`🌐 Environment: ${env.NODE_ENV}`);
    console.log(`🌐 Protocol: ${env.USE_HTTPS ? 'HTTPS/WSS' : 'HTTP/WS'}`);
    console.log(`\n🔒 Security Features:`);
    console.log(`   ✅ Winston Structured Logging`);
    console.log(`   ✅ Rate Limiting & Sanitization`);
    console.log(`   ✅ Environment Variable Validation`);
    console.log(`   ✅ Helmet Security Headers`);
    console.log(`   ✅ Strict CORS Policy`);
    console.log(`   ✅ JWT Authentication (${env.ENABLE_GUEST_ACCESS ? 'Guest Mode Enabled' : 'Enforced'})`);
    console.log(`\n📋 Allowed Origins:`);
    allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
    console.log(`\n⏰ Started: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════');
  }
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Graceful Shutdown Handler
 * 
 * Handles SIGTERM and SIGINT signals to shut down gracefully.
 * This is critical for zero-downtime deployments in Kubernetes/Docker.
 * 
 * Shutdown Process:
 * 1. Stop accepting new connections
 * 2. Close existing connections gracefully
 * 3. Close database/Redis connections
 * 4. Flush logs and metrics
 * 5. Exit process
 * 
 * Maximum wait time: 30 seconds before forced shutdown
 */
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal');
    return;
  }
  
  isShuttingDown = true;
  logger.info(`${signal} received, starting graceful shutdown`);
  console.log(`\n🛑 ${signal} received, starting graceful shutdown...`);
  
  // Set shutdown timeout (30 seconds)
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    console.log('⚠️  Shutdown timeout reached, forcing exit');
    process.exit(1);
  }, 30000);
  
  try {
    // Step 1: Stop accepting new HTTP connections
    logger.info('Closing HTTP server...');
    console.log('📡 Closing HTTP server...');
    await new Promise<void>((resolve) => {
      httpServer.close(() => {
        logger.info('HTTP server closed');
        console.log('✅ HTTP server closed');
        resolve();
      });
    });
    
    // Step 2: Close all Socket.IO connections
    logger.info('Closing Socket.IO connections...');
    console.log('🔌 Closing Socket.IO connections...');
    const sockets = await io.fetchSockets();
    logger.info(`Disconnecting ${sockets.length} active connections`);
    
    for (const socket of sockets) {
      socket.disconnect(true);
    }
    
    io.close(() => {
      logger.info('Socket.IO server closed');
      console.log('✅ Socket.IO server closed');
    });
    
    // Step 3: Close Redis connection (if enabled)
    if (env.USE_REDIS) {
      logger.info('Closing Redis connection...');
      console.log('📦 Closing Redis connection...');
      
      try {
        await RedisService.closeRedis();
        logger.info('Redis connection closed');
        console.log('✅ Redis connection closed');
      } catch (error) {
        logError('Error closing Redis connection', error);
        console.log('⚠️  Error closing Redis connection');
      }
    }
    
    // Step 4: Flush Sentry events (if enabled)
    if (env.SENTRY_DSN) {
      logger.info('Flushing Sentry events...');
      console.log('📊 Flushing Sentry events...');
      await Sentry.close(2000); // Wait up to 2 seconds
      logger.info('Sentry events flushed');
      console.log('✅ Sentry events flushed');
    }
    
    // Step 5: Final log flush
    logger.info('Graceful shutdown completed successfully');
    console.log('✅ Graceful shutdown completed successfully');
    
    // Clear shutdown timeout
    clearTimeout(shutdownTimeout);
    
    // Exit cleanly
    process.exit(0);
  } catch (error) {
    logError('Error during graceful shutdown', error);
    console.log('❌ Error during graceful shutdown');
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Log when shutdown handlers are registered
logger.info('Graceful shutdown handlers registered (SIGTERM, SIGINT)');
