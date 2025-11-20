/**
 * /api/projects/[id] API Route Tests
 *
 * Tests for GET, PUT, DELETE /api/projects/[id] endpoints
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
      delete: jest.fn(),
    },
  },
}))

import { GET, PUT, DELETE } from '@/app/api/projects/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUnique = prisma.project.findUnique as jest.Mock
const mockUpdate = prisma.project.update as jest.Mock
const mockDelete = prisma.project.delete as jest.Mock

describe('GET /api/projects/[id]', () => {
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
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('should return project when found and owned by user', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const mockProject = {
      id: projectId,
      name: 'Test Project',
      description: 'Description',
      userId,
      status: 'draft',
      requirements: [],
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(mockProject)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.project).toEqual(mockProject)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: projectId, userId },
      include: {
        requirements: {
          orderBy: { order: 'asc' },
        },
      },
    })
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

  it('should return 404 when project belongs to different user', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(null) // Security check filters out

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project456' }) }

    const response = await GET(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
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

  it('should filter by userId to prevent unauthorized access', async () => {
    const userId = 'user123'
    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      userId,
      name: 'Test',
    })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    await GET(mockRequest, context)

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId,
        }),
      })
    )
  })
})

describe('PUT /api/projects/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const mockRequest = {
      json: async () => ({ name: 'Updated Name' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('should update project with valid data', async () => {
    const userId = 'user123'
    const projectId = 'project123'
    const updateData = { name: 'Updated Name', description: 'Updated Desc' }
    const updatedProject = {
      id: projectId,
      ...updateData,
      userId,
      status: 'draft',
      requirements: [],
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({ id: projectId, userId })
    mockUpdate.mockResolvedValue(updatedProject)

    const mockRequest = {
      json: async () => updateData,
    } as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.project).toEqual(updatedProject)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: projectId },
      data: updateData,
      include: {
        requirements: {
          orderBy: { order: 'asc' },
        },
      },
    })
  })

  it('should return 404 when project not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(null)

    const mockRequest = {
      json: async () => ({ name: 'Updated' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'nonexistent' }) }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('should return 404 when trying to update another users project', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(null) // Security filter

    const mockRequest = {
      json: async () => ({ name: 'Hacked' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project456' }) }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('should return 400 when name exceeds 100 characters', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })

    const mockRequest = {
      json: async () => ({ name: 'a'.repeat(101) }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should return 400 when description exceeds 500 characters', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })

    const mockRequest = {
      json: async () => ({ description: 'a'.repeat(501) }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should return 400 when status is invalid', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })

    const mockRequest = {
      json: async () => ({ status: 'invalid-status' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should accept valid status values', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({ id: projectId, userId })
    mockUpdate.mockResolvedValue({
      id: projectId,
      userId,
      status: 'ready',
    })

    const validStatuses = ['draft', 'generating', 'ready', 'deployed']

    for (const status of validStatuses) {
      const mockRequest = {
        json: async () => ({ status }),
      } as NextRequest
      const context = { params: Promise.resolve({ id: projectId }) }

      const response = await PUT(mockRequest, context)

      expect(response.status).toBe(200)
    }
  })

  it('should return 400 when repository is not a valid URL', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })

    const mockRequest = {
      json: async () => ({ repository: 'not-a-url' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should return 400 when deployment is not a valid URL', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })

    const mockRequest = {
      json: async () => ({ deployment: 'not-a-url' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should return 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({ id: 'project123', userId: 'user123' })
    mockUpdate.mockRejectedValue(new Error('Database error'))

    const mockRequest = {
      json: async () => ({ name: 'Updated' }),
    } as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await PUT(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('DELETE /api/projects/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await DELETE(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('should delete project when found and owned by user', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({ id: projectId, userId })
    mockDelete.mockResolvedValue({ id: projectId })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    const response = await DELETE(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Project deleted successfully')
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: projectId },
    })
  })

  it('should return 404 when project not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'nonexistent' }) }

    const response = await DELETE(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('should return 404 when trying to delete another users project', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue(null) // Security filter

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project456' }) }

    const response = await DELETE(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('should return 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({ id: 'project123', userId: 'user123' })
    mockDelete.mockRejectedValue(new Error('Database error'))

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await DELETE(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should check ownership before deletion', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
    })
    mockFindUnique.mockResolvedValue({ id: projectId, userId })
    mockDelete.mockResolvedValue({ id: projectId })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: projectId }) }

    await DELETE(mockRequest, context)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        id: projectId,
        userId,
      },
    })
  })
})
