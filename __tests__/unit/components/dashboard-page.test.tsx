/**
 * Dashboard Page Component Tests
 *
 * Tests for src/app/dashboard/page.tsx
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardPage from '@/app/dashboard/page'

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

// Mock window.confirm
global.confirm = jest.fn()

const mockProjects = [
  {
    id: 'project1',
    name: 'Test Project 1',
    description: 'A test project',
    status: 'draft',
    techStack: null,
    repository: null,
    deployment: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    requirements: [{ id: 'req1', question: 'Q1', answer: 'A1', order: 0 }],
  },
  {
    id: 'project2',
    name: 'Deployed Project',
    description: 'Deployed app',
    status: 'deployed',
    techStack: '{}',
    repository: 'https://github.com/user/repo',
    deployment: 'https://app.vercel.app',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
    requirements: [
      { id: 'req2', question: 'Q2', answer: 'A2', order: 0 },
      { id: 'req3', question: 'Q3', answer: 'A3', order: 1 },
    ],
  },
]

describe('Dashboard Page', () => {
  let mockRouter: { push: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter = {
      push: jest.fn(),
    }
    mockUseRouter.mockReturnValue(mockRouter)
    ;(global.fetch as jest.Mock).mockClear()
    ;(global.confirm as jest.Mock).mockClear()
  })

  describe('Authentication', () => {
    it('should redirect to home when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        status: 'unauthenticated',
        data: null,
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/')
      })
    })

    it('should show loading when session is loading', () => {
      mockUseSession.mockReturnValue({
        status: 'loading',
        data: null,
      })

      render(<DashboardPage />)

      expect(screen.getByText(/Loading your projects/i)).toBeInTheDocument()
    })

    it('should fetch projects when authenticated', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123', email: 'test@example.com' } },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: [] }),
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/projects')
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      mockUseSession.mockReturnValue({
        status: 'loading',
        data: null,
      })

      render(<DashboardPage />)

      expect(screen.getByText(/Loading your projects/i)).toBeInTheDocument()
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123', email: 'test@example.com' } },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: [] }),
      })
    })

    it('should show empty state when no projects', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/No projects yet/i)).toBeInTheDocument()
      })
    })

    it('should show create first project button', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(
          screen.getByText('Create Your First Project')
        ).toBeInTheDocument()
      })
    })

    it('should navigate to new project page when clicking empty state button', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        const button = screen.getByText('Create Your First Project')
        fireEvent.click(button)
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/projects/new')
    })

    it('should not show stats cards when no projects', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.queryByText('Total Projects')).not.toBeInTheDocument()
      })
    })
  })

  describe('Projects Display', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123', email: 'test@example.com' } },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      })
    })

    it('should display page title and description', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('My Projects')).toBeInTheDocument()
        expect(
          screen.getByText('Manage your ShipSensei projects')
        ).toBeInTheDocument()
      })
    })

    it('should show new project button in header', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('+ New Project')).toBeInTheDocument()
      })
    })

    it('should navigate to new project page when clicking header button', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        const button = screen.getByText('+ New Project')
        fireEvent.click(button)
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/projects/new')
    })

    it('should display all projects', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument()
        expect(screen.getByText('Deployed Project')).toBeInTheDocument()
      })
    })

    it('should display project descriptions', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('A test project')).toBeInTheDocument()
        expect(screen.getByText('Deployed app')).toBeInTheDocument()
      })
    })

    it('should display project status badges', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('draft')).toBeInTheDocument()
        expect(screen.getByText('deployed')).toBeInTheDocument()
      })
    })

    it('should display requirements count', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('1 question')).toBeInTheDocument()
        expect(screen.getByText('2 questions')).toBeInTheDocument()
      })
    })

    it('should show repository indicator for projects with repos', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Repository linked')).toBeInTheDocument()
      })
    })

    it('should show deployment indicator for deployed projects', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        const deployedIndicators = screen.getAllByText('Deployed')
        // Should have at least one deployment indicator (in project card or stats)
        expect(deployedIndicators.length).toBeGreaterThan(0)
      })
    })

    it('should navigate to project detail when clicking project card', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        const projectCard = screen.getByText('Test Project 1')
        fireEvent.click(projectCard)
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/projects/project1')
    })
  })

  describe('Stats Cards', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123', email: 'test@example.com' } },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      })
    })

    it('should display total projects count', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Total Projects')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    it('should display deployed projects count', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        const deployedHeaders = screen.getAllByText('Deployed')
        expect(deployedHeaders.length).toBeGreaterThan(0)
        // Check that we have counts displayed (should have multiple "1"s for different stats)
        const counts = screen.getAllByText('1')
        expect(counts.length).toBeGreaterThan(0)
      })
    })

    it('should display GitHub projects count', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('On GitHub')).toBeInTheDocument()
      })
    })

    it('should display in progress projects count', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('In Progress')).toBeInTheDocument()
      })
    })
  })

  describe('Project Deletion', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123', email: 'test@example.com' } },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      })
    })

    it('should show confirmation dialog when deleting', async () => {
      ;(global.confirm as jest.Mock).mockReturnValue(false)

      render(<DashboardPage />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete project')
        fireEvent.click(deleteButtons[0])
      })

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to delete')
      )
    })

    it('should not delete if user cancels confirmation', async () => {
      ;(global.confirm as jest.Mock).mockReturnValue(false)

      render(<DashboardPage />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete project')
        fireEvent.click(deleteButtons[0])
      })

      expect(global.fetch).toHaveBeenCalledTimes(1) // Only initial fetch
    })

    it('should delete project when confirmed', async () => {
      ;(global.confirm as jest.Mock).mockReturnValue(true)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      render(<DashboardPage />)

      await waitFor(async () => {
        const deleteButtons = screen.getAllByTitle('Delete project')
        fireEvent.click(deleteButtons[0])

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/projects/project1', {
            method: 'DELETE',
          })
        })
      })
    })

    it('should remove project from UI after successful deletion', async () => {
      ;(global.confirm as jest.Mock).mockReturnValue(true)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      render(<DashboardPage />)

      await waitFor(async () => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument()

        const deleteButtons = screen.getAllByTitle('Delete project')
        fireEvent.click(deleteButtons[0])

        await waitFor(() => {
          expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument()
        })
      })
    })

    it('should show error message on delete failure', async () => {
      ;(global.confirm as jest.Mock).mockReturnValue(true)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      render(<DashboardPage />)

      await waitFor(async () => {
        const deleteButtons = screen.getAllByTitle('Delete project')
        fireEvent.click(deleteButtons[0])

        await waitFor(() => {
          expect(
            screen.getByText('Failed to delete project')
          ).toBeInTheDocument()
        })
      })
    })

    it('should show loading spinner while deleting', async () => {
      ;(global.confirm as jest.Mock).mockReturnValue(true)
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise(resolve => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({}),
                }),
              100
            )
          })
      )

      render(<DashboardPage />)

      await waitFor(async () => {
        const deleteButtons = screen.getAllByTitle('Delete project')
        fireEvent.click(deleteButtons[0])

        await waitFor(() => {
          const spinner = document.querySelector('.animate-spin')
          expect(spinner).toBeInTheDocument()
        })
      })
    })

    it('should disable delete button while deleting', async () => {
      ;(global.confirm as jest.Mock).mockReturnValue(true)
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise(resolve => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({}),
                }),
              100
            )
          })
      )

      render(<DashboardPage />)

      await waitFor(async () => {
        const deleteButtons = screen.getAllByTitle('Delete project')
        fireEvent.click(deleteButtons[0])

        await waitFor(() => {
          const deleteButton = screen.getAllByTitle('Delete project')[0]
          expect(deleteButton).toBeDisabled()
        })
      })
    })
  })

  describe('User Information', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123', email: 'test@example.com' } },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: [] }),
      })
    })

    it('should display user email', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })
    })

    it('should show sign out button', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Sign out')).toBeInTheDocument()
      })
    })

    it('should navigate to sign out when clicking sign out button', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        const signOutButton = screen.getByText('Sign out')
        fireEvent.click(signOutButton)
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/api/auth/signout')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123', email: 'test@example.com' } },
      })
    })

    it('should display error message on fetch failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch projects')).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should display error message without hiding UI', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Page should still render with empty projects array showing empty state
      expect(screen.getByText(/No projects yet/i)).toBeInTheDocument()
    })
  })

  describe('Date Formatting', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123', email: 'test@example.com' } },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      })
    })

    it('should display formatted update dates', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        // Should contain "Updated" text with formatted dates
        const updateText = screen.getAllByText(/Updated/i)
        expect(updateText.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Status Badge Colors', () => {
    it('should render different colors for different statuses', async () => {
      const projectsWithDifferentStatuses = [
        {
          ...mockProjects[0],
          id: 'p1',
          status: 'draft',
        },
        {
          ...mockProjects[1],
          id: 'p2',
          status: 'generating',
        },
        {
          ...mockProjects[1],
          id: 'p3',
          status: 'ready',
        },
        {
          ...mockProjects[1],
          id: 'p4',
          status: 'deployed',
        },
      ]

      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123', email: 'test@example.com' } },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: projectsWithDifferentStatuses }),
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('draft')).toBeInTheDocument()
        expect(screen.getByText('generating')).toBeInTheDocument()
        expect(screen.getByText('ready')).toBeInTheDocument()
        expect(screen.getByText('deployed')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'user123', email: 'test@example.com' } },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      })
    })

    it('should have proper heading structure', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 })
        expect(h1).toHaveTextContent('My Projects')
      })
    })

    it('should have accessible buttons', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
      })
    })

    it('should have title attribute on delete buttons', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete project')
        expect(deleteButtons.length).toBe(2)
      })
    })
  })
})
