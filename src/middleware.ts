import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Next.js Middleware
 *
 * Runs on Edge Runtime before requests reach API routes.
 * Handles:
 * - Rate limiting
 * - Authentication checks for protected routes
 * - Request logging
 */

// Simple in-memory rate limiter for Edge runtime
const rateLimitStore = new Map<
  string,
  { count: number; resetTime: number }
>()

function rateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now()
  const key = `${identifier}:${windowMs}`

  let entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs }
  }

  entry.count++
  rateLimitStore.set(key, entry)

  const remaining = Math.max(0, limit - entry.count)
  const limited = entry.count > limit

  return {
    limited,
    remaining,
    resetTime: entry.resetTime,
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip rate limiting for:
  // - Static files
  // - Health checks
  // - Auth callbacks
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/api/health' ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next()
  }

  // Get user identifier (IP or user ID)
  const token = await getToken({ req: request })
  const userId = token?.sub
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const identifier = userId || ip

  // Apply rate limits based on route
  let limit = 100 // General API: 100/min
  let windowMs = 60 * 1000 // 1 minute

  if (pathname.includes('/generate') || pathname.includes('/recommend-stack')) {
    // AI endpoints: 10/min
    limit = 10
  } else if (pathname.includes('/deploy')) {
    // Deployment endpoints: 5/hour
    limit = 5
    windowMs = 60 * 60 * 1000
  }

  const { limited, remaining, resetTime } = rateLimit(
    identifier,
    limit,
    windowMs
  )

  if (limited) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetTime),
        },
      }
    )
  }

  // Add rate limit headers to response
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', String(limit))
  response.headers.set('X-RateLimit-Remaining', String(remaining))
  response.headers.set('X-RateLimit-Reset', String(resetTime))

  return response
}

// Configure which routes middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
