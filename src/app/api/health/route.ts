import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Health Check Endpoint
 *
 * Returns the health status of the application and its dependencies.
 * Used for:
 * - Uptime monitoring
 * - Load balancer health checks
 * - Deployment verification
 *
 * @returns {200} - System is healthy
 * @returns {503} - System is unhealthy (database connection failed)
 */
export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
    },
  }

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    checks.checks.database = 'connected'
  } catch (error) {
    console.error('Health check failed - database:', error)
    checks.checks.database = 'disconnected'
    checks.status = 'unhealthy'

    return NextResponse.json(checks, { status: 503 })
  }

  return NextResponse.json(checks, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
