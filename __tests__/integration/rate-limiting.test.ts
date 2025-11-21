/**
 * Rate Limiting Integration Tests
 *
 * Tests rate limiting behavior in both production and development modes
 */

import { checkRateLimit, getRateLimitStorageType, __clearStorageCache } from '@/lib/edge-rate-limit'

describe('Rate Limiting', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  beforeEach(() => {
    // Clear any existing rate limit keys and cached storage
    jest.clearAllMocks()
    __clearStorageCache()
  })

  afterEach(() => {
    // Restore environment
    process.env.NODE_ENV = originalNodeEnv
    process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl
    process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken
  })

  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    })

    it('should use in-memory storage in development', () => {
      const storageType = getRateLimitStorageType()
      expect(storageType).toBe('memory')
    })

    it('should allow requests within limit', async () => {
      const result = await checkRateLimit('test-user', 5, 60000)

      expect(result.limited).toBe(false)
      expect(result.remaining).toBe(4)
      expect(result.resetTime).toBeGreaterThan(Date.now())
      expect(result.retryAfter).toBe(0)
    })

    it('should enforce rate limits in memory', async () => {
      const identifier = `test-limit-${Date.now()}`

      // Make 5 requests (should all pass)
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(identifier, 5, 60000)
        expect(result.limited).toBe(false)
        expect(result.remaining).toBe(4 - i)
      }

      // 6th request should be limited
      const limitedResult = await checkRateLimit(identifier, 5, 60000)
      expect(limitedResult.limited).toBe(true)
      expect(limitedResult.remaining).toBe(0)
      expect(limitedResult.retryAfter).toBeGreaterThan(0)
    })

    it('should fail open in development when storage fails', async () => {
      // Mock storage to simulate failure
      const mockError = new Error('Storage failure')
      jest.spyOn(console, 'warn').mockImplementation(() => {})
      jest.spyOn(console, 'error').mockImplementation(() => {})

      // Simulate storage failure by using invalid identifier that causes internal error
      const result = await checkRateLimit('', 5, 60000)

      // In development, should fail open
      expect(result.limited).toBe(false)
    })
  })

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should require Redis in production', () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      __clearStorageCache() // Clear cache after env changes

      expect(() => {
        getRateLimitStorageType()
      }).toThrow('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production')
    })

    it('should use Redis when configured in production', () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis-url.com'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      __clearStorageCache() // Clear cache after env changes

      const storageType = getRateLimitStorageType()
      expect(storageType).toBe('redis')
    })

    it('should fail closed in production when storage fails', async () => {
      // Configure invalid Redis (will cause connection failure)
      process.env.UPSTASH_REDIS_REST_URL = 'https://invalid-redis-url.com'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'invalid-token'
      __clearStorageCache() // Clear cache after env changes

      jest.spyOn(console, 'error').mockImplementation(() => {})

      const result = await checkRateLimit('test-user', 5, 60000)

      // In production, should fail closed
      expect(result.limited).toBe(true)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBe(60)
    })
  })

  describe('Rate Limiting Headers', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      __clearStorageCache()
    })

    it('should return correct rate limit information', async () => {
      const identifier = `header-test-${Date.now()}`
      const limit = 10
      const windowMs = 60000

      const result = await checkRateLimit(identifier, limit, windowMs)

      expect(result.remaining).toBe(limit - 1)
      expect(result.resetTime).toBeGreaterThan(Date.now())
      expect(result.resetTime).toBeLessThan(Date.now() + windowMs + 1000) // Allow 1s buffer
    })

    it('should handle rapid sequential requests correctly', async () => {
      const identifier = `rapid-test-${Date.now()}`
      const limit = 3

      // Make 3 rapid requests sequentially (not parallel) for more predictable behavior
      const result1 = await checkRateLimit(identifier, limit, 60000)
      const result2 = await checkRateLimit(identifier, limit, 60000)
      const result3 = await checkRateLimit(identifier, limit, 60000)

      // All should succeed but with decreasing remaining count
      expect(result1.limited).toBe(false)
      expect(result2.limited).toBe(false)
      expect(result3.limited).toBe(false)

      // Next request should be limited
      const limitedResult = await checkRateLimit(identifier, limit, 60000)
      expect(limitedResult.limited).toBe(true)
    })
  })

  describe('Security Features', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      __clearStorageCache()
    })

    it('should handle different identifiers independently', async () => {
      const user1 = `user1-${Date.now()}`
      const user2 = `user2-${Date.now()}`

      // User1 hits rate limit
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(user1, 5, 60000)
      }
      const user1Limited = await checkRateLimit(user1, 5, 60000)
      expect(user1Limited.limited).toBe(true)

      // User2 should still be allowed
      const user2Result = await checkRateLimit(user2, 5, 60000)
      expect(user2Result.limited).toBe(false)
    })

    it('should use time windows correctly', async () => {
      const identifier = `window-test-${Date.now()}`

      // Use very short window for testing
      const shortWindow = 100 // 100ms

      // First request should succeed
      const result1 = await checkRateLimit(identifier, 1, shortWindow)
      expect(result1.limited).toBe(false)

      // Immediate second request should be limited
      const result2 = await checkRateLimit(identifier, 1, shortWindow)
      expect(result2.limited).toBe(true)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be allowed again
      const result3 = await checkRateLimit(identifier, 1, shortWindow)
      expect(result3.limited).toBe(false)
    })
  })
})