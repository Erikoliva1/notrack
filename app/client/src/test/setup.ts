import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock Audio context for ringtone tests
class MockAudioContext {
  createOscillator() {
    return {
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
      frequency: { value: 0 },
    };
  }
  createGain() {
    return {
      connect: () => {},
      disconnect: () => {},
      gain: { value: 0 },
    };
  }
  get destination() {
    return {};
  }
}

(window as any).AudioContext = MockAudioContext;
(window as any).webkitAudioContext = MockAudioContext;
