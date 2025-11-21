import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { prisma } from '@/lib/prisma'
import { startDeployment, getDeploymentStatus, cancelDeployment, retryDeployment } from '@/lib/deployment-manager'
import { decryptToken } from '@/lib/encryption'

type RouteContext = {
  params: Promise<{ id: string }>
}

// POST /api/projects/[id]/deploy - Deploy project to Vercel with reliable error handling
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await context.params

    // Parse request body for action
    const body = await request.json().catch(() => ({}))
    const action = body.action as string // 'start' | 'retry' | 'cancel'

    // Get user's stored Vercel token from database (SECURITY FIX)
    let vercelToken: string | null = null

    if (action !== 'cancel') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { vercelToken: true },
      })

      if (!user?.vercelToken) {
        return NextResponse.json(
          {
            error: 'Vercel token not configured. Please add your Vercel API token in settings.',
            action: 'configure_token',
          },
          { status: 400 }
        )
      }

      // Decrypt the stored token
      try {
        vercelToken = await decryptToken(user.vercelToken)
      } catch (error) {
        console.error('Failed to decrypt Vercel token:', error)
        return NextResponse.json(
          {
            error: 'Failed to decrypt Vercel token. Please re-add your token in settings.',
          },
          { status: 500 }
        )
      }
    }

    // Verify project belongs to user
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Handle different actions
    if (action === 'cancel') {
      const result = await cancelDeployment(projectId, session.user.id)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ message: 'Deployment cancelled' })
    }

    // Check if repository exists for start/retry actions
    if (!project.repository) {
      return NextResponse.json(
        { error: 'Project must be generated first' },
        { status: 400 }
      )
    }

    // Extract GitHub repo name from URL
    const repoMatch = project.repository.match(/github\.com\/([^/]+\/[^/]+)/)
    if (!repoMatch) {
      return NextResponse.json(
        { error: 'Invalid repository URL' },
        { status: 400 }
      )
    }

    const githubRepo = repoMatch[1]

    // Generate Vercel project name from our project name
    const vercelProjectName = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const deploymentContext = {
      projectId,
      userId: session.user.id,
      vercelToken: vercelToken!,
      vercelProjectName,
      githubRepo,
    }

    let result
    if (action === 'retry') {
      result = await retryDeployment(deploymentContext)
    } else {
      // Default to 'start' action
      result = await startDeployment(deploymentContext)
    }

    if (!result.success) {
      // SECURITY: Don't expose sensitive token information in error messages
      let errorMessage = result.error || 'Failed to deploy to Vercel'
      if (typeof errorMessage === 'string') {
        // Sanitize error message to remove any potential token leakage
        errorMessage = errorMessage.replace(/ver_[A-Za-z0-9_]+/g, '[TOKEN]')
      }

      return NextResponse.json(
        {
          error: errorMessage,
          retryable: result.retryable
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: action === 'retry' ? 'Deployment retry started' : 'Deployment started',
      deployment: {
        id: result.deploymentId,
        url: result.deploymentUrl,
        status: 'BUILDING',
      },
    })
  } catch (error) {
    console.error('Error in deploy endpoint:', error)

    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// GET /api/projects/[id]/deploy - Get deployment status with detailed information
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await context.params

    // Get detailed deployment status
    const deploymentStatus = await getDeploymentStatus(projectId, session.user.id)

    return NextResponse.json({
      status: deploymentStatus.status,
      deploymentUrl: deploymentStatus.deploymentUrl,
      lastUpdated: deploymentStatus.lastUpdated,
      error: deploymentStatus.error,
    })
  } catch (error) {
    console.error('Error getting deployment status:', error)

    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
