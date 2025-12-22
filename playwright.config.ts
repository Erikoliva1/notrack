import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Tests full user flows:
 * - User connects and receives extension
 * - User A calls User B
 * - Call connects successfully
 * - Audio transmission works
 * - Call ends gracefully
 */

export default defineConfig({
  testDir: './tests/e2e',
  
  // Maximum time one test can run
  timeout: 30 * 1000,
  
  // Maximum time expect() should wait for condition
  expect: {
    timeout: 5000,
  },
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail build on CI if tests.only is left in
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,
  
  // Number of parallel workers
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:5173',
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Grant permissions for microphone
        permissions: ['microphone'],
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        permissions: ['microphone'],
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        permissions: ['microphone'],
      },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        permissions: ['microphone'],
      },
    },
    
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        permissions: ['microphone'],
      },
    },
  ],

  // Run local dev server before starting tests
  webServer: [
    {
      command: 'cd app/client && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd app/server && npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
