/**
 * useReconnection Hook
 * 
 * Handles automatic WebSocket reconnection with exponential backoff.
 * 
 * Features:
 * - Automatic reconnection on disconnect
 * - Configurable max retry attempts
 * - Exponential backoff delay
 * - Call state recovery
 * - Connection status tracking
 * 
 * Usage:
 * ```typescript
 * const { connectionStatus } = useReconnection(socket, {
 *   onReconnect: () => {
 *     // Restore call state
 *   }
 * });
 * ```
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export type ConnectionStatus = 
  | 'connected' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'failed';

interface ReconnectionOptions {
  /**
   * Callback fired when reconnection is successful
   * Use this to restore call state, re-emit events, etc.
   */
  onReconnect?: () => void;
  
  /**
   * Callback fired when reconnection fails after max attempts
   */
  onReconnectFailed?: () => void;
  
  /**
   * Maximum number of reconnection attempts
   * @default 5
   */
  maxAttempts?: number;
  
  /**
   * Initial delay between reconnection attempts (ms)
   * @default 2000 (2 seconds)
   */
  initialDelay?: number;
  
  /**
   * Maximum delay between attempts (ms)
   * @default 30000 (30 seconds)
   */
  maxDelay?: number;
}

interface UseReconnectionReturn {
  /**
   * Current connection status
   */
  connectionStatus: ConnectionStatus;
  
  /**
   * Current reconnection attempt number (0 if not reconnecting)
   */
  reconnectAttempt: number;
  
  /**
   * Manually trigger a reconnection
   */
  reconnect: () => void;
  
  /**
   * Reset reconnection state
   */
  reset: () => void;
}

export function useReconnection(
  socket: Socket | null,
  options: ReconnectionOptions = {}
): UseReconnectionReturn {
  const {
    onReconnect,
    onReconnectFailed,
    maxAttempts = 5,
    initialDelay = 2000,
    maxDelay = 30000,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptCountRef = useRef(0);
  const isReconnectingRef = useRef(false);

  /**
   * Calculate delay with exponential backoff
   */
  const getReconnectDelay = useCallback((attempt: number): number => {
    // Exponential backoff: delay = initialDelay * (2 ^ attempt)
    const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    
    return delay + jitter;
  }, [initialDelay, maxDelay]);

  /**
   * Clear any pending reconnection timeout
   */
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Reset reconnection state
   */
  const reset = useCallback(() => {
    clearReconnectTimeout();
    attemptCountRef.current = 0;
    setReconnectAttempt(0);
    isReconnectingRef.current = false;
  }, [clearReconnectTimeout]);

  /**
   * Attempt to reconnect
   */
  const attemptReconnect = useCallback(() => {
    if (!socket || isReconnectingRef.current) return;

    const currentAttempt = attemptCountRef.current;

    if (currentAttempt >= maxAttempts) {
      console.error(`❌ Reconnection failed after ${maxAttempts} attempts`);
      setConnectionStatus('failed');
      isReconnectingRef.current = false;
      
      if (onReconnectFailed) {
        onReconnectFailed();
      }
      
      return;
    }

    attemptCountRef.current++;
    setReconnectAttempt(attemptCountRef.current);
    setConnectionStatus('reconnecting');
    
    const delay = getReconnectDelay(currentAttempt);
    console.log(`🔄 Attempting reconnection ${attemptCountRef.current}/${maxAttempts} in ${Math.round(delay / 1000)}s...`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!socket || !socket.disconnected) {
        reset();
        return;
      }

      console.log(`🔌 Reconnect attempt ${attemptCountRef.current}...`);
      socket.connect();
    }, delay);
  }, [socket, maxAttempts, getReconnectDelay, reset, onReconnectFailed]);

  /**
   * Manually trigger reconnection
   */
  const reconnect = useCallback(() => {
    if (!socket) return;
    
    reset();
    socket.connect();
  }, [socket, reset]);

  /**
   * Set up socket event listeners
   */
  useEffect(() => {
    if (!socket) return;

    /**
     * Handle initial connection
     */
    const handleConnect = () => {
      console.log('✅ Socket connected successfully');
      setConnectionStatus('connected');
      
      // If this was a reconnection, call the callback
      if (isReconnectingRef.current) {
        console.log('✅ Reconnection successful!');
        isReconnectingRef.current = false;
        
        if (onReconnect) {
          onReconnect();
        }
      }
      
      reset();
    };

    /**
     * Handle disconnection
     */
    const handleDisconnect = (reason: string) => {
      console.warn(`⚠️  Socket disconnected: ${reason}`);
      setConnectionStatus('disconnected');

      // Don't auto-reconnect if disconnect was intentional
      if (reason === 'io client disconnect') {
        console.log('Disconnect was intentional, not reconnecting');
        return;
      }

      // Start reconnection process
      isReconnectingRef.current = true;
      attemptReconnect();
    };

    /**
     * Handle connection errors
     */
    const handleConnectError = (error: Error) => {
      console.error('❌ Connection error:', error.message);
      
      // If we're already reconnecting, try again
      if (isReconnectingRef.current) {
        attemptReconnect();
      }
    };

    /**
     * Handle reconnection errors
     */
    const handleReconnectError = (error: Error) => {
      console.error('❌ Reconnection error:', error.message);
      attemptReconnect();
    };

    /**
     * Handle reconnection attempts (built-in socket.io)
     */
    const handleReconnectAttempt = (attempt: number) => {
      console.log(`🔄 Socket.io reconnection attempt ${attempt}...`);
    };

    /**
     * Handle successful reconnection (built-in socket.io)
     */
    const handleReconnect = (attempt: number) => {
      console.log(`✅ Socket.io reconnected after ${attempt} attempt(s)`);
    };

    // Set initial status
    setConnectionStatus(socket.connected ? 'connected' : 'disconnected');

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect_error', handleReconnectError);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect', handleReconnect);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect_error', handleReconnectError);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect', handleReconnect);
      
      clearReconnectTimeout();
    };
  }, [socket, attemptReconnect, reset, onReconnect, clearReconnectTimeout]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      clearReconnectTimeout();
    };
  }, [clearReconnectTimeout]);

  return {
    connectionStatus,
    reconnectAttempt,
    reconnect,
    reset,
  };
}
