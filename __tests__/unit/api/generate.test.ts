/**
 * /api/projects/[id]/generate API Tests
 *
 * Tests for POST /api/projects/[id]/generate
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

jest.mock('@/lib/github', () => ({
  createRepository: jest.fn(),
  createFiles: jest.fn(),
}))

jest.mock('@/lib/project-generator', () => ({
  generateProjectTemplate: jest.fn(),
}))

import { POST } from '@/app/api/projects/[id]/generate/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { createRepository, createFiles } from '@/lib/github'
import { generateProjectTemplate } from '@/lib/project-generator'
import { NextRequest } from 'next/server'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUnique = prisma.project.findUnique as jest.Mock
const mockUpdate = prisma.project.update as jest.Mock
const mockCreateRepository = createRepository as jest.Mock
const mockCreateFiles = createFiles as jest.Mock
const mockGenerateTemplate = generateProjectTemplate as jest.Mock

describe('POST /api/projects/[id]/generate', () => {
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
  })

  it('should return 400 when GitHub access token is missing', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      // No accessToken
    })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('GitHub access token not found')
  })

  it('should return 404 when project not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockResolvedValue(null)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'nonexistent' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
  })

  it('should return 400 when no requirements are completed', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      requirements: [
        { id: 'req1', question: 'Q1', answer: null },
      ],
    })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No requirements completed')
  })

  it('should return 400 when tech stack recommendation is missing', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockResolvedValue({
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      techStack: null, // Missing
      requirements: [
        { id: 'req1', question: 'Q1', answer: 'A1' },
      ],
    })

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Tech stack recommendation required')
  })

  it('should generate project successfully', async () => {
    const mockProject = {
      id: 'project123',
      name: 'My Awesome App',
      description: 'A great app',
      userId: 'user123',
      techStack: '{"stack":"Next.js"}',
      requirements: [
        { id: 'req1', question: 'What?', answer: 'An app' },
      ],
    }

    const mockRepo = {
      url: 'https://github.com/user/my-awesome-app',
      owner: 'user',
    }

    const mockTemplate = {
      files: [
        { path: 'README.md', content: '# My App' },
        { path: 'package.json', content: '{}' },
      ],
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockResolvedValue(mockProject)
    mockUpdate.mockResolvedValue({ ...mockProject, status: 'ready' })
    mockCreateRepository.mockResolvedValue(mockRepo)
    mockGenerateTemplate.mockResolvedValue(mockTemplate)
    mockCreateFiles.mockResolvedValue(undefined)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Project generated successfully')
    expect(data.repository).toEqual(mockRepo)
  })

  it('should sanitize repository name', async () => {
    const mockProject = {
      id: 'project123',
      name: 'My Awesome App!!!',
      userId: 'user123',
      techStack: '{"stack":"Next.js"}',
      requirements: [{ id: 'req1', question: 'Q', answer: 'A' }],
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockResolvedValue(mockProject)
    mockUpdate.mockResolvedValue(mockProject)
    mockCreateRepository.mockResolvedValue({
      url: 'https://github.com/user/repo',
      owner: 'user',
    })
    mockGenerateTemplate.mockResolvedValue({ files: [] })
    mockCreateFiles.mockResolvedValue(undefined)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    await POST(mockRequest, context)

    expect(mockCreateRepository).toHaveBeenCalledWith(
      'github-token',
      'my-awesome-app', // Sanitized: lowercase, no special chars
      expect.any(String),
      false
    )
  })

  it('should update project status to generating before generation', async () => {
    const mockProject = {
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      techStack: '{"stack":"Next.js"}',
      requirements: [{ id: 'req1', question: 'Q', answer: 'A' }],
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockResolvedValue(mockProject)
    mockUpdate.mockResolvedValue(mockProject)
    mockCreateRepository.mockResolvedValue({
      url: 'https://github.com/user/repo',
      owner: 'user',
    })
    mockGenerateTemplate.mockResolvedValue({ files: [] })
    mockCreateFiles.mockResolvedValue(undefined)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    await POST(mockRequest, context)

    expect(mockUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'project123' },
      data: { status: 'generating' },
    })
  })

  it('should update project status to ready after success', async () => {
    const mockProject = {
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      techStack: '{"stack":"Next.js"}',
      requirements: [{ id: 'req1', question: 'Q', answer: 'A' }],
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockResolvedValue(mockProject)
    mockUpdate.mockResolvedValue(mockProject)
    mockCreateRepository.mockResolvedValue({
      url: 'https://github.com/user/repo',
      owner: 'user',
    })
    mockGenerateTemplate.mockResolvedValue({ files: [] })
    mockCreateFiles.mockResolvedValue(undefined)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    await POST(mockRequest, context)

    expect(mockUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'project123' },
      data: {
        repository: expect.any(String),
        status: 'ready',
      },
      include: expect.any(Object),
    })
  })

  it('should revert status on generation error', async () => {
    const mockProject = {
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      techStack: '{"stack":"Next.js"}',
      requirements: [{ id: 'req1', question: 'Q', answer: 'A' }],
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockResolvedValue(mockProject)
    mockUpdate.mockResolvedValueOnce(mockProject) // First update to "generating"
    mockUpdate.mockResolvedValueOnce(mockProject) // Revert to "ready"
    mockCreateRepository.mockRejectedValue(new Error('GitHub API error'))

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    await POST(mockRequest, context)

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'project123' },
      data: { status: 'ready' },
    })
  })

  it('should pass answered requirements to template generator', async () => {
    const mockProject = {
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      techStack: '{"stack":"Next.js"}',
      requirements: [
        { id: 'req1', question: 'Q1', answer: 'A1' },
        { id: 'req2', question: 'Q2', answer: null }, // Unanswered
        { id: 'req3', question: 'Q3', answer: 'A3' },
      ],
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockResolvedValue(mockProject)
    mockUpdate.mockResolvedValue(mockProject)
    mockCreateRepository.mockResolvedValue({
      url: 'https://github.com/user/repo',
      owner: 'user',
    })
    mockGenerateTemplate.mockResolvedValue({ files: [] })
    mockCreateFiles.mockResolvedValue(undefined)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    await POST(mockRequest, context)

    expect(mockGenerateTemplate).toHaveBeenCalledWith(
      'Test',
      '',
      [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q3', answer: 'A3' },
      ]
    )
  })

  it('should create files in GitHub repository', async () => {
    const mockProject = {
      id: 'project123',
      name: 'Test',
      userId: 'user123',
      techStack: '{"stack":"Next.js"}',
      requirements: [{ id: 'req1', question: 'Q', answer: 'A' }],
    }

    const mockTemplate = {
      files: [
        { path: 'README.md', content: '# Test' },
        { path: 'package.json', content: '{}' },
      ],
    }

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockResolvedValue(mockProject)
    mockUpdate.mockResolvedValue(mockProject)
    mockCreateRepository.mockResolvedValue({
      url: 'https://github.com/user/test',
      owner: 'user',
    })
    mockGenerateTemplate.mockResolvedValue(mockTemplate)
    mockCreateFiles.mockResolvedValue(undefined)

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    await POST(mockRequest, context)

    expect(mockCreateFiles).toHaveBeenCalledWith(
      'github-token',
      'user',
      'test',
      mockTemplate.files
    )
  })

  it('should return 500 on error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockRejectedValue(new Error('Database error'))

    const mockRequest = {} as NextRequest
    const context = { params: Promise.resolve({ id: 'project123' }) }

    const response = await POST(mockRequest, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })

  it('should check ownership before generation', async () => {
    const userId = 'user123'
    const projectId = 'project123'

    mockGetServerSession.mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
      accessToken: 'github-token',
    })
    mockFindUnique.mockResolvedValue({
      id: projectId,
      userId,
      techStack: '{}',
      requirements: [{ id: 'req1', question: 'Q', answer: 'A' }],
    })
    mockUpdate.mockResolvedValue({})
    mockCreateRepository.mockResolvedValue({
      url: 'https://github.com/user/repo',
      owner: 'user',
    })
    mockGenerateTemplate.mockResolvedValue({ files: [] })
    mockCreateFiles.mockResolvedValue(undefined)

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
