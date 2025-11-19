import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { prisma } from '@/lib/prisma'
import { deployToVercel, waitForDeployment } from '@/lib/vercel'

type RouteContext = {
  params: Promise<{ id: string }>
}

// POST /api/projects/[id]/deploy - Deploy project to Vercel
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await context.params

    // Get Vercel token from request body
    const body = await request.json()
    const vercelToken = body.vercelToken as string

    if (!vercelToken) {
      return NextResponse.json(
        { error: 'Vercel token is required' },
        { status: 400 }
      )
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

    // Check if repository exists
    if (!project.repository) {
      return NextResponse.json(
        { error: 'Project must be generated first' },
        { status: 400 }
      )
    }

    // Extract GitHub repo name from URL
    // e.g., "https://github.com/owner/repo" -> "owner/repo"
    const repoMatch = project.repository.match(/github\.com\/([^\/]+\/[^\/]+)/)
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

    try {
      // Deploy to Vercel
      const deployment = await deployToVercel(
        vercelToken,
        vercelProjectName,
        githubRepo,
        true // production deployment
      )

      // Wait for deployment to complete (async, don't block response)
      waitForDeployment(vercelToken, deployment.id)
        .then(async (completedDeployment) => {
          // Update project with deployment URL
          await prisma.project.update({
            where: { id: projectId },
            data: {
              deployment: `https://${completedDeployment.url}`,
              status: 'deployed',
            },
          })
        })
        .catch((error) => {
          console.error('Deployment failed:', error)
        })

      // Return immediately with deployment info
      const deploymentUrl = `https://${deployment.url}`

      return NextResponse.json({
        message: 'Deployment started',
        deployment: {
          id: deployment.id,
          url: deploymentUrl,
          status: deployment.readyState || 'BUILDING',
        },
      })
    } catch (error) {
      console.error('Error deploying to Vercel:', error)

      let errorMessage = 'Failed to deploy to Vercel'
      if (error instanceof Error) {
        errorMessage = error.message
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in deploy endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/projects/[id]/deploy - Get deployment status
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await context.params

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

    return NextResponse.json({
      deployment: project.deployment,
      status: project.status,
    })
  } catch (error) {
    console.error('Error getting deployment status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
