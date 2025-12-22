/**
 * useWebRTCStats Hook
 * 
 * Monitors WebRTC connection quality metrics in real-time.
 * 
 * Features:
 * - Packet loss tracking
 * - Round-trip time (RTT) measurement
 * - Bandwidth estimation
 * - Jitter measurement
 * - Connection quality indicator
 * - Automatic polling (every 5 seconds)
 * 
 * Usage:
 * ```typescript
 * const stats = useWebRTCStats(peerConnection, callState === 'CONNECTED');
 * 
 * console.log(`RTT: ${stats.rtt}ms`);
 * console.log(`Packet Loss: ${stats.packetLoss}%`);
 * console.log(`Bandwidth: ${stats.bandwidth} kbps`);
 * console.log(`Quality: ${stats.quality}`); // excellent, good, fair, poor
 * ```
 */

import { useState, useEffect, useRef } from 'react';

export interface WebRTCStats {
  // Round-trip time in milliseconds
  rtt: number;
  
  // Packet loss percentage (0-100)
  packetLoss: number;
  
  // Bandwidth in kilobits per second
  bandwidth: number;
  
  // Jitter in milliseconds
  jitter: number;
  
  // Connection quality: excellent (< 100ms RTT, < 1% loss)
  //                     good (< 200ms RTT, < 3% loss)
  //                     fair (< 400ms RTT, < 10% loss)
  //                     poor (>= 400ms RTT or >= 10% loss)
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  
  // Total packets sent/received
  packetsSent: number;
  packetsReceived: number;
  
  // Bytes sent/received
  bytesSent: number;
  bytesReceived: number;
  
  // Whether stats are available
  available: boolean;
}

const DEFAULT_STATS: WebRTCStats = {
  rtt: 0,
  packetLoss: 0,
  bandwidth: 0,
  jitter: 0,
  quality: 'unknown',
  packetsSent: 0,
  packetsReceived: 0,
  bytesSent: 0,
  bytesReceived: 0,
  available: false,
};

/**
 * Calculate connection quality based on RTT and packet loss
 */
function calculateQuality(rtt: number, packetLoss: number): WebRTCStats['quality'] {
  if (rtt === 0 && packetLoss === 0) {
    return 'unknown';
  }
  
  // Excellent: Low latency, minimal packet loss
  if (rtt < 100 && packetLoss < 1) {
    return 'excellent';
  }
  
  // Good: Acceptable latency and packet loss
  if (rtt < 200 && packetLoss < 3) {
    return 'good';
  }
  
  // Fair: Noticeable latency or packet loss
  if (rtt < 400 && packetLoss < 10) {
    return 'fair';
  }
  
  // Poor: High latency or packet loss
  return 'poor';
}

/**
 * Parse WebRTC stats report and extract relevant metrics
 */
async function parseStats(peerConnection: RTCPeerConnection): Promise<WebRTCStats> {
  try {
    const stats = await peerConnection.getStats();
    
    let rtt = 0;
    let packetLoss = 0;
    let bandwidth = 0;
    let jitter = 0;
    let packetsSent = 0;
    let packetsReceived = 0;
    let bytesSent = 0;
    let bytesReceived = 0;
    let packetsLost = 0;
    
    stats.forEach((report) => {
      // Outbound RTP (audio/video sent)
      if (report.type === 'outbound-rtp' && report.kind === 'audio') {
        packetsSent += report.packetsSent || 0;
        bytesSent += report.bytesSent || 0;
      }
      
      // Inbound RTP (audio/video received)
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        packetsReceived += report.packetsReceived || 0;
        bytesReceived += report.bytesReceived || 0;
        packetsLost += report.packetsLost || 0;
        jitter = report.jitter ? report.jitter * 1000 : 0; // Convert to ms
      }
      
      // Candidate pair (for RTT)
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        if (report.currentRoundTripTime !== undefined) {
          rtt = report.currentRoundTripTime * 1000; // Convert to ms
        }
        
        // Calculate bandwidth from bytes sent/received
        if (report.availableOutgoingBitrate !== undefined) {
          bandwidth = Math.round(report.availableOutgoingBitrate / 1000); // Convert to kbps
        }
      }
      
      // Remote inbound RTP (for additional stats)
      if (report.type === 'remote-inbound-rtp' && report.kind === 'audio') {
        if (report.roundTripTime !== undefined) {
          rtt = report.roundTripTime * 1000; // Convert to ms
        }
      }
    });
    
    // Calculate packet loss percentage
    const totalPackets = packetsReceived + packetsLost;
    if (totalPackets > 0) {
      packetLoss = (packetsLost / totalPackets) * 100;
    }
    
    // Determine connection quality
    const quality = calculateQuality(rtt, packetLoss);
    
    return {
      rtt: Math.round(rtt),
      packetLoss: Math.round(packetLoss * 10) / 10, // Round to 1 decimal
      bandwidth,
      jitter: Math.round(jitter),
      quality,
      packetsSent,
      packetsReceived,
      bytesSent,
      bytesReceived,
      available: true,
    };
  } catch (error) {
    console.error('Error parsing WebRTC stats:', error);
    return DEFAULT_STATS;
  }
}

/**
 * Hook to monitor WebRTC statistics
 * 
 * @param peerConnection - RTCPeerConnection instance
 * @param enabled - Whether to enable stats monitoring
 * @param intervalMs - Polling interval in milliseconds (default: 5000)
 * @returns WebRTC stats object
 */
export function useWebRTCStats(
  peerConnection: RTCPeerConnection | null,
  enabled: boolean = false,
  intervalMs: number = 5000
): WebRTCStats {
  const [stats, setStats] = useState<WebRTCStats>(DEFAULT_STATS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Don't start if not enabled or no peer connection
    if (!enabled || !peerConnection) {
      setStats(DEFAULT_STATS);
      return;
    }
    
    // Initial stats fetch
    parseStats(peerConnection).then(setStats);
    
    // Set up polling interval
    intervalRef.current = setInterval(async () => {
      if (peerConnection && peerConnection.connectionState === 'connected') {
        const newStats = await parseStats(peerConnection);
        setStats(newStats);
      }
    }, intervalMs);
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [peerConnection, enabled, intervalMs]);
  
  return stats;
}

/**
 * Hook variant that returns stats with history
 * Useful for charts and graphs
 */
export function useWebRTCStatsHistory(
  peerConnection: RTCPeerConnection | null,
  enabled: boolean = false,
  intervalMs: number = 5000,
  maxHistory: number = 60 // Keep last 60 samples (5 minutes at 5s interval)
): {
  current: WebRTCStats;
  history: WebRTCStats[];
} {
  const [current, setCurrent] = useState<WebRTCStats>(DEFAULT_STATS);
  const [history, setHistory] = useState<WebRTCStats[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (!enabled || !peerConnection) {
      setCurrent(DEFAULT_STATS);
      setHistory([]);
      return;
    }
    
    // Initial stats fetch
    parseStats(peerConnection).then((stats) => {
      setCurrent(stats);
      setHistory([stats]);
    });
    
    // Set up polling interval
    intervalRef.current = setInterval(async () => {
      if (peerConnection && peerConnection.connectionState === 'connected') {
        const newStats = await parseStats(peerConnection);
        setCurrent(newStats);
        
        setHistory((prev) => {
          const updated = [...prev, newStats];
          // Keep only last maxHistory samples
          return updated.slice(-maxHistory);
        });
      }
    }, intervalMs);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [peerConnection, enabled, intervalMs, maxHistory]);
  
  return { current, history };
}

/**
 * Get quality color for UI display
 */
export function getQualityColor(quality: WebRTCStats['quality']): string {
  switch (quality) {
    case 'excellent':
      return '#00ff41'; // Green (hacker theme)
    case 'good':
      return '#88ff88'; // Light green
    case 'fair':
      return '#ffb000'; // Amber
    case 'poor':
      return '#ff0055'; // Red
    default:
      return '#808080'; // Gray
  }
}

/**
 * Get quality icon for UI display
 */
export function getQualityIcon(quality: WebRTCStats['quality']): string {
  switch (quality) {
    case 'excellent':
      return '●●●●●'; // 5 bars
    case 'good':
      return '●●●●○'; // 4 bars
    case 'fair':
      return '●●●○○'; // 3 bars
    case 'poor':
      return '●●○○○'; // 2 bars
    default:
      return '○○○○○'; // 0 bars
  }
}

export default useWebRTCStats;
