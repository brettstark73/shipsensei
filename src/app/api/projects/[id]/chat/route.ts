import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { prisma } from '@/lib/prisma'
import {
  generateRequirementsQuestions,
  generateFollowUpQuestion,
} from '@/lib/ai'
import { z } from 'zod'

type RouteContext = {
  params: Promise<{ id: string }>
}

const answerSchema = z.object({
  requirementId: z.string(),
  answer: z.string().min(1).max(5000),
})

// POST /api/projects/[id]/chat - Start chat or submit answer
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await context.params
    const body = await request.json()
    const action = body.action // 'start' or 'answer'

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

    // START CHAT - Generate initial questions
    if (action === 'start') {
      // Check if questions already exist
      if (project.requirements.length > 0) {
        return NextResponse.json({
          message: 'Chat already started',
          requirements: project.requirements,
        })
      }

      // Generate questions using AI
      const questions = await generateRequirementsQuestions(
        project.name,
        project.description || undefined
      )

      // Create requirements from questions
      const requirementsData = questions.map((question, index) => ({
        projectId,
        question,
        answer: null,
        order: index,
      }))

      await prisma.requirement.createMany({
        data: requirementsData,
      })

      // Fetch created requirements
      const requirements = await prisma.requirement.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
      })

      return NextResponse.json({
        message: 'Chat started',
        requirements,
      })
    }

    // SUBMIT ANSWER
    if (action === 'answer') {
      const validation = answerSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validation.error.format() },
          { status: 400 }
        )
      }

      const { requirementId, answer } = validation.data

      // Verify requirement belongs to this project
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

      // Update answer
      await prisma.requirement.update({
        where: { id: requirementId },
        data: { answer },
      })

      // Get all requirements to check if we should generate follow-up
      const allRequirements = await prisma.requirement.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
      })

      const answeredRequirements = allRequirements.filter((r) => r.answer)
      const conversationHistory = answeredRequirements.map((r) => ({
        question: r.question,
        answer: r.answer!,
      }))

      // Check if all current questions are answered
      const allAnswered = allRequirements.every((r) => r.answer)

      let nextQuestion: string | null = null
      let newRequirement = null

      if (allAnswered && conversationHistory.length < 10) {
        // Generate follow-up question
        nextQuestion = await generateFollowUpQuestion(
          project.name,
          conversationHistory
        )

        if (nextQuestion) {
          // Create new requirement
          newRequirement = await prisma.requirement.create({
            data: {
              projectId,
              question: nextQuestion,
              answer: null,
              order: allRequirements.length,
            },
          })
        }
      }

      // Fetch updated requirements
      const requirements = await prisma.requirement.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
      })

      return NextResponse.json({
        message: 'Answer saved',
        requirements,
        completed: allAnswered && !nextQuestion,
        nextQuestion: newRequirement,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
