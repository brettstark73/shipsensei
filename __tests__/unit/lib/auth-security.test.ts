/**
 * Security tests for authentication configuration
 * Verifies OAuth tokens are not leaked to client sessions
 */

import { authOptions } from '../../../src/lib/auth.config'

describe('Auth Security Tests', () => {
  describe('Session callback security', () => {
    it('should not expose OAuth access tokens in session object', async () => {
      // Mock session and token objects
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      }

      const mockUser = {
        id: 'test-user-id',
      }

      const mockToken = {
        sub: 'test-user-id',
        accessToken: 'github_access_token_secret', // This should NOT appear in final session
      }

      // Call the session callback
      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        user: mockUser,
        token: mockToken,
      })

      // Verify the session exists and has expected user data
      expect(result).toBeDefined()
      expect(result?.user?.id).toBe('test-user-id')

      // CRITICAL: Verify access token is NOT in the session
      expect(result).not.toHaveProperty('accessToken')
      expect((result as any).accessToken).toBeUndefined()

      // Convert to string to check if token appears anywhere in the object
      const sessionString = JSON.stringify(result)
      expect(sessionString).not.toContain('github_access_token_secret')
    })

    it('should handle session callback when token has no accessToken', async () => {
      const mockSession = {
        user: {
          id: 'test-user-id',
        },
      }

      const mockUser = {
        id: 'test-user-id',
      }

      const mockToken = {
        sub: 'test-user-id',
        // No accessToken property
      }

      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        user: mockUser,
        token: mockToken,
      })

      expect(result).toBeDefined()
      expect(result?.user?.id).toBe('test-user-id')
      expect(result).not.toHaveProperty('accessToken')
    })
  })

  describe('JWT callback security', () => {
    it('should store access token in JWT but never expose to client', async () => {
      const mockToken = {
        sub: 'test-user-id',
      }

      const mockAccount = {
        access_token: 'github_secret_token',
        provider: 'github',
      }

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        account: mockAccount,
      })

      // JWT should contain the token (server-side only)
      expect(result?.accessToken).toBe('github_secret_token')

      // But this JWT is never sent to the client directly
      // It's only used server-side by NextAuth
    })

    it('should handle JWT callback without account', async () => {
      const mockToken = {
        sub: 'test-user-id',
        accessToken: 'existing-token',
      }

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        // No account parameter
      })

      expect(result).toBeDefined()
      expect(result?.accessToken).toBe('existing-token')
    })
  })

  describe('Authentication configuration security', () => {
    it('should use database sessions not JWT', () => {
      expect(authOptions.session?.strategy).toBe('database')
    })

    it('should have GitHub OAuth scope configured for repo access', () => {
      const githubProvider = authOptions.providers.find(
        (p: any) => p.id === 'github'
      )

      expect(githubProvider).toBeDefined()
      expect(githubProvider?.authorization?.params?.scope).toContain(
        'public_repo'
      )
    })

    it('should require NEXTAUTH_SECRET', () => {
      expect(authOptions.secret).toBeDefined()
    })
  })
})
