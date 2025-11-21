import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { prisma } from '@/lib/prisma'
import { generateTechStackRecommendation } from '@/lib/ai'

type RouteContext = {
  params: Promise<{ id: string }>
}

// POST /api/projects/[id]/recommend-stack - Generate tech stack recommendation
export async function POST(request: NextRequest, context: RouteContext) {
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
      include: {
        requirements: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if there are answered requirements
    const answeredRequirements = project.requirements.filter(r => r.answer)

    if (answeredRequirements.length === 0) {
      return NextResponse.json(
        { error: 'No requirements answered yet' },
        { status: 400 }
      )
    }

    // Generate recommendation
    const recommendation = await generateTechStackRecommendation(
      project.name,
      answeredRequirements.map(r => ({
        question: r.question,
        answer: r.answer!,
      }))
    )

    // Update project with tech stack
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        techStack: JSON.stringify(recommendation),
        status: 'READY', // Mark as ready for generation
      },
      include: {
        requirements: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    return NextResponse.json({
      project: updatedProject,
      recommendation,
    })
  } catch (error) {
    console.error('Error generating tech stack:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
