/**
 * Sentry Instrumentation
 * 
 * CRITICAL: This file must be imported FIRST in index.ts before any other imports.
 * This ensures Sentry can properly instrument Express and other libraries.
 * 
 * Sentry v8 requires initialization to happen before importing frameworks like Express.
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { cleanEnv, str, num } from 'envalid';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Quick env validation for Sentry
const env = cleanEnv(process.env, {
  SENTRY_DSN: str({ default: '' }),
  SENTRY_ENVIRONMENT: str({ default: 'development' }),
  SENTRY_TRACES_SAMPLE_RATE: num({ default: 1.0 }),
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
});

// Initialize Sentry BEFORE any other imports
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    
    // Performance Monitoring
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    
    // Profiling
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // Sentry v8: Use functional integrations
      Sentry.httpIntegration(),
      nodeProfilingIntegration(),
    ],
  });

  console.log('✅ Sentry initialized for server error tracking');
} else {
  console.warn('⚠️  Sentry DSN not configured. Server error tracking disabled.');
}

// Export Sentry instance for use in other files
export { Sentry };
