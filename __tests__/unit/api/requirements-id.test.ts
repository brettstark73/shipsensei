/**
 * /api/projects/[id]/requirements/[requirementId] API Tests
 *
 * Tests for GET, PUT, DELETE /api/projects/[id]/requirements/[requirementId]
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
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import {
  GET,
  PUT,
  DELETE,
} from '@/app/api/projects/[id]/requirements/[requirementId]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetServerSession = getServerSession as jest.Mock
const mockProjectFindUnique = prisma.project.findUnique as jest.Mock
const mockRequirementFindUnique = prisma.requirement.findUnique as jest.Mock
const mockUpdate = prisma.requirement.update as jest.Mock
const mockDelete = prisma.requirement.delete as jest.Mock

describe('GET /api/projects/[id]/requirements/[requirementId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: 'project123', requirementId: 'req123' }),
    }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 when project not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: 'nonexistent', requirementId: 'req123' }),
    }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
  })

  it('should return 404 when requirement not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })
    mockRequirementFindUnique.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({
        id: 'project123',
        requirementId: 'nonexistent',
      }),
    }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Requirement not found')
  })

  it('should return requirement for valid request', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'
    const requirement = {
      id: requirementId,
      projectId,
      question: 'What is your target audience?',
      answer: 'Small businesses',
      order: 0,
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue(requirement)

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.requirement).toEqual(requirement)
  })

  it('should filter requirement by projectId', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: requirementId,
      projectId,
      question: 'Test?',
    })

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    await GET(mockRequest, context)

    expect(mockRequirementFindUnique).toHaveBeenCalledWith({
      where: {
        id: requirementId,
        projectId,
      },
    })
  })

  it('should return 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockProjectFindUnique.mockRejectedValue(new Error('Database error'))

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: 'project123', requirementId: 'req123' }),
    }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should check ownership before fetching requirement', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: 'req123',
      projectId,
    })

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId: 'req123' }),
    }

    await GET(mockRequest, context)

    expect(mockProjectFindUnique).toHaveBeenCalledWith({
      where: {
        id: projectId,
        userId,
      },
    })
  })
})

describe('PUT /api/projects/[id]/requirements/[requirementId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const mockRequest = {
      json: async () => ({ question: 'Updated question?' }),
    } as NextRequest
    const context = {
      params: Promise.resolve({ id: 'project123', requirementId: 'req123' }),
    }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 when project not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue(null)

    const mockRequest = {
      json: async () => ({ question: 'Updated question?' }),
    } as NextRequest
    const context = {
      params: Promise.resolve({ id: 'nonexistent', requirementId: 'req123' }),
    }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
  })

  it('should return 404 when requirement not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })
    mockRequirementFindUnique.mockResolvedValue(null)

    const mockRequest = {
      json: async () => ({ question: 'Updated question?' }),
    } as NextRequest
    const context = {
      params: Promise.resolve({
        id: 'project123',
        requirementId: 'nonexistent',
      }),
    }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Requirement not found')
  })

  it('should return 400 when validation fails', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })

    const mockRequest = {
      json: async () => ({ question: '' }), // Invalid: empty question
    } as NextRequest
    const context = {
      params: Promise.resolve({ id: 'project123', requirementId: 'req123' }),
    }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should update requirement with valid input', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'
    const updateData = {
      question: 'Updated question?',
      answer: 'Updated answer',
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: requirementId,
      projectId,
      question: 'Old question',
      answer: 'Old answer',
    })
    mockUpdate.mockResolvedValue({
      id: requirementId,
      projectId,
      ...updateData,
      order: 0,
    })

    const mockRequest = {
      json: async () => updateData,
    } as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.requirement.question).toBe('Updated question?')
    expect(data.requirement.answer).toBe('Updated answer')
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: requirementId },
      data: updateData,
    })
  })

  it('should update only question', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: requirementId,
      projectId,
    })
    mockUpdate.mockResolvedValue({
      id: requirementId,
      question: 'New question?',
    })

    const mockRequest = {
      json: async () => ({ question: 'New question?' }), // Only question
    } as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: requirementId },
      data: { question: 'New question?' },
    })
  })

  it('should update only answer', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: requirementId,
      projectId,
    })
    mockUpdate.mockResolvedValue({
      id: requirementId,
      answer: 'New answer',
    })

    const mockRequest = {
      json: async () => ({ answer: 'New answer' }), // Only answer
    } as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: requirementId },
      data: { answer: 'New answer' },
    })
  })

  it('should update only order', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: requirementId,
      projectId,
    })
    mockUpdate.mockResolvedValue({
      id: requirementId,
      order: 5,
    })

    const mockRequest = {
      json: async () => ({ order: 5 }), // Only order
    } as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: requirementId },
      data: { order: 5 },
    })
  })

  it('should allow null answer', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: requirementId,
      projectId,
    })
    mockUpdate.mockResolvedValue({
      id: requirementId,
      answer: null,
    })

    const mockRequest = {
      json: async () => ({ answer: null }), // Clear answer
    } as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.requirement.answer).toBeNull()
  })

  it('should return 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: 'req123',
      projectId: 'project123',
    })
    mockUpdate.mockRejectedValue(new Error('Database error'))

    const mockRequest = {
      json: async () => ({ question: 'Test?' }),
    } as NextRequest
    const context = {
      params: Promise.resolve({ id: 'project123', requirementId: 'req123' }),
    }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should check ownership before updating', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: requirementId,
      projectId,
    })
    mockUpdate.mockResolvedValue({
      id: requirementId,
    })

    const mockRequest = {
      json: async () => ({ question: 'Test?' }),
    } as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    await PUT(mockRequest, context)

    expect(mockProjectFindUnique).toHaveBeenCalledWith({
      where: {
        id: projectId,
        userId,
      },
    })
  })

  it('should filter requirement by projectId before updating', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: requirementId,
      projectId,
    })
    mockUpdate.mockResolvedValue({
      id: requirementId,
    })

    const mockRequest = {
      json: async () => ({ question: 'Test?' }),
    } as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    await PUT(mockRequest, context)

    expect(mockRequirementFindUnique).toHaveBeenCalledWith({
      where: {
        id: requirementId,
        projectId,
      },
    })
  })
})

describe('DELETE /api/projects/[id]/requirements/[requirementId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: 'project123', requirementId: 'req123' }),
    }

    const response = await DELETE(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 when project not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: 'nonexistent', requirementId: 'req123' }),
    }

    const response = await DELETE(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
  })

  it('should return 404 when requirement not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })
    mockRequirementFindUnique.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({
        id: 'project123',
        requirementId: 'nonexistent',
      }),
    }

    const response = await DELETE(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Requirement not found')
  })

  it('should delete requirement successfully', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: requirementId,
      projectId,
    })
    mockDelete.mockResolvedValue({
      id: requirementId,
    })

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    const response = await DELETE(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Requirement deleted successfully')
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: requirementId },
    })
  })

  it('should return 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: 'project123',
      userId: 'user123',
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: 'req123',
      projectId: 'project123',
    })
    mockDelete.mockRejectedValue(new Error('Database error'))

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: 'project123', requirementId: 'req123' }),
    }

    const response = await DELETE(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should check ownership before deleting', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: requirementId,
      projectId,
    })
    mockDelete.mockResolvedValue({
      id: requirementId,
    })

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    await DELETE(mockRequest, context)

    expect(mockProjectFindUnique).toHaveBeenCalledWith({
      where: {
        id: projectId,
        userId,
      },
    })
  })

  it('should filter requirement by projectId before deleting', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const requirementId = 'req123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue({
      id: requirementId,
      projectId,
    })
    mockDelete.mockResolvedValue({
      id: requirementId,
    })

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({ id: projectId, requirementId }),
    }

    await DELETE(mockRequest, context)

    expect(mockRequirementFindUnique).toHaveBeenCalledWith({
      where: {
        id: requirementId,
        projectId,
      },
    })
  })

  it('should not delete if requirement belongs to different project', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockProjectFindUnique.mockResolvedValue({
      id: projectId,
      userId,
    })
    mockRequirementFindUnique.mockResolvedValue(null) // Not found due to projectId filter

    const mockRequest = {} as NextRequest
    const context = {
      params: Promise.resolve({
        id: projectId,
        requirementId: 'req-from-other-project',
      }),
    }

    const response = await DELETE(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Requirement not found')
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
