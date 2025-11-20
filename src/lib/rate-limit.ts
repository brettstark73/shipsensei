/**
 * Rate Limiting Utility
 *
 * In-memory rate limiter for API routes.
 * For production with multiple instances, upgrade to Upstash Redis.
 *
 * Rate limits (from CLAUDE.md):
 * - 100 requests/min per user (general API)
 * - 10 AI generations/min
 * - 5 deployments/hour
 */

type RateLimitConfig = {
  interval: number // Time window in milliseconds
  maxRequests: number // Max requests allowed in the interval
}

type RateLimitStore = {
  count: number
  resetTime: number
}

// In-memory store (use Redis in production)
const store = new Map<string, RateLimitStore>()

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
  API: { interval: 60 * 1000, maxRequests: 100 }, // 100/min
  AI: { interval: 60 * 1000, maxRequests: 10 }, // 10/min
  DEPLOYMENT: { interval: 60 * 60 * 1000, maxRequests: 5 }, // 5/hour
} as const

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns { limited: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  limited: boolean
  remaining: number
  resetTime: number
} {
  const key = `${identifier}:${config.interval}`
  const now = Date.now()

  // Get or create rate limit entry
  let entry = store.get(key)

  // Reset if window has passed
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.interval,
    }
  }

  // Increment count
  entry.count++
  store.set(key, entry)

  const remaining = Math.max(0, config.maxRequests - entry.count)
  const limited = entry.count > config.maxRequests

  return {
    limited,
    remaining,
    resetTime: entry.resetTime,
  }
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key)
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
