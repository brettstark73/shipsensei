/**
 * /api/projects/[id]/recommend-stack API Tests
 *
 * Tests for POST /api/projects/[id]/recommend-stack
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

jest.mock('@/lib/ai', () => ({
  generateTechStackRecommendation: jest.fn(),
}))

import { POST } from '@/app/api/projects/[id]/recommend-stack/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { generateTechStackRecommendation } from '@/lib/ai'
import { NextRequest } from 'next/server'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUnique = prisma.project.findUnique as jest.Mock
const mockUpdate = prisma.project.update as jest.Mock
const mockGenerateTechStack = generateTechStackRecommendation as jest.Mock

describe('POST /api/projects/[id]/recommend-stack', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('should return 404 when project not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'nonexistent' }) }

    const response = await POST(mockRequest, context)
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

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(mockGenerateTechStack).not.toHaveBeenCalled()
  })

  it('should return 400 when no requirements are answered', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      userId,
      requirements: [
        { id: 'req1', question: 'Q1', answer: null }, // Not answered
        { id: 'req2', question: 'Q2', answer: null }, // Not answered
      ],
    })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No requirements answered yet')
    expect(mockGenerateTechStack).not.toHaveBeenCalled()
  })

  it('should generate recommendation with answered requirements', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const mockProject = {
      id: projectId,
      name: 'E-commerce App',
      userId,
      requirements: [
        {
          id: 'req1',
          question: 'What are you building?',
          answer: 'An online store',
        },
        {
          id: 'req2',
          question: 'Who is your audience?',
          answer: 'Small businesses',
        },
      ],
    }

    const mockRecommendation = {
      stack: 'Next.js 14 + Tailwind + Prisma + PostgreSQL',
      rationale: 'Best for modern web apps',
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(mockProject)
    mockGenerateTechStack.mockResolvedValue(mockRecommendation)
    mockUpdate.mockResolvedValue({
      ...mockProject,
      techStack: JSON.stringify(mockRecommendation),
      status: 'ready',
    })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recommendation).toEqual(mockRecommendation)
    expect(mockGenerateTechStack).toHaveBeenCalledWith('E-commerce App', [
      { question: 'What are you building?', answer: 'An online store' },
      { question: 'Who is your audience?', answer: 'Small businesses' },
    ])
  })

  it('should update project status to ready', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      name: 'Test',
      userId,
      requirements: [{ id: 'req1', question: 'Q1', answer: 'A1' }],
    })
    mockGenerateTechStack.mockResolvedValue({ stack: 'Next.js' })
    mockUpdate.mockResolvedValue({
      id: projectId,
      status: 'ready',
      techStack: '{"stack":"Next.js"}',
    })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    await POST(mockRequest, context)

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: projectId },
      data: {
        techStack: expect.any(String),
        status: 'ready',
      },
      include: {
        requirements: {
          orderBy: { order: 'asc' },
        },
      },
    })
  })

  it('should store recommendation as JSON string', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const mockRecommendation = {
      stack: 'Next.js + Tailwind',
      rationale: 'Modern stack',
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
      requirements: [{ id: 'req1', question: 'Q', answer: 'A' }],
    })
    mockGenerateTechStack.mockResolvedValue(mockRecommendation)
    mockUpdate.mockResolvedValue({
      id: projectId,
      techStack: JSON.stringify(mockRecommendation),
    })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    await POST(mockRequest, context)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          techStack: JSON.stringify(mockRecommendation),
        }),
      })
    )
  })

  it('should filter out unanswered requirements', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      name: 'Test',
      userId,
      requirements: [
        { id: 'req1', question: 'Q1', answer: 'A1' }, // Answered
        { id: 'req2', question: 'Q2', answer: null }, // Not answered
        { id: 'req3', question: 'Q3', answer: 'A3' }, // Answered
      ],
    })
    mockGenerateTechStack.mockResolvedValue({ stack: 'Next.js' })
    mockUpdate.mockResolvedValue({ id: projectId })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    await POST(mockRequest, context)

    expect(mockGenerateTechStack).toHaveBeenCalledWith('Test', [
      { question: 'Q1', answer: 'A1' },
      { question: 'Q3', answer: 'A3' },
    ])
  })

  it('should return 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockRejectedValue(new Error('Database error'))

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should return 500 on AI generation error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
      requirements: [{ id: 'req1', question: 'Q', answer: 'A' }],
    })
    mockGenerateTechStack.mockRejectedValue(new Error('AI API error'))

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should return both project and recommendation in response', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const mockRecommendation = { stack: 'Next.js' }
    const updatedProject = {
      id: projectId,
      techStack: JSON.stringify(mockRecommendation),
      status: 'ready',
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
      requirements: [{ id: 'req1', question: 'Q', answer: 'A' }],
    })
    mockGenerateTechStack.mockResolvedValue(mockRecommendation)
    mockUpdate.mockResolvedValue(updatedProject)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(data).toHaveProperty('project')
    expect(data).toHaveProperty('recommendation')
    expect(data.project).toEqual(updatedProject)
    expect(data.recommendation).toEqual(mockRecommendation)
  })

  it('should check ownership before generating', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
      requirements: [{ id: 'req1', question: 'Q', answer: 'A' }],
    })
    mockGenerateTechStack.mockResolvedValue({ stack: 'Next.js' })
    mockUpdate.mockResolvedValue({ id: projectId })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    await POST(mockRequest, context)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        id: projectId,
        userId,
      },
      include: expect.any(Object),
    })
  })
})
