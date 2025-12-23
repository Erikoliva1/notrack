/**
 * Custom Error Classes for WebRTC Application
 * 
 * Provides structured error handling with:
 * - Error codes for programmatic handling
 * - User-friendly messages for UI display
 * - Original error preservation for debugging
 * 
 * Usage:
 * ```typescript
 * try {
 *   await getUserMedia();
 * } catch (error) {
 *   throw new MicrophoneAccessError(error);
 * }
 * ```
 */

/**
 * Base WebRTC Error Class
 * All custom errors extend from this base class
 */
export class WebRTCError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public originalError?: Error | unknown
  ) {
    super(message);
    this.name = 'WebRTCError';
    
    // Maintain proper stack trace for debugging (V8 engines only)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get user-friendly error message for display
   */
  getUserMessage(): string {
    return this.userMessage;
  }

  /**
   * Get error code for programmatic handling
   */
  getCode(): string {
    return this.code;
  }

  /**
   * Serialize error for logging/monitoring
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      userMessage: this.userMessage,
      stack: this.stack,
      originalError: this.originalError instanceof Error 
        ? this.originalError.message 
        : String(this.originalError),
    };
  }
}

/**
 * Microphone Access Error
 * Thrown when getUserMedia fails due to permission issues
 */
export class MicrophoneAccessError extends WebRTCError {
  constructor(originalError: Error | unknown) {
    const errorName = originalError instanceof Error ? originalError.name : 'Unknown';
    
    let userMessage = 'Could not access microphone. Please check your device and permissions.';
    let code = 'MICROPHONE_ERROR';

    // Provide specific messages based on error type
    if (errorName === 'NotFoundError') {
      userMessage = 'No microphone found. Please connect a microphone and try again.';
      code = 'MICROPHONE_NOT_FOUND';
    } else if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      userMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
      code = 'MICROPHONE_ACCESS_DENIED';
    } else if (errorName === 'NotReadableError') {
      userMessage = 'Microphone is already in use by another application. Please close other apps and try again.';
      code = 'MICROPHONE_IN_USE';
    } else if (errorName === 'OverconstrainedError') {
      userMessage = 'No microphone meets the required specifications.';
      code = 'MICROPHONE_CONSTRAINTS_ERROR';
    } else if (errorName === 'AbortError') {
      userMessage = 'Microphone access was aborted.';
      code = 'MICROPHONE_ABORTED';
    } else if (errorName === 'SecurityError') {
      userMessage = 'Microphone access blocked by security policy. Please use HTTPS.';
      code = 'MICROPHONE_SECURITY_ERROR';
    }

    super(
      `Microphone access failed: ${errorName}`,
      code,
      userMessage,
      originalError
    );
    this.name = 'MicrophoneAccessError';
  }
}

/**
 * Peer Connection Error
 * Thrown when WebRTC peer connection fails
 */
export class PeerConnectionError extends WebRTCError {
  constructor(message: string, originalError?: Error | unknown) {
    super(
      `Peer connection failed: ${message}`,
      'PEER_CONNECTION_FAILED',
      'Unable to establish connection. Please check your network and try again.',
      originalError
    );
    this.name = 'PeerConnectionError';
  }
}

/**
 * ICE Connection Error
 * Thrown when ICE candidate gathering or connection fails
 */
export class ICEConnectionError extends WebRTCError {
  constructor(message: string, originalError?: Error | unknown) {
    super(
      `ICE connection failed: ${message}`,
      'ICE_CONNECTION_FAILED',
      'Connection failed. This may be due to firewall or network restrictions.',
      originalError
    );
    this.name = 'ICEConnectionError';
  }
}

/**
 * Signaling Error
 * Thrown when Socket.IO signaling fails
 */
export class SignalingError extends WebRTCError {
  constructor(message: string, originalError?: Error | unknown) {
    super(
      `Signaling failed: ${message}`,
      'SIGNALING_FAILED',
      'Unable to connect to signaling server. Please check your internet connection.',
      originalError
    );
    this.name = 'SignalingError';
  }
}

/**
 * Call Setup Error
 * Thrown when call setup (offer/answer) fails
 */
export class CallSetupError extends WebRTCError {
  constructor(phase: 'offer' | 'answer', originalError?: Error | unknown) {
    super(
      `Call setup failed during ${phase} phase`,
      `CALL_SETUP_${phase.toUpperCase()}_FAILED`,
      `Unable to ${phase === 'offer' ? 'initiate' : 'accept'} call. Please try again.`,
      originalError
    );
    this.name = 'CallSetupError';
  }
}

/**
 * Recording Error
 * Thrown when call recording fails
 */
export class RecordingError extends WebRTCError {
  constructor(message: string, originalError?: Error | unknown) {
    super(
      `Recording failed: ${message}`,
      'RECORDING_FAILED',
      'Unable to record call. Recording may not be supported in your browser.',
      originalError
    );
    this.name = 'RecordingError';
  }
}

/**
 * Browser Support Error
 * Thrown when browser doesn't support required features
 */
export class BrowserSupportError extends WebRTCError {
  constructor(feature: string) {
    super(
      `Browser does not support ${feature}`,
      'BROWSER_NOT_SUPPORTED',
      `Your browser does not support ${feature}. Please use a modern browser like Chrome, Firefox, or Safari.`,
    );
    this.name = 'BrowserSupportError';
  }
}

/**
 * Network Error
 * Thrown when network-related issues occur
 */
export class NetworkError extends WebRTCError {
  constructor(message: string, originalError?: Error | unknown) {
    super(
      `Network error: ${message}`,
      'NETWORK_ERROR',
      'Network connection issue. Please check your internet connection and try again.',
      originalError
    );
    this.name = 'NetworkError';
  }
}

/**
 * Error Factory
 * Creates appropriate error based on the error type
 */
export class ErrorFactory {
  /**
   * Create appropriate error from generic error
   */
  static createFromError(error: Error | unknown, context?: string): WebRTCError {
    // If it's already a WebRTCError, return it
    if (error instanceof WebRTCError) {
      return error;
    }

    // Handle specific error types
    if (error instanceof Error) {
      const errorName = error.name;

      // MediaDevices errors
      if (errorName.includes('NotAllowed') || 
          errorName.includes('NotFound') || 
          errorName.includes('NotReadable') ||
          errorName.includes('Overconstrained')) {
        return new MicrophoneAccessError(error);
      }

      // Network errors
      if (errorName.includes('Network') || errorName.includes('Timeout')) {
        return new NetworkError(error.message, error);
      }
    }

    // Generic WebRTC error
    return new WebRTCError(
      error instanceof Error ? error.message : String(error),
      'UNKNOWN_ERROR',
      context || 'An unexpected error occurred. Please try again.',
      error
    );
  }
}

/**
 * Error Handler Utility
 * Centralized error handling and logging
 */
export class ErrorHandler {
  /**
   * Handle error with optional callback
   */
  static handle(
    error: Error | unknown,
    onError?: (error: WebRTCError) => void,
    context?: string
  ): WebRTCError {
    const webRTCError = ErrorFactory.createFromError(error, context);

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error(`[${webRTCError.name}]`, webRTCError.toJSON());
    }

    // Call error callback if provided
    if (onError) {
      onError(webRTCError);
    }

    return webRTCError;
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: WebRTCError): boolean {
    const recoverableCodes = [
      'NETWORK_ERROR',
      'SIGNALING_FAILED',
      'PEER_CONNECTION_FAILED',
    ];

    return recoverableCodes.includes(error.code);
  }

  /**
   * Get retry delay for recoverable errors
   */
  static getRetryDelay(error: WebRTCError, attempt: number): number {
    if (!this.isRecoverable(error)) {
      return 0;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
    return Math.min(1000 * Math.pow(2, attempt), 16000);
  }
}
