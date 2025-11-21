import { getServerSession } from 'next-auth'
import type { NextRequest } from 'next/server'
import { authOptions } from './auth.config'
import { prisma } from './prisma'

/**
 * Server-side utility to safely get GitHub access token from database
 * NEVER exposes tokens to client sessions or JWT
 */

// For API routes
export async function getGitHubToken(
  _request: NextRequest
): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return null

    return await getGitHubTokenFromUserId(session.user.id)
  } catch (error) {
    console.error('Failed to get GitHub token:', error)
    return null
  }
}

// For server components/actions
export async function getGitHubTokenFromSession(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return null

    return await getGitHubTokenFromUserId(session.user.id)
  } catch (error) {
    console.error('Failed to get GitHub token from session:', error)
    return null
  }
}

// Core function to get GitHub token from database
async function getGitHubTokenFromUserId(userId: string): Promise<string | null> {
  try {
    // Find GitHub account for this user
    // Prisma will decrypt the access_token automatically via middleware
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: 'github',
      },
      select: {
        access_token: true,
        expires_at: true,
      },
    })

    if (!account?.access_token) {
      console.warn('No GitHub access token found for user:', userId)
      return null
    }

    // Check if token is expired (if expires_at is provided)
    if (account.expires_at && account.expires_at * 1000 < Date.now()) {
      console.warn('GitHub access token expired for user:', userId)
      return null
    }

    return account.access_token
  } catch (error) {
    console.error('Failed to retrieve GitHub token from database:', error)
    return null
  }
}

/**
 * Validate that user has GitHub OAuth access before attempting repo operations
 */
export async function validateGitHubAccess(request: NextRequest): Promise<{
  hasAccess: boolean
  token: string | null
  error?: string
}> {
  try {
    const token = await getGitHubToken(request)

    if (!token) {
      return {
        hasAccess: false,
        token: null,
        error:
          'GitHub access token not found. Please re-authenticate with GitHub.',
      }
    }

    return {
      hasAccess: true,
      token,
    }
  } catch (error) {
    console.error('GitHub access validation failed:', error)
    return {
      hasAccess: false,
      token: null,
      error: 'Failed to validate GitHub access. Please try again.',
    }
  }
}

/**
 * Check if user has connected GitHub account
 */
export async function hasGitHubConnection(userId: string): Promise<boolean> {
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: 'github',
      },
      select: {
        id: true,
      },
    })

    return !!account
  } catch (error) {
    console.error('Failed to check GitHub connection:', error)
    return false
  }
}
