/**
 * Edge-Compatible Rate Limiting with Shared Storage
 *
 * Provides reliable rate limiting for Edge runtime environments.
 *
 * Storage Options (in order of preference):
 * 1. Upstash Redis (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 * 2. In-memory fallback (BEST-EFFORT: resets on cold starts, no cross-region coordination)
 *
 * IMPORTANT: In-memory mode provides BEST-EFFORT protection only.
 * For production workloads with multiple regions or high scale, configure Upstash Redis.
 */

interface RateLimitEntry {
  count: number
  windowStart: number
  expiresAt: number
}

interface RateLimitResult {
  limited: boolean
  remaining: number
  resetTime: number
  retryAfter: number
}

/**
 * Abstract storage interface for rate limiting
 */
interface RateLimitStorage {
  get(key: string): Promise<RateLimitEntry | null>
  set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void>
  increment(key: string, ttlMs: number): Promise<number>
}

/**
 * Upstash Redis storage implementation
 */
class RedisStorage implements RateLimitStorage {
  private baseUrl: string
  private token: string

  constructor(url: string, token: string) {
    this.baseUrl = url.replace(/\/$/, '') // Remove trailing slash
    this.token = token
  }

  private async request(command: string[]): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([command]),
    })

    if (!response.ok) {
      throw new Error(`Redis request failed: ${response.status}`)
    }

    const [result] = await response.json()
    if (result.error) {
      throw new Error(`Redis error: ${result.error}`)
    }

    return result.result
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    try {
      const result = await this.request(['GET', key])
      return result ? JSON.parse(result) : null
    } catch (error) {
      console.warn('Redis GET failed:', error)
      return null
    }
  }

  async set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void> {
    try {
      await this.request([
        'SETEX',
        key,
        Math.ceil(ttlMs / 1000),
        JSON.stringify(entry),
      ])
    } catch (error) {
      console.warn('Redis SET failed:', error)
    }
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    try {
      // Use Redis pipeline to atomically increment and set TTL
      const response = await fetch(`${this.baseUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, Math.ceil(ttlMs / 1000)],
        ]),
      })

      if (!response.ok) {
        throw new Error(`Redis pipeline failed: ${response.status}`)
      }

      const results = await response.json()
      const [incrResult] = results

      if (incrResult.error) {
        throw new Error(`Redis INCR error: ${incrResult.error}`)
      }

      return incrResult.result
    } catch (error) {
      console.warn('Redis INCREMENT failed:', error)
      throw error
    }
  }
}

/**
 * In-memory storage implementation (fallback)
 */
class MemoryStorage implements RateLimitStorage {
  private store = new Map<string, RateLimitEntry>()

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key)
    if (!entry || entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry
  }

  async set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void> {
    this.store.set(key, entry)

    // Auto-cleanup expired entry
    setTimeout(() => {
      this.store.delete(key)
    }, ttlMs)
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    const now = Date.now()
    const windowStart = Math.floor(now / ttlMs) * ttlMs
    const expiresAt = windowStart + ttlMs

    const existing = await this.get(key)
    const newCount = (existing?.count || 0) + 1

    await this.set(key, { count: newCount, windowStart, expiresAt }, ttlMs)
    return newCount
  }
}

// Cached storage instance (singleton pattern)
let cachedStorage: RateLimitStorage | null = null

/**
 * Get the appropriate storage backend (cached singleton)
 */
function getStorage(): RateLimitStorage {
  // Return cached instance if available
  if (cachedStorage) {
    return cachedStorage
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    cachedStorage = new RedisStorage(redisUrl, redisToken)
  } else {
    // Fallback to in-memory storage
    cachedStorage = new MemoryStorage()
  }

  return cachedStorage
}

/**
 * Clear cached storage (for testing purposes)
 */
export function __clearStorageCache(): void {
  cachedStorage = null
}

/**
 * Edge-compatible rate limiting using shared storage
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const storage = getStorage()
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const key = `ratelimit:${identifier}:${windowStart}`
  const resetTime = windowStart + windowMs

  try {
    const count = await storage.increment(key, windowMs)

    if (count > limit) {
      // Rate limit exceeded
      return {
        limited: true,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000),
      }
    }

    return {
      limited: false,
      remaining: limit - count,
      resetTime,
      retryAfter: 0,
    }
  } catch (error) {
    console.warn('Rate limit check failed:', error)

    // Fail open - allow the request if storage is down
    // Better than failing closed and blocking all traffic
    return {
      limited: false,
      remaining: limit - 1,
      resetTime,
      retryAfter: 0,
    }
  }
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const storage = getStorage()
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const key = `ratelimit:${identifier}:${windowStart}`
  const resetTime = windowStart + windowMs

  try {
    const existing = await storage.get(key)

    if (!existing) {
      return {
        limited: false,
        remaining: limit,
        resetTime,
        retryAfter: 0,
      }
    }

    return {
      limited: existing.count >= limit,
      remaining: Math.max(0, limit - existing.count),
      resetTime,
      retryAfter:
        existing.count >= limit ? Math.ceil((resetTime - now) / 1000) : 0,
    }
  } catch (error) {
    console.warn('Rate limit status check failed:', error)

    // Fail open - assume not limited if storage is down
    return {
      limited: false,
      remaining: limit,
      resetTime,
      retryAfter: 0,
    }
  }
}

/**
 * Clear rate limit for testing/admin purposes
 */
export async function clearRateLimit(identifier: string): Promise<void> {
  const storage = getStorage()

  // Note: This is a best-effort implementation for in-memory storage
  // For Redis, would need to implement pattern-based deletion
  if (storage instanceof MemoryStorage) {
    // Direct access to private store - simplified for testing purposes only
    const memStorage = storage as MemoryStorage & {
      store: Map<string, RateLimitEntry>
    }

    if (memStorage.store) {
      const keysToDelete: string[] = []
      for (const [key] of memStorage.store.entries()) {
        if (key.includes(`ratelimit:${identifier}:`)) {
          keysToDelete.push(key)
        }
      }

      keysToDelete.forEach(key => memStorage.store.delete(key))
    }
  }

  // For Redis storage, keys will naturally expire
  // Could implement explicit deletion with SCAN pattern if needed
}

/**
 * Get storage type for monitoring (simplified stats)
 */
export function getRateLimitStorageType(): string {
  const storage = getStorage()
  if (storage instanceof RedisStorage) {
    return 'redis'
  }
  return 'memory'
}
