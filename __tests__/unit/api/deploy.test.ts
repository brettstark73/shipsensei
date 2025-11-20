/**
 * /api/projects/[id]/deploy API Tests
 *
 * Tests for GET and POST /api/projects/[id]/deploy
 */

// Mock Next.js modules first
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
    }),
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth.config', () => ({
  authOptions: {},
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/vercel', () => ({
  deployToVercel: jest.fn(),
  waitForDeployment: jest.fn(),
}))

import { GET, POST } from '@/app/api/projects/[id]/deploy/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { deployToVercel, waitForDeployment } from '@/lib/vercel'
import { NextRequest } from 'next/server'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUnique = prisma.project.findUnique as jest.Mock
const mockUpdate = prisma.project.update as jest.Mock
const mockDeployToVercel = deployToVercel as jest.Mock
const mockWaitForDeployment = waitForDeployment as jest.Mock

describe('POST /api/projects/[id]/deploy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const mockRequest = {
      json: async () => ({ vercelToken: 'token' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 when Vercel token is missing', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })

    const mockRequest = {
      json: async () => ({}), // No vercelToken
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Vercel token is required')
  })

  it('should return 404 when project not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(null)

    const mockRequest = {
      json: async () => ({ vercelToken: 'token' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'nonexistent' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
  })

  it('should return 400 when project has no repository', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
      repository: null, // No repository
    })

    const mockRequest = {
      json: async () => ({ vercelToken: 'token' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Project must be generated first')
  })

  it('should return 400 when repository URL is invalid', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
      repository: 'invalid-url',
    })

    const mockRequest = {
      json: async () => ({ vercelToken: 'token' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid repository URL')
  })

  it('should deploy project successfully', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      name: 'My App',
      userId: 'user123',
      repository: 'https://github.com/user/my-app',
    })
    mockDeployToVercel.mockResolvedValue({
      id: 'deploy123',
      url: 'my-app-abc123.vercel.app',
      readyState: 'BUILDING',
    })
    mockWaitForDeployment.mockResolvedValue({
      id: 'deploy123',
      url: 'my-app-abc123.vercel.app',
      readyState: 'READY',
    })

    const mockRequest = {
      json: async () => ({ vercelToken: 'vercel-token' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Deployment started')
    expect(data.deployment.url).toBe('https://my-app-abc123.vercel.app')
  })

  it('should sanitize Vercel project name', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      name: 'My Awesome App!!!',
      userId: 'user123',
      repository: 'https://github.com/user/my-app',
    })
    mockDeployToVercel.mockResolvedValue({
      id: 'deploy123',
      url: 'my-app.vercel.app',
      readyState: 'BUILDING',
    })
    mockWaitForDeployment.mockResolvedValue({})

    const mockRequest = {
      json: async () => ({ vercelToken: 'vercel-token' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    await POST(mockRequest, context)

    expect(mockDeployToVercel).toHaveBeenCalledWith(
      'vercel-token',
      'my-awesome-app', // Sanitized
      'user/my-app',
      true
    )
  })

  it('should extract GitHub repo from URL correctly', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      repository: 'https://github.com/myorg/my-repo',
    })
    mockDeployToVercel.mockResolvedValue({
      id: 'deploy123',
      url: 'test.vercel.app',
    })
    mockWaitForDeployment.mockResolvedValue({})

    const mockRequest = {
      json: async () => ({ vercelToken: 'vercel-token' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    await POST(mockRequest, context)

    expect(mockDeployToVercel).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'myorg/my-repo', // Extracted correctly
      true
    )
  })

  it('should deploy to production', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      repository: 'https://github.com/user/repo',
    })
    mockDeployToVercel.mockResolvedValue({
      id: 'deploy123',
      url: 'test.vercel.app',
    })
    mockWaitForDeployment.mockResolvedValue({})

    const mockRequest = {
      json: async () => ({ vercelToken: 'vercel-token' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    await POST(mockRequest, context)

    expect(mockDeployToVercel).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      true // production = true
    )
  })

  it('should return deployment info immediately', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      repository: 'https://github.com/user/repo',
    })
    mockDeployToVercel.mockResolvedValue({
      id: 'deploy-id-123',
      url: 'test-abc.vercel.app',
      readyState: 'BUILDING',
    })
    mockWaitForDeployment.mockResolvedValue({})

    const mockRequest = {
      json: async () => ({ vercelToken: 'vercel-token' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(data.deployment).toEqual({
      id: 'deploy-id-123',
      url: 'https://test-abc.vercel.app',
      status: 'BUILDING',
    })
  })

  it('should return 500 on deployment error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      repository: 'https://github.com/user/repo',
    })
    mockDeployToVercel.mockRejectedValue(new Error('Vercel API error'))

    const mockRequest = {
      json: async () => ({ vercelToken: 'vercel-token' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })

  it('should check ownership before deploying', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
      repository: 'https://github.com/user/repo',
    })
    mockDeployToVercel.mockResolvedValue({
      id: 'deploy123',
      url: 'test.vercel.app',
    })
    mockWaitForDeployment.mockResolvedValue({})

    const mockRequest = {
      json: async () => ({ vercelToken: 'token' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    await POST(mockRequest, context)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        id: projectId,
        userId,
      },
    })
  })
})

describe('GET /api/projects/[id]/deploy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 when project not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'nonexistent' }) }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
  })

  it('should return deployment status', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
      deployment: 'https://my-app.vercel.app',
      status: 'deployed',
    })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.deployment).toBe('https://my-app.vercel.app')
    expect(data.status).toBe('deployed')
  })

  it('should return null deployment when not deployed', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
      deployment: null,
      status: 'ready',
    })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.deployment).toBeNull()
    expect(data.status).toBe('ready')
  })

  it('should return 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockRejectedValue(new Error('Database error'))

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should check ownership before returning status', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
      deployment: null,
      status: 'draft',
    })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    await GET(mockRequest, context)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        id: projectId,
        userId,
      },
    })
  })
})
