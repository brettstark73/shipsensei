import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for requirement creation
const createRequirementSchema = z.object({
  question: z.string().min(1).max(1000),
  answer: z.string().max(5000).optional(),
  order: z.number().int().min(0),
})

// Validation schema for bulk requirement creation
const createBulkRequirementsSchema = z.array(createRequirementSchema)

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/requirements - Get all requirements for a project
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
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
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const requirements = await prisma.requirement.findMany({
      where: {
        projectId,
      },
      orderBy: {
        order: 'asc',
      },
    })

    return NextResponse.json({ requirements })
  } catch (error) {
    console.error('Error fetching requirements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/requirements - Create requirement(s)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: projectId } = await context.params
    const body = await request.json()

    // Verify project belongs to user
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if it's bulk creation (array) or single creation
    const isBulk = Array.isArray(body)

    if (isBulk) {
      // Bulk creation
      const validation = createBulkRequirementsSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validation.error.format() },
          { status: 400 }
        )
      }

      const requirementsData = validation.data.map((req) => ({
        ...req,
        projectId,
      }))

      await prisma.requirement.createMany({
        data: requirementsData,
      })

      const requirements = await prisma.requirement.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
      })

      return NextResponse.json({ requirements }, { status: 201 })
    } else {
      // Single creation
      const validation = createRequirementSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validation.error.format() },
          { status: 400 }
        )
      }

      const requirement = await prisma.requirement.create({
        data: {
          ...validation.data,
          projectId,
        },
      })

      return NextResponse.json({ requirement }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating requirement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
