/**
 * Input Sanitization Utility
 * 
 * Protects against XSS, injection attacks, and malicious input.
 * 
 * Security Features:
 * - HTML/Script tag removal
 * - SQL injection prevention
 * - Path traversal prevention
 * - Control character removal
 * - Length validation
 * - Type validation
 * 
 * Usage:
 * ```typescript
 * const clean = sanitizeString(userInput);
 * const cleanData = sanitizeSocketData(data);
 * ```
 */

import xss from 'xss';

/**
 * XSS filter configuration
 * Very restrictive - allows almost nothing
 */
const xssOptions = {
  whiteList: {}, // No HTML tags allowed
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

/**
 * Maximum lengths for different field types
 */
const MAX_LENGTHS = {
  extension: 20,      // Extension numbers (e.g., "123-456")
  username: 50,       // Usernames
  message: 1000,      // Generic messages
  token: 500,         // JWT tokens
  general: 200,       // General purpose fields
};

/**
 * Patterns for validation
 */
const PATTERNS = {
  // Extension number: digits and hyphens only
  extension: /^[\d-]+$/,
  
  // Alphanumeric with common symbols
  alphanumeric: /^[a-zA-Z0-9\s\-_.@]+$/,
  
  // Path traversal attempts
  pathTraversal: /(\.\.|\/|\\|%2e%2e|%2f|%5c)/i,
  
  // SQL injection patterns
  sqlInjection: /(union|select|insert|update|delete|drop|create|alter|exec|script|javascript|onerror|onclick)/i,
  
  // Control characters (except normal whitespace)
  controlChars: /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g,
};

/**
 * Sanitize a string input
 * 
 * Steps:
 * 1. Type check
 * 2. Convert to string
 * 3. Remove control characters
 * 4. XSS filtering
 * 5. Trim whitespace
 * 6. Length validation
 * 
 * @param input - Raw input string
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(
  input: any,
  maxLength: number = MAX_LENGTHS.general
): string {
  // Type check - return empty string for invalid types
  if (input === null || input === undefined) {
    return '';
  }

  // Convert to string
  let cleaned = String(input);

  // Remove control characters (keep newlines and tabs)
  cleaned = cleaned.replace(PATTERNS.controlChars, '');

  // XSS filtering
  cleaned = xss(cleaned, xssOptions);

  // Trim whitespace
  cleaned = cleaned.trim();

  // Length validation
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
    console.warn(`⚠️  Input truncated to ${maxLength} characters`);
  }

  return cleaned;
}

/**
 * Sanitize extension number
 * More restrictive - only allows digits and hyphens
 * 
 * @param extension - Extension number (e.g., "123-456")
 * @returns Sanitized extension or empty string if invalid
 */
export function sanitizeExtension(extension: any): string {
  const cleaned = sanitizeString(extension, MAX_LENGTHS.extension);

  // Validate format - only digits and hyphens
  if (!PATTERNS.extension.test(cleaned)) {
    console.warn(`⚠️  Invalid extension format: ${cleaned}`);
    return '';
  }

  return cleaned;
}

/**
 * Sanitize username
 * Allows alphanumeric plus common symbols
 * 
 * @param username - Username input
 * @returns Sanitized username
 */
export function sanitizeUsername(username: any): string {
  const cleaned = sanitizeString(username, MAX_LENGTHS.username);

  // Check for SQL injection patterns
  if (PATTERNS.sqlInjection.test(cleaned)) {
    console.warn(`⚠️  Potential SQL injection in username: ${cleaned}`);
    return 'Guest User'; // Safe fallback
  }

  return cleaned || 'Guest User';
}

/**
 * Check for path traversal attempts
 * 
 * @param input - Input to check
 * @returns true if safe, false if path traversal detected
 */
export function isPathTraversalSafe(input: string): boolean {
  return !PATTERNS.pathTraversal.test(input);
}

/**
 * Check for SQL injection attempts
 * 
 * @param input - Input to check
 * @returns true if safe, false if SQL injection detected
 */
export function isSQLInjectionSafe(input: string): boolean {
  return !PATTERNS.sqlInjection.test(input);
}

/**
 * Sanitize object - recursively sanitize all string properties
 * 
 * @param obj - Object to sanitize
 * @param depth - Current recursion depth (prevent infinite loops)
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  depth: number = 0
): T {
  // Prevent infinite recursion
  if (depth > 10) {
    console.warn('⚠️  Max sanitization depth reached');
    return obj;
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'object' ? sanitizeObject(item, depth + 1) : sanitizeString(item)
    ) as any;
  }

  // Handle objects
  if (typeof obj === 'object') {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key (prevent prototype pollution)
      const cleanKey = sanitizeString(key, 100);
      
      // Skip dangerous keys
      if (cleanKey === '__proto__' || cleanKey === 'constructor' || cleanKey === 'prototype') {
        console.warn(`⚠️  Blocked dangerous key: ${cleanKey}`);
        continue;
      }

      // Sanitize value based on type
      if (typeof value === 'string') {
        sanitized[cleanKey] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[cleanKey] = sanitizeObject(value, depth + 1);
      } else {
        sanitized[cleanKey] = value;
      }
    }

    return sanitized as T;
  }

  // Return primitives as-is
  return obj;
}

/**
 * Sanitize socket event data
 * Main entry point for socket handlers
 * 
 * CRITICAL: WebRTC data (offer, answer, candidate) must NOT be sanitized
 * as it contains browser-generated SDP with newlines that must be preserved.
 * 
 * @param data - Raw socket event data
 * @returns Sanitized data
 */
export function sanitizeSocketData<T extends Record<string, any>>(data: T): T {
  if (!data || typeof data !== 'object') {
    console.warn('⚠️  Invalid socket data type');
    return {} as T;
  }

  try {
    // Create a shallow copy to avoid mutating original
    const sanitized: any = {};

    // CRITICAL FIX: Preserve WebRTC data as-is (browser-generated, not user input)
    const webrtcFields = ['offer', 'answer', 'candidate'];

    for (const [key, value] of Object.entries(data)) {
      // Skip sanitization for WebRTC fields - they're browser-generated, not user input
      if (webrtcFields.includes(key)) {
        sanitized[key] = value; // Preserve exactly as-is (with newlines in SDP)
      } 
      // Sanitize user input fields
      else if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } 
      // Recursively sanitize nested objects (but not WebRTC data)
      else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } 
      else {
        sanitized[key] = value;
      }
    }

    // Additional validation for common user input fields
    if ('targetExtension' in sanitized && typeof sanitized.targetExtension === 'string') {
      sanitized.targetExtension = sanitizeExtension(sanitized.targetExtension);
    }

    if ('callerExtension' in sanitized && typeof sanitized.callerExtension === 'string') {
      sanitized.callerExtension = sanitizeExtension(sanitized.callerExtension);
    }

    if ('calleeExtension' in sanitized && typeof sanitized.calleeExtension === 'string') {
      sanitized.calleeExtension = sanitizeExtension(sanitized.calleeExtension);
    }

    if ('username' in sanitized && typeof sanitized.username === 'string') {
      sanitized.username = sanitizeUsername(sanitized.username);
    }

    return sanitized as T;
  } catch (error) {
    console.error('❌ Error sanitizing socket data:', error);
    return {} as T;
  }
}

/**
 * Validate WebRTC offer/answer structure
 * Ensures SDP data is valid
 * 
 * @param sessionDescription - RTCSessionDescription object
 * @returns true if valid, false otherwise
 */
export function isValidSessionDescription(sessionDescription: any): boolean {
  if (!sessionDescription || typeof sessionDescription !== 'object') {
    return false;
  }

  // Must have type and sdp
  if (!sessionDescription.type || !sessionDescription.sdp) {
    return false;
  }

  // Type must be 'offer' or 'answer'
  if (sessionDescription.type !== 'offer' && sessionDescription.type !== 'answer') {
    return false;
  }

  // SDP must be a string
  if (typeof sessionDescription.sdp !== 'string') {
    return false;
  }

  // SDP must start with 'v='
  if (!sessionDescription.sdp.startsWith('v=')) {
    return false;
  }

  return true;
}

/**
 * Validate ICE candidate structure
 * 
 * @param candidate - RTCIceCandidate object
 * @returns true if valid, false otherwise
 */
export function isValidIceCandidate(candidate: any): boolean {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  // Must have candidate string
  if (!candidate.candidate || typeof candidate.candidate !== 'string') {
    return false;
  }

  // Optional but validate if present
  if (candidate.sdpMLineIndex !== undefined && typeof candidate.sdpMLineIndex !== 'number') {
    return false;
  }

  if (candidate.sdpMid !== undefined && typeof candidate.sdpMid !== 'string') {
    return false;
  }

  return true;
}

/**
 * Security check for WebRTC data
 * Validates offer/answer/ice-candidate payloads
 * 
 * @param eventName - Socket event name
 * @param data - Event data
 * @returns true if valid, false otherwise
 */
export function validateWebRTCData(eventName: string, data: any): boolean {
  switch (eventName) {
    case 'call-user':
      if (!data.offer || !isValidSessionDescription(data.offer)) {
        console.warn('⚠️  Invalid offer in call-user event');
        return false;
      }
      if (!data.targetExtension) {
        console.warn('⚠️  Missing targetExtension in call-user event');
        return false;
      }
      return true;

    case 'answer-call':
      if (!data.answer || !isValidSessionDescription(data.answer)) {
        console.warn('⚠️  Invalid answer in answer-call event');
        return false;
      }
      if (!data.callerExtension) {
        console.warn('⚠️  Missing callerExtension in answer-call event');
        return false;
      }
      return true;

    case 'ice-candidate':
      if (!data.candidate || !isValidIceCandidate(data.candidate)) {
        console.warn('⚠️  Invalid ICE candidate');
        return false;
      }
      if (!data.targetExtension) {
        console.warn('⚠️  Missing targetExtension in ice-candidate event');
        return false;
      }
      return true;

    default:
      return true;
  }
}

/**
 * Complete security check for socket events
 * Combines sanitization and validation
 * 
 * @param eventName - Socket event name
 * @param data - Raw event data
 * @returns Sanitized and validated data, or null if invalid
 */
export function secureSocketData<T extends Record<string, any>>(
  eventName: string,
  data: T
): T | null {
  // Sanitize first
  const sanitized = sanitizeSocketData(data);

  // Then validate
  if (!validateWebRTCData(eventName, sanitized)) {
    return null;
  }

  return sanitized;
}

export default {
  sanitizeString,
  sanitizeExtension,
  sanitizeUsername,
  sanitizeObject,
  sanitizeSocketData,
  isPathTraversalSafe,
  isSQLInjectionSafe,
  isValidSessionDescription,
  isValidIceCandidate,
  validateWebRTCData,
  secureSocketData,
};
