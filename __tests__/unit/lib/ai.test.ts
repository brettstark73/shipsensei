import {
  generateRequirementsQuestions,
  generateFollowUpQuestion,
  generateTechStackRecommendation,
} from '@/lib/ai'
import Anthropic from '@anthropic-ai/sdk'

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk')

const mockAnthropicCreate = jest.fn()

beforeEach(() => {
  ;(Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
    () =>
      ({
        messages: {
          create: mockAnthropicCreate,
        },
      }) as unknown as Anthropic
  )
})

describe('AI Service', () => {
  describe('generateRequirementsQuestions', () => {
    it('should generate questions from valid Claude response', async () => {
      const mockQuestions = [
        'Who is your target user?',
        'What problem are you solving?',
        'What are the core features?',
      ]

      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockQuestions),
          },
        ],
      })

      const result = await generateRequirementsQuestions(
        'TestApp',
        'A test application'
      )

      expect(result).toEqual(mockQuestions)
      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('TestApp'),
            }),
          ]),
        })
      )
    })

    it('should generate questions without project description', async () => {
      const mockQuestions = ['Question 1', 'Question 2']

      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockQuestions),
          },
        ],
      })

      const result = await generateRequirementsQuestions('TestApp')

      expect(result).toEqual(mockQuestions)
    })

    it('should return fallback questions when JSON parsing fails', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Invalid JSON response',
          },
        ],
      })

      const result = await generateRequirementsQuestions('TestApp')

      // Should return fallback questions
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toContain('target user')
    })

    it('should return fallback questions when response is not an array', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ invalid: 'format' }),
          },
        ],
      })

      const result = await generateRequirementsQuestions('TestApp')

      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should throw error when response type is not text', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'image',
            data: 'invalid',
          },
        ],
      })

      await expect(
        generateRequirementsQuestions('TestApp')
      ).rejects.toThrow('Unexpected response type from Claude')
    })
  })

  describe('generateFollowUpQuestion', () => {
    it('should generate a follow-up question', async () => {
      const conversationHistory = [
        {
          question: 'Who is your target user?',
          answer: 'Small business owners',
        },
      ]

      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'What specific challenges do small business owners face?',
          },
        ],
      })

      const result = await generateFollowUpQuestion(
        'TestApp',
        conversationHistory
      )

      expect(result).toBe(
        'What specific challenges do small business owners face?'
      )
      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
        })
      )
    })

    it('should return null when Claude responds with COMPLETE', async () => {
      const conversationHistory = [
        {
          question: 'Who is your target user?',
          answer: 'Small business owners',
        },
      ]

      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'COMPLETE',
          },
        ],
      })

      const result = await generateFollowUpQuestion(
        'TestApp',
        conversationHistory
      )

      expect(result).toBeNull()
    })

    it('should return null when conversation history reaches 10 items', async () => {
      const conversationHistory = Array.from({ length: 10 }, (_, i) => ({
        question: `Question ${i + 1}`,
        answer: `Answer ${i + 1}`,
      }))

      const result = await generateFollowUpQuestion(
        'TestApp',
        conversationHistory
      )

      expect(result).toBeNull()
      expect(mockAnthropicCreate).not.toHaveBeenCalled()
    })

    it('should return null when response type is not text', async () => {
      const conversationHistory = [
        {
          question: 'Who is your target user?',
          answer: 'Small business owners',
        },
      ]

      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'image',
            data: 'invalid',
          },
        ],
      })

      const result = await generateFollowUpQuestion(
        'TestApp',
        conversationHistory
      )

      expect(result).toBeNull()
    })
  })

  describe('generateTechStackRecommendation', () => {
    it('should generate tech stack recommendation from valid response', async () => {
      const mockRecommendation = {
        stack: 'Next.js 14 + Tailwind CSS + Prisma',
        rationale: 'This stack is perfect for rapid development.',
      }

      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockRecommendation),
          },
        ],
      })

      const requirements = [
        {
          question: 'Who is your target user?',
          answer: 'Small business owners',
        },
      ]

      const result = await generateTechStackRecommendation(
        'TestApp',
        requirements
      )

      expect(result).toEqual(mockRecommendation)
      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
        })
      )
    })

    it('should return fallback recommendation when JSON parsing fails', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Invalid JSON',
          },
        ],
      })

      const requirements = [
        {
          question: 'What are you building?',
          answer: 'A web app',
        },
      ]

      const result = await generateTechStackRecommendation(
        'TestApp',
        requirements
      )

      expect(result).toHaveProperty('stack')
      expect(result).toHaveProperty('rationale')
      expect(result.stack).toContain('Next.js')
    })

    it('should throw error when response type is not text', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'image',
            data: 'invalid',
          },
        ],
      })

      const requirements = [
        {
          question: 'What are you building?',
          answer: 'A web app',
        },
      ]

      await expect(
        generateTechStackRecommendation('TestApp', requirements)
      ).rejects.toThrow('Unexpected response type from Claude')
    })
  })
})
