import { test, expect } from '@playwright/test'

/**
 * API Health Check E2E Tests
 *
 * Tests the health check endpoint to ensure:
 * - API is responding
 * - Health endpoint returns correct status
 * - Can be used for monitoring/uptime checks
 */

test.describe('API Health Check', () => {
  test('should return 200 from health endpoint', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBe(200)
  })

  test('should return valid JSON with status', async ({ request }) => {
    const response = await request.get('/api/health')
    const data = await response.json()

    expect(data).toHaveProperty('status')
    expect(data.status).toBe('healthy')
  })

  test('should include timestamp in response', async ({ request }) => {
    const response = await request.get('/api/health')
    const data = await response.json()

    expect(data).toHaveProperty('timestamp')
    expect(new Date(data.timestamp)).toBeInstanceOf(Date)
  })

  test('should respond quickly (< 1 second)', async ({ request }) => {
    const startTime = Date.now()
    await request.get('/api/health')
    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(1000)
  })
})
