import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { io, Socket } from 'socket.io-client';
import DialPad from './DialPad';
import Toast from './Toast';
import { useWebRTC } from '../hooks/useWebRTC';
import { useReconnection } from '../hooks/useReconnection';
import { useWebRTCStats, getQualityColor, getQualityIcon } from '../hooks/useWebRTCStats';
import { useCallRecording, formatRecordingDuration } from '../hooks/useCallRecording';
import { useSignalProtocol } from '../hooks/useSignalProtocol';
import { WebRTCError } from '../errors/WebRTCErrors';

// ============================================================================
// CODE SPLITTING - Lazy Load Non-Critical Components
// ============================================================================

const CallLogTable = lazy(() => import('./CallLogTable'));
const IncomingCallModal = lazy(() => import('./IncomingCallModal'));

// Socket.io connection
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

// Call States
type CallState = 'IDLE' | 'CALLING' | 'RINGING' | 'CONNECTED';

// Call Log Entry Type
interface CallLogEntry {
  id: string;
  time: string;
  extension: string;
  status: 'Incoming' | 'Outgoing' | 'Missed' | 'Completed';
  duration: string;
}

// Toast Type
interface ToastMessage {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

/**
 * SecureTerminal - Main Calling Interface Component
 * 
 * Extracted from App.tsx to reduce cognitive complexity.
 * Handles all calling UI and WebRTC logic.
 */
export default function SecureTerminal() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [extensionNumber, setExtensionNumber] = useState<string>('');
  const [dialedNumber, setDialedNumber] = useState<string>('');
  const [callState, setCallState] = useState<CallState>('IDLE');
  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
  const [incomingCall, setIncomingCall] = useState<{
    callerExtension: string;
    offer: any;
  } | null>(null);
  const [remoteExtension, setRemoteExtension] = useState<string>('');
  
  // Call duration tracking
  const callStartTimeRef = useRef<number | null>(null);
  const callDurationIntervalRef = useRef<number | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  
  // Ringtone (Web Audio API)
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // WebRTC hook
  const {
    remoteAudioRef,
    isAudioEnabled,
    peerConnection,
    createOffer,
    createAnswer,
    handleAnswer,
    handleIceCandidate,
    toggleMute,
    cleanup: cleanupWebRTC,
  } = useWebRTC(socket, remoteExtension);

  // WebRTC stats monitoring
  const stats = useWebRTCStats(peerConnection, callState === 'CONNECTED');

  // Call recording
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    isSupported: isRecordingSupported,
  } = useCallRecording(remoteAudioRef);

  // Reconnection hook
  const { connectionStatus, reconnectAttempt } = useReconnection(socket, {
    onReconnect: () => {
      console.log('✅ Connection restored!');
      showToast('Connection restored', 'success');
      
      if (callState === 'CONNECTED' && remoteExtension) {
        console.log('Attempting to restore call state...');
        showToast('Attempting to restore call...', 'info');
      }
    },
    onReconnectFailed: () => {
      console.error('❌ Reconnection failed after maximum attempts');
      showToast('Connection failed. Please refresh the page.', 'error');
      
      if (callState !== 'IDLE') {
        handleEndCall();
      }
    },
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 30000,
  });

  // Toast notifications
  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Ringtone functions
  const startRingtone = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 480;
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
    } catch (error) {
      console.error('Error starting ringtone:', error);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping ringtone:', error);
    }
  }, []);

  // Call duration timer
  const startCallDurationTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    setCallDuration(0);
    
    let animationFrameId: number;
    let lastUpdate = Date.now();
    
    const updateDuration = () => {
      const now = Date.now();
      
      if (now - lastUpdate >= 1000) {
        if (callStartTimeRef.current) {
          const elapsed = Math.floor((now - callStartTimeRef.current) / 1000);
          setCallDuration(elapsed);
        }
        lastUpdate = now;
      }
      
      animationFrameId = requestAnimationFrame(updateDuration);
    };
    
    animationFrameId = requestAnimationFrame(updateDuration);
    callDurationIntervalRef.current = animationFrameId as any;
  }, []);

  const stopCallDurationTimer = useCallback(() => {
    if (callDurationIntervalRef.current) {
      cancelAnimationFrame(callDurationIntervalRef.current);
      callDurationIntervalRef.current = null;
    }
    callStartTimeRef.current = null;
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const addCallToLog = useCallback((
    extension: string,
    status: CallLogEntry['status'],
    durationSeconds: number
  ) => {
    const now = new Date();
    const entry: CallLogEntry = {
      id: Date.now().toString(),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      extension: extension,
      status: status,
      duration: formatDuration(durationSeconds),
    };
    
    setCallLog((prev) => [entry, ...prev]);
  }, [formatDuration]);

  // Signal Protocol Hook - Handles all socket events
  useSignalProtocol(socket, {
    onExtensionAssigned: (extensionNum) => {
      setExtensionNumber(extensionNum);
    },
    onIncomingCall: (data) => {
      setIncomingCall(data);
      setCallState('RINGING');
      setRemoteExtension(data.callerExtension);
      startRingtone();
    },
    onCallAnswered: (data) => {
      setCallState('CONNECTED');
      setRemoteExtension(data.calleeExtension);
      if (data.answer) {
        handleAnswer(data.answer);
      }
      startCallDurationTimer();
    },
    onIceCandidate: (data) => {
      if (data.candidate) {
        handleIceCandidate(data.candidate);
      }
    },
    onCallFailed: (message) => {
      showToast(message, 'error');
      setCallState('IDLE');
      setDialedNumber('');
      if (remoteExtension) {
        addCallToLog(remoteExtension, 'Missed', 0);
      }
    },
    onError: (message) => {
      showToast(`Error: ${message}`, 'error');
    },
    onHangup: (from) => {
      showToast('Call ended by remote user', 'info');
      const duration = callStartTimeRef.current
        ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
        : 0;
      
      if (from) {
        addCallToLog(from, 'Completed', duration);
      }
      
      stopCallDurationTimer();
      cleanupWebRTC();
      setCallState('IDLE');
      setDialedNumber('');
      setRemoteExtension('');
      setCallDuration(0);
    },
  });

  // Initialize socket connection
  useEffect(() => {
    console.log('Initializing socket connection to', SERVER_URL);
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket connection');
      stopRingtone();
      stopCallDurationTimer();
      newSocket.close();
    };
  }, [stopRingtone, stopCallDurationTimer]);

  // Format extension number as XXX-XXX
  const formatExtension = (value: string) => {
    // Strip all non-numbers
    const numbers = value.replace(/\D/g, '');
    
    // Limit to 6 digits
    const trimmed = numbers.slice(0, 6);
    
    // Add the hyphen automatically after 3rd digit
    if (trimmed.length > 3) {
      return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
    }
    return trimmed;
  };

  // Handle call actions
  const handleNumberClick = (number: string) => {
    if (callState === 'IDLE') {
      const newValue = dialedNumber + number;
      const formatted = formatExtension(newValue);
      setDialedNumber(formatted);
    }
  };

  const handleCall = async () => {
    if (dialedNumber.length > 0 && socket && callState === 'IDLE') {
      try {
        setCallState('CALLING');
        setRemoteExtension(dialedNumber);
        
        const offer = await createOffer();
        
        socket.emit('call-user', {
          targetExtension: dialedNumber,
          offer: offer,
        });
      } catch (error: any) {
        setCallState('IDLE');
        setDialedNumber('');
        setRemoteExtension('');
        
        const errorMessage = error instanceof WebRTCError 
          ? error.getUserMessage() 
          : (error?.message || 'Failed to access microphone. Please check permissions.');
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleAcceptCall = async () => {
    if (incomingCall && socket) {
      stopRingtone();
      
      try {
        setCallState('CONNECTED');
        setRemoteExtension(incomingCall.callerExtension);
        
        const answer = await createAnswer(incomingCall.offer);
        
        socket.emit('answer-call', {
          callerExtension: incomingCall.callerExtension,
          answer: answer,
        });
        
        setIncomingCall(null);
        startCallDurationTimer();
      } catch (error: any) {
        setCallState('IDLE');
        setIncomingCall(null);
        setRemoteExtension('');
        
        const errorMessage = error instanceof WebRTCError 
          ? error.getUserMessage() 
          : (error?.message || 'Failed to access microphone. Please check permissions.');
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleRejectCall = () => {
    if (incomingCall && socket) {
      stopRingtone();
      
      socket.emit('reject', {
        callerExtension: incomingCall.callerExtension,
      });
      
      addCallToLog(incomingCall.callerExtension, 'Missed', 0);
      
      setIncomingCall(null);
      setCallState('IDLE');
    }
  };

  const handleEndCall = () => {
    if (socket && remoteExtension) {
      socket.emit('hangup', {
        targetNumber: remoteExtension,
      });
    }
    
    const duration = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : 0;
    
    if (remoteExtension) {
      addCallToLog(remoteExtension, 'Completed', duration);
    }
    
    stopCallDurationTimer();
    cleanupWebRTC();
    setCallState('IDLE');
    setDialedNumber('');
    setRemoteExtension('');
    setCallDuration(0);
  };

  const handleBackspace = () => {
    if (callState === 'IDLE') {
      setDialedNumber((prev) => prev.slice(0, -1));
    }
  };

  const getCallStateDisplay = () => {
    switch (callState) {
      case 'CALLING':
        return `Calling ${remoteExtension}...`;
      case 'RINGING':
        return 'Incoming Call...';
      case 'CONNECTED':
        return `Connected - ${formatDuration(callDuration)}`;
      default:
        return 'Idle';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'reconnecting':
        return `Reconnecting (${reconnectAttempt}/5)...`;
      case 'failed':
        return 'Connection Failed';
      default:
        return 'Unknown';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-[#00ff41] animate-pulse';
      case 'disconnected':
        return 'bg-[#ff0055]';
      case 'reconnecting':
        return 'bg-[#ffb000] animate-pulse';
      case 'failed':
        return 'bg-[#ff0055] animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* CRT Scanline Overlay */}
      <div className="crt-overlay"></div>

      {/* Hidden Audio Element for Remote Stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      {/* Incoming Call Modal */}
      {incomingCall && callState === 'RINGING' && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="text-[#00ff41] font-mono text-xl animate-pulse">
              [LOADING_SECURE_CHANNEL...]
            </div>
          </div>
        }>
          <IncomingCallModal
            callerExtension={incomingCall.callerExtension}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        </Suspense>
      )}

      {/* Header */}
      <header className="bg-black border-b border-[#00ff41] box-glow">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="bg-transparent p-1">
                <img 
                  src="/logo.png" 
                  alt="Anonymous Logo" 
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                />
              </div>
              <div>
                <h1 className="text-sm sm:text-xl font-bold text-[#00ff41] text-glow font-mono">
                  [ANONYMOUS_LINE]
                </h1>
                <p className="text-[10px] sm:text-xs text-[#00ff41] opacity-50 font-mono tracking-wider hidden sm:block">
                  &gt; ENCRYPTED_CHANNEL_ACTIVE
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              {/* Extension Number */}
              <div className="bg-black px-2 sm:px-4 py-1 sm:py-2 border border-[#00ff41] box-glow">
                <div className="text-[10px] sm:text-xs text-[#00ff41] opacity-50 uppercase tracking-wide font-mono hidden sm:block">
                  ext
                </div>
                <div className="text-sm sm:text-lg font-mono font-bold text-[#00ff41] text-glow tracking-wider">
                  {extensionNumber || '###-###'}
                </div>
              </div>

              {/* Call State */}
              <div className="bg-black px-2 sm:px-4 py-1 sm:py-2 border border-[#00ff41] box-glow flex-1 sm:flex-none">
                <div className="text-[10px] sm:text-xs text-[#00ff41] opacity-50 uppercase tracking-wide font-mono hidden sm:block">
                  status
                </div>
                <div className="text-xs sm:text-sm font-semibold text-[#00ff41] text-glow font-mono truncate">
                  {getCallStateDisplay()}
                </div>
              </div>

              {/* Connection Status */}
              <div className="flex items-center space-x-1 sm:space-x-2 bg-black px-2 sm:px-3 py-1 sm:py-2 border border-[#00ff41] box-glow">
                <div className={`w-2 h-2 ${getConnectionStatusColor()}`}></div>
                <span className="text-[10px] sm:text-xs font-medium text-[#00ff41] font-mono hidden sm:inline">
                  {getConnectionStatusText()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-2 sm:px-3 lg:px-4 py-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Call Log */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="bg-black border border-[#00ff41] p-3 h-[calc(100vh-140px)] box-glow overflow-hidden">
              <Suspense fallback={
                <div className="text-[#00ff41] font-mono text-sm p-4 animate-pulse">
                  &gt; LOADING_CALL_HISTORY...
                </div>
              }>
                <CallLogTable callLog={callLog} />
              </Suspense>
            </div>
          </div>

          {/* Dial Pad / Call Screen */}
          <div className="lg:col-span-1">
            {callState === 'IDLE' && (
              <div className="bg-black border border-[#00ff41] p-3 box-glow">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-[#00ff41] text-glow uppercase tracking-wide font-mono">
                    &gt; SECURITY_KEYPAD
                  </h2>
                </div>
                <DialPad
                  onNumberClick={handleNumberClick}
                  onCall={handleCall}
                  onEndCall={handleEndCall}
                  displayValue={dialedNumber}
                  isInCall={false}
                />

                {dialedNumber.length > 0 && (
                  <button
                    onClick={handleBackspace}
                    className="w-full mt-2 py-2 border border-[#00ff41] bg-black
                             text-[#00ff41] font-medium hover:bg-[#00ff41] hover:text-black
                             transition-colors duration-150 font-mono text-glow text-sm"
                  >
                    [CLEAR_INPUT]
                  </button>
                )}
              </div>
            )}

            {/* Call Status Card */}
            {(callState === 'CALLING' || callState === 'CONNECTED') && (
              <div className={`bg-black border p-4 box-glow font-mono ${
                callState === 'CONNECTED' ? 'border-[#00ff41]' : 'border-[#ffb000]'
              }`}>
                <div className="text-center mb-6">
                  <div className="mb-4">
                    <div className="text-xs text-[#00ff41] opacity-50 mb-2">
                      {callState === 'CALLING' ? '&gt; ESTABLISHING_SECURE_CONNECTION...' : '&gt; CONNECTION_ESTABLISHED'}
                    </div>
                    <div className={`text-4xl font-bold ${callState === 'CONNECTED' ? 'text-[#00ff41] text-glow' : 'text-[#ffb000] text-glow-amber animate-pulse'}`}>
                      {callState === 'CALLING' ? '[CALLING]' : '[CONNECTED]'}
                    </div>
                  </div>
                  
                  <div className="bg-black border border-[#00ff41] py-3 px-6 inline-block mb-2 box-glow">
                    <div className="text-xs text-[#00ff41] opacity-50 mb-1">TARGET_EXTENSION:</div>
                    <p className="text-2xl font-mono font-bold text-[#00ff41] text-glow tracking-[0.2em]">
                      {remoteExtension}
                    </p>
                  </div>
                  
                  {callState === 'CONNECTED' && (
                    <div className="text-sm text-[#00ff41] font-mono mt-2 opacity-75">
                      DURATION: {formatDuration(callDuration)}
                    </div>
                  )}

                  {/* Connection Quality Stats */}
                  {callState === 'CONNECTED' && stats.available && (
                    <div className="mt-4 bg-black border border-[#00ff41] p-3 box-glow">
                      <div className="text-xs text-[#00ff41] opacity-50 mb-2 uppercase tracking-wide">
                        &gt; CONNECTION_METRICS
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] text-[#00ff41] opacity-50 mb-1">QUALITY</div>
                          <div className="flex items-center space-x-2">
                            <span 
                              className="text-lg font-mono"
                              style={{ color: getQualityColor(stats.quality) }}
                            >
                              {getQualityIcon(stats.quality)}
                            </span>
                            <span 
                              className="text-xs font-mono uppercase"
                              style={{ color: getQualityColor(stats.quality) }}
                            >
                              {stats.quality}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#00ff41] opacity-50 mb-1">LATENCY (RTT)</div>
                          <div className="text-lg font-mono text-[#00ff41]">
                            {stats.rtt}ms
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#00ff41] opacity-50 mb-1">PACKET_LOSS</div>
                          <div className="text-lg font-mono text-[#00ff41]">
                            {stats.packetLoss.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#00ff41] opacity-50 mb-1">JITTER</div>
                          <div className="text-lg font-mono text-[#00ff41]">
                            {stats.jitter}ms
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Signal Strength */}
                {callState === 'CONNECTED' && stats.available && (
                  <div className="mb-3 bg-black border border-[#00ff41] p-2 box-glow">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#00ff41] opacity-50 font-mono">SIGNAL</span>
                      <span className="text-sm font-mono font-bold" style={{ color: getQualityColor(stats.quality) }}>
                        {stats.quality === 'excellent' ? '98%' : 
                         stats.quality === 'good' ? '85%' :
                         stats.quality === 'fair' ? '65%' : 
                         stats.quality === 'poor' ? '35%' : '0%'}
                      </span>
                    </div>
                    <div className="mt-1 h-2 bg-black border border-[#00ff41] overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: stats.quality === 'excellent' ? '98%' : 
                                 stats.quality === 'good' ? '85%' :
                                 stats.quality === 'fair' ? '65%' : 
                                 stats.quality === 'poor' ? '35%' : '0%',
                          backgroundColor: getQualityColor(stats.quality)
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="mb-3 bg-black border border-[#ff0055] p-2 box-glow-red flex items-center justify-between animate-pulse">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-[#ff0055] rounded-full animate-pulse"></div>
                      <span className="text-[#ff0055] font-mono text-sm font-bold">REC</span>
                    </div>
                    <span className="text-[#ff0055] font-mono text-sm">
                      {formatRecordingDuration(recordingDuration)}
                    </span>
                  </div>
                )}

                {/* Audio Controls */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={toggleMute}
                    className={`py-3 font-bold font-mono border transition-all duration-200 ${
                      isAudioEnabled
                        ? 'bg-black border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black box-glow'
                        : 'bg-black border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-black box-glow'
                    }`}
                  >
                    <span className="text-sm">{isAudioEnabled ? '[MUTE_MIC]' : '[UNMUTE_MIC]'}</span>
                  </button>

                  {isRecordingSupported && (
                    <button
                      onClick={async () => {
                        try {
                          if (isRecording) {
                            await stopRecording();
                            showToast('Recording saved', 'success');
                          } else {
                            await startRecording();
                            showToast('Recording started', 'info');
                          }
                        } catch (error: any) {
                          showToast(error.message || 'Recording failed', 'error');
                        }
                      }}
                      className={`py-3 font-bold font-mono border transition-all duration-200 ${
                        isRecording
                          ? 'bg-black border-[#ff0055] text-[#ff0055] hover:bg-[#ff0055] hover:text-black box-glow-red'
                          : 'bg-black border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black box-glow'
                      }`}
                    >
                      <span className="text-sm">{isRecording ? '[STOP_REC]' : '[RECORD]'}</span>
                    </button>
                  )}
                </div>

                {/* End Call Button */}
                <button
                  onClick={handleEndCall}
                  className="w-full py-4 bg-black border border-[#ff0055] text-[#ff0055] font-bold font-mono
                           hover:bg-[#ff0055] hover:text-black transition-all duration-200 
                           box-glow-red text-glow-red text-lg"
                >
                  [TERMINATE_CONNECTION]
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Call Log */}
        <div className="lg:hidden mt-2">
          <details className="bg-black border border-[#00ff41] box-glow">
            <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-[#00ff41] text-glow uppercase tracking-wide hover:bg-[#00ff41] hover:text-black font-mono transition-colors">
              &gt; CALL_HISTORY ({callLog.length})
            </summary>
            <div className="px-4 pb-4 max-h-64 overflow-auto">
              <Suspense fallback={
                <div className="text-[#00ff41] font-mono text-xs p-2 animate-pulse">
                  &gt; LOADING...
                </div>
              }>
                <CallLogTable callLog={callLog} />
              </Suspense>
            </div>
          </details>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-[#00ff41] py-2 box-glow mt-2">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-[#00ff41] font-mono">
            <span className="opacity-50">&gt; ANONYMOUS_SECURE_LINE_v5.0 | ENCRYPTED_PROTOCOL_ACTIVE</span>
            
            {/* Links */}
            <div className="flex items-center gap-4">
              <a 
                href="/privacy" 
                className="opacity-70 hover:opacity-100 hover:text-glow transition-all duration-200 underline"
              >
                [PRIVACY_POLICY]
              </a>
              <a 
                href="mailto:admin@notrack.co.uk" 
                className="opacity-70 hover:opacity-100 hover:text-glow transition-all duration-200 underline"
              >
                [CONTACT]
              </a>
            </div>
            
            <span className="opacity-50">SID: {socket?.id?.slice(0, 8) || 'N/A'} | STATE: {callState}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
