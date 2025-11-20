/**
 * Auth Configuration Tests
 *
 * Tests for NextAuth.js configuration and callbacks
 */

import { authOptions } from '@/lib/auth.config'

describe('Auth Configuration', () => {
  describe('authOptions', () => {
    it('should have correct adapter', () => {
      expect(authOptions.adapter).toBeDefined()
    })

    it('should have GitHub and Google providers', () => {
      expect(authOptions.providers).toHaveLength(2)
    })

    it('should have custom pages configured', () => {
      expect(authOptions.pages?.signIn).toBe('/auth/signin')
      expect(authOptions.pages?.error).toBe('/auth/error')
    })

    it('should use database session strategy', () => {
      expect(authOptions.session?.strategy).toBe('database')
    })

    it('should have secret configured', () => {
      expect(authOptions.secret).toBeDefined()
    })
  })

  describe('session callback', () => {
    const sessionCallback = authOptions.callbacks?.session

    it('should add user id to session from user object', async () => {
      if (!sessionCallback) {
        throw new Error('Session callback not defined')
      }

      const mockSession = {
        user: { email: 'test@example.com' },
        expires: new Date().toISOString(),
      }
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
      }
      const mockToken = {}

      const result = await sessionCallback({
        session: mockSession,
        user: mockUser,
        token: mockToken,
      })

      expect(result.user?.id).toBe('user123')
    })

    it('should add user id from token.sub when user is not provided', async () => {
      if (!sessionCallback) {
        throw new Error('Session callback not defined')
      }

      const mockSession = {
        user: { email: 'test@example.com' },
        expires: new Date().toISOString(),
      }
      const mockToken = {
        sub: 'token-user-id',
      }

      const result = await sessionCallback({
        session: mockSession,
        user: undefined as any,
        token: mockToken,
      })

      expect(result.user?.id).toBe('token-user-id')
    })

    it('should add access token to session when available', async () => {
      if (!sessionCallback) {
        throw new Error('Session callback not defined')
      }

      const mockSession = {
        user: { email: 'test@example.com' },
        expires: new Date().toISOString(),
      }
      const mockToken = {
        sub: 'user123',
        accessToken: 'github-access-token-123',
      }

      const result = await sessionCallback({
        session: mockSession,
        user: undefined as any,
        token: mockToken,
      })

      expect((result as any).accessToken).toBe('github-access-token-123')
    })

    it('should return session without access token when not available', async () => {
      if (!sessionCallback) {
        throw new Error('Session callback not defined')
      }

      const mockSession = {
        user: { email: 'test@example.com' },
        expires: new Date().toISOString(),
      }
      const mockToken = {
        sub: 'user123',
      }

      const result = await sessionCallback({
        session: mockSession,
        user: undefined as any,
        token: mockToken,
      })

      expect((result as any).accessToken).toBeUndefined()
    })

    it('should handle missing session.user gracefully', async () => {
      if (!sessionCallback) {
        throw new Error('Session callback not defined')
      }

      const mockSession = {
        expires: new Date().toISOString(),
      }
      const mockToken = {
        sub: 'user123',
      }

      const result = await sessionCallback({
        session: mockSession as any,
        user: undefined as any,
        token: mockToken,
      })

      expect(result).toBeDefined()
    })
  })

  describe('jwt callback', () => {
    const jwtCallback = authOptions.callbacks?.jwt

    it('should store access token in JWT when account is provided', async () => {
      if (!jwtCallback) {
        throw new Error('JWT callback not defined')
      }

      const mockToken = {
        sub: 'user123',
      }
      const mockAccount = {
        access_token: 'github-oauth-token',
        provider: 'github',
        type: 'oauth' as const,
        providerAccountId: 'github-user-id',
      }

      const result = await jwtCallback({
        token: mockToken,
        account: mockAccount,
      })

      expect(result.accessToken).toBe('github-oauth-token')
    })

    it('should preserve existing token when no account', async () => {
      if (!jwtCallback) {
        throw new Error('JWT callback not defined')
      }

      const mockToken = {
        sub: 'user123',
        accessToken: 'existing-token',
      }

      const result = await jwtCallback({
        token: mockToken,
        account: undefined,
      })

      expect(result.accessToken).toBe('existing-token')
    })

    it('should not add access token when account has no access_token', async () => {
      if (!jwtCallback) {
        throw new Error('JWT callback not defined')
      }

      const mockToken = {
        sub: 'user123',
      }
      const mockAccount = {
        provider: 'github',
        type: 'oauth' as const,
        providerAccountId: 'github-user-id',
      }

      const result = await jwtCallback({
        token: mockToken,
        account: mockAccount as any,
      })

      expect(result.accessToken).toBeUndefined()
    })

    it('should return token with all original properties', async () => {
      if (!jwtCallback) {
        throw new Error('JWT callback not defined')
      }

      const mockToken = {
        sub: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      }

      const result = await jwtCallback({
        token: mockToken,
        account: undefined,
      })

      expect(result.sub).toBe('user123')
      expect(result.email).toBe('test@example.com')
      expect(result.name).toBe('Test User')
    })
  })

  describe('GitHub provider configuration', () => {
    it('should request correct scopes', () => {
      const githubProvider = authOptions.providers.find(
        (p: any) => p.id === 'github'
      ) as any

      expect(githubProvider).toBeDefined()
      expect(githubProvider.options.authorization.params.scope).toBe(
        'read:user user:email public_repo'
      )
    })
  })

  describe('Google provider configuration', () => {
    it('should be configured', () => {
      const googleProvider = authOptions.providers.find(
        (p: any) => p.id === 'google'
      )

      expect(googleProvider).toBeDefined()
    })
  })
})
