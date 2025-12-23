/**
 * useCallRecording Hook
 * 
 * Provides call recording functionality using the MediaRecorder API.
 * 
 * Features:
 * - Record audio from WebRTC calls
 * - Automatic download of recordings
 * - Recording duration tracking
 * - Support for multiple audio formats
 * - Error handling
 * 
 * Usage:
 * ```typescript
 * const { 
 *   isRecording, 
 *   recordingDuration,
 *   startRecording, 
 *   stopRecording 
 * } = useCallRecording(remoteAudioRef);
 * 
 * // Start recording
 * await startRecording();
 * 
 * // Stop recording (automatically downloads)
 * await stopRecording();
 * ```
 */

import { useState, useRef, useCallback } from 'react';

export interface UseCallRecordingReturn {
  // Whether recording is currently active
  isRecording: boolean;
  
  // Duration of current recording in seconds
  recordingDuration: number;
  
  // Start recording the call
  startRecording: () => Promise<void>;
  
  // Stop recording and download the file
  stopRecording: () => Promise<void>;
  
  // Whether recording is supported
  isSupported: boolean;
}

/**
 * Hook for recording WebRTC calls
 * 
 * @param audioRef - Reference to the audio element playing remote stream
 * @returns Recording controls and state
 */
export function useCallRecording(
  audioRef: React.RefObject<HTMLAudioElement>
): UseCallRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSupported] = useState(() => {
    return typeof MediaRecorder !== 'undefined' && 
           typeof navigator.mediaDevices !== 'undefined';
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Format duration as MM:SS
   */
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Start the duration timer
   */
  const startDurationTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setRecordingDuration(0);

    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRecordingDuration(elapsed);
    }, 1000);
  }, []);

  /**
   * Stop the duration timer
   */
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  /**
   * Download the recorded audio file
   */
  const downloadRecording = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const duration = formatDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    a.download = `call-recording-${timestamp}-${duration}.webm`;
    
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    console.log(`📼 Recording saved: ${a.download}`);
  }, [formatDuration]);

  /**
   * Start recording the call
   */
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      console.error('MediaRecorder API not supported');
      throw new Error('Recording not supported in this browser');
    }

    if (isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    if (!audioRef.current || !audioRef.current.srcObject) {
      console.error('No audio stream available');
      throw new Error('No active call to record');
    }

    try {
      // Get the remote audio stream
      const remoteStream = audioRef.current.srcObject as MediaStream;
      
      // Create a new MediaStream to record
      const audioContext = new AudioContext();
      const remoteSource = audioContext.createMediaStreamSource(remoteStream);
      
      // Get local microphone stream
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const localSource = audioContext.createMediaStreamSource(localStream);
      
      // Mix both streams
      const destination = audioContext.createMediaStreamDestination();
      remoteSource.connect(destination);
      localSource.connect(destination);
      
      streamRef.current = destination.stream;

      // Determine supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps
      });

      chunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        downloadRecording(blob);
        
        // Cleanup
        chunksRef.current = [];
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Handle errors
      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        setIsRecording(false);
        stopDurationTimer();
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every 1 second
      mediaRecorderRef.current = mediaRecorder;
      
      setIsRecording(true);
      startDurationTimer();
      
      console.log(`🔴 Recording started (${mimeType})`);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      throw error;
    }
  }, [audioRef, isSupported, isRecording, startDurationTimer, stopDurationTimer, downloadRecording]);

  /**
   * Stop recording and download the file
   */
  const stopRecording = useCallback(async () => {
    if (!isRecording || !mediaRecorderRef.current) {
      console.warn('No recording in progress');
      return;
    }

    try {
      // Stop the MediaRecorder
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      setIsRecording(false);
      stopDurationTimer();
      
      console.log('⏹️  Recording stopped');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }, [isRecording, stopDurationTimer]);

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    isSupported,
  };
}

/**
 * Helper function to format recording duration
 */
export function formatRecordingDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default useCallRecording;
