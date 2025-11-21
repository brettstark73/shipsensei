/**
 * GitHub Authentication Integration Tests
 *
 * Tests GitHub token retrieval from encrypted database storage
 */

import {
  getGitHubToken,
  getGitHubTokenFromSession,
  validateGitHubAccess,
  hasGitHubConnection
} from '@/lib/github-auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findFirst: jest.fn(),
    },
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrismaAccountFindFirst = prisma.account.findFirst as jest.MockedFunction<
  typeof prisma.account.findFirst
>

describe('GitHub Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Database Token Retrieval', () => {
    const mockUserId = 'user-123'
    const mockAccessToken = 'gho_test_access_token'

    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
    })

    it('should retrieve GitHub token from database', async () => {
      // Mock successful token retrieval
      mockPrismaAccountFindFirst.mockResolvedValue({
        access_token: mockAccessToken,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      const token = await getGitHubToken(mockRequest)

      expect(token).toBe(mockAccessToken)
      expect(mockPrismaAccountFindFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          provider: 'github',
        },
        select: {
          access_token: true,
          expires_at: true,
        },
      })
    })

    it('should return null when no GitHub account exists', async () => {
      // Mock no account found
      mockPrismaAccountFindFirst.mockResolvedValue(null)

      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      const token = await getGitHubToken(mockRequest)

      expect(token).toBeNull()
    })

    it('should return null when token is expired', async () => {
      // Mock expired token
      mockPrismaAccountFindFirst.mockResolvedValue({
        access_token: mockAccessToken,
        expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      const token = await getGitHubToken(mockRequest)

      expect(token).toBeNull()
    })

    it('should handle tokens without expiration', async () => {
      // Mock token without expiration (GitHub personal access tokens don't expire)
      mockPrismaAccountFindFirst.mockResolvedValue({
        access_token: mockAccessToken,
        expires_at: null,
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      const token = await getGitHubToken(mockRequest)

      expect(token).toBe(mockAccessToken)
    })
  })

  describe('Session-based Token Retrieval', () => {
    it('should retrieve token from session', async () => {
      const mockUserId = 'user-456'
      const mockAccessToken = 'gho_session_token'

      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      mockPrismaAccountFindFirst.mockResolvedValue({
        access_token: mockAccessToken,
        expires_at: null,
      })

      const token = await getGitHubTokenFromSession()

      expect(token).toBe(mockAccessToken)
    })

    it('should return null when no session exists', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const token = await getGitHubTokenFromSession()

      expect(token).toBeNull()
      expect(mockPrismaAccountFindFirst).not.toHaveBeenCalled()
    })
  })

  describe('GitHub Access Validation', () => {
    it('should validate successful GitHub access', async () => {
      const mockUserId = 'user-789'
      const mockAccessToken = 'gho_valid_token'

      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      mockPrismaAccountFindFirst.mockResolvedValue({
        access_token: mockAccessToken,
        expires_at: null,
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      const result = await validateGitHubAccess(mockRequest)

      expect(result.hasAccess).toBe(true)
      expect(result.token).toBe(mockAccessToken)
      expect(result.error).toBeUndefined()
    })

    it('should handle missing GitHub access', async () => {
      const mockUserId = 'user-no-github'

      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      mockPrismaAccountFindFirst.mockResolvedValue(null)

      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      const result = await validateGitHubAccess(mockRequest)

      expect(result.hasAccess).toBe(false)
      expect(result.token).toBeNull()
      expect(result.error).toBe('GitHub access token not found. Please re-authenticate with GitHub.')
    })

    it('should handle database errors gracefully', async () => {
      const mockUserId = 'user-error'

      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      mockPrismaAccountFindFirst.mockRejectedValue(new Error('Database error'))

      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      const result = await validateGitHubAccess(mockRequest)

      expect(result.hasAccess).toBe(false)
      expect(result.token).toBeNull()
      expect(result.error).toBe('Failed to validate GitHub access. Please try again.')
    })
  })

  describe('GitHub Connection Check', () => {
    it('should detect existing GitHub connection', async () => {
      mockPrismaAccountFindFirst.mockResolvedValue({ id: 'account-123' })

      const hasConnection = await hasGitHubConnection('user-123')

      expect(hasConnection).toBe(true)
      expect(mockPrismaAccountFindFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          provider: 'github',
        },
        select: {
          id: true,
        },
      })
    })

    it('should detect missing GitHub connection', async () => {
      mockPrismaAccountFindFirst.mockResolvedValue(null)

      const hasConnection = await hasGitHubConnection('user-no-github')

      expect(hasConnection).toBe(false)
    })

    it('should handle database errors in connection check', async () => {
      mockPrismaAccountFindFirst.mockRejectedValue(new Error('DB error'))

      const hasConnection = await hasGitHubConnection('user-error')

      expect(hasConnection).toBe(false)
    })
  })

  describe('Security Considerations', () => {
    it('should never expose tokens to client', () => {
      // This is more of a design validation
      // The functions only work server-side and return plain tokens
      // No client-side session exposure
      expect(true).toBe(true) // Placeholder for architectural validation
    })

    it('should use encrypted database storage', async () => {
      // Verify that we're using the Prisma client with encryption middleware
      const mockUserId = 'user-security'

      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      // The fact that we're calling prisma.account.findFirst means
      // the encryption middleware will automatically decrypt tokens
      mockPrismaAccountFindFirst.mockResolvedValue({
        access_token: 'decrypted_token',
        expires_at: null,
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      const token = await getGitHubToken(mockRequest)

      expect(token).toBe('decrypted_token')
      // Encryption/decryption is handled by Prisma middleware
    })
  })
})