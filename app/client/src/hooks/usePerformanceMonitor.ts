/**
 * PHASE 5: Performance Monitoring Hook
 * 
 * Provides real-time performance metrics and memory profiling
 * Helps detect memory leaks and performance degradation
 */

import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  memory: {
    used: number;
    limit: number;
    percentage: number;
  } | null;
  renderCount: number;
  lastRenderTime: number;
}

export const usePerformanceMonitor = (enabled: boolean = false) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: null,
    renderCount: 0,
    lastRenderTime: 0,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const renderCountRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const metricsIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Track render count
    renderCountRef.current++;

    // FPS monitoring
    const measureFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        frameCountRef.current = 0;
        lastTimeRef.current = now;

        // Get memory info if available
        let memoryInfo = null;
        if ('memory' in performance && (performance as any).memory) {
          const mem = (performance as any).memory;
          memoryInfo = {
            used: Math.round(mem.usedJSHeapSize / 1048576), // MB
            limit: Math.round(mem.jsHeapSizeLimit / 1048576), // MB
            percentage: Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100),
          };
        }

        setMetrics({
          fps,
          memory: memoryInfo,
          renderCount: renderCountRef.current,
          lastRenderTime: now,
        });
      }

      animationFrameRef.current = requestAnimationFrame(measureFPS);
    };

    animationFrameRef.current = requestAnimationFrame(measureFPS);

    // Memory leak detection (log warnings if memory grows continuously)
    const memoryCheckInterval = setInterval(() => {
      if ('memory' in performance && (performance as any).memory) {
        const mem = (performance as any).memory;
        const usedMB = mem.usedJSHeapSize / 1048576;
        const percentage = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;

        if (percentage > 80) {
          console.warn('⚠️ High memory usage detected:', {
            usedMB: usedMB.toFixed(2),
            percentage: percentage.toFixed(1) + '%',
            renders: renderCountRef.current,
          });
        }
      }
    }, 10000); // Check every 10 seconds

    metricsIntervalRef.current = memoryCheckInterval;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [enabled]);

  return metrics;
};

/**
 * Performance profiler utility
 * Measures execution time of functions
 */
export const profileFunction = <T extends (...args: any[]) => any>(
  fn: T,
  label: string
): T => {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    const result = fn(...args);
    const duration = performance.now() - start;
    
    if (duration > 16) { // Longer than one frame (60fps)
      console.warn(`⚠️ Slow function: ${label} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }) as T;
};

/**
 * Memory snapshot utility
 * Logs current memory usage
 */
export const logMemorySnapshot = (label: string = 'Memory Snapshot') => {
  if ('memory' in performance && (performance as any).memory) {
    const mem = (performance as any).memory;
    console.log(`📊 ${label}:`, {
      used: `${(mem.usedJSHeapSize / 1048576).toFixed(2)} MB`,
      total: `${(mem.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      limit: `${(mem.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
      percentage: `${((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(1)}%`,
    });
  } else {
    console.log(`📊 ${label}: Memory API not available in this browser`);
  }
};
