import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { authOptions } from './auth.config'

/**
 * Server-side utility to safely get GitHub access token
 * NEVER exposes tokens to client sessions
 */

// For API routes
export async function getGitHubToken(
  request: NextRequest
): Promise<string | null> {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    return (token?.accessToken as string) || null
  } catch (error) {
    console.error('Failed to get GitHub token:', error)
    return null
  }
}

// For server components/actions
export async function getGitHubTokenFromSession(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return null

    // Get the token from JWT (server-side only)
    const token = await getToken({
      secret: process.env.NEXTAUTH_SECRET,
    })

    return (token?.accessToken as string) || null
  } catch (error) {
    console.error('Failed to get GitHub token from session:', error)
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
}
