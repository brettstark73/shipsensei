import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for requirement updates
const updateRequirementSchema = z.object({
  question: z.string().min(1).max(1000).optional(),
  answer: z.string().max(5000).optional().nullable(),
  order: z.number().int().min(0).optional(),
})

type RouteContext = {
  params: Promise<{ id: string; requirementId: string }>
}

// GET /api/projects/[id]/requirements/[requirementId]
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, requirementId } = await context.params

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

    const requirement = await prisma.requirement.findUnique({
      where: {
        id: requirementId,
        projectId,
      },
    })

    if (!requirement) {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ requirement })
  } catch (error) {
    console.error('Error fetching requirement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/projects/[id]/requirements/[requirementId]
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, requirementId } = await context.params
    const body = await request.json()

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

    // Validate input
    const validation = updateRequirementSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    // Check if requirement exists
    const existingRequirement = await prisma.requirement.findUnique({
      where: {
        id: requirementId,
        projectId,
      },
    })

    if (!existingRequirement) {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      )
    }

    // Update requirement
    const requirement = await prisma.requirement.update({
      where: {
        id: requirementId,
      },
      data: validation.data,
    })

    return NextResponse.json({ requirement })
  } catch (error) {
    console.error('Error updating requirement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/requirements/[requirementId]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, requirementId } = await context.params

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

    // Check if requirement exists
    const existingRequirement = await prisma.requirement.findUnique({
      where: {
        id: requirementId,
        projectId,
      },
    })

    if (!existingRequirement) {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      )
    }

    // Delete requirement
    await prisma.requirement.delete({
      where: {
        id: requirementId,
      },
    })

    return NextResponse.json(
      { message: 'Requirement deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting requirement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
