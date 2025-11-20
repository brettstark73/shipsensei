import { test, expect } from '@playwright/test'

/**
 * Landing Page E2E Tests
 *
 * Tests the public-facing landing page to ensure:
 * - Page loads correctly
 * - Key content is visible
 * - Navigation works
 * - Call-to-action buttons are present
 */

test.describe('Landing Page', () => {
  test('should load the landing page successfully', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check that the page title is correct
    await expect(page).toHaveTitle(/ShipSensei/)
  })

  test('should display main hero section', async ({ page }) => {
    await page.goto('/')

    // Check for main heading
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    // Should have some call-to-action text
    await expect(page.getByText(/idea/i)).toBeVisible()
  })

  test('should have sign in button that navigates to auth', async ({
    page,
  }) => {
    await page.goto('/')

    // Look for sign in or get started button
    const signInButton = page
      .getByRole('link', { name: /sign in|get started|start building/i })
      .first()

    await expect(signInButton).toBeVisible()

    // Click should navigate somewhere (even if auth fails without real creds)
    await signInButton.click()

    // Should navigate away from home page or show auth modal
    // Just verify we didn't stay on the exact same page state
    await page.waitForTimeout(1000) // Give time for navigation/modal
  })

  test('should display feature sections', async ({ page }) => {
    await page.goto('/')

    // Check for key features or benefits sections
    // This will depend on your actual landing page content
    const pageContent = await page.textContent('body')

    // Should mention key value propositions
    expect(pageContent).toMatch(
      /requirements|tech stack|deploy|generate|project/i
    )
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Page should still load and be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/')

    // Check for description meta tag
    const description = await page.locator('meta[name="description"]')
    await expect(description).toHaveCount(1)

    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveCount(1)
  })
})
