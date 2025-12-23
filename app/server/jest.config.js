module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Coverage Configuration
  collectCoverage: false, // Enable with --coverage flag
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Collect coverage from these files
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/instrument.ts', // Sentry instrumentation
  ],
  
  // Coverage thresholds - fail if below these percentages
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for critical files
    './src/middleware/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 75,
      functions: 80,
      lines: 82,
      statements: 82
    }
  },
  
  // Ignore these patterns for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/tests/',
    '.test.ts$'
  ],
  
  verbose: true,
  testTimeout: 10000,
  
  // CI-specific settings
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Module name mapper for path aliases (if using)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  }
};
