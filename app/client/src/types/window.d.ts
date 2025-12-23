/**
 * Window type declarations
 * 
 * Extends the global Window interface with custom properties
 */

import * as Sentry from '@sentry/react';

declare global {
  interface Window {
    /**
     * Sentry instance for error tracking
     * Available globally for manual error capture
     */
    Sentry?: typeof Sentry;
  }
}

export {};
