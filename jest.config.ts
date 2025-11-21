import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Test patterns - include both .test.* and .spec.* files
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.spec.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/types/**/*',
    '!src/app/layout.tsx', // Root layout is mostly boilerplate
    '!src/lib/prisma.ts', // Prisma client singleton
    '!src/lib/auth-provider.tsx', // Simple wrapper component
  ],

  // Coverage thresholds - restored to meaningful levels that prevent regressions
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Service layer (lib/) - high standards for critical business logic
    'src/lib/ai.ts': {
      branches: 80,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'src/lib/github.ts': {
      branches: 65,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    'src/lib/project-generator.ts': {
      branches: 70,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'src/lib/vercel.ts': {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/lib/edge-rate-limit.ts': {
      branches: 60,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/lib/edge-logger.ts': {
      branches: 55,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
