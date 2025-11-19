import { GET, POST } from '@/app/api/projects/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>
const mockPrismaProjectFindMany = prisma.project.findMany as jest.MockedFunction<
  typeof prisma.project.findMany
>
const mockPrismaProjectCreate = prisma.project.create as jest.MockedFunction<
  typeof prisma.project.create
>

describe('Projects API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/projects', () => {
    it('should return projects for authenticated user', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          description: 'Description 1',
          userId: 'user-123',
          status: 'draft',
          requirements: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'project-2',
          name: 'Project 2',
          description: 'Description 2',
          userId: 'user-123',
          status: 'ready',
          requirements: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockGetServerSession.mockResolvedValue(mockSession as never)
      mockPrismaProjectFindMany.mockResolvedValue(mockProjects as never)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(2)
      expect(data.projects[0].id).toBe('project-1')
      expect(data.projects[1].id).toBe('project-2')

      expect(mockPrismaProjectFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          requirements: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(mockPrismaProjectFindMany).not.toHaveBeenCalled()
    })

    it('should return 500 when database error occurs', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      mockGetServerSession.mockResolvedValue(mockSession as never)
      mockPrismaProjectFindMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/projects', () => {
    it('should create a new project for authenticated user', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      const mockProject = {
        id: 'project-123',
        name: 'New Project',
        description: 'Test description',
        userId: 'user-123',
        status: 'draft',
        requirements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockGetServerSession.mockResolvedValue(mockSession as never)
      mockPrismaProjectCreate.mockResolvedValue(mockProject as never)

      const requestBody = {
        name: 'New Project',
        description: 'Test description',
      }

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.project.id).toBe('project-123')
      expect(data.project.name).toBe('New Project')
      expect(data.project.status).toBe('draft')

      expect(mockPrismaProjectCreate).toHaveBeenCalledWith({
        data: {
          name: 'New Project',
          description: 'Test description',
          userId: 'user-123',
          status: 'draft',
        },
        include: {
          requirements: true,
        },
      })
    })

    it('should create project without description', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      const mockProject = {
        id: 'project-456',
        name: 'Project No Desc',
        description: null,
        userId: 'user-123',
        status: 'draft',
        requirements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockGetServerSession.mockResolvedValue(mockSession as never)
      mockPrismaProjectCreate.mockResolvedValue(mockProject as never)

      const requestBody = {
        name: 'Project No Desc',
      }

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.project.name).toBe('Project No Desc')
      expect(data.project.description).toBeNull()
    })

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const requestBody = {
        name: 'New Project',
      }

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(mockPrismaProjectCreate).not.toHaveBeenCalled()
    })

    it('should return 400 when project name is missing', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      mockGetServerSession.mockResolvedValue(mockSession as never)

      const requestBody = {
        description: 'Missing name',
      }

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input')
      expect(data.details).toBeDefined()
      expect(mockPrismaProjectCreate).not.toHaveBeenCalled()
    })

    it('should return 400 when project name is empty', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      mockGetServerSession.mockResolvedValue(mockSession as never)

      const requestBody = {
        name: '',
      }

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input')
      expect(mockPrismaProjectCreate).not.toHaveBeenCalled()
    })

    it('should return 400 when project name exceeds max length', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      mockGetServerSession.mockResolvedValue(mockSession as never)

      const requestBody = {
        name: 'a'.repeat(101), // Exceeds 100 character limit
      }

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input')
      expect(mockPrismaProjectCreate).not.toHaveBeenCalled()
    })

    it('should return 400 when description exceeds max length', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      mockGetServerSession.mockResolvedValue(mockSession as never)

      const requestBody = {
        name: 'Valid Name',
        description: 'a'.repeat(501), // Exceeds 500 character limit
      }

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input')
      expect(mockPrismaProjectCreate).not.toHaveBeenCalled()
    })

    it('should return 500 when database error occurs', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      mockGetServerSession.mockResolvedValue(mockSession as never)
      mockPrismaProjectCreate.mockRejectedValue(new Error('Database error'))

      const requestBody = {
        name: 'New Project',
      }

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
