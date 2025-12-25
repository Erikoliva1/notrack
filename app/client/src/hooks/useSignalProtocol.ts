import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

/**
 * useSignalProtocol - Custom Hook for Socket.IO Event Handlers
 * 
 * Extracted from App.tsx to reduce cognitive complexity.
 * Handles all WebRTC signaling protocol events.
 */

interface SignalProtocolCallbacks {
  onExtensionAssigned: (extensionNumber: string) => void;
  onIncomingCall: (data: { callerExtension: string; offer: any }) => void;
  onCallAnswered: (data: { calleeExtension: string; answer: any }) => void;
  onIceCandidate: (data: { senderExtension: string; candidate: any }) => void;
  onCallFailed: (message: string) => void;
  onError: (message: string) => void;
  onHangup: (from: string) => void;
}

export function useSignalProtocol(
  socket: Socket | null,
  callbacks: SignalProtocolCallbacks
) {
  // Store callbacks in refs to avoid re-registering listeners
  const callbacksRef = useRef(callbacks);
  
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!socket) return;

    // Extension Assignment
    const handleExtensionAssigned = (data: { extensionNumber: string }) => {
      // PHASE 1: Persistent Identity - Save extension to localStorage for persistence
      localStorage.setItem('notrack_extension', data.extensionNumber);
      callbacksRef.current.onExtensionAssigned(data.extensionNumber);
    };

    // Incoming Call
    const handleIncomingCall = (data: { callerExtension: string; offer: any }) => {
      callbacksRef.current.onIncomingCall(data);
    };

    // Call Answered
    const handleCallAnswered = (data: { calleeExtension: string; answer: any }) => {
      callbacksRef.current.onCallAnswered(data);
    };

    // ICE Candidate
    const handleIceCandidate = (data: { senderExtension: string; candidate: any }) => {
      callbacksRef.current.onIceCandidate(data);
    };

    // Call Failed
    const handleCallFailed = (data: { message: string }) => {
      console.error('[SignalProtocol] Call failed:', data.message);
      callbacksRef.current.onCallFailed(data.message);
    };

    // Error
    const handleError = (data: { message: string }) => {
      console.error('[SignalProtocol] Error:', data.message);
      callbacksRef.current.onError(data.message);
    };

    // Hangup
    const handleHangup = (data: { from: string }) => {
      callbacksRef.current.onHangup(data.from);
    };

    // Register all event listeners
    socket.on('extension-assigned', handleExtensionAssigned);
    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-answered', handleCallAnswered);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-failed', handleCallFailed);
    socket.on('error', handleError);
    socket.on('hangup', handleHangup);

    // Cleanup function
    return () => {
      socket.off('extension-assigned', handleExtensionAssigned);
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-answered', handleCallAnswered);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-failed', handleCallFailed);
      socket.off('error', handleError);
      socket.off('hangup', handleHangup);
    };
  }, [socket]);
}
