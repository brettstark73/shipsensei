import { test, expect } from '@playwright/test'

/**
 * Dashboard E2E Tests
 *
 * Tests the authenticated dashboard experience.
 *
 * Note: These tests require authentication. In a real setup, you would:
 * 1. Use Playwright's auth storage feature
 * 2. Mock the session with a test user
 * 3. Or use a test OAuth provider
 *
 * For now, these tests are marked as skipped and serve as templates.
 */

test.describe('Dashboard (Authenticated)', () => {
  // Skip these tests until authentication is properly set up for E2E
  test.skip('should load dashboard when authenticated', async ({ page }) => {
    // TODO: Set up authentication state
    // await page.context().addCookies([...authCookies])

    await page.goto('/dashboard')

    // Should see dashboard content
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test.skip('should display projects list', async ({ page }) => {
    // TODO: Set up authentication state
    await page.goto('/dashboard')

    // Should have projects section
    await expect(page.getByText(/projects|create project/i)).toBeVisible()
  })

  test.skip('should allow creating a new project', async ({ page }) => {
    // TODO: Set up authentication state
    await page.goto('/dashboard')

    // Click create project button
    const createButton = page.getByRole('button', {
      name: /new project|create project/i,
    })
    await createButton.click()

    // Should show project creation form or modal
    await expect(page.getByText(/project name|what.*building/i)).toBeVisible()
  })

  test.skip('should navigate to project details', async ({ page }) => {
    // TODO: Set up authentication state and test project
    await page.goto('/dashboard')

    // Click on a project (assumes at least one exists)
    const projectLink = page.getByRole('link').filter({ hasText: /project/i }).first()
    await projectLink.click()

    // Should navigate to project page
    await expect(page).toHaveURL(/\/projects\//)
  })
})

test.describe('Dashboard (Unauthenticated)', () => {
  test('should redirect to sign in when not authenticated', async ({
    page,
  }) => {
    await page.goto('/dashboard')

    // Should redirect to home or show auth prompt
    // Wait for any redirects to complete
    await page.waitForLoadState('networkidle')

    const url = page.url()

    // Should either be on home page or sign-in page, not dashboard
    expect(url).not.toContain('/dashboard')
  })
})
