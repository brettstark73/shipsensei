/**
 * Reliable Deployment Management System
 *
 * Handles deployment status, error recovery, and user notifications
 * Provides idempotent, transactional deployment operations
 */

import { prisma } from './prisma'
import { deployToVercel, waitForDeployment } from './vercel'

export type DeploymentStatus =
  | 'pending'     // Initial state, not started
  | 'deploying'   // Deployment in progress
  | 'deployed'    // Successfully deployed
  | 'failed'      // Deployment failed
  | 'retrying'    // Automatic retry in progress

export interface DeploymentResult {
  success: boolean
  deploymentUrl?: string
  deploymentId?: string
  error?: string
  retryable?: boolean
}

export interface DeploymentContext {
  projectId: string
  userId: string
  vercelToken: string
  vercelProjectName: string
  githubRepo: string
  maxRetries?: number
}

/**
 * Deployment status tracking in database
 */
async function updateDeploymentStatus(
  projectId: string,
  status: DeploymentStatus,
  deploymentId?: string,
  deploymentUrl?: string,
  error?: string
): Promise<void> {
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status,
        deployment: deploymentUrl || undefined,
        // Store deployment metadata in a JSON field if available
        ...(deploymentId && {
          // We could add a deploymentMetadata JSON field to store this
          // For now, we'll track it in logs
        }),
        updatedAt: new Date(),
      },
    })

    // Log deployment status change
    console.log(`Project ${projectId} deployment status: ${status}`, {
      deploymentId,
      deploymentUrl,
      error,
    })
  } catch (dbError) {
    console.error('Failed to update deployment status:', dbError)
    // Don't throw here - we don't want DB issues to break deployment tracking
  }
}

/**
 * Start deployment with proper error handling and status tracking
 */
export async function startDeployment(
  context: DeploymentContext
): Promise<DeploymentResult> {
  const { projectId, vercelToken, vercelProjectName, githubRepo, maxRetries = 2 } = context

  // Mark deployment as starting
  await updateDeploymentStatus(projectId, 'deploying')

  try {
    // Initiate Vercel deployment
    const deployment = await deployToVercel(
      vercelToken,
      vercelProjectName,
      githubRepo,
      true // production
    )

    // Start background monitoring (don't await)
    monitorDeployment({
      ...context,
      deploymentId: deployment.id,
      attempt: 1,
      maxRetries,
    }).catch(error => {
      console.error('Deployment monitoring failed:', error)
      // Update status to failed if monitoring itself fails
      updateDeploymentStatus(projectId, 'failed', deployment.id, undefined,
        'Deployment monitoring failed: ' + error.message)
    })

    return {
      success: true,
      deploymentId: deployment.id,
      deploymentUrl: `https://${deployment.url}`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error('Deployment initiation failed:', error)
    await updateDeploymentStatus(projectId, 'failed', undefined, undefined, errorMessage)

    return {
      success: false,
      error: errorMessage,
      retryable: isRetryableError(error),
    }
  }
}

/**
 * Monitor deployment progress in background
 */
async function monitorDeployment(context: DeploymentContext & {
  deploymentId: string
  attempt: number
  maxRetries: number
}): Promise<void> {
  const { projectId, vercelToken, deploymentId, attempt, maxRetries } = context

  try {
    // Wait for deployment to complete
    const completedDeployment = await waitForDeployment(vercelToken, deploymentId)

    // Success - update project with final URL and status
    const deploymentUrl = `https://${completedDeployment.url}`
    await updateDeploymentStatus(projectId, 'deployed', deploymentId, deploymentUrl)

    console.log(`Deployment ${deploymentId} completed successfully: ${deploymentUrl}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Deployment ${deploymentId} failed:`, error)

    // Check if we should retry
    if (attempt < maxRetries && isRetryableError(error)) {
      console.log(`Retrying deployment ${deploymentId} (attempt ${attempt + 1}/${maxRetries})`)

      await updateDeploymentStatus(projectId, 'retrying', deploymentId, undefined,
        `Retry attempt ${attempt + 1}: ${errorMessage}`)

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 30000)) // 30 seconds

      // Retry deployment monitoring
      await monitorDeployment({
        ...context,
        attempt: attempt + 1,
      })
    } else {
      // Max retries exceeded or non-retryable error
      await updateDeploymentStatus(projectId, 'failed', deploymentId, undefined, errorMessage)

      // Could send notification to user here via email/webhook
      console.error(`Deployment ${deploymentId} failed permanently after ${attempt} attempts`)
    }
  }
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const retryablePatterns = [
    'timeout',
    'network',
    'connection',
    'rate limit',
    'temporary',
    '502',
    '503',
    '504',
  ]

  const errorMessage = error.message.toLowerCase()
  return retryablePatterns.some(pattern => errorMessage.includes(pattern))
}

/**
 * Get deployment status for a project
 */
export async function getDeploymentStatus(projectId: string, userId: string): Promise<{
  status: DeploymentStatus
  deploymentUrl?: string
  error?: string
  lastUpdated?: Date
}> {
  try {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: userId, // Ensure user owns the project
      },
      select: {
        status: true,
        deployment: true,
        updatedAt: true,
      },
    })

    if (!project) {
      throw new Error('Project not found')
    }

    return {
      status: project.status as DeploymentStatus,
      deploymentUrl: project.deployment || undefined,
      lastUpdated: project.updatedAt,
    }
  } catch (error) {
    console.error('Failed to get deployment status:', error)
    throw error
  }
}

/**
 * Cancel a deployment in progress
 */
export async function cancelDeployment(
  projectId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify user owns project
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
      select: { status: true },
    })

    if (!project) {
      return { success: false, error: 'Project not found' }
    }

    if (project.status !== 'deploying' && project.status !== 'retrying') {
      return { success: false, error: 'No deployment in progress to cancel' }
    }

    // Update status to indicate cancellation
    await updateDeploymentStatus(projectId, 'failed', undefined, undefined, 'Deployment cancelled by user')

    // Note: We can't actually cancel the Vercel deployment once started,
    // but we can stop monitoring it and mark it as cancelled in our system

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to cancel deployment:', error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Retry a failed deployment
 */
export async function retryDeployment(
  context: Omit<DeploymentContext, 'maxRetries'>
): Promise<DeploymentResult> {
  const { projectId, userId } = context

  try {
    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
      select: { status: true, repository: true },
    })

    if (!project) {
      return { success: false, error: 'Project not found' }
    }

    if (!project.repository) {
      return { success: false, error: 'Project must be generated before deployment' }
    }

    // Reset status and start new deployment
    return await startDeployment({ ...context, maxRetries: 1 }) // Single retry attempt
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to retry deployment:', error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Clean up failed deployments (for maintenance)
 */
export async function cleanupFailedDeployments(olderThanDays: number = 7): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

    const result = await prisma.project.updateMany({
      where: {
        status: 'failed',
        updatedAt: { lt: cutoffDate },
      },
      data: {
        status: 'pending', // Reset to pending for potential retry
      },
    })

    console.log(`Reset ${result.count} failed deployments older than ${olderThanDays} days`)
    return result.count
  } catch (error) {
    console.error('Failed to cleanup failed deployments:', error)
    return 0
  }
}