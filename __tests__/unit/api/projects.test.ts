/**
 * /api/projects API Route Tests
 *
 * Tests for GET and POST /api/projects endpoints
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
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

import { GET, POST } from '@/app/api/projects/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindMany = prisma.project.findMany as jest.Mock
const mockCreate = prisma.project.create as jest.Mock

describe('GET /api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('should return 401 when session exists but user.id is missing', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' }, // No id
    })

    const mockRequest = {} as NextRequest
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return user projects when authenticated', async () => {
    const userId = 'user123'
    const mockProjects = [
      {
        id: 'project1',
        name: 'Test Project 1',
        description: 'Description 1',
        userId,
        status: 'draft',
        requirements: [],
      },
      {
        id: 'project2',
        name: 'Test Project 2',
        description: 'Description 2',
        userId,
        status: 'ready',
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1' }],
      },
    ]

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindMany.mockResolvedValue(mockProjects)

    const mockRequest = {} as NextRequest
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.projects).toEqual(mockProjects)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId },
      include: {
        requirements: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  })

  it('should return empty array when user has no projects', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindMany.mockResolvedValue([])

    const mockRequest = {} as NextRequest
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.projects).toEqual([])
  })

  it('should return 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindMany.mockRejectedValue(new Error('Database error'))

    const mockRequest = {} as NextRequest
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should filter projects by authenticated user only', async () => {
    const userId = 'user123'
    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindMany.mockResolvedValue([])

    const mockRequest = {} as NextRequest
    await GET(mockRequest)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
      })
    )
  })
})

describe('POST /api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const mockRequest = {
      json: async () => ({ name: 'Test Project' }),
    } as NextRequest

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('should create project with valid input', async () => {
    const userId = 'user123'
    const projectData = {
      name: 'Test Project',
      description: 'Test description',
    }
    const createdProject = {
      id: 'project123',
      ...projectData,
      userId,
      status: 'draft',
      requirements: [],
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockCreate.mockResolvedValue(createdProject)

    const mockRequest = {
      json: async () => projectData,
    } as NextRequest

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.project).toEqual(createdProject)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: projectData.name,
        description: projectData.description,
        userId,
        status: 'draft',
      },
      include: { requirements: true },
    })
  })

  it('should create project without description', async () => {
    const userId = 'user123'
    const projectData = { name: 'Test Project' }

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockCreate.mockResolvedValue({
      id: 'project123',
      ...projectData,
      userId,
      status: 'draft',
      requirements: [],
    })

    const mockRequest = {
      json: async () => projectData,
    } as NextRequest

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: projectData.name,
        }),
      })
    )
  })

  it('should return 400 when name is missing', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })

    const mockRequest = {
      json: async () => ({ description: 'No name' }),
    } as NextRequest

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('should return 400 when name is empty string', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })

    const mockRequest = {
      json: async () => ({ name: '' }),
    } as NextRequest

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should return 400 when name exceeds 100 characters', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })

    const mockRequest = {
      json: async () => ({ name: 'a'.repeat(101) }),
    } as NextRequest

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should return 400 when description exceeds 500 characters', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })

    const mockRequest = {
      json: async () => ({
        name: 'Test',
        description: 'a'.repeat(501),
      }),
    } as NextRequest

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should return 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockCreate.mockRejectedValue(new Error('Database error'))

    const mockRequest = {
      json: async () => ({ name: 'Test Project' }),
    } as NextRequest

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should associate project with authenticated user', async () => {
    const userId = 'user123'
    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockCreate.mockResolvedValue({
      id: 'project123',
      name: 'Test',
      userId,
      status: 'draft',
      requirements: [],
    })

    const mockRequest = {
      json: async () => ({ name: 'Test Project' }),
    } as NextRequest

    await POST(mockRequest)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
        }),
      })
    )
  })

  it('should set initial status to draft', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockCreate.mockResolvedValue({
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      status: 'draft',
      requirements: [],
    })

    const mockRequest = {
      json: async () => ({ name: 'Test Project' }),
    } as NextRequest

    await POST(mockRequest)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'draft',
        }),
      })
    )
  })
})
