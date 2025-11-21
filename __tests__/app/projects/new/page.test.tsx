import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import NewProjectPage from '@/app/projects/new/page'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('NewProjectPage', () => {
  const mockPush = jest.fn()
  const mockRouter = { push: mockPush }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSession as jest.Mock).mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should redirect unauthenticated users to home page', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        status: 'unauthenticated',
        data: null,
      })

      render(<NewProjectPage />)

      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('should render page for authenticated users', () => {
      render(<NewProjectPage />)

      expect(
        screen.getByRole('heading', { name: /create new project/i })
      ).toBeInTheDocument()
    })

    it('should not redirect when status is loading', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        status: 'loading',
        data: null,
      })

      render(<NewProjectPage />)

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Rendering', () => {
    it('should render all form elements', () => {
      render(<NewProjectPage />)

      expect(screen.getByLabelText(/project name \*/i)).toBeInTheDocument()
      expect(
        screen.getByLabelText(/brief description \(optional\)/i)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /create project/i })
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should render back to dashboard button', () => {
      render(<NewProjectPage />)

      expect(
        screen.getByRole('button', { name: /back to dashboard/i })
      ).toBeInTheDocument()
    })

    it('should render character counters', () => {
      render(<NewProjectPage />)

      expect(screen.getByText('0/100 characters')).toBeInTheDocument()
      expect(screen.getByText('0/500 characters')).toBeInTheDocument()
    })

    it('should render info box with next steps', () => {
      render(<NewProjectPage />)

      expect(screen.getByText(/what happens next\?/i)).toBeInTheDocument()
      expect(
        screen.getByText(/we'll ask you 5-10 smart questions/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/you'll get an opinionated tech stack/i)
      ).toBeInTheDocument()
    })

    it('should render tips section', () => {
      render(<NewProjectPage />)

      expect(screen.getByText(/💡 tips/i)).toBeInTheDocument()
      expect(screen.getByText(/be specific:/i)).toBeInTheDocument()
      expect(screen.getByText(/think user-first:/i)).toBeInTheDocument()
      expect(screen.getByText(/start simple:/i)).toBeInTheDocument()
    })
  })

  describe('Form Input', () => {
    it('should update name input value', () => {
      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      fireEvent.change(nameInput, { target: { value: 'My Project' } })

      expect(nameInput).toHaveValue('My Project')
      expect(screen.getByText('10/100 characters')).toBeInTheDocument()
    })

    it('should update description input value', () => {
      render(<NewProjectPage />)

      const descInput = screen.getByLabelText(/brief description/i)
      fireEvent.change(descInput, {
        target: { value: 'This is a project description' },
      })

      expect(descInput).toHaveValue('This is a project description')
      expect(screen.getByText('29/500 characters')).toBeInTheDocument()
    })

    it('should enforce max length on name input', () => {
      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(
        /project name \*/i
      ) as HTMLInputElement

      expect(nameInput.maxLength).toBe(100)
    })

    it('should enforce max length on description input', () => {
      render(<NewProjectPage />)

      const descInput = screen.getByLabelText(
        /brief description/i
      ) as HTMLTextAreaElement

      expect(descInput.maxLength).toBe(500)
    })
  })

  describe('Form Validation', () => {
    it('should disable submit button when name is empty', () => {
      render(<NewProjectPage />)

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })

      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when name has value', () => {
      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })

      fireEvent.change(nameInput, { target: { value: 'My Project' } })

      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit button when name is only whitespace', () => {
      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })

      fireEvent.change(nameInput, { target: { value: '   ' } })

      expect(submitButton).toBeDisabled()
    })

    it('should show error when submitting with empty name', async () => {
      render(<NewProjectPage />)

      // Try to submit empty form by removing required attribute
      const nameInput = screen.getByLabelText(/project name \*/i)
      fireEvent.change(nameInput, { target: { value: '   ' } })

      const form = nameInput.closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(
          screen.getByText(/project name is required/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call API with trimmed values on successful submission', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: { id: 'proj-123', name: 'My Project' },
        }),
      } as Response)

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      const descInput = screen.getByLabelText(/brief description/i)

      fireEvent.change(nameInput, { target: { value: '  My Project  ' } })
      fireEvent.change(descInput, {
        target: { value: '  A great app  ' },
      })

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'My Project',
            description: 'A great app',
          }),
        })
      })
    })

    it('should omit description if empty', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: { id: 'proj-123', name: 'My Project' },
        }),
      } as Response)

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      fireEvent.change(nameInput, { target: { value: 'My Project' } })

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/projects',
          expect.objectContaining({
            body: JSON.stringify({
              name: 'My Project',
              description: undefined,
            }),
          })
        )
      })
    })

    it('should show loading state during submission', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    project: { id: 'proj-123', name: 'My Project' },
                  }),
                } as Response),
              100
            )
          )
      )

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      fireEvent.change(nameInput, { target: { value: 'My Project' } })

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })
      fireEvent.click(submitButton)

      // Should show loading text
      expect(
        screen.getByRole('button', { name: /creating.../i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /creating.../i })
      ).toBeDisabled()

      // Inputs should be disabled
      expect(nameInput).toBeDisabled()

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('should redirect to project page on successful creation', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: { id: 'proj-123', name: 'My Project' },
        }),
      } as Response)

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      fireEvent.change(nameInput, { target: { value: 'My Project' } })

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/projects/proj-123')
      })
    })

    it('should display API error message', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Project name already exists' }),
      } as Response)

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      fireEvent.change(nameInput, { target: { value: 'Existing Project' } })

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/project name already exists/i)
        ).toBeInTheDocument()
      })
    })

    it('should display generic error message when API returns no error', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response)

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      fireEvent.change(nameInput, { target: { value: 'My Project' } })

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/failed to create project/i)
        ).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      fireEvent.change(nameInput, { target: { value: 'My Project' } })

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    it('should clear error on new submission', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'First error' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            project: { id: 'proj-123', name: 'My Project' },
          }),
        } as Response)

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      fireEvent.change(nameInput, { target: { value: 'My Project' } })

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })

      // First submission - error
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/first error/i)).toBeInTheDocument()
      })

      // Second submission - success
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText(/first error/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate to dashboard when clicking back button', () => {
      render(<NewProjectPage />)

      const backButton = screen.getByRole('button', {
        name: /back to dashboard/i,
      })
      fireEvent.click(backButton)

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('should navigate to dashboard when clicking cancel button', () => {
      render(<NewProjectPage />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('should disable cancel button during loading', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    project: { id: 'proj-123', name: 'My Project' },
                  }),
                } as Response),
              100
            )
          )
      )

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/project name \*/i)
      fireEvent.change(nameInput, { target: { value: 'My Project' } })

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      })
      fireEvent.click(submitButton)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeDisabled()

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })
})
