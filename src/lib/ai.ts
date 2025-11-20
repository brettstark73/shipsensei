import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export type Message = {
  role: 'user' | 'assistant'
  content: string
}

// Generate requirements discovery questions based on project description
export async function generateRequirementsQuestions(
  projectName: string,
  projectDescription?: string
): Promise<string[]> {
  const prompt = `You are a product requirements expert helping a non-technical person build "${projectName}".
${projectDescription ? `Project description: ${projectDescription}` : ''}

Generate 5-7 smart, specific questions to discover their true requirements. Focus on:
- Who are the users?
- What problem does this solve?
- What are the core features (MVP only)?
- Any specific constraints or preferences?

Return ONLY a JSON array of question strings, no explanation.
Example: ["Who is your target user?", "What's the main problem you're solving?"]`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const fallbackQuestions = [
    'Who is your target user or audience?',
    "What's the main problem you're trying to solve?",
    'What are the 3 most important features for your MVP?',
    'Do you have any design or branding preferences?',
    'Are there any existing apps or websites similar to what you want?',
  ]

  try {
    const questions = JSON.parse(content.text)
    return Array.isArray(questions) ? questions : fallbackQuestions
  } catch (error) {
    console.error('Failed to parse questions from Claude:', error)
    return fallbackQuestions
  }
}

// Generate follow-up question based on conversation context
export async function generateFollowUpQuestion(
  projectName: string,
  conversationHistory: Array<{ question: string; answer: string }>
): Promise<string | null> {
  if (conversationHistory.length >= 10) {
    return null // Stop after 10 questions
  }

  const prompt = `You are helping someone build "${projectName}".

Previous Q&A:
${conversationHistory.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}

Based on their answers, generate ONE smart follow-up question to clarify requirements. Focus on gaps or ambiguities.
If enough information has been gathered, respond with just "COMPLETE".

Return ONLY the question text, nothing else.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    return null
  }

  const question = content.text.trim()
  return question === 'COMPLETE' ? null : question
}

// Generate tech stack recommendation based on requirements
export async function generateTechStackRecommendation(
  projectName: string,
  requirements: Array<{ question: string; answer: string }>
): Promise<{
  stack: string
  rationale: string
}> {
  const prompt = `You are a senior tech architect. Based on these requirements for "${projectName}":

${requirements.map((r, i) => `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.answer}`).join('\n\n')}

Recommend ONE opinionated tech stack using Next.js 14. Return JSON with:
{
  "stack": "Next.js 14 + Tailwind CSS + Prisma + PostgreSQL + Vercel",
  "rationale": "2-3 sentences explaining why this stack fits their needs"
}

Keep it simple and beginner-friendly. Return ONLY valid JSON.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  try {
    return JSON.parse(content.text)
  } catch (error) {
    console.error('Failed to parse tech stack from Claude:', error)
    return {
      stack: 'Next.js 14 + Tailwind CSS + Prisma + PostgreSQL + Vercel',
      rationale:
        'This stack is perfect for rapid prototyping and scales well. Next.js handles both frontend and backend, Tailwind makes styling fast, Prisma simplifies database work, and Vercel provides instant deployment.',
    }
  }
}

export { anthropic }
