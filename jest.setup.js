require('@testing-library/jest-dom')
const { TextEncoder, TextDecoder } = require('util')

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only'
process.env.GITHUB_CLIENT_ID = 'test-github-client-id'
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-api-key'

// Mock fetch globally
global.fetch = jest.fn()

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})
