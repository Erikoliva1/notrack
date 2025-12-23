/**
 * Jest Test Setup
 * 
 * Global setup for all tests
 * - Mock environment variables
 * - Setup test utilities
 * - Configure test timeouts
 */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173';
process.env.ENABLE_GUEST_ACCESS = 'true';
process.env.USE_REDIS = 'false'; // Use in-memory for tests
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.RATE_LIMIT_WINDOW_MS = '900000';

// Increase test timeout for integration tests
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
  await new Promise(resolve => setTimeout(resolve, 500));
});
