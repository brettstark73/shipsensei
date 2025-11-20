/**
 * Project Detail Page Component Tests
 *
 * Tests for src/app/projects/[id]/page.tsx (ProjectDetailPage component)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ProjectDetailPage from '@/app/projects/[id]/page'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockUseSession = useSession as jest.Mock
const mockUseRouter = useRouter as jest.Mock

describe('ProjectDetailPage', () => {
  let mockRouter: { push: jest.Mock }
  let mockScrollIntoView: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter = {
      push: jest.fn(),
    }
    mockUseRouter.mockReturnValue(mockRouter)

    // Mock scrollIntoView
    mockScrollIntoView = jest.fn()
    Element.prototype.scrollIntoView = mockScrollIntoView

    // Mock global.alert
    global.alert = jest.fn()

    // Mock global.prompt
    global.prompt = jest.fn()

    // Mock global.fetch
    global.fetch = jest.fn()

    // Mock setTimeout
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const mockProjectBase = {
    id: 'project123',
    name: 'Test Project',
    description: 'Test description',
    status: 'draft',
    techStack: null,
    repository: null,
    deployment: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    requirements: [],
  }

  const createMockParams = (id: string) => Promise.resolve({ id })

  describe('Authentication', () => {
    it('should redirect to home when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/')
      })
    })

    it('should not redirect when authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectBase }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalledWith('/')
      })
    })

    it('should show loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      expect(screen.getByText('Loading project...')).toBeInTheDocument()
    })
  })

  describe('Project Loading', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should fetch project on mount', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectBase }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/projects/project123')
      })
    })

    it('should display project name and description', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectBase }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
        expect(screen.getByText('Test description')).toBeInTheDocument()
      })
    })

    it('should display project status badge', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectBase }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('draft')).toBeInTheDocument()
      })
    })

    it('should show loading spinner while fetching', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ project: mockProjectBase }),
                }),
              100
            )
          )
      )

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      expect(screen.getByText('Loading project...')).toBeInTheDocument()

      jest.advanceTimersByTime(100)

      await waitFor(() => {
        expect(screen.queryByText('Loading project...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should show 404 error when project not found', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Project not found')).toBeInTheDocument()
      })
    })

    it('should show generic error for other API failures', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch project')).toBeInTheDocument()
      })
    })

    it('should show back to dashboard button on error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const backButton = screen.getByText('Back to Dashboard')
        expect(backButton).toBeInTheDocument()
        fireEvent.click(backButton)
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should allow dismissing error banner', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectBase }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      // Trigger an error by failing chat start
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const startButton = screen.getByText('Start Requirements Chat')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to start chat')).toBeInTheDocument()
      })

      const dismissButton = screen.getByText('Dismiss')
      fireEvent.click(dismissButton)

      await waitFor(() => {
        expect(
          screen.queryByText('Failed to start chat')
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('Welcome Screen', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should show welcome screen when chat not started', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectBase }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(
          screen.getByText("Let's Discover Your Requirements")
        ).toBeInTheDocument()
        expect(screen.getByText('Start Requirements Chat')).toBeInTheDocument()
      })
    })

    it('should have emoji on welcome screen', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectBase }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('💬')).toBeInTheDocument()
      })
    })

    it('should display welcome message', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectBase }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(
          screen.getByText(/I'll ask you 5-10 smart questions/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Starting Chat', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should start chat when button clicked', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: mockProjectBase }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            requirements: [
              {
                id: 'req1',
                question: 'What is your project about?',
                answer: null,
                order: 0,
              },
            ],
          }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Start Requirements Chat')).toBeInTheDocument()
      })

      const startButton = screen.getByText('Start Requirements Chat')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project123/chat',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start' }),
          }
        )
      })
    })

    it('should show "Starting..." while starting chat', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: mockProjectBase }),
        })
        .mockImplementation(
          () =>
            new Promise(resolve =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({
                      requirements: [
                        {
                          id: 'req1',
                          question: 'What is your project about?',
                          answer: null,
                          order: 0,
                        },
                      ],
                    }),
                  }),
                100
              )
            )
        )

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Start Requirements Chat')).toBeInTheDocument()
      })

      const startButton = screen.getByText('Start Requirements Chat')
      fireEvent.click(startButton)

      expect(screen.getByText('Starting...')).toBeInTheDocument()

      jest.advanceTimersByTime(100)

      await waitFor(() => {
        expect(screen.queryByText('Starting...')).not.toBeInTheDocument()
      })
    })

    it('should display first question after starting chat', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: mockProjectBase }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            requirements: [
              {
                id: 'req1',
                question: 'What is your project about?',
                answer: null,
                order: 0,
              },
            ],
          }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Start Requirements Chat')).toBeInTheDocument()
      })

      const startButton = screen.getByText('Start Requirements Chat')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(
          screen.getByText('What is your project about?')
        ).toBeInTheDocument()
      })
    })

    it('should handle error when starting chat fails', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: mockProjectBase }),
        })
        .mockResolvedValueOnce({
          ok: false,
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Start Requirements Chat')).toBeInTheDocument()
      })

      const startButton = screen.getByText('Start Requirements Chat')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to start chat')).toBeInTheDocument()
      })
    })
  })

  describe('Requirements Chat Interface', () => {
    const mockProjectWithRequirements = {
      ...mockProjectBase,
      requirements: [
        {
          id: 'req1',
          question: 'What is your project about?',
          answer: null,
          order: 0,
        },
      ],
    }

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should not show welcome screen when requirements exist', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectWithRequirements }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(
          screen.queryByText('Start Requirements Chat')
        ).not.toBeInTheDocument()
      })
    })

    it('should display progress bar', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectWithRequirements }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Progress')).toBeInTheDocument()
        expect(screen.getByText('0 / 1 answered')).toBeInTheDocument()
      })
    })

    it('should display question with AI badge', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectWithRequirements }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(
          screen.getByText('What is your project about?')
        ).toBeInTheDocument()
        expect(screen.getByText('AI')).toBeInTheDocument()
      })
    })

    it('should show answer textarea for current question', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectWithRequirements }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(
            /Type your answer... \(Press Enter to send/i
          )
        ).toBeInTheDocument()
      })
    })

    it('should display character counter', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectWithRequirements }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('0 / 5000 characters')).toBeInTheDocument()
      })
    })

    it('should update character counter when typing', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectWithRequirements }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        )
        fireEvent.change(textarea, { target: { value: 'Test answer' } })
      })

      expect(screen.getByText('11 / 5000 characters')).toBeInTheDocument()
    })

    it('should display Send button', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectWithRequirements }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Send')).toBeInTheDocument()
      })
    })

    it('should disable Send button when answer is empty', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectWithRequirements }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const sendButton = screen.getByText('Send')
        expect(sendButton).toBeDisabled()
      })
    })

    it('should enable Send button when answer is not empty', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectWithRequirements }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        )
        fireEvent.change(textarea, { target: { value: 'Test answer' } })

        const sendButton = screen.getByText('Send')
        expect(sendButton).not.toBeDisabled()
      })
    })
  })

  describe('Answering Questions', () => {
    const mockProjectWithRequirements = {
      ...mockProjectBase,
      requirements: [
        {
          id: 'req1',
          question: 'What is your project about?',
          answer: null,
          order: 0,
        },
      ],
    }

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should submit answer when Send button clicked', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: mockProjectWithRequirements }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            requirements: [
              {
                id: 'req1',
                question: 'What is your project about?',
                answer: 'A recipe sharing app',
                order: 0,
              },
            ],
            completed: true,
          }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        )
        fireEvent.change(textarea, {
          target: { value: 'A recipe sharing app' },
        })
      })

      const sendButton = screen.getByText('Send')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project123/chat',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'answer',
              requirementId: 'req1',
              answer: 'A recipe sharing app',
            }),
          }
        )
      })
    })

    it('should submit answer when Enter key is pressed', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: mockProjectWithRequirements }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            requirements: [
              {
                id: 'req1',
                question: 'What is your project about?',
                answer: 'A recipe sharing app',
                order: 0,
              },
            ],
            completed: true,
          }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        )
        fireEvent.change(textarea, {
          target: { value: 'A recipe sharing app' },
        })
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project123/chat',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'answer',
              requirementId: 'req1',
              answer: 'A recipe sharing app',
            }),
          }
        )
      })
    })

    it('should not submit when Shift+Enter is pressed', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectWithRequirements }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        )
        fireEvent.change(textarea, {
          target: { value: 'A recipe sharing app' },
        })
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
      })

      // Should only have been called once for initial project fetch
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should show "Sending..." while submitting answer', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: mockProjectWithRequirements }),
        })
        .mockImplementation(
          () =>
            new Promise(resolve =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({
                      requirements: [
                        {
                          id: 'req1',
                          question: 'What is your project about?',
                          answer: 'A recipe sharing app',
                          order: 0,
                        },
                      ],
                      completed: true,
                    }),
                  }),
                100
              )
            )
        )

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        )
        fireEvent.change(textarea, {
          target: { value: 'A recipe sharing app' },
        })
      })

      const sendButton = screen.getByText('Send')
      fireEvent.click(sendButton)

      expect(screen.getByText('Sending...')).toBeInTheDocument()

      jest.advanceTimersByTime(100)

      await waitFor(() => {
        expect(screen.queryByText('Sending...')).not.toBeInTheDocument()
      })
    })

    it('should clear textarea after successful submission', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: mockProjectWithRequirements }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            requirements: [
              {
                id: 'req1',
                question: 'What is your project about?',
                answer: 'A recipe sharing app',
                order: 0,
              },
            ],
            completed: true,
          }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        ) as HTMLTextAreaElement
        fireEvent.change(textarea, {
          target: { value: 'A recipe sharing app' },
        })

        expect(textarea.value).toBe('A recipe sharing app')

        const sendButton = screen.getByText('Send')
        fireEvent.click(sendButton)
      })

      await waitFor(() => {
        const textarea = screen.queryByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        ) as HTMLTextAreaElement | null
        // Textarea might not exist anymore if all questions are answered
        if (textarea) {
          expect(textarea.value).toBe('')
        }
      })
    })

    it('should display answered question with user badge', async () => {
      const answeredProject = {
        ...mockProjectBase,
        requirements: [
          {
            id: 'req1',
            question: 'What is your project about?',
            answer: 'A recipe sharing app',
            order: 0,
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: answeredProject }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('A recipe sharing app')).toBeInTheDocument()
        expect(screen.getByText('U')).toBeInTheDocument()
      })
    })

    it('should handle error when answer submission fails', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: mockProjectWithRequirements }),
        })
        .mockResolvedValueOnce({
          ok: false,
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        )
        fireEvent.change(textarea, {
          target: { value: 'A recipe sharing app' },
        })
      })

      const sendButton = screen.getByText('Send')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to submit answer')).toBeInTheDocument()
      })
    })

    it('should trim whitespace from answers', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: mockProjectWithRequirements }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            requirements: [
              {
                id: 'req1',
                question: 'What is your project about?',
                answer: 'A recipe sharing app',
                order: 0,
              },
            ],
            completed: true,
          }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        )
        fireEvent.change(textarea, {
          target: { value: '   A recipe sharing app   ' },
        })
      })

      const sendButton = screen.getByText('Send')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project123/chat',
          expect.objectContaining({
            body: JSON.stringify({
              action: 'answer',
              requirementId: 'req1',
              answer: 'A recipe sharing app',
            }),
          })
        )
      })
    })
  })

  describe('Progress Tracking', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should show 0% progress when no answers', async () => {
      const projectWithNoAnswers = {
        ...mockProjectBase,
        requirements: [
          { id: 'req1', question: 'Q1', answer: null, order: 0 },
          { id: 'req2', question: 'Q2', answer: null, order: 1 },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: projectWithNoAnswers }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('0 / 2 answered')).toBeInTheDocument()
      })
    })

    it('should show 50% progress when half answered', async () => {
      const projectHalfAnswered = {
        ...mockProjectBase,
        requirements: [
          { id: 'req1', question: 'Q1', answer: 'A1', order: 0 },
          { id: 'req2', question: 'Q2', answer: null, order: 1 },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: projectHalfAnswered }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('1 / 2 answered')).toBeInTheDocument()
      })
    })

    it('should show 100% progress when all answered', async () => {
      const projectAllAnswered = {
        ...mockProjectBase,
        requirements: [
          { id: 'req1', question: 'Q1', answer: 'A1', order: 0 },
          { id: 'req2', question: 'Q2', answer: 'A2', order: 1 },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: projectAllAnswered }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('2 / 2 answered')).toBeInTheDocument()
      })
    })

    it('should auto-scroll to bottom when new questions appear', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            project: {
              ...mockProjectBase,
              requirements: [
                { id: 'req1', question: 'Q1', answer: null, order: 0 },
              ],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            requirements: [
              { id: 'req1', question: 'Q1', answer: 'A1', order: 0 },
              { id: 'req2', question: 'Q2', answer: null, order: 1 },
            ],
          }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        )
        fireEvent.change(textarea, { target: { value: 'A1' } })
        const sendButton = screen.getByText('Send')
        fireEvent.click(sendButton)
      })

      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalled()
      })
    })
  })

  describe('Completion and Tech Stack', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should show completion message when all questions answered', async () => {
      const completedProject = {
        ...mockProjectBase,
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: completedProject }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Requirements Complete!')).toBeInTheDocument()
        expect(screen.getByText('🎉')).toBeInTheDocument()
      })
    })

    it('should show tech stack recommendation button when completed', async () => {
      const completedProject = {
        ...mockProjectBase,
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: completedProject }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(
          screen.getByText('Get Tech Stack Recommendation')
        ).toBeInTheDocument()
      })
    })

    it('should generate tech stack recommendation when button clicked', async () => {
      const completedProject = {
        ...mockProjectBase,
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: completedProject }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            recommendation: {
              stack: 'Next.js + Tailwind CSS + Prisma',
              rationale: 'Great for your use case',
            },
            project: {
              ...completedProject,
              techStack: JSON.stringify({
                stack: 'Next.js + Tailwind CSS + Prisma',
                rationale: 'Great for your use case',
              }),
            },
          }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Get Tech Stack Recommendation')
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project123/recommend-stack',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }
        )
      })
    })

    it('should display tech stack recommendation', async () => {
      const projectWithStack = {
        ...mockProjectBase,
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
        techStack: JSON.stringify({
          stack: 'Next.js + Tailwind CSS + Prisma',
          rationale: 'Great for your use case',
        }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: projectWithStack }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Recommended Tech Stack')).toBeInTheDocument()
        expect(
          screen.getByText('Next.js + Tailwind CSS + Prisma')
        ).toBeInTheDocument()
        expect(screen.getByText('Great for your use case')).toBeInTheDocument()
        expect(screen.getByText('🛠️')).toBeInTheDocument()
      })
    })

    it('should show "Generating..." while generating stack', async () => {
      const completedProject = {
        ...mockProjectBase,
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: completedProject }),
        })
        .mockImplementation(
          () =>
            new Promise(resolve =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({
                      recommendation: {
                        stack: 'Next.js + Tailwind CSS + Prisma',
                        rationale: 'Great for your use case',
                      },
                      project: completedProject,
                    }),
                  }),
                100
              )
            )
        )

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Get Tech Stack Recommendation')
        fireEvent.click(button)
      })

      expect(screen.getByText('Generating...')).toBeInTheDocument()

      jest.advanceTimersByTime(100)

      await waitFor(() => {
        expect(screen.queryByText('Generating...')).not.toBeInTheDocument()
      })
    })

    it('should handle error when generating stack fails', async () => {
      const completedProject = {
        ...mockProjectBase,
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: completedProject }),
        })
        .mockResolvedValueOnce({
          ok: false,
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Get Tech Stack Recommendation')
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(
          screen.getByText('Failed to generate recommendation')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Project Generation', () => {
    const projectWithStack = {
      ...mockProjectBase,
      requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
      techStack: JSON.stringify({
        stack: 'Next.js + Tailwind CSS + Prisma',
        rationale: 'Great for your use case',
      }),
    }

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should show generate project button when stack exists', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: projectWithStack }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(
          screen.getByText('Generate Project on GitHub')
        ).toBeInTheDocument()
      })
    })

    it('should generate project when button clicked', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: projectWithStack }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            project: {
              ...projectWithStack,
              repository: 'https://github.com/user/test-project',
            },
            repository: {
              url: 'https://github.com/user/test-project',
            },
          }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Generate Project on GitHub')
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project123/generate',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }
        )
      })
    })

    it('should show alert on successful generation', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: projectWithStack }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            project: {
              ...projectWithStack,
              repository: 'https://github.com/user/test-project',
            },
            repository: {
              url: 'https://github.com/user/test-project',
            },
          }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Generate Project on GitHub')
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('https://github.com/user/test-project')
        )
      })
    })

    it('should show GitHub link after generation', async () => {
      const generatedProject = {
        ...projectWithStack,
        repository: 'https://github.com/user/test-project',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('View on GitHub →')).toBeInTheDocument()
      })
    })

    it('should show "Generating..." while generating project', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: projectWithStack }),
        })
        .mockImplementation(
          () =>
            new Promise(resolve =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({
                      project: {
                        ...projectWithStack,
                        repository: 'https://github.com/user/test-project',
                      },
                      repository: {
                        url: 'https://github.com/user/test-project',
                      },
                    }),
                  }),
                100
              )
            )
        )

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Generate Project on GitHub')
        fireEvent.click(button)
      })

      expect(
        screen.getByText('Generating... (This may take 1-2 min)')
      ).toBeInTheDocument()

      jest.advanceTimersByTime(100)

      await waitFor(() => {
        expect(
          screen.queryByText('Generating... (This may take 1-2 min)')
        ).not.toBeInTheDocument()
      })
    })

    it('should handle error when generation fails', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: projectWithStack }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'GitHub API error' }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Generate Project on GitHub')
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(screen.getByText('GitHub API error')).toBeInTheDocument()
      })
    })
  })

  describe('Deployment', () => {
    const generatedProject = {
      ...mockProjectBase,
      requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
      techStack: JSON.stringify({
        stack: 'Next.js + Tailwind CSS + Prisma',
        rationale: 'Great for your use case',
      }),
      repository: 'https://github.com/user/test-project',
    }

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should show deploy button when repository exists', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Deploy to Vercel')).toBeInTheDocument()
      })
    })

    it('should prompt for Vercel token when deploy clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })
      ;(global.prompt as jest.Mock).mockReturnValue('vercel-token-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deployment: {
            url: 'https://test-project.vercel.app',
            status: 'READY',
          },
        }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Deploy to Vercel')
        fireEvent.click(button)
      })

      expect(global.prompt).toHaveBeenCalledWith(
        expect.stringContaining('Enter your Vercel API Token')
      )
    })

    it('should deploy project with provided token', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })
      ;(global.prompt as jest.Mock).mockReturnValue('vercel-token-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deployment: {
            url: 'https://test-project.vercel.app',
            status: 'READY',
          },
        }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Deploy to Vercel')
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project123/deploy',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vercelToken: 'vercel-token-123' }),
          }
        )
      })
    })

    it('should not deploy if token prompt cancelled', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })
      ;(global.prompt as jest.Mock).mockReturnValue(null)

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Deploy to Vercel')
        fireEvent.click(button)
      })

      // Should only have been called once for initial project fetch
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should show alert on successful deployment', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })
      ;(global.prompt as jest.Mock).mockReturnValue('vercel-token-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deployment: {
            url: 'https://test-project.vercel.app',
            status: 'READY',
          },
        }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Deploy to Vercel')
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('https://test-project.vercel.app')
        )
      })
    })

    it('should show live site link after deployment', async () => {
      const deployedProject = {
        ...generatedProject,
        deployment: 'https://test-project.vercel.app',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: deployedProject }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('View Live Site →')).toBeInTheDocument()
      })
    })

    it('should show "Deploying..." while deploying', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })
      ;(global.prompt as jest.Mock).mockReturnValue('vercel-token-123')
      ;(global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    deployment: {
                      url: 'https://test-project.vercel.app',
                      status: 'READY',
                    },
                  }),
                }),
              100
            )
          )
      )

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Deploy to Vercel')
        fireEvent.click(button)
      })

      expect(screen.getByText('Deploying to Vercel...')).toBeInTheDocument()

      jest.advanceTimersByTime(100)

      await waitFor(() => {
        expect(
          screen.queryByText('Deploying to Vercel...')
        ).not.toBeInTheDocument()
      })
    })

    it('should handle error when deployment fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })
      ;(global.prompt as jest.Mock).mockReturnValue('vercel-token-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid Vercel token' }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Deploy to Vercel')
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(screen.getByText('Invalid Vercel token')).toBeInTheDocument()
      })
    })

    it('should trim whitespace from Vercel token', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })
      ;(global.prompt as jest.Mock).mockReturnValue('  vercel-token-123  ')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deployment: {
            url: 'https://test-project.vercel.app',
            status: 'READY',
          },
        }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Deploy to Vercel')
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project123/deploy',
          expect.objectContaining({
            body: JSON.stringify({ vercelToken: 'vercel-token-123' }),
          })
        )
      })
    })

    it('should refresh project after deployment', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })
      ;(global.prompt as jest.Mock).mockReturnValue('vercel-token-123')
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            deployment: {
              url: 'https://test-project.vercel.app',
              status: 'READY',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            project: {
              ...generatedProject,
              deployment: 'https://test-project.vercel.app',
            },
          }),
        })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Deploy to Vercel')
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      // Fast-forward the 3-second timeout
      jest.advanceTimersByTime(3000)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3)
        expect(global.fetch).toHaveBeenCalledWith('/api/projects/project123')
      })
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should navigate to dashboard when back button clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjectBase }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const backButtons = screen.getAllByText('Back to Dashboard')
        fireEvent.click(backButtons[0])
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should navigate to dashboard from tech stack section', async () => {
      const projectWithStack = {
        ...mockProjectBase,
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
        techStack: JSON.stringify({
          stack: 'Next.js + Tailwind CSS + Prisma',
          rationale: 'Great for your use case',
        }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: projectWithStack }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const dashboardButtons = screen.getAllByText('Back to Dashboard')
        // The last one should be in the tech stack section
        const button = dashboardButtons[dashboardButtons.length - 1]
        fireEvent.click(button)
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should open GitHub link in new tab', async () => {
      const generatedProject = {
        ...mockProjectBase,
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
        techStack: JSON.stringify({
          stack: 'Next.js + Tailwind CSS + Prisma',
          rationale: 'Great for your use case',
        }),
        repository: 'https://github.com/user/test-project',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const githubLink = screen.getByText('View on GitHub →')
        expect(githubLink).toHaveAttribute('target', '_blank')
        expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })

    it('should open live site link in new tab', async () => {
      const deployedProject = {
        ...mockProjectBase,
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
        techStack: JSON.stringify({
          stack: 'Next.js + Tailwind CSS + Prisma',
          rationale: 'Great for your use case',
        }),
        repository: 'https://github.com/user/test-project',
        deployment: 'https://test-project.vercel.app',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: deployedProject }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const liveSiteLink = screen.getByText('View Live Site →')
        expect(liveSiteLink).toHaveAttribute('target', '_blank')
        expect(liveSiteLink).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })
  })

  describe('Status Badges', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should display draft status with correct styling', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: { ...mockProjectBase, status: 'draft' },
        }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const badge = screen.getByText('draft')
        expect(badge).toHaveClass('bg-gray-100', 'text-gray-800')
      })
    })

    it('should display generating status with correct styling', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: { ...mockProjectBase, status: 'generating' },
        }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const badge = screen.getByText('generating')
        expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
      })
    })

    it('should display ready status with correct styling', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: { ...mockProjectBase, status: 'ready' },
        }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const badge = screen.getByText('ready')
        expect(badge).toHaveClass('bg-green-100', 'text-green-800')
      })
    })

    it('should display deployed status with correct styling', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: { ...mockProjectBase, status: 'deployed' },
        }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const badge = screen.getByText('deployed')
        expect(badge).toHaveClass('bg-purple-100', 'text-purple-800')
      })
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
    })

    it('should handle project without description', async () => {
      const projectNoDescription = {
        ...mockProjectBase,
        description: null,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: projectNoDescription }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
        expect(screen.queryByText('Test description')).not.toBeInTheDocument()
      })
    })

    it('should handle invalid JSON in tech stack', async () => {
      const projectInvalidStack = {
        ...mockProjectBase,
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
        techStack: 'invalid json',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: projectInvalidStack }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        // Should show completion message but no recommendation
        expect(screen.getByText('Requirements Complete!')).toBeInTheDocument()
        expect(
          screen.queryByText('Recommended Tech Stack')
        ).not.toBeInTheDocument()
      })
    })

    it('should handle empty Vercel token input', async () => {
      const generatedProject = {
        ...mockProjectBase,
        requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
        techStack: JSON.stringify({
          stack: 'Next.js + Tailwind CSS + Prisma',
          rationale: 'Great for your use case',
        }),
        repository: 'https://github.com/user/test-project',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: generatedProject }),
      })
      ;(global.prompt as jest.Mock).mockReturnValue('   ')

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const button = screen.getByText('Deploy to Vercel')
        fireEvent.click(button)
      })

      // Should only have been called once for initial project fetch
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should not submit empty answer (whitespace only)', async () => {
      const projectWithRequirements = {
        ...mockProjectBase,
        requirements: [
          {
            id: 'req1',
            question: 'What is your project about?',
            answer: null,
            order: 0,
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: projectWithRequirements }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /Type your answer... \(Press Enter to send/i
        )
        fireEvent.change(textarea, { target: { value: '   ' } })

        const sendButton = screen.getByText('Send')
        expect(sendButton).toBeDisabled()
      })
    })

    it('should handle multiple requirements with mixed answered states', async () => {
      const projectMixedAnswers = {
        ...mockProjectBase,
        requirements: [
          { id: 'req1', question: 'Q1', answer: 'A1', order: 0 },
          { id: 'req2', question: 'Q2', answer: null, order: 1 },
          { id: 'req3', question: 'Q3', answer: null, order: 2 },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: projectMixedAnswers }),
      })

      render(<ProjectDetailPage params={createMockParams('project123')} />)

      await waitFor(() => {
        expect(screen.getByText('1 / 3 answered')).toBeInTheDocument()
        expect(screen.getByText('Q1')).toBeInTheDocument()
        expect(screen.getByText('A1')).toBeInTheDocument()
        expect(screen.getByText('Q2')).toBeInTheDocument()
        expect(screen.getByText('Q3')).toBeInTheDocument()
      })
    })

    it('should handle when project data is null', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: null }),
      })

      const { container } = render(
        <ProjectDetailPage params={createMockParams('project123')} />
      )

      // Should show loading initially
      expect(screen.getByText('Loading project...')).toBeInTheDocument()

      // After loading completes with null project, component returns null
      await waitFor(() => {
        expect(screen.queryByText('Loading project...')).not.toBeInTheDocument()
      })
    })
  })
})
