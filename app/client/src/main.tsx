import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

/**
 * Initialize Sentry for client-side error tracking and performance monitoring
 * 
 * Environment Variables Required:
 * - VITE_SENTRY_DSN: Your Sentry project DSN
 * - VITE_SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 * 
 * Features Enabled:
 * - Error tracking with stack traces
 * - Performance monitoring (Web Vitals, HTTP requests)
 * - Session replay (optional, can be enabled)
 * - React component profiling
 */
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    
    // Performance Monitoring
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),
      
      // Replay integration for session recording (optional)
      Sentry.replayIntegration({
        maskAllText: true, // Mask text for privacy
        blockAllMedia: true, // Block media for privacy
      }),
    ],
    
    // Performance Monitoring - Sample rate (0.0 to 1.0)
    // 1.0 = 100% of transactions are sent
    // Lower in production to reduce data volume
    tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Session Replay - Sample rate
    // Only capture replays for sessions with errors in production
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'canvas.contentDocument',
      // Network errors that aren't actionable
      'NetworkError',
      'Network request failed',
      // AbortError from cancelled requests
      'AbortError',
    ],
    
    // Additional context
    beforeSend(event, hint) {
      // Add custom context
      if (event.exception) {
        console.error('Sentry captured error:', hint.originalException);
      }
      return event;
    },
    
    // Release tracking (set via build process)
    release: import.meta.env.VITE_APP_VERSION || 'development',
  });

  console.log('✅ Sentry initialized for error tracking');
} else {
  console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
}

/**
 * Main Application Entry Point
 * 
 * ARCHITECTURE CHANGE:
 * - App.tsx now contains ALL routing logic
 * - HelmetProvider moved into App.tsx
 * - ErrorBoundary moved into App.tsx
 * - Simplified main.tsx to bare minimum
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
