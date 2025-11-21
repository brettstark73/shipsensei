/**
 * Deployment Manager Integration Tests
 *
 * Tests reliable deployment handling, error recovery, and status tracking
 */

import {
  startDeployment,
  getDeploymentStatus,
  cancelDeployment,
  retryDeployment,
  cleanupFailedDeployments
} from '@/lib/deployment-manager'
import { prisma } from '@/lib/prisma'
import * as vercel from '@/lib/vercel'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

// Mock Vercel functions
jest.mock('@/lib/vercel', () => ({
  deployToVercel: jest.fn(),
  waitForDeployment: jest.fn(),
}))

const mockPrismaProjectFindUnique = prisma.project.findUnique as jest.MockedFunction<
  typeof prisma.project.findUnique
>
const mockPrismaProjectUpdate = prisma.project.update as jest.MockedFunction<
  typeof prisma.project.update
>
const mockPrismaProjectUpdateMany = prisma.project.updateMany as jest.MockedFunction<
  typeof prisma.project.updateMany
>

const mockDeployToVercel = vercel.deployToVercel as jest.MockedFunction<
  typeof vercel.deployToVercel
>
const mockWaitForDeployment = vercel.waitForDeployment as jest.MockedFunction<
  typeof vercel.waitForDeployment
>

describe('Deployment Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const mockContext = {
    projectId: 'project-123',
    userId: 'user-456',
    vercelToken: 'vercel-token',
    vercelProjectName: 'test-project',
    githubRepo: 'user/test-repo',
  }

  describe('Start Deployment', () => {
    it('should start deployment successfully', async () => {
      const mockDeployment = {
        id: 'deployment-123',
        url: 'test-project-abc123.vercel.app',
        name: 'test-project',
        state: 'BUILDING',
        ready: 0,
        readyState: 'BUILDING',
        inspectorUrl: 'https://vercel.com/inspector',
      }

      mockDeployToVercel.mockResolvedValue(mockDeployment)
      mockPrismaProjectUpdate.mockResolvedValue({} as any)

      const result = await startDeployment(mockContext)

      expect(result.success).toBe(true)
      expect(result.deploymentId).toBe('deployment-123')
      expect(result.deploymentUrl).toBe('https://test-project-abc123.vercel.app')

      // Verify deployment status was updated to 'deploying'
      expect(mockPrismaProjectUpdate).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        data: {
          status: 'deploying',
          updatedAt: expect.any(Date),
        },
      })
    })

    it('should handle deployment initiation failure', async () => {
      mockDeployToVercel.mockRejectedValue(new Error('Vercel API error'))
      mockPrismaProjectUpdate.mockResolvedValue({} as any)

      const result = await startDeployment(mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Vercel API error')
      expect(result.retryable).toBe(false)

      // Verify status was updated to 'failed'
      expect(mockPrismaProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
          }),
        })
      )
    })

    it('should identify retryable errors', async () => {
      mockDeployToVercel.mockRejectedValue(new Error('Request timeout'))
      mockPrismaProjectUpdate.mockResolvedValue({} as any)

      const result = await startDeployment(mockContext)

      expect(result.success).toBe(false)
      expect(result.retryable).toBe(true)
    })
  })

  describe('Deployment Status', () => {
    it('should get deployment status successfully', async () => {
      mockPrismaProjectFindUnique.mockResolvedValue({
        status: 'deployed',
        deployment: 'https://test-project.vercel.app',
        updatedAt: new Date('2024-01-01'),
      } as any)

      const status = await getDeploymentStatus('project-123', 'user-456')

      expect(status.status).toBe('deployed')
      expect(status.deploymentUrl).toBe('https://test-project.vercel.app')
      expect(status.lastUpdated).toEqual(new Date('2024-01-01'))
    })

    it('should handle project not found', async () => {
      mockPrismaProjectFindUnique.mockResolvedValue(null)

      await expect(getDeploymentStatus('invalid-project', 'user-456'))
        .rejects.toThrow('Project not found')
    })
  })

  describe('Cancel Deployment', () => {
    it('should cancel deployment in progress', async () => {
      mockPrismaProjectFindUnique.mockResolvedValue({
        status: 'deploying',
      } as any)
      mockPrismaProjectUpdate.mockResolvedValue({} as any)

      const result = await cancelDeployment('project-123', 'user-456')

      expect(result.success).toBe(true)
      expect(mockPrismaProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
          }),
        })
      )
    })

    it('should not cancel deployment that is not in progress', async () => {
      mockPrismaProjectFindUnique.mockResolvedValue({
        status: 'deployed',
      } as any)

      const result = await cancelDeployment('project-123', 'user-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No deployment in progress to cancel')
    })
  })

  describe('Retry Deployment', () => {
    it('should retry failed deployment', async () => {
      mockPrismaProjectFindUnique.mockResolvedValue({
        status: 'failed',
        repository: 'https://github.com/user/test-repo',
      } as any)

      const mockDeployment = {
        id: 'deployment-retry',
        url: 'test-project-retry.vercel.app',
        name: 'test-project',
        state: 'BUILDING',
        ready: 0,
        readyState: 'BUILDING',
        inspectorUrl: 'https://vercel.com/inspector',
      }

      mockDeployToVercel.mockResolvedValue(mockDeployment)
      mockPrismaProjectUpdate.mockResolvedValue({} as any)

      const result = await retryDeployment(mockContext)

      expect(result.success).toBe(true)
      expect(result.deploymentId).toBe('deployment-retry')
    })

    it('should not retry deployment for project without repository', async () => {
      mockPrismaProjectFindUnique.mockResolvedValue({
        status: 'failed',
        repository: null,
      } as any)

      const result = await retryDeployment(mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Project must be generated before deployment')
    })
  })

  describe('Cleanup Failed Deployments', () => {
    it('should reset old failed deployments', async () => {
      mockPrismaProjectUpdateMany.mockResolvedValue({ count: 5 } as any)

      const resetCount = await cleanupFailedDeployments(7)

      expect(resetCount).toBe(5)
      expect(mockPrismaProjectUpdateMany).toHaveBeenCalledWith({
        where: {
          status: 'failed',
          updatedAt: { lt: expect.any(Date) },
        },
        data: {
          status: 'pending',
        },
      })
    })

    it('should handle cleanup errors gracefully', async () => {
      mockPrismaProjectUpdateMany.mockRejectedValue(new Error('DB error'))

      const resetCount = await cleanupFailedDeployments()

      expect(resetCount).toBe(0)
    })
  })

  describe('Background Monitoring', () => {
    beforeEach(() => {
      // Mock setTimeout for background monitoring
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should update status on successful deployment', async () => {
      const mockCompletedDeployment = {
        id: 'deployment-123',
        url: 'test-project-final.vercel.app',
        name: 'test-project',
        state: 'READY',
        ready: 1,
        readyState: 'READY',
        inspectorUrl: 'https://vercel.com/inspector',
      }

      mockDeployToVercel.mockResolvedValue({
        id: 'deployment-123',
        url: 'test-project-temp.vercel.app',
        name: 'test-project',
        state: 'BUILDING',
        ready: 0,
        readyState: 'BUILDING',
        inspectorUrl: 'https://vercel.com/inspector',
      })

      mockWaitForDeployment.mockResolvedValue(mockCompletedDeployment)
      mockPrismaProjectUpdate.mockResolvedValue({} as any)

      // Start deployment
      const startPromise = startDeployment(mockContext)

      // Fast-forward to allow background monitoring to complete
      jest.runAllTimers()

      const result = await startPromise

      expect(result.success).toBe(true)

      // Allow background monitoring to complete
      await new Promise(resolve => setImmediate(resolve))

      // Verify final status update
      expect(mockPrismaProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'deployed',
            deployment: 'https://test-project-final.vercel.app',
          }),
        })
      )
    })

    it('should handle monitoring failure with retry', async () => {
      const mockInitialDeployment = {
        id: 'deployment-123',
        url: 'test-project-temp.vercel.app',
        name: 'test-project',
        state: 'BUILDING',
        ready: 0,
        readyState: 'BUILDING',
        inspectorUrl: 'https://vercel.com/inspector',
      }

      mockDeployToVercel.mockResolvedValue(mockInitialDeployment)

      // First attempt fails with retryable error, second succeeds
      mockWaitForDeployment
        .mockRejectedValueOnce(new Error('Timeout error'))
        .mockResolvedValueOnce({
          ...mockInitialDeployment,
          readyState: 'READY',
          url: 'test-project-final.vercel.app',
        })

      mockPrismaProjectUpdate.mockResolvedValue({} as any)

      // Start deployment with max retries
      const result = await startDeployment({ ...mockContext, maxRetries: 2 })

      expect(result.success).toBe(true)

      // Allow monitoring and retry to complete
      jest.runAllTimers()
      await new Promise(resolve => setImmediate(resolve))

      // Verify retry status update
      expect(mockPrismaProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'retrying',
          }),
        })
      )
    })
  })
})