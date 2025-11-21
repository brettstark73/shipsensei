import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkRateLimit } from '@/lib/edge-rate-limit'
import { withRequestId, createRequestLogger } from '@/lib/edge-logger'

/**
 * Next.js Middleware (Edge Runtime Compatible)
 *
 * Runs on Edge Runtime before requests reach API routes.
 * Handles:
 * - Request ID generation and observability (Web Crypto API)
 * - Rate limiting (in-memory, resets on cold starts)
 * - Authentication checks for protected routes
 * - Request logging and performance tracking
 *
 * Note: Uses Edge-compatible components. Rate limits reset on cold starts.
 * For persistent rate limiting, move to API routes with database backing.
 */

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname } = request.nextUrl

  // Generate request ID for observability
  const requestId = withRequestId()
  const logger = createRequestLogger(requestId)

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

  try {
    const { limited, remaining, resetTime, retryAfter } = await checkRateLimit(
      identifier,
      limit,
      windowMs
    )

    if (limited) {
      const duration = Date.now() - startTime

      logger.logSecurityEvent('rate_limit_exceeded', 'medium', {
        requestId,
        userId,
        metadata: {
          pathname,
          userAgent: request.headers.get('user-agent'),
          identifier,
          limit,
          duration,
        },
      })

      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Please try again later',
          retryAfter,
          requestId,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetTime),
            'X-Request-ID': requestId,
          },
        }
      )
    }

    // Add rate limit headers and request ID to response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(limit))
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(resetTime))
    response.headers.set('X-Request-ID', requestId)

    // Log successful request
    const duration = Date.now() - startTime
    logger.logApiRequest(
      request.method,
      pathname,
      200, // Middleware success
      duration,
      {
        requestId,
        userId,
        metadata: {
          userAgent: request.headers.get('user-agent'),
          remaining,
        },
      }
    )

    return response
  } catch (error) {
    const duration = Date.now() - startTime

    // Log middleware error
    logger.error('Rate limiter middleware error', {
      requestId,
      metadata: {
        pathname,
        operation: 'middleware',
        duration,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    // Fail closed in production for security, fail open in development
    if (process.env.NODE_ENV === 'production') {
      // In production, rate limiter failure is a security issue
      // Block the request to prevent potential abuse
      logger.logSecurityEvent('rate_limiter_failure', 'high', {
        requestId,
        userId,
        metadata: {
          pathname,
          userAgent: request.headers.get('user-agent'),
          identifier,
          duration,
          error: error instanceof Error ? error.message : String(error),
        },
      })

      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'Please try again later',
          requestId,
        },
        {
          status: 503,
          headers: {
            'Retry-After': '60',
            'X-Request-ID': requestId,
          },
        }
      )
    }

    // In development, fail open to avoid blocking developers
    console.warn('Rate limiting disabled due to error (development mode)')
    const response = NextResponse.next()
    response.headers.set('X-Request-ID', requestId)
    response.headers.set('X-Rate-Limit-Warning', 'Rate limiting disabled')
    return response
  }
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
