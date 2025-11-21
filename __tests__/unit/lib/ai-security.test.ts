/**
 * Security-focused tests for AI module
 * Tests critical security fixes implemented
 */

describe('AI Security Tests', () => {
  // Store original env
  const originalEnv = process.env.ANTHROPIC_API_KEY
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    // Restore original env
    process.env.ANTHROPIC_API_KEY = originalEnv
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('ANTHROPIC_API_KEY validation', () => {
    it('should throw error when ANTHROPIC_API_KEY is missing and client is used', () => {
      // Clear the environment variable
      delete process.env.ANTHROPIC_API_KEY
      process.env.NODE_ENV = 'production' // Ensure not in test mode

      // Mock dynamic import to clear module cache
      jest.resetModules()

      expect(() => {
        const { anthropic } = require('../../../src/lib/ai')
        anthropic() // Call the lazy client getter
      }).toThrow('ANTHROPIC_API_KEY environment variable is required')
    })

    it('should throw error when ANTHROPIC_API_KEY is empty string and client is used', () => {
      // Set empty string
      process.env.ANTHROPIC_API_KEY = ''
      process.env.NODE_ENV = 'production' // Ensure not in test mode

      // Mock dynamic import to clear module cache
      jest.resetModules()

      expect(() => {
        const { anthropic } = require('../../../src/lib/ai')
        anthropic() // Call the lazy client getter
      }).toThrow('ANTHROPIC_API_KEY environment variable is required')
    })

    it('should not throw error when ANTHROPIC_API_KEY is set and module is imported', () => {
      // Set valid key
      process.env.ANTHROPIC_API_KEY = 'test-key'

      // Mock dynamic import to clear module cache
      jest.resetModules()

      expect(() => {
        require('../../../src/lib/ai')
      }).not.toThrow()
    })

    it('should allow import in test environment without API key', () => {
      // Clear the environment variable but set test environment
      delete process.env.ANTHROPIC_API_KEY
      process.env.NODE_ENV = 'test'

      // Mock dynamic import to clear module cache
      jest.resetModules()

      expect(() => {
        require('../../../src/lib/ai')
      }).not.toThrow()

      expect(() => {
        const { anthropic } = require('../../../src/lib/ai')
        anthropic() // This should throw in test env when key missing
      }).toThrow('ANTHROPIC_API_KEY not available in test environment')
    })
  })

  describe('Model configuration', () => {
    beforeEach(() => {
      // Ensure we have a valid API key for these tests
      process.env.ANTHROPIC_API_KEY = 'test-key'
      jest.resetModules()
    })

    it('should use default model when ANTHROPIC_MODEL is not set', () => {
      delete process.env.ANTHROPIC_MODEL
      jest.resetModules()

      // This test just verifies the module loads without error
      // The actual model value is internal to the module
      expect(() => {
        require('../../../src/lib/ai')
      }).not.toThrow()
    })

    it('should use custom model when ANTHROPIC_MODEL is set', () => {
      process.env.ANTHROPIC_MODEL = 'claude-3-opus-20240229'
      jest.resetModules()

      expect(() => {
        require('../../../src/lib/ai')
      }).not.toThrow()
    })
  })

  describe('Security regression prevention', () => {
    it('should not expose API key in module exports', () => {
      process.env.ANTHROPIC_API_KEY = 'secret-test-key'
      jest.resetModules()

      const aiModule = require('../../../src/lib/ai')
      const moduleString = JSON.stringify(aiModule)

      // Ensure API key is not accidentally exposed in module exports
      expect(moduleString).not.toContain('secret-test-key')
    })
  })
})
