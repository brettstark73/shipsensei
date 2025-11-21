import {
  checkRateLimit,
  getRateLimitStatus,
  clearRateLimit,
  getRateLimitStorageType,
  __clearStorageCache,
} from '@/lib/edge-rate-limit'

// Mock fetch for Redis tests
global.fetch = jest.fn()

describe('Edge Rate Limiting', () => {
  const originalEnv = process.env
  let testCounter = 0
  let mockTime = 1700000000000 // Fixed timestamp for consistent testing

  // Generate unique identifier for each test to avoid state pollution
  function getUniqueId(prefix: string): string {
    return `${prefix}-${testCounter++}`
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Clear storage cache to get fresh instance per test
    __clearStorageCache()

    // Reset to memory storage by default
    process.env = { ...originalEnv }
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    // Mock Date.now() for consistent window calculations
    mockTime = 1700000000000 + testCounter * 100000 // Different base time per test
    jest.spyOn(Date, 'now').mockReturnValue(mockTime)
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  describe('MemoryStorage (fallback mode)', () => {
    beforeEach(() => {
      // Ensure we're using memory storage
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    })

    describe('checkRateLimit', () => {
      it('should allow requests within limit', async () => {
        const identifier = getUniqueId('user')
        const limit = 5
        const windowMs = 60000 // 1 minute

        const result1 = await checkRateLimit(identifier, limit, windowMs)
        expect(result1.limited).toBe(false)
        expect(result1.remaining).toBe(4) // limit - 1
        expect(result1.retryAfter).toBe(0)

        const result2 = await checkRateLimit(identifier, limit, windowMs)
        expect(result2.limited).toBe(false)
        expect(result2.remaining).toBe(3) // limit - 2
      })

      it('should block requests exceeding limit', async () => {
        const identifier = getUniqueId('user')
        const limit = 3
        const windowMs = 60000

        // Make requests up to limit
        await checkRateLimit(identifier, limit, windowMs)
        await checkRateLimit(identifier, limit, windowMs)
        await checkRateLimit(identifier, limit, windowMs)

        // Next request should be limited (count will be 4, which is > 3)
        const result = await checkRateLimit(identifier, limit, windowMs)
        expect(result.limited).toBe(true)
        expect(result.remaining).toBe(0)
        expect(result.retryAfter).toBeGreaterThan(0)
      })

      it('should reset after window expires', async () => {
        const identifier = getUniqueId('user')
        const limit = 2
        const windowMs = 100 // 100ms window for fast testing

        // Exhaust limit
        await checkRateLimit(identifier, limit, windowMs)
        await checkRateLimit(identifier, limit, windowMs)

        // Next request should be limited (count will be 3, which is > 2)
        const limited = await checkRateLimit(identifier, limit, windowMs)
        expect(limited.limited).toBe(true)

        // Advance time to next window
        mockTime += windowMs + 10
        jest.spyOn(Date, 'now').mockReturnValue(mockTime)

        // Should be allowed again in new window
        const allowed = await checkRateLimit(identifier, limit, windowMs)
        expect(allowed.limited).toBe(false)
        expect(allowed.remaining).toBe(1)
      })

      it('should have separate limits per identifier', async () => {
        const userA = getUniqueId('user-a')
        const userB = getUniqueId('user-b')
        const limit = 2
        const windowMs = 60000

        await checkRateLimit(userA, limit, windowMs)
        await checkRateLimit(userA, limit, windowMs)

        // user-a is at limit (count = 3 on next request, which is > 2)
        const resultA = await checkRateLimit(userA, limit, windowMs)
        expect(resultA.limited).toBe(true)

        // user-b should still have full limit
        const resultB = await checkRateLimit(userB, limit, windowMs)
        expect(resultB.limited).toBe(false)
        expect(resultB.remaining).toBe(1)
      })

      it('should return valid resetTime', async () => {
        const identifier = getUniqueId('user')
        const limit = 5
        const windowMs = 60000
        const now = Date.now()

        const result = await checkRateLimit(identifier, limit, windowMs)

        expect(result.resetTime).toBeGreaterThan(now)
        expect(result.resetTime).toBeLessThanOrEqual(now + windowMs)
      })
    })

    describe('getRateLimitStatus', () => {
      it('should return status without incrementing', async () => {
        const identifier = getUniqueId('user')
        const limit = 5
        const windowMs = 60000

        // Check status - should show full limit
        const status1 = await getRateLimitStatus(identifier, limit, windowMs)
        expect(status1.limited).toBe(false)
        expect(status1.remaining).toBe(5)

        // Status check shouldn't increment
        const status2 = await getRateLimitStatus(identifier, limit, windowMs)
        expect(status2.remaining).toBe(5)

        // Actual request should increment
        await checkRateLimit(identifier, limit, windowMs)

        // Status should reflect the increment
        const status3 = await getRateLimitStatus(identifier, limit, windowMs)
        expect(status3.remaining).toBe(4)
      })

      it('should show limited status when at limit', async () => {
        const identifier = getUniqueId('user')
        const limit = 2
        const windowMs = 60000

        // Exhaust limit (2 requests allowed, 3rd request will be limited)
        await checkRateLimit(identifier, limit, windowMs)
        await checkRateLimit(identifier, limit, windowMs)

        // Status should show count=2, which is >= limit, so limited
        const status = await getRateLimitStatus(identifier, limit, windowMs)
        expect(status.limited).toBe(true)
        expect(status.remaining).toBe(0)
        expect(status.retryAfter).toBeGreaterThan(0)
      })

      it('should return full limit for new identifier', async () => {
        const identifier = getUniqueId('user')
        const limit = 10
        const windowMs = 60000

        const status = await getRateLimitStatus(identifier, limit, windowMs)
        expect(status.limited).toBe(false)
        expect(status.remaining).toBe(10)
        expect(status.retryAfter).toBe(0)
      })
    })

    describe('clearRateLimit', () => {
      it('should clear rate limit for identifier', async () => {
        const identifier = getUniqueId('user')
        const limit = 2
        const windowMs = 60000

        // Exhaust limit
        await checkRateLimit(identifier, limit, windowMs)
        await checkRateLimit(identifier, limit, windowMs)

        // Next request should be limited
        const limited = await checkRateLimit(identifier, limit, windowMs)
        expect(limited.limited).toBe(true)

        // Clear rate limit
        await clearRateLimit(identifier)

        // Should be allowed again
        const allowed = await checkRateLimit(identifier, limit, windowMs)
        expect(allowed.limited).toBe(false)
        expect(allowed.remaining).toBe(1)
      })

      it('should only clear specific identifier', async () => {
        const user1 = getUniqueId('user-1')
        const user2 = getUniqueId('user-2')
        const limit = 2
        const windowMs = 60000

        // Exhaust limit for user-1
        await checkRateLimit(user1, limit, windowMs)
        await checkRateLimit(user1, limit, windowMs)
        await checkRateLimit(user1, limit, windowMs)

        // Exhaust limit for user-2
        await checkRateLimit(user2, limit, windowMs)
        await checkRateLimit(user2, limit, windowMs)
        await checkRateLimit(user2, limit, windowMs)

        // Clear only user-1
        await clearRateLimit(user1)

        // user-1 should be allowed
        const result1 = await checkRateLimit(user1, limit, windowMs)
        expect(result1.limited).toBe(false)

        // user-2 should still be limited
        const result2 = await checkRateLimit(user2, limit, windowMs)
        expect(result2.limited).toBe(true)
      })
    })

    describe('getRateLimitStorageType', () => {
      it('should return "memory" when Redis not configured', () => {
        delete process.env.UPSTASH_REDIS_REST_URL
        delete process.env.UPSTASH_REDIS_REST_TOKEN

        expect(getRateLimitStorageType()).toBe('memory')
      })
    })
  })

  describe('RedisStorage (production mode)', () => {
    beforeEach(() => {
      // Configure Redis environment
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
    })

    describe('checkRateLimit with Redis', () => {
      it('should make correct Redis pipeline request', async () => {
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { result: 1 }, // INCR result
            { result: 1 }, // EXPIRE result
          ],
        } as Response)

        const identifier = 'user-redis'
        const limit = 5
        const windowMs = 60000

        const result = await checkRateLimit(identifier, limit, windowMs)

        expect(result.limited).toBe(false)
        expect(result.remaining).toBe(4)

        expect(mockFetch).toHaveBeenCalledWith(
          'https://redis.example.com/pipeline',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
              'Content-Type': 'application/json',
            }),
            body: expect.stringContaining('INCR'),
          })
        )
      })

      it('should detect rate limit exceeded in Redis', async () => {
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { result: 6 }, // INCR result (exceeds limit of 5)
            { result: 1 }, // EXPIRE result
          ],
        } as Response)

        const identifier = 'user-redis-limited'
        const limit = 5
        const windowMs = 60000

        const result = await checkRateLimit(identifier, limit, windowMs)

        expect(result.limited).toBe(true)
        expect(result.remaining).toBe(0)
        expect(result.retryAfter).toBeGreaterThan(0)
      })

      it('should fail open if Redis is down', async () => {
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const consoleWarnSpy = jest
          .spyOn(console, 'warn')
          .mockImplementation(() => {})

        const identifier = 'user-redis-down'
        const limit = 5
        const windowMs = 60000

        const result = await checkRateLimit(identifier, limit, windowMs)

        // Should fail open (allow request)
        expect(result.limited).toBe(false)
        expect(result.remaining).toBe(4)
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Rate limit check failed:',
          expect.any(Error)
        )

        consoleWarnSpy.mockRestore()
      })

      it('should handle Redis error response', async () => {
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [{ error: 'WRONGTYPE Operation not permitted' }],
        } as Response)

        const consoleWarnSpy = jest
          .spyOn(console, 'warn')
          .mockImplementation(() => {})

        const identifier = 'user-redis-error'
        const limit = 5
        const windowMs = 60000

        const result = await checkRateLimit(identifier, limit, windowMs)

        // Should fail open
        expect(result.limited).toBe(false)
        expect(consoleWarnSpy).toHaveBeenCalled()

        consoleWarnSpy.mockRestore()
      })

      it('should handle Redis HTTP error status', async () => {
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response)

        const consoleWarnSpy = jest
          .spyOn(console, 'warn')
          .mockImplementation(() => {})

        const identifier = 'user-redis-500'
        const limit = 5
        const windowMs = 60000

        const result = await checkRateLimit(identifier, limit, windowMs)

        // Should fail open
        expect(result.limited).toBe(false)
        expect(consoleWarnSpy).toHaveBeenCalled()

        consoleWarnSpy.mockRestore()
      })
    })

    describe('getRateLimitStatus with Redis', () => {
      it('should make correct Redis GET request', async () => {
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              result: JSON.stringify({
                count: 2,
                windowStart: Date.now(),
                expiresAt: Date.now() + 60000,
              }),
            },
          ],
        } as Response)

        const identifier = 'user-redis-status'
        const limit = 5
        const windowMs = 60000

        const status = await getRateLimitStatus(identifier, limit, windowMs)

        expect(status.limited).toBe(false)
        expect(status.remaining).toBe(3) // limit - count

        expect(mockFetch).toHaveBeenCalledWith(
          'https://redis.example.com/pipeline',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('GET'),
          })
        )
      })

      it('should return full limit when Redis key not found', async () => {
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [{ result: null }], // Key doesn't exist
        } as Response)

        const identifier = 'user-redis-new'
        const limit = 5
        const windowMs = 60000

        const status = await getRateLimitStatus(identifier, limit, windowMs)

        expect(status.limited).toBe(false)
        expect(status.remaining).toBe(5)
        expect(status.retryAfter).toBe(0)
      })

      it('should fail open if Redis status check fails', async () => {
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const consoleWarnSpy = jest
          .spyOn(console, 'warn')
          .mockImplementation(() => {})

        const identifier = 'user-redis-status-fail'
        const limit = 5
        const windowMs = 60000

        const status = await getRateLimitStatus(identifier, limit, windowMs)

        // Should fail open (assume not limited)
        expect(status.limited).toBe(false)
        expect(status.remaining).toBe(5)
        // RedisStorage.get() logs "Redis GET failed:" not "Rate limit status check failed:"
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Redis GET failed:',
          expect.any(Error)
        )

        consoleWarnSpy.mockRestore()
      })
    })

    describe('getRateLimitStorageType', () => {
      it('should return "redis" when Redis is configured', () => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com'
        process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

        expect(getRateLimitStorageType()).toBe('redis')
      })
    })

    describe('Redis URL normalization', () => {
      it('should remove trailing slash from Redis URL', async () => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com/'
        process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [{ result: 1 }, { result: 1 }],
        } as Response)

        await checkRateLimit('user', 5, 60000)

        // Should call without double slash
        expect(mockFetch).toHaveBeenCalledWith(
          'https://redis.example.com/pipeline',
          expect.any(Object)
        )
      })
    })
  })

  describe('Edge cases and security', () => {
    beforeEach(() => {
      // Ensure memory storage for edge case tests
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    })

    it('should handle very short time windows', async () => {
      const identifier = getUniqueId('user')
      const limit = 3
      const windowMs = 10 // 10ms

      const result1 = await checkRateLimit(identifier, limit, windowMs)
      const result2 = await checkRateLimit(identifier, limit, windowMs)
      const result3 = await checkRateLimit(identifier, limit, windowMs)

      expect(result1.limited).toBe(false)
      expect(result2.limited).toBe(false)
      expect(result3.limited).toBe(false)

      const result4 = await checkRateLimit(identifier, limit, windowMs)
      expect(result4.limited).toBe(true)
    })

    it('should handle very long time windows', async () => {
      const identifier = getUniqueId('user')
      const limit = 5
      const windowMs = 3600000 // 1 hour

      const result = await checkRateLimit(identifier, limit, windowMs)

      expect(result.limited).toBe(false)
      expect(result.resetTime).toBeGreaterThan(Date.now())
      expect(result.resetTime).toBeLessThanOrEqual(Date.now() + windowMs)
    })

    it('should handle limit of 1', async () => {
      const identifier = getUniqueId('user')
      const limit = 1
      const windowMs = 60000

      const result1 = await checkRateLimit(identifier, limit, windowMs)
      expect(result1.limited).toBe(false)
      expect(result1.remaining).toBe(0)

      const result2 = await checkRateLimit(identifier, limit, windowMs)
      expect(result2.limited).toBe(true)
      expect(result2.remaining).toBe(0)
    })

    it('should handle special characters in identifier', async () => {
      const identifier = `${getUniqueId('user')}:123@example.com`
      const limit = 5
      const windowMs = 60000

      const result = await checkRateLimit(identifier, limit, windowMs)
      expect(result.limited).toBe(false)
      expect(result.remaining).toBe(4)

      const status = await getRateLimitStatus(identifier, limit, windowMs)
      expect(status.remaining).toBe(4)
    })

    it('should calculate retryAfter correctly', async () => {
      const identifier = getUniqueId('user')
      const limit = 1
      const windowMs = 5000 // 5 seconds

      // Exhaust limit
      await checkRateLimit(identifier, limit, windowMs)

      const result = await checkRateLimit(identifier, limit, windowMs)
      expect(result.limited).toBe(true)
      expect(result.retryAfter).toBeGreaterThan(0)
      expect(result.retryAfter).toBeLessThanOrEqual(5) // Should be ~5 seconds or less
    })
  })
})
