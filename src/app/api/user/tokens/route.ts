import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/encryption'
import { z } from 'zod'

// Validation schema for token updates
const tokenUpdateSchema = z.object({
  vercelToken: z.string().optional(),
  githubToken: z.string().optional(),
})

/**
 * GET /api/user/tokens - Get user's stored tokens (masked for security)
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        vercelToken: true,
        githubToken: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Return masked tokens (for UI display only)
    return NextResponse.json({
      hasVercelToken: !!user.vercelToken,
      hasGithubToken: !!user.githubToken,
      vercelTokenMasked: user.vercelToken
        ? `${user.vercelToken.substring(0, 8)}...`
        : null,
      githubTokenMasked: user.githubToken
        ? `${user.githubToken.substring(0, 8)}...`
        : null,
    })
  } catch (error) {
    console.error('Error fetching user tokens:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/tokens - Store or update user's API tokens (encrypted)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = tokenUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.format(),
        },
        { status: 400 }
      )
    }

    const { vercelToken, githubToken } = validation.data

    // Prepare encrypted tokens
    const updates: { vercelToken?: string; githubToken?: string } = {}

    if (vercelToken) {
      // Validate Vercel token format (should start with specific prefix)
      if (!vercelToken.startsWith('ver_') && !vercelToken.includes('_')) {
        return NextResponse.json(
          { error: 'Invalid Vercel token format' },
          { status: 400 }
        )
      }
      updates.vercelToken = await encryptToken(vercelToken)
    }

    if (githubToken) {
      // Validate GitHub token format
      if (
        !githubToken.startsWith('ghp_') &&
        !githubToken.startsWith('github_pat_')
      ) {
        return NextResponse.json(
          { error: 'Invalid GitHub token format' },
          { status: 400 }
        )
      }
      updates.githubToken = await encryptToken(githubToken)
    }

    // Update user tokens
    await prisma.user.update({
      where: { id: session.user.id },
      data: updates,
    })

    return NextResponse.json({
      message: 'Tokens updated successfully',
      updated: Object.keys(updates),
    })
  } catch (error) {
    console.error('Error updating user tokens:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user/tokens - Remove user's stored tokens
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tokenType = searchParams.get('type')

    if (!tokenType || !['vercel', 'github', 'all'].includes(tokenType)) {
      return NextResponse.json(
        { error: 'Invalid token type. Must be: vercel, github, or all' },
        { status: 400 }
      )
    }

    const updates: { vercelToken?: null; githubToken?: null } = {}

    if (tokenType === 'vercel' || tokenType === 'all') {
      updates.vercelToken = null
    }

    if (tokenType === 'github' || tokenType === 'all') {
      updates.githubToken = null
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updates,
    })

    return NextResponse.json({
      message: 'Tokens removed successfully',
      removed: Object.keys(updates),
    })
  } catch (error) {
    console.error('Error removing user tokens:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
