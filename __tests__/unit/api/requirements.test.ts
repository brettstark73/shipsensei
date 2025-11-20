/**
 * /api/projects/[id]/requirements API Tests
 *
 * Tests for GET and POST /api/projects/[id]/requirements
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
    },
    requirement: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
  },
}))

import { GET, POST } from '@/app/api/projects/[id]/requirements/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUnique = prisma.project.findUnique as jest.Mock
const mockFindMany = prisma.requirement.findMany as jest.Mock
const mockCreate = prisma.requirement.create as jest.Mock
const mockCreateMany = prisma.requirement.createMany as jest.Mock

describe('GET /api/projects/[id]/requirements', () => {
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

  it('should return 404 when trying to access another users project', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(null) // Security filter

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project456' }) }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        id: 'project456',
        userId: 'user123',
      },
    })
  })

  it('should return requirements ordered by order field', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockFindMany.mockResolvedValue([
      { id: 'req1', question: 'Q1', answer: 'A1', order: 0 },
      { id: 'req2', question: 'Q2', answer: null, order: 1 },
      { id: 'req3', question: 'Q3', answer: 'A3', order: 2 },
    ])

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.requirements).toHaveLength(3)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { projectId },
      orderBy: { order: 'asc' },
    })
  })

  it('should return empty array when no requirements', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockFindMany.mockResolvedValue([])

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.requirements).toEqual([])
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

  it('should check ownership before fetching requirements', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockFindMany.mockResolvedValue([])

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

describe('POST /api/projects/[id]/requirements (single)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const mockRequest = {
      json: async () => ({ question: 'Test?', order: 0 }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 when project not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(null)

    const mockRequest = {
      json: async () => ({ question: 'Test?', order: 0 }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'nonexistent' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
  })

  it('should return 400 when question is too short', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })

    const mockRequest = {
      json: async () => ({ question: '', order: 0 }), // Empty question
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should return 400 when question is too long', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })

    const mockRequest = {
      json: async () => ({ question: 'a'.repeat(1001), order: 0 }), // 1001 chars
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should return 400 when answer is too long', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })

    const mockRequest = {
      json: async () => ({
        question: 'Test?',
        answer: 'a'.repeat(5001), // 5001 chars
        order: 0,
      }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should return 400 when order is negative', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })

    const mockRequest = {
      json: async () => ({ question: 'Test?', order: -1 }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should create requirement with valid input', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementData = {
      question: 'What is your target audience?',
      answer: 'Small businesses',
      order: 0,
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockCreate.mockResolvedValue({
      id: 'req123',
      ...requirementData,
      projectId,
    })

    const mockRequest = {
      json: async () => requirementData,
    } as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.requirement).toEqual({
      id: 'req123',
      ...requirementData,
      projectId,
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        ...requirementData,
        projectId,
      },
    })
  })

  it('should create requirement without answer', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockCreate.mockResolvedValue({
      id: 'req123',
      question: 'Test?',
      answer: null,
      order: 0,
      projectId,
    })

    const mockRequest = {
      json: async () => ({ question: 'Test?', order: 0 }), // No answer
    } as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.requirement.answer).toBeNull()
  })

  it('should return 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })
    mockCreate.mockRejectedValue(new Error('Database error'))

    const mockRequest = {
      json: async () => ({ question: 'Test?', order: 0 }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('POST /api/projects/[id]/requirements (bulk)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create multiple requirements in bulk', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementsData = [
      { question: 'Question 1?', order: 0 },
      { question: 'Question 2?', order: 1 },
      { question: 'Question 3?', order: 2 },
    ]

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockCreateMany.mockResolvedValue({ count: 3 })
    mockFindMany.mockResolvedValue(
      requirementsData.map((req, i) => ({
        id: `req${i}`,
        ...req,
        answer: null,
        projectId,
      }))
    )

    const mockRequest = {
      json: async () => requirementsData,
    } as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.requirements).toHaveLength(3)
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: requirementsData.map((req) => ({
        ...req,
        projectId,
      })),
    })
  })

  it('should return 400 when bulk validation fails', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })

    const mockRequest = {
      json: async () => [
        { question: 'Valid?', order: 0 },
        { question: '', order: 1 }, // Invalid: empty question
      ],
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should fetch created requirements after bulk creation', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockCreateMany.mockResolvedValue({ count: 2 })
    mockFindMany.mockResolvedValue([
      { id: 'req1', question: 'Q1', order: 0, projectId },
      { id: 'req2', question: 'Q2', order: 1, projectId },
    ])

    const mockRequest = {
      json: async () => [
        { question: 'Q1', order: 0 },
        { question: 'Q2', order: 1 },
      ],
    } as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    await POST(mockRequest, context)

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { projectId },
      orderBy: { order: 'asc' },
    })
  })

  it('should handle empty bulk array', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })
    mockCreateMany.mockResolvedValue({ count: 0 })
    mockFindMany.mockResolvedValue([])

    const mockRequest = {
      json: async () => [], // Empty array
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.requirements).toEqual([])
  })

  it('should check ownership before bulk creation', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockCreateMany.mockResolvedValue({ count: 1 })
    mockFindMany.mockResolvedValue([])

    const mockRequest = {
      json: async () => [{ question: 'Test?', order: 0 }],
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
