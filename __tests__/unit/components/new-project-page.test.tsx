/**
 * New Project Page Component Tests
 *
 * Tests for src/app/projects/new/page.tsx
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import NewProjectPage from '@/app/projects/new/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

const mockUseRouter = useRouter as jest.Mock
const mockUseSession = useSession as jest.Mock

// Mock fetch
global.fetch = jest.fn()

describe('New Project Page', () => {
  let mockRouter: { push: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter = {
      push: jest.fn(),
    }
    mockUseRouter.mockReturnValue(mockRouter)
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Authentication', () => {
    it('should redirect to home when unauthenticated', () => {
      mockUseSession.mockReturnValue({
        status: 'unauthenticated',
      })

      render(<NewProjectPage />)

      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })

    it('should render page when authenticated', () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123' } },
      })

      render(<NewProjectPage />)

      expect(screen.getByText('Create New Project')).toBeInTheDocument()
    })

    it('should render page when loading', () => {
      mockUseSession.mockReturnValue({
        status: 'loading',
      })

      render(<NewProjectPage />)

      expect(screen.getByText('Create New Project')).toBeInTheDocument()
    })
  })

  describe('Page Content', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123' } },
      })
    })

    it('should render page title', () => {
      render(<NewProjectPage />)

      expect(screen.getByText('Create New Project')).toBeInTheDocument()
      expect(
        screen.getByText(/Tell us about your project idea/i)
      ).toBeInTheDocument()
    })

    it('should render back to dashboard button', () => {
      render(<NewProjectPage />)

      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
    })

    it('should render project name input', () => {
      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      expect(nameInput).toBeInTheDocument()
      expect(nameInput).toHaveAttribute('type', 'text')
      expect(nameInput).toHaveAttribute('maxLength', '100')
      expect(nameInput).toHaveAttribute(
        'placeholder',
        'e.g., Recipe Sharing App'
      )
    })

    it('should render description textarea', () => {
      render(<NewProjectPage />)

      const descriptionInput = screen.getByLabelText(/Brief Description/i)
      expect(descriptionInput).toBeInTheDocument()
      expect(descriptionInput.tagName).toBe('TEXTAREA')
      expect(descriptionInput).toHaveAttribute('maxLength', '500')
    })

    it('should render character counters', () => {
      render(<NewProjectPage />)

      expect(screen.getByText('0/100 characters')).toBeInTheDocument()
      expect(screen.getByText('0/500 characters')).toBeInTheDocument()
    })

    it('should render what happens next section', () => {
      render(<NewProjectPage />)

      expect(screen.getByText('What happens next?')).toBeInTheDocument()
      expect(
        screen.getByText(/We'll ask you 5-10 smart questions/i)
      ).toBeInTheDocument()
    })

    it('should render tips section', () => {
      render(<NewProjectPage />)

      expect(screen.getByText(/💡 Tips/i)).toBeInTheDocument()
      expect(screen.getByText(/Be specific:/i)).toBeInTheDocument()
    })

    it('should render cancel button', () => {
      render(<NewProjectPage />)

      expect(
        screen.getByRole('button', { name: /Cancel/i })
      ).toBeInTheDocument()
    })

    it('should render create button', () => {
      render(<NewProjectPage />)

      expect(
        screen.getByRole('button', { name: /Create Project/i })
      ).toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123' } },
      })
    })

    it('should update name input when typing', () => {
      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(
        /Project Name/i
      ) as HTMLInputElement
      fireEvent.change(nameInput, { target: { value: 'My Project' } })

      expect(nameInput.value).toBe('My Project')
    })

    it('should update description input when typing', () => {
      render(<NewProjectPage />)

      const descInput = screen.getByLabelText(
        /Brief Description/i
      ) as HTMLTextAreaElement
      fireEvent.change(descInput, { target: { value: 'Test description' } })

      expect(descInput.value).toBe('Test description')
    })

    it('should update character counter for name', () => {
      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'Test' } })

      expect(screen.getByText('4/100 characters')).toBeInTheDocument()
    })

    it('should update character counter for description', () => {
      render(<NewProjectPage />)

      const descInput = screen.getByLabelText(/Brief Description/i)
      fireEvent.change(descInput, { target: { value: 'Hello World' } })

      expect(screen.getByText('11/500 characters')).toBeInTheDocument()
    })

    it('should disable submit button when name is empty', () => {
      render(<NewProjectPage />)

      const submitButton = screen.getByRole('button', {
        name: /Create Project/i,
      })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when name has value', () => {
      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'My Project' } })

      const submitButton = screen.getByRole('button', {
        name: /Create Project/i,
      })
      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit button when name has only whitespace', () => {
      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: '   ' } })

      const submitButton = screen.getByRole('button', {
        name: /Create Project/i,
      })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123' } },
      })
    })

    it('should navigate to dashboard when clicking back button', () => {
      render(<NewProjectPage />)

      const backButton = screen.getByText('Back to Dashboard')
      fireEvent.click(backButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })

    it('should navigate to dashboard when clicking cancel button', () => {
      render(<NewProjectPage />)

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('Form Submission', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123' } },
      })
    })

    it('should show error when submitting without name', async () => {
      render(<NewProjectPage />)

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('Project name is required')).toBeInTheDocument()
      })
    })

    it('should call API with correct data on successful submission', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { id: 'project123' } }),
      })

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      const descInput = screen.getByLabelText(/Brief Description/i)

      fireEvent.change(nameInput, { target: { value: 'Test Project' } })
      fireEvent.change(descInput, { target: { value: 'Test description' } })

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Test Project',
            description: 'Test description',
          }),
        })
      })
    })

    it('should navigate to project page on successful creation', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { id: 'project456' } }),
      })

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'New Project' } })

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/projects/project456')
      })
    })

    it('should trim whitespace from inputs', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { id: 'project123' } }),
      })

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      const descInput = screen.getByLabelText(/Brief Description/i)

      fireEvent.change(nameInput, { target: { value: '  Trimmed Name  ' } })
      fireEvent.change(descInput, { target: { value: '  Trimmed Desc  ' } })

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects',
          expect.objectContaining({
            body: JSON.stringify({
              name: 'Trimmed Name',
              description: 'Trimmed Desc',
            }),
          })
        )
      })
    })

    it('should send undefined description when empty', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { id: 'project123' } }),
      })

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'Project Name' } })

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects',
          expect.objectContaining({
            body: JSON.stringify({
              name: 'Project Name',
              description: undefined,
            }),
          })
        )
      })
    })

    it('should display error message on API error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Database error' }),
      })

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'Test' } })

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('Database error')).toBeInTheDocument()
      })
    })

    it('should display generic error when API returns no message', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'Test' } })

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('Failed to create project')).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'Test' } })

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123' } },
      })
    })

    it('should show loading text in submit button when submitting', async () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise(resolve => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ project: { id: 'project123' } }),
                }),
              100
            )
          })
      )

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'Test' } })

      const submitButton = screen.getByRole('button', {
        name: /Create Project/i,
      })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument()
      })
    })

    it('should disable inputs when submitting', async () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise(resolve => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ project: { id: 'project123' } }),
                }),
              100
            )
          })
      )

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'Test' } })

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(nameInput).toBeDisabled()
        expect(screen.getByLabelText(/Brief Description/i)).toBeDisabled()
      })
    })

    it('should disable buttons when submitting', async () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise(resolve => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ project: { id: 'project123' } }),
                }),
              100
            )
          })
      )

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'Test' } })

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Creating.../i })
        ).toBeDisabled()
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled()
      })
    })

    it('should re-enable form after submission completes', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Error' }),
      })

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'Test' } })

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      // Should be enabled again after error
      expect(nameInput).not.toBeDisabled()
      expect(screen.getByLabelText(/Brief Description/i)).not.toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123' } },
      })
    })

    it('should not display error initially', () => {
      render(<NewProjectPage />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('should clear error when resubmitting', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'First error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ project: { id: 'project123' } }),
        })

      render(<NewProjectPage />)

      const nameInput = screen.getByLabelText(/Project Name/i)
      fireEvent.change(nameInput, { target: { value: 'Test' } })

      const form = screen
        .getByRole('button', { name: /Create Project/i })
        .closest('form')!

      // First submission - error
      fireEvent.submit(form)
      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second submission - should clear error
      fireEvent.submit(form)
      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123' } },
      })
    })

    it('should have proper form labels', () => {
      render(<NewProjectPage />)

      expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Brief Description/i)).toBeInTheDocument()
    })

    it('should have accessible buttons', () => {
      render(<NewProjectPage />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have proper heading structure', () => {
      render(<NewProjectPage />)

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('Create New Project')
    })
  })
})
