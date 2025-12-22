/**
 * Validation utilities for input sanitization and validation
 */

/**
 * Validate extension number format (XXX-XXX)
 */
export function isValidExtension(extension: string): boolean {
  if (typeof extension !== 'string') {
    return false;
  }
  return /^\d{3}-\d{3}$/.test(extension);
}

/**
 * Validate WebRTC offer/answer format
 */
export function isValidRTCSessionDescription(description: any): boolean {
  if (!description || typeof description !== 'object') {
    return false;
  }
  
  const validTypes = ['offer', 'answer', 'pranswer', 'rollback'];
  
  if (!validTypes.includes(description.type)) {
    return false;
  }
  
  if (description.sdp && typeof description.sdp !== 'string') {
    return false;
  }
  
  return true;
}

/**
 * Validate ICE candidate format
 */
export function isValidIceCandidate(candidate: any): boolean {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }
  
  // Basic validation - ICE candidates have specific required fields
  if (typeof candidate.candidate !== 'string') {
    return false;
  }
  
  return true;
}

/**
 * Sanitize string input (prevent XSS, injection attacks)
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Limit length
  sanitized = sanitized.substring(0, maxLength);
  
  // Remove potentially dangerous characters (basic XSS prevention)
  sanitized = sanitized.replace(/[<>\"']/g, '');
  
  return sanitized;
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  if (typeof username !== 'string') {
    return false;
  }
  
  // Username: 3-20 characters, alphanumeric and underscores only
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  if (typeof password !== 'string') {
    return false;
  }
  
  // Password: minimum 8 characters, at least one letter and one number
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

/**
 * Validate socket event data structure
 */
export function validateSocketData(eventName: string, data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format' };
  }
  
  switch (eventName) {
    case 'call-user':
      if (!isValidExtension(data.targetExtension)) {
        return { valid: false, error: 'Invalid target extension format' };
      }
      if (!isValidRTCSessionDescription(data.offer)) {
        return { valid: false, error: 'Invalid WebRTC offer' };
      }
      break;
      
    case 'answer-call':
      if (!isValidExtension(data.callerExtension)) {
        return { valid: false, error: 'Invalid caller extension format' };
      }
      if (!isValidRTCSessionDescription(data.answer)) {
        return { valid: false, error: 'Invalid WebRTC answer' };
      }
      break;
      
    case 'ice-candidate':
      if (!isValidExtension(data.targetExtension)) {
        return { valid: false, error: 'Invalid target extension format' };
      }
      if (!isValidIceCandidate(data.candidate)) {
        return { valid: false, error: 'Invalid ICE candidate' };
      }
      break;
      
    case 'hangup':
      if (!isValidExtension(data.targetNumber)) {
        return { valid: false, error: 'Invalid target number format' };
      }
      break;
      
    case 'reject':
      if (!isValidExtension(data.callerExtension)) {
        return { valid: false, error: 'Invalid caller extension format' };
      }
      break;
      
    default:
      return { valid: true };
  }
  
  return { valid: true };
}
