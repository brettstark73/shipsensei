/**
 * Health Check API Tests
 *
 * Tests for /api/health endpoint
 */

// Mock Next.js modules first
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
    }),
  },
}))

import { GET } from '@/app/api/health/route'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}))

const mockQueryRaw = prisma.$queryRaw as jest.Mock

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 200 when database is healthy', async () => {
    // Mock successful database connection
    mockQueryRaw.mockResolvedValue([{ 1: 1 }])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.checks.database).toBe('connected')
    expect(data.timestamp).toBeDefined()
  })

  it('should return 503 when database is unhealthy', async () => {
    // Mock database connection failure
    mockQueryRaw.mockRejectedValue(new Error('Connection failed'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.checks.database).toBe('disconnected')
  })

  it('should include timestamp in ISO format', async () => {
    mockQueryRaw.mockResolvedValue([{ 1: 1 }])

    const response = await GET()
    const data = await response.json()

    expect(data.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    )
    expect(new Date(data.timestamp)).toBeInstanceOf(Date)
  })

  it('should include no-cache headers', async () => {
    mockQueryRaw.mockResolvedValue([{ 1: 1 }])

    const response = await GET()

    expect(response.headers.get('Cache-Control')).toBe(
      'no-cache, no-store, must-revalidate'
    )
  })

  it('should include all required fields in response', async () => {
    mockQueryRaw.mockResolvedValue([{ 1: 1 }])

    const response = await GET()
    const data = await response.json()

    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('checks')
    expect(data.checks).toHaveProperty('database')
  })
})
