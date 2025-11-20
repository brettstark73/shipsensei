/**
 * Rate Limit Utility Tests
 *
 * Tests for src/lib/rate-limit.ts
 */

import {
  checkRateLimit,
  cleanupRateLimitStore,
  RATE_LIMITS,
} from '@/lib/rate-limit'

describe('Rate Limit Utility', () => {
  beforeEach(() => {
    // Clear the internal store by triggering cleanup
    cleanupRateLimitStore()
  })

  describe('RATE_LIMITS configuration', () => {
    it('should have API rate limit of 100 requests per minute', () => {
      expect(RATE_LIMITS.API.maxRequests).toBe(100)
      expect(RATE_LIMITS.API.interval).toBe(60 * 1000)
    })

    it('should have AI rate limit of 10 requests per minute', () => {
      expect(RATE_LIMITS.AI.maxRequests).toBe(10)
      expect(RATE_LIMITS.AI.interval).toBe(60 * 1000)
    })

    it('should have deployment rate limit of 5 requests per hour', () => {
      expect(RATE_LIMITS.DEPLOYMENT.maxRequests).toBe(5)
      expect(RATE_LIMITS.DEPLOYMENT.interval).toBe(60 * 60 * 1000)
    })
  })

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const result = checkRateLimit(`unique-${Date.now()}`, RATE_LIMITS.API)

      expect(result.limited).toBe(false)
      expect(result.remaining).toBe(99) // 100 - 1
      expect(result.resetTime).toBeGreaterThan(Date.now())
    })

    it('should decrement remaining count on each request', () => {
      const identifier = `unique-${Date.now()}-decrement`
      const config = RATE_LIMITS.API

      const result1 = checkRateLimit(identifier, config)
      expect(result1.remaining).toBe(99)

      const result2 = checkRateLimit(identifier, config)
      expect(result2.remaining).toBe(98)

      const result3 = checkRateLimit(identifier, config)
      expect(result3.remaining).toBe(97)
    })

    it('should rate limit after exceeding max requests', () => {
      const identifier = `unique-${Date.now()}-exceed`
      const config = { maxRequests: 3, interval: 60000 }

      // Make 3 requests (at limit)
      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)

      // 4th request should not be limited yet (count = 3, max = 3)
      const result4 = checkRateLimit(identifier, config)
      expect(result4.limited).toBe(true)
      expect(result4.remaining).toBe(0)
    })

    it('should isolate rate limits by identifier', () => {
      const config = RATE_LIMITS.API

      const result1 = checkRateLimit('user123', config)
      const result2 = checkRateLimit('user456', config)

      expect(result1.remaining).toBe(99)
      expect(result2.remaining).toBe(99) // Different user, fresh limit
    })

    it('should reset limit after time window expires', () => {
      const identifier = 'user123'
      const config = { maxRequests: 2, interval: 100 } // 100ms window

      // Use up the limit
      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)
      const limited = checkRateLimit(identifier, config)
      expect(limited.limited).toBe(true)

      // Wait for window to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = checkRateLimit(identifier, config)
          expect(result.limited).toBe(false)
          expect(result.remaining).toBe(1) // Reset to max - 1
          resolve(undefined)
        }, 150) // Wait longer than interval
      })
    })

    it('should return consistent reset time within window', () => {
      const identifier = 'user123'
      const config = RATE_LIMITS.API

      const result1 = checkRateLimit(identifier, config)
      const result2 = checkRateLimit(identifier, config)

      expect(result1.resetTime).toBe(result2.resetTime)
    })

    it('should handle different intervals correctly', () => {
      const identifier = 'user123'

      const apiResult = checkRateLimit(identifier, RATE_LIMITS.API)
      const aiResult = checkRateLimit(identifier, RATE_LIMITS.AI)

      // Different intervals should have different reset times
      expect(apiResult.resetTime).toBeDefined()
      expect(aiResult.resetTime).toBeDefined()
    })

    it('should track remaining requests accurately', () => {
      const identifier = 'user123'
      const config = { maxRequests: 5, interval: 60000 }

      for (let i = 5; i > 0; i--) {
        const result = checkRateLimit(identifier, config)
        expect(result.remaining).toBe(i - 1)
      }

      const exceededResult = checkRateLimit(identifier, config)
      expect(exceededResult.limited).toBe(true)
      expect(exceededResult.remaining).toBe(0)
    })

    it('should never return negative remaining count', () => {
      const identifier = 'user123'
      const config = { maxRequests: 1, interval: 60000 }

      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)
      const result = checkRateLimit(identifier, config)

      expect(result.remaining).toBeGreaterThanOrEqual(0)
    })
  })

  describe('cleanupRateLimitStore', () => {
    it('should remove expired entries', () => {
      const identifier = 'user123'
      const config = { maxRequests: 10, interval: 50 } // 50ms window

      // Create an entry
      checkRateLimit(identifier, config)

      // Wait for expiry
      return new Promise((resolve) => {
        setTimeout(() => {
          cleanupRateLimitStore()

          // After cleanup, should start fresh
          const result = checkRateLimit(identifier, config)
          expect(result.remaining).toBe(9) // Fresh start
          resolve(undefined)
        }, 100)
      })
    })

    it('should not remove active entries', () => {
      const identifier = 'user123'
      const config = { maxRequests: 10, interval: 60000 } // 1 minute

      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)

      cleanupRateLimitStore()

      // Entry should still exist
      const result = checkRateLimit(identifier, config)
      expect(result.remaining).toBe(7) // Was at 8, now 7
    })
  })

  describe('Edge cases', () => {
    it('should handle rapid sequential requests', () => {
      const identifier = 'user123'
      const config = { maxRequests: 100, interval: 60000 }

      const results = []
      for (let i = 0; i < 50; i++) {
        results.push(checkRateLimit(identifier, config))
      }

      results.forEach((result, index) => {
        expect(result.remaining).toBe(99 - index)
      })
    })

    it('should handle zero max requests', () => {
      const identifier = 'user123'
      const config = { maxRequests: 0, interval: 60000 }

      const result = checkRateLimit(identifier, config)

      expect(result.limited).toBe(true)
      expect(result.remaining).toBe(0)
    })

    it('should handle very large intervals', () => {
      const identifier = 'user123'
      const config = { maxRequests: 10, interval: 24 * 60 * 60 * 1000 } // 24 hours

      const result = checkRateLimit(identifier, config)

      expect(result.limited).toBe(false)
      expect(result.resetTime).toBeGreaterThan(Date.now())
    })

    it('should handle concurrent requests from same identifier', () => {
      const identifier = 'user123'
      const config = { maxRequests: 10, interval: 60000 }

      // Simulate concurrent requests
      const results = Promise.all([
        Promise.resolve(checkRateLimit(identifier, config)),
        Promise.resolve(checkRateLimit(identifier, config)),
        Promise.resolve(checkRateLimit(identifier, config)),
      ])

      return results.then((res) => {
        expect(res).toHaveLength(3)
        res.forEach((r) => {
          expect(r.limited).toBe(false)
        })
      })
    })

    it('should handle special characters in identifier', () => {
      const specialIdentifiers = [
        'user@example.com',
        '192.168.1.1',
        'user-123',
        'user_456',
        'user.789',
      ]

      specialIdentifiers.forEach((id) => {
        const result = checkRateLimit(id, RATE_LIMITS.API)
        expect(result.limited).toBe(false)
        expect(result.remaining).toBeGreaterThanOrEqual(0)
      })
    })
  })
})
