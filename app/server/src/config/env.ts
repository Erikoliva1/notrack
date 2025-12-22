import { cleanEnv, str, port, bool, num } from 'envalid';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first
// Explicitly specify the path to .env file relative to the server root
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

/**
 * Strict Environment Variable Validation
 * 
 * This module validates all required environment variables at startup.
 * If any required variables are missing or invalid, the server will crash
 * immediately with a clear error message.
 * 
 * Security Benefits:
 * - Prevents running with default/insecure fallback values
 * - Ensures JWT_SECRET is always explicitly set
 * - Validates configuration before server starts
 */

export const env = cleanEnv(process.env, {
  // Server Configuration
  PORT: port({ 
    default: 3000,
    desc: 'Server port number'
  }),
  
  NODE_ENV: str({ 
    choices: ['development', 'production', 'test'],
    default: 'development',
    desc: 'Application environment'
  }),

  // Security - JWT Configuration (REQUIRED - NO FALLBACK)
  JWT_SECRET: str({
    desc: 'Secret key for JWT signing and verification. MUST be changed in production!'
  }),
  
  JWT_EXPIRATION: str({
    default: '24h',
    desc: 'JWT token expiration time'
  }),

  // CORS Configuration
  ALLOWED_ORIGINS: str({
    default: 'http://localhost:5173,http://localhost:3000',
    desc: 'Comma-separated list of allowed CORS origins'
  }),

  // Guest Access Feature Flag
  ENABLE_GUEST_ACCESS: bool({
    default: false,
    desc: 'Allow connections without JWT authentication. Set to false in production!'
  }),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: num({
    default: 15000,
    desc: 'Rate limit window in milliseconds'
  }),
  
  RATE_LIMIT_MAX_REQUESTS: num({
    default: 50,
    desc: 'Maximum requests per rate limit window'
  }),

  // SSL/TLS Configuration
  USE_HTTPS: bool({
    default: false,
    desc: 'Enable HTTPS/WSS protocol'
  }),
  
  SSL_KEY_PATH: str({
    default: './cert/key.pem',
    desc: 'Path to SSL private key file'
  }),
  
  SSL_CERT_PATH: str({
    default: './cert/cert.pem',
    desc: 'Path to SSL certificate file'
  }),

  // Connection Management
  CONNECTION_TIMEOUT_MS: num({
    default: 1800000,
    desc: 'Connection timeout in milliseconds (default: 30 minutes)'
  }),
  
  HEARTBEAT_INTERVAL_MS: num({
    default: 30000,
    desc: 'Heartbeat interval in milliseconds (default: 30 seconds)'
  }),

  // Error Tracking & Monitoring
  SENTRY_DSN: str({
    default: '',
    desc: 'Sentry DSN for error tracking and performance monitoring (optional)'
  }),

  SENTRY_ENVIRONMENT: str({
    default: 'development',
    desc: 'Sentry environment name (development, staging, production)'
  }),

  SENTRY_TRACES_SAMPLE_RATE: num({
    default: 1.0,
    desc: 'Sentry traces sample rate (0.0 to 1.0). Lower in production to reduce data volume.'
  }),

  // Redis Configuration
  REDIS_HOST: str({
    default: 'localhost',
    desc: 'Redis server host address'
  }),

  REDIS_PORT: port({
    default: 6379,
    desc: 'Redis server port'
  }),

  REDIS_PASSWORD: str({
    default: '',
    desc: 'Redis authentication password (optional)'
  }),

  REDIS_DB: num({
    default: 0,
    desc: 'Redis database number (0-15)'
  }),

  USE_REDIS: bool({
    default: false,
    desc: 'Enable Redis for persistent storage and horizontal scaling'
  }),

  // API Documentation
  ENABLE_API_DOCS: bool({
    default: false,
    desc: 'Enable Swagger API documentation endpoint at /api-docs'
  })
});

/**
 * Validate critical security settings
 */
function validateSecurityConfig(): void {
  const criticalErrors: string[] = [];
  const warnings: string[] = [];

  // Check JWT_SECRET is not a common weak value (CRITICAL - blocks startup)
  const weakSecrets = [
    'change-me',
    'default-secret-change-me',
    'secret',
    'your-secret-key',
    'dev-secret'
  ];

  if (weakSecrets.some(weak => env.JWT_SECRET.toLowerCase().includes(weak))) {
    criticalErrors.push(
      `⚠️  CRITICAL: JWT_SECRET contains a weak/default value. ` +
      `Please set a strong, unique secret in production!`
    );
  }

  // Warn if guest access is enabled in production (WARNING - allows startup)
  if (env.NODE_ENV === 'production' && env.ENABLE_GUEST_ACCESS) {
    warnings.push(
      `⚠️  INFO: ENABLE_GUEST_ACCESS is true in production. ` +
      `This allows unauthenticated connections for the calling app.`
    );
  }

  // Info about HTTPS in production (non-blocking)
  if (env.NODE_ENV === 'production' && !env.USE_HTTPS) {
    warnings.push(
      `ℹ️  INFO: HTTPS is disabled. This is normal when using Railway/proxy SSL termination.`
    );
  }

  // Log warnings (non-blocking)
  if (warnings.length > 0) {
    console.warn('\n════════════════════════════════════════════════');
    console.warn('⚠️  SECURITY CONFIGURATION INFO');
    console.warn('════════════════════════════════════════════════');
    warnings.forEach(warning => console.warn(warning));
    console.warn('════════════════════════════════════════════════\n');
  }

  // Log critical errors and block startup
  if (criticalErrors.length > 0) {
    console.error('\n════════════════════════════════════════════════');
    console.error('❌ CRITICAL SECURITY ISSUES');
    console.error('════════════════════════════════════════════════');
    criticalErrors.forEach(error => console.error(error));
    console.error('════════════════════════════════════════════════\n');
    
    throw new Error('Critical security issues detected - server startup blocked');
  }
}

// Run validation
validateSecurityConfig();

// Log successful validation
console.log('✅ Environment variables validated successfully');
console.log(`   Environment: ${env.NODE_ENV}`);
console.log(`   Port: ${env.PORT}`);
console.log(`   Guest Access: ${env.ENABLE_GUEST_ACCESS ? 'ENABLED' : 'DISABLED'}`);
console.log(`   HTTPS: ${env.USE_HTTPS ? 'ENABLED' : 'DISABLED'}`);
