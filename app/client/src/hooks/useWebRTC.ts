import { useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { 
  MicrophoneAccessError, 
  BrowserSupportError,
  CallSetupError,
  ErrorHandler 
} from '../errors/WebRTCErrors';

/**
 * useWebRTC Hook - WebRTC Connection Management
 * 
 * Manages WebRTC peer connections, media streams, and ICE candidates for audio calling.
 * Handles both caller and callee sides with automatic cleanup and error handling.
 * 
 * @param socket - Socket.IO client instance for signaling
 * @param remoteExtension - Remote user's extension number (e.g., "123-456")
 * 
 * @returns Object containing:
 * - remoteAudioRef: Ref for remote audio element
 * - isAudioEnabled: Current microphone state
 * - peerConnection: Current RTCPeerConnection instance
 * - createOffer: Function to initiate a call
 * - createAnswer: Function to answer a call
 * - handleAnswer: Function to handle received answer
 * - handleIceCandidate: Function to handle ICE candidates
 * - toggleMute: Function to mute/unmute microphone
 * - cleanup: Function to clean up all resources
 * 
 * @example
 * // Basic usage - Caller side
 * ```typescript
 * import { useWebRTC } from './hooks/useWebRTC';
 * 
 * function CallerComponent({ socket, remoteExtension }) {
 *   const webRTC = useWebRTC(socket, remoteExtension);
 * 
 *   const makeCall = async () => {
 *     try {
 *       // Create offer
 *       const offer = await webRTC.createOffer();
 *       
 *       // Send offer to remote user
 *       socket.emit('call-user', {
 *         targetExtension: remoteExtension,
 *         offer: offer
 *       });
 *     } catch (error) {
 *       console.error('Failed to create offer:', error);
 *     }
 *   };
 * 
 *   return (
 *     <>
 *       <button onClick={makeCall}>Call</button>
 *       <audio ref={webRTC.remoteAudioRef} autoPlay />
 *     </>
 *   );
 * }
 * ```
 * 
 * @example
 * // Callee side - Answering a call
 * ```typescript
 * function CalleeComponent({ socket, remoteExtension, incomingOffer }) {
 *   const webRTC = useWebRTC(socket, remoteExtension);
 * 
 *   const acceptCall = async () => {
 *     try {
 *       // Create answer from received offer
 *       const answer = await webRTC.createAnswer(incomingOffer);
 *       
 *       // Send answer back to caller
 *       socket.emit('answer-call', {
 *         targetExtension: remoteExtension,
 *         answer: answer
 *       });
 *     } catch (error) {
 *       console.error('Failed to answer call:', error);
 *     }
 *   };
 * 
 *   return (
 *     <>
 *       <button onClick={acceptCall}>Accept Call</button>
 *       <audio ref={webRTC.remoteAudioRef} autoPlay />
 *     </>
 *   );
 * }
 * ```
 * 
 * @example
 * // Complete call flow with Socket.IO events
 * ```typescript
 * function CallComponent({ socket }) {
 *   const [remoteExtension, setRemoteExtension] = useState('');
 *   const webRTC = useWebRTC(socket, remoteExtension);
 * 
 *   useEffect(() => {
 *     if (!socket) return;
 * 
 *     // Handle incoming call
 *     socket.on('incoming-call', async ({ callerExtension, offer }) => {
 *       setRemoteExtension(callerExtension);
 *       const answer = await webRTC.createAnswer(offer);
 *       socket.emit('answer-call', {
 *         targetExtension: callerExtension,
 *         answer
 *       });
 *     });
 * 
 *     // Handle received answer (caller side)
 *     socket.on('call-answered', async ({ answer }) => {
 *       await webRTC.handleAnswer(answer);
 *     });
 * 
 *     // Handle ICE candidates
 *     socket.on('ice-candidate', async ({ candidate }) => {
 *       await webRTC.handleIceCandidate(candidate);
 *     });
 * 
 *     // Cleanup on unmount
 *     return () => {
 *       webRTC.cleanup();
 *       socket.off('incoming-call');
 *       socket.off('call-answered');
 *       socket.off('ice-candidate');
 *     };
 *   }, [socket, webRTC]);
 * 
 *   return <audio ref={webRTC.remoteAudioRef} autoPlay />;
 * }
 * ```
 * 
 * @example
 * // Error handling with custom error classes
 * ```typescript
 * function CallComponentWithErrorHandling({ socket, remoteExtension }) {
 *   const webRTC = useWebRTC(socket, remoteExtension);
 *   const [error, setError] = useState<string | null>(null);
 * 
 *   const makeCall = async () => {
 *     try {
 *       const offer = await webRTC.createOffer();
 *       socket.emit('call-user', { targetExtension: remoteExtension, offer });
 *     } catch (error) {
 *       if (error instanceof MicrophoneAccessError) {
 *         setError(error.userMessage); // User-friendly message
 *       } else if (error instanceof BrowserSupportError) {
 *         setError(error.userMessage);
 *       } else {
 *         setError('Failed to start call');
 *       }
 *     }
 *   };
 * 
 *   return (
 *     <>
 *       {error && <div className="error">{error}</div>}
 *       <button onClick={makeCall}>Call</button>
 *     </>
 *   );
 * }
 * ```
 * 
 * @example
 * // Mute/Unmute functionality
 * ```typescript
 * function CallControls({ webRTC }) {
 *   return (
 *     <div>
 *       <button onClick={webRTC.toggleMute}>
 *         {webRTC.isAudioEnabled ? 'Mute' : 'Unmute'}
 *       </button>
 *       <button onClick={webRTC.cleanup}>
 *         End Call
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Advanced ICE Configuration
 * 
 * Supports both STUN and TURN servers for production-grade connectivity.
 * 
 * STUN (Session Traversal Utilities for NAT):
 * - Discovers public IP address
 * - Works for ~80% of connections
 * - Free to use
 * 
 * TURN (Traversal Using Relays around NAT):
 * - Relays media when direct connection fails
 * - Required for corporate firewalls, symmetric NAT, 4G/5G networks
 * - Covers the remaining ~20% of connections
 * 
 * Configuration via Environment Variables:
 * - VITE_TURN_USERNAME: TURN server username
 * - VITE_TURN_CREDENTIAL: TURN server password
 * 
 * Free TURN Providers:
 * - Metered.ca (50GB/month): https://www.metered.ca/tools/openrelay/
 * - Xirsys (500MB/month): https://xirsys.com/
 * - Twilio (10GB/month): https://www.twilio.com/stun-turn
 */
const getICEServers = () => {
  const iceServers: RTCIceServer[] = [
    // Google STUN servers for redundancy
    { urls: 'stun:stun.l.google.com:19302' },
    
    // Metered.ca STUN server
    { urls: 'stun:stun.relay.metered.ca:80' },
  ];

  // Add TURN servers if credentials are provided
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUsername && turnCredential) {
    // Production TURN servers with authenticated Metered.ca credentials
    console.log('✅ Using authenticated Metered.ca TURN servers');
    
    // Complete Metered.ca TURN server configuration
    // This provides maximum connectivity through firewalls and NAT
    iceServers.push(
      // TURN over UDP (Standard, lowest latency)
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: turnUsername,
        credential: turnCredential,
      },
      // TURN over TCP (Better firewall compatibility)
      {
        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
        username: turnUsername,
        credential: turnCredential,
      },
      // TURNS over TLS (Secure, best compatibility)
      {
        urls: 'turns:global.relay.metered.ca:443',
        username: turnUsername,
        credential: turnCredential,
      },
      // TURNS over TLS/TCP (Most compatible, encrypted)
      {
        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
        username: turnUsername,
        credential: turnCredential,
      }
    );
  } else {
    // Fallback to free public TURN server for development
    console.warn('⚠️  No TURN credentials configured. Using public TURN server (not recommended for production)');
    console.warn('   Add VITE_TURN_USERNAME and VITE_TURN_CREDENTIAL to .env for production use');
    
    iceServers.push(
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
    );
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10, // Pre-gather ICE candidates for faster connection
    iceTransportPolicy: 'all' as RTCIceTransportPolicy, // Try all connection types
  };
};

const ICE_SERVERS = getICEServers();

export const useWebRTC = (socket: Socket | null, remoteExtension: string) => {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  // PHASE 4 OPTIMIZATION: ICE candidate batching with telemetry
  const iceCandidateQueueRef = useRef<RTCIceCandidate[]>([]);
  const iceBatchTimerRef = useRef<number | null>(null);
  const iceCandidateTelemetryRef = useRef({
    totalCandidates: 0,
    batchesSent: 0,
    avgBatchSize: 0,
    largestBatch: 0,
  });

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // PHASE 4 OPTIMIZATION: Batch ICE candidates for better network efficiency
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket && remoteExtension) {
        // Add candidate to queue
        iceCandidateQueueRef.current.push(event.candidate);
        
        // Clear existing timer
        if (iceBatchTimerRef.current) {
          clearTimeout(iceBatchTimerRef.current);
        }
        
        // Set timer to send batch after 50ms (or when queue reaches 5 candidates)
        if (iceCandidateQueueRef.current.length >= 5) {
          // Send immediately if we have 5+ candidates
          sendIceCandidateBatch();
        } else {
          // Wait 50ms to collect more candidates
          iceBatchTimerRef.current = setTimeout(() => {
            sendIceCandidateBatch();
          }, 50);
        }
      }
    };
    
    // Helper function to send batched ICE candidates with telemetry
    const sendIceCandidateBatch = () => {
      if (iceCandidateQueueRef.current.length > 0 && socket && remoteExtension) {
        const batchSize = iceCandidateQueueRef.current.length;
        
        // Update telemetry
        const telemetry = iceCandidateTelemetryRef.current;
        telemetry.totalCandidates += batchSize;
        telemetry.batchesSent += 1;
        telemetry.avgBatchSize = telemetry.totalCandidates / telemetry.batchesSent;
        telemetry.largestBatch = Math.max(telemetry.largestBatch, batchSize);
        
        console.log(`📊 ICE Batch #${telemetry.batchesSent}: Sending ${batchSize} candidates to ${remoteExtension}`);
        console.log(`   Stats - Total: ${telemetry.totalCandidates}, Avg: ${telemetry.avgBatchSize.toFixed(1)}, Largest: ${telemetry.largestBatch}`);
        
        // Send all candidates at once
        iceCandidateQueueRef.current.forEach(candidate => {
          socket.emit('ice-candidate', {
            targetExtension: remoteExtension,
            candidate: candidate,
          });
        });
        
        // Clear the queue
        iceCandidateQueueRef.current = [];
        iceBatchTimerRef.current = null;
      }
    };

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0]);
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch((err) => {
          console.error('Error playing remote audio:', err);
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [socket, remoteExtension]);

  // Get local media stream (microphone)
  const getLocalStream = useCallback(async () => {
    try {
      // First check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new BrowserSupportError('MediaDevices API (required for microphone access)');
      }

      // Check for available audio input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      if (audioInputs.length === 0) {
        throw new MicrophoneAccessError(new Error('NotFoundError'));
      }

      console.log(`Found ${audioInputs.length} microphone device(s), requesting access...`);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream;
      console.log('Local media stream obtained successfully');
      return stream;
    } catch (error: any) {
      // Use custom error classes for better error handling
      const webRTCError = ErrorHandler.handle(
        error,
        undefined,
        'Failed to access microphone'
      );
      
      // Throw the user-friendly error
      throw webRTCError;
    }
  }, []);

  // Create offer (caller side)
  const createOffer = useCallback(async () => {
    try {
      const peerConnection = initializePeerConnection();
      const stream = await getLocalStream();

      // Add local audio track to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      console.log('Offer created:', offer);
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw new CallSetupError('offer', error);
    }
  }, [initializePeerConnection, getLocalStream]);

  // Create answer (callee side)
  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      try {
        const peerConnection = initializePeerConnection();
        const stream = await getLocalStream();

        // Add local audio track to peer connection
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        // Set remote description (the offer)
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );

        // Create answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        console.log('Answer created:', answer);
        return answer;
      } catch (error) {
        console.error('Error creating answer:', error);
        throw new CallSetupError('answer', error);
      }
    },
    [initializePeerConnection, getLocalStream]
  );

  // Handle received answer (caller side)
  const handleAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      try {
        const peerConnection = peerConnectionRef.current;
        if (peerConnection) {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          console.log('Remote description set (answer)');
        }
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    },
    []
  );

  // Handle received ICE candidate
  const handleIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      try {
        const peerConnection = peerConnectionRef.current;
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('ICE candidate added');
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    },
    []
  );

  // Toggle microphone mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('Microphone muted:', !audioTrack.enabled);
      }
    }
  }, []);

  // PHASE 4 & 5 OPTIMIZATION: Enhanced cleanup with memory leak prevention
  const cleanup = useCallback(() => {
    console.log('Cleaning up WebRTC resources');

    // Log final ICE candidate telemetry
    const telemetry = iceCandidateTelemetryRef.current;
    if (telemetry.batchesSent > 0) {
      console.log('📊 Final ICE Candidate Statistics:');
      console.log(`   Total Candidates: ${telemetry.totalCandidates}`);
      console.log(`   Batches Sent: ${telemetry.batchesSent}`);
      console.log(`   Average Batch Size: ${telemetry.avgBatchSize.toFixed(2)}`);
      console.log(`   Largest Batch: ${telemetry.largestBatch}`);
      console.log(`   Efficiency: ${((1 - (telemetry.batchesSent / telemetry.totalCandidates)) * 100).toFixed(1)}% fewer messages`);
    }

    // Clear ICE candidate batch timer
    if (iceBatchTimerRef.current) {
      clearTimeout(iceBatchTimerRef.current);
      iceBatchTimerRef.current = null;
    }
    
    // Clear ICE candidate queue and reset telemetry
    iceCandidateQueueRef.current = [];
    iceCandidateTelemetryRef.current = {
      totalCandidates: 0,
      batchesSent: 0,
      avgBatchSize: 0,
      largestBatch: 0,
    };

    // Stop local stream with enhanced cleanup
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        // PHASE 5: Ensure track is fully released
        track.enabled = false;
      });
      localStreamRef.current = null;
    }

    // Close peer connection with enhanced cleanup
    if (peerConnectionRef.current) {
      // PHASE 5: Remove all event listeners before closing
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear remote audio with enhanced cleanup
    if (remoteAudioRef.current) {
      // PHASE 5: Stop playback and clear source
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.src = '';
    }

    setIsAudioEnabled(true);
  }, []);

  return {
    remoteAudioRef,
    isAudioEnabled,
    peerConnection: peerConnectionRef.current,
    createOffer,
    createAnswer,
    handleAnswer,
    handleIceCandidate,
    toggleMute,
    cleanup,
  };
};
