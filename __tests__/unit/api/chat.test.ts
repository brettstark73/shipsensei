/**
 * /api/projects/[id]/chat API Tests
 *
 * Tests for POST /api/projects/[id]/chat
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
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/ai', () => ({
  generateRequirementsQuestions: jest.fn(),
  generateFollowUpQuestion: jest.fn(),
}))

import { POST } from '@/app/api/projects/[id]/chat/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import {
  generateRequirementsQuestions,
  generateFollowUpQuestion,
} from '@/lib/ai'
import { NextRequest } from 'next/server'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUniqueProject = prisma.project.findUnique as jest.Mock
const mockFindUniqueRequirement = prisma.requirement.findUnique as jest.Mock
const mockCreateMany = prisma.requirement.createMany as jest.Mock
const mockFindMany = prisma.requirement.findMany as jest.Mock
const mockUpdate = prisma.requirement.update as jest.Mock
const mockCreate = prisma.requirement.create as jest.Mock
const mockGenerateQuestions = generateRequirementsQuestions as jest.Mock
const mockGenerateFollowUp = generateFollowUpQuestion as jest.Mock

describe('POST /api/projects/[id]/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const mockRequest = {
        json: async () => ({ action: 'start' }),
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
      mockFindUniqueProject.mockResolvedValue(null)

      const mockRequest = {
        json: async () => ({ action: 'start' }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'nonexistent' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Project not found')
    })

    it('should check project ownership', async () => {
      const userId = 'user123'
      mockGetServerSession.mockResolvedValue({
        user: { id: userId, email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        userId,
        requirements: [],
      })
      mockGenerateQuestions.mockResolvedValue(['Q1', 'Q2'])
      mockCreateMany.mockResolvedValue({ count: 2 })
      mockFindMany.mockResolvedValue([])

      const mockRequest = {
        json: async () => ({ action: 'start' }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      await POST(mockRequest, context)

      expect(mockFindUniqueProject).toHaveBeenCalledWith({
        where: {
          id: 'project123',
          userId,
        },
        include: expect.any(Object),
      })
    })
  })

  describe('Action: start', () => {
    it('should generate initial questions when chat starts', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        name: 'My App',
        description: 'A great app',
        userId: 'user123',
        requirements: [],
      })
      mockGenerateQuestions.mockResolvedValue([
        'What is your target audience?',
        'What features do you need?',
      ])
      mockCreateMany.mockResolvedValue({ count: 2 })
      mockFindMany.mockResolvedValue([
        {
          id: 'req1',
          projectId: 'project123',
          question: 'What is your target audience?',
          answer: null,
          order: 0,
        },
        {
          id: 'req2',
          projectId: 'project123',
          question: 'What features do you need?',
          answer: null,
          order: 1,
        },
      ])

      const mockRequest = {
        json: async () => ({ action: 'start' }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Chat started')
      expect(data.requirements).toHaveLength(2)
      expect(mockGenerateQuestions).toHaveBeenCalledWith(
        'My App',
        'A great app'
      )
    })

    it('should return existing requirements if chat already started', async () => {
      const existingRequirements = [
        {
          id: 'req1',
          question: 'Existing question',
          answer: null,
          order: 0,
        },
      ]

      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        userId: 'user123',
        requirements: existingRequirements,
      })

      const mockRequest = {
        json: async () => ({ action: 'start' }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Chat already started')
      expect(data.requirements).toEqual(existingRequirements)
      expect(mockGenerateQuestions).not.toHaveBeenCalled()
    })

    it('should create requirements with correct order', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        name: 'Test',
        userId: 'user123',
        requirements: [],
      })
      mockGenerateQuestions.mockResolvedValue(['Q1', 'Q2', 'Q3'])
      mockCreateMany.mockResolvedValue({ count: 3 })
      mockFindMany.mockResolvedValue([])

      const mockRequest = {
        json: async () => ({ action: 'start' }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      await POST(mockRequest, context)

      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [
          {
            projectId: 'project123',
            question: 'Q1',
            answer: null,
            order: 0,
          },
          {
            projectId: 'project123',
            question: 'Q2',
            answer: null,
            order: 1,
          },
          {
            projectId: 'project123',
            question: 'Q3',
            answer: null,
            order: 2,
          },
        ],
      })
    })

    it('should handle missing description', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        name: 'Test',
        description: null,
        userId: 'user123',
        requirements: [],
      })
      mockGenerateQuestions.mockResolvedValue(['Q1'])
      mockCreateMany.mockResolvedValue({ count: 1 })
      mockFindMany.mockResolvedValue([])

      const mockRequest = {
        json: async () => ({ action: 'start' }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      await POST(mockRequest, context)

      expect(mockGenerateQuestions).toHaveBeenCalledWith('Test', undefined)
    })
  })

  describe('Action: answer', () => {
    it('should save answer to requirement', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        name: 'Test',
        userId: 'user123',
        requirements: [],
      })
      mockFindUniqueRequirement.mockResolvedValue({
        id: 'req1',
        projectId: 'project123',
        question: 'Q1',
        answer: null,
      })
      mockUpdate.mockResolvedValue({
        id: 'req1',
        answer: 'My answer',
      })
      mockFindMany.mockResolvedValue([
        {
          id: 'req1',
          question: 'Q1',
          answer: 'My answer',
        },
      ])

      const mockRequest = {
        json: async () => ({
          action: 'answer',
          requirementId: 'req1',
          answer: 'My answer',
        }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Answer saved')
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: { answer: 'My answer' },
      })
    })

    it('should return 400 when answer is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        userId: 'user123',
        requirements: [],
      })

      const mockRequest = {
        json: async () => ({
          action: 'answer',
          requirementId: 'req1',
          // Missing answer
        }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input')
    })

    it('should return 400 when answer is empty', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        userId: 'user123',
        requirements: [],
      })

      const mockRequest = {
        json: async () => ({
          action: 'answer',
          requirementId: 'req1',
          answer: '',
        }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input')
    })

    it('should return 400 when answer exceeds 5000 characters', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        userId: 'user123',
        requirements: [],
      })

      const mockRequest = {
        json: async () => ({
          action: 'answer',
          requirementId: 'req1',
          answer: 'a'.repeat(5001),
        }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input')
    })

    it('should return 404 when requirement not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        userId: 'user123',
        requirements: [],
      })
      mockFindUniqueRequirement.mockResolvedValue(null)

      const mockRequest = {
        json: async () => ({
          action: 'answer',
          requirementId: 'nonexistent',
          answer: 'My answer',
        }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Requirement not found')
    })

    it('should generate follow-up question when all answered', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        name: 'Test',
        userId: 'user123',
        requirements: [],
      })
      mockFindUniqueRequirement.mockResolvedValue({
        id: 'req1',
        projectId: 'project123',
      })
      mockUpdate.mockResolvedValue({})
      mockFindMany.mockResolvedValueOnce([
        {
          id: 'req1',
          question: 'Q1',
          answer: 'A1',
        },
      ])
      mockGenerateFollowUp.mockResolvedValue('Follow-up question?')
      mockCreate.mockResolvedValue({
        id: 'req2',
        question: 'Follow-up question?',
        answer: null,
        order: 1,
      })
      mockFindMany.mockResolvedValueOnce([
        {
          id: 'req1',
          question: 'Q1',
          answer: 'A1',
        },
        {
          id: 'req2',
          question: 'Follow-up question?',
          answer: null,
        },
      ])

      const mockRequest = {
        json: async () => ({
          action: 'answer',
          requirementId: 'req1',
          answer: 'A1',
        }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockGenerateFollowUp).toHaveBeenCalledWith('Test', [
        { question: 'Q1', answer: 'A1' },
      ])
      expect(data.nextQuestion).toBeDefined()
    })

    it('should not generate follow-up when limit reached (10 questions)', async () => {
      const tenQuestions = Array.from({ length: 10 }, (_, i) => ({
        id: `req${i}`,
        question: `Q${i}`,
        answer: `A${i}`,
      }))

      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        name: 'Test',
        userId: 'user123',
        requirements: [],
      })
      mockFindUniqueRequirement.mockResolvedValue({
        id: 'req1',
        projectId: 'project123',
      })
      mockUpdate.mockResolvedValue({})
      mockFindMany.mockResolvedValue(tenQuestions)

      const mockRequest = {
        json: async () => ({
          action: 'answer',
          requirementId: 'req1',
          answer: 'A1',
        }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      await POST(mockRequest, context)

      expect(mockGenerateFollowUp).not.toHaveBeenCalled()
    })

    it('should return completed=true when all answered and no follow-up', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        name: 'Test',
        userId: 'user123',
        requirements: [],
      })
      mockFindUniqueRequirement.mockResolvedValue({
        id: 'req1',
        projectId: 'project123',
      })
      mockUpdate.mockResolvedValue({})
      mockFindMany.mockResolvedValue([
        {
          id: 'req1',
          question: 'Q1',
          answer: 'A1',
        },
      ])
      mockGenerateFollowUp.mockResolvedValue(null)

      const mockRequest = {
        json: async () => ({
          action: 'answer',
          requirementId: 'req1',
          answer: 'A1',
        }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(data.completed).toBe(true)
    })
  })

  describe('Invalid action', () => {
    it('should return 400 for invalid action', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockResolvedValue({
        id: 'project123',
        userId: 'user123',
        requirements: [],
      })

      const mockRequest = {
        json: async () => ({ action: 'invalid' }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      })
      mockFindUniqueProject.mockRejectedValue(new Error('Database error'))

      const mockRequest = {
        json: async () => ({ action: 'start' }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: 'project123' }) }

      const response = await POST(mockRequest, context)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
