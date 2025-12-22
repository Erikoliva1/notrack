/**
 * Winston Logger Configuration
 * 
 * Structured JSON logging for production observability.
 * 
 * Features:
 * - Colorized console output for development
 * - JSON file logging for production
 * - Automatic log rotation
 * - Error-specific log file
 * - Contextual metadata support
 * - Request ID tracking
 * 
 * Usage:
 * ```typescript
 * import { logger } from './utils/logger';
 * 
 * logger.info('User connected', { socketId: 'abc123', extension: '123-456' });
 * logger.error('Connection failed', { error: err.message, socketId: 'abc123' });
 * logger.warn('Rate limit exceeded', { socketId: 'abc123', event: 'call-user' });
 * ```
 */

import winston from 'winston';
import { env } from '../config/env';

/**
 * Custom log format for console (development)
 * Colorized and human-readable
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      // Remove timestamp from metadata (already displayed)
      const { timestamp: _, ...cleanMeta } = metadata;
      if (Object.keys(cleanMeta).length > 0) {
        msg += ` ${JSON.stringify(cleanMeta)}`;
      }
    }
    
    return msg;
  })
);

/**
 * Custom log format for files (production)
 * Structured JSON for easy parsing
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: {
    service: 'webrtc-calling-server',
    environment: env.NODE_ENV,
  },
  transports: [],
});

/**
 * Console transport for all environments
 * Colorized in development, JSON in production
 */
if (env.NODE_ENV === 'production') {
  // Production: JSON format to console (for cloud logging services)
  logger.add(
    new winston.transports.Console({
      format: fileFormat,
    })
  );
} else {
  // Development: Colorized, human-readable format
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

/**
 * File transports for production
 * Separate files for errors and combined logs
 */
if (env.NODE_ENV === 'production') {
  // Error-specific log file
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // Combined log file (all levels)
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    })
  );
}

/**
 * Helper function to log socket events
 * Standardized format for socket-related logs
 * Now includes Request ID tracking
 */
export function logSocketEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  data: {
    socketId: string;
    extension?: string;
    targetExtension?: string;
    message?: string;
    error?: string;
    requestId?: string;
    [key: string]: any;
  }
): void {
  const { socketId, extension, targetExtension, message, error, requestId, ...metadata } = data;

  const logData: any = {
    event,
    socketId,
    ...metadata,
  };

  if (extension) logData.extension = extension;
  if (targetExtension) logData.targetExtension = targetExtension;
  if (error) logData.error = error;
  if (requestId) logData.requestId = requestId;

  const logMessage = message || `Socket event: ${event}`;

  logger[level](logMessage, logData);
}

/**
 * Helper function to log connection events
 * Now includes Request ID tracking
 */
export function logConnection(
  action: 'connect' | 'disconnect',
  socketId: string,
  metadata: Record<string, any> = {}
): void {
  logger.info(`Client ${action}`, {
    action,
    socketId,
    ...metadata,
  });
}

/**
 * Helper function to log security events
 * Now includes Request ID tracking for HTTP request correlation
 */
export function logSecurityEvent(
  type: 'rate_limit' | 'validation_failed' | 'sanitization_failed' | 'attack_detected',
  socketId: string,
  details: Record<string, any> = {}
): void {
  logger.warn('Security event', {
    type,
    socketId,
    ...details,
  });
}

/**
 * Helper function to log performance metrics
 */
export function logPerformance(
  metric: string,
  value: number,
  unit: 'ms' | 'seconds' | 'bytes' | 'count',
  metadata: Record<string, any> = {}
): void {
  logger.info('Performance metric', {
    metric,
    value,
    unit,
    ...metadata,
  });
}

/**
 * Helper function to log errors with stack traces
 * Now includes Request ID tracking for better debugging
 */
export function logError(
  message: string,
  error: Error | unknown,
  metadata: Record<string, any> = {}
): void {
  const errorData: any = {
    message,
    ...metadata,
  };

  if (error instanceof Error) {
    errorData.error = error.message;
    errorData.stack = error.stack;
    errorData.name = error.name;
  } else {
    errorData.error = String(error);
  }

  logger.error(message, errorData);
}

/**
 * Stream for Morgan HTTP logging middleware
 */
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Export the logger instance
 */
export { logger };

/**
 * Export default for convenience
 */
export default logger;
