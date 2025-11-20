/**
 * Landing Page Component Tests
 *
 * Tests for src/app/page.tsx (Home component)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Home from '@/app/page'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockUseSession = useSession as jest.Mock
const mockSignIn = signIn as jest.Mock
const mockUseRouter = useRouter as jest.Mock

describe('Home Page (Landing)', () => {
  let mockRouter: { push: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter = {
      push: jest.fn(),
    }
    mockUseRouter.mockReturnValue(mockRouter)
  })

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })
    })

    it('should render landing page with hero section', () => {
      render(<Home />)

      // Check that main sections are rendered
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1.textContent).toMatch(/Ship.*Sensei/i)
      const descriptions = screen.getAllByText(/AI-powered mentorship/i)
      expect(descriptions.length).toBeGreaterThan(0)
    })

    it('should display "Get Started" button in header', () => {
      render(<Home />)

      const headerButtons = screen.getAllByText('Get Started')
      expect(headerButtons.length).toBeGreaterThan(0)
    })

    it('should display "Start Building Free" button in hero', () => {
      render(<Home />)

      expect(
        screen.getByText('Start Building Free →')
      ).toBeInTheDocument()
    })

    it('should show no credit card message when unauthenticated', () => {
      render(<Home />)

      const creditCardMessages = screen.getAllByText(/No credit card required/i)
      expect(creditCardMessages.length).toBeGreaterThan(0)
    })

    it('should call signIn when "Get Started" is clicked', () => {
      render(<Home />)

      const getStartedButton = screen.getAllByText('Get Started')[0]
      fireEvent.click(getStartedButton)

      expect(mockSignIn).toHaveBeenCalledTimes(1)
    })

    it('should call signIn when "Start Building Free" is clicked', () => {
      render(<Home />)

      const startBuildingButton = screen.getByText('Start Building Free →')
      fireEvent.click(startBuildingButton)

      expect(mockSignIn).toHaveBeenCalledTimes(1)
    })

    it('should render features grid section', () => {
      render(<Home />)

      expect(screen.getByText('The Complete Journey')).toBeInTheDocument()
      expect(
        screen.getByText(/Everything you need to go from idea to production/i)
      ).toBeInTheDocument()
    })

    it('should render how it works section', () => {
      render(<Home />)

      expect(screen.getByText(/Describe Your Idea/i)).toBeInTheDocument()
      expect(screen.getByText(/Get Recommendations/i)).toBeInTheDocument()
      expect(screen.getByText(/Generate Code/i)).toBeInTheDocument()
      expect(screen.getByText(/Deploy & Share/i)).toBeInTheDocument()
    })

    it('should render CTA section', () => {
      render(<Home />)

      expect(screen.getByText(/Ready to Ship Your Idea?/i)).toBeInTheDocument()
    })
  })

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
        status: 'authenticated',
      })
    })

    it('should display "Dashboard" button in header when authenticated', () => {
      render(<Home />)

      const dashboardButtons = screen.getAllByText('Dashboard')
      expect(dashboardButtons.length).toBeGreaterThan(0)
    })

    it('should display "Go to Dashboard" button in hero when authenticated', () => {
      render(<Home />)

      expect(screen.getByText('Go to Dashboard →')).toBeInTheDocument()
    })

    it('should NOT show credit card message when authenticated', () => {
      render(<Home />)

      expect(
        screen.queryByText(/No credit card required/i)
      ).not.toBeInTheDocument()
    })

    it('should navigate to dashboard when header button is clicked', () => {
      render(<Home />)

      const dashboardButton = screen.getAllByText('Dashboard')[0]
      fireEvent.click(dashboardButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })

    it('should navigate to dashboard when hero button is clicked', () => {
      render(<Home />)

      const goToDashboardButton = screen.getByText('Go to Dashboard →')
      fireEvent.click(goToDashboardButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })

    it('should not call signIn when authenticated', () => {
      render(<Home />)

      const dashboardButton = screen.getAllByText('Dashboard')[0]
      fireEvent.click(dashboardButton)

      expect(mockSignIn).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })
    })

    it('should display "Loading..." in header button', () => {
      render(<Home />)

      const loadingButtons = screen.getAllByText('Loading...')
      expect(loadingButtons.length).toBeGreaterThan(0)
    })

    it('should still render page content while loading', () => {
      render(<Home />)

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1.textContent).toMatch(/Ship.*Sensei/i)
      const descriptions = screen.getAllByText(/AI-powered mentorship/i)
      expect(descriptions.length).toBeGreaterThan(0)
    })
  })

  describe('Content Sections', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })
    })

    it('should render header with ShipSensei branding', () => {
      render(<Home />)

      // Header should have an H1 with the branding
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toBeInTheDocument()
      expect(h1.textContent).toMatch(/Ship.*Sensei/i)
    })

    it('should render sticky header', () => {
      render(<Home />)

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })

    it('should render hero badge', () => {
      render(<Home />)

      expect(
        screen.getByText(/Ship your idea in under 30 minutes/i)
      ).toBeInTheDocument()
    })

    it('should render hero headline', () => {
      render(<Home />)

      expect(screen.getAllByText(/From Idea to/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Launched Product/i).length).toBeGreaterThan(0)
    })

    it('should render hero description', () => {
      render(<Home />)

      expect(
        screen.getByText(
          /AI-powered mentorship that guides complete beginners/i
        )
      ).toBeInTheDocument()
    })

    it('should render features section heading', () => {
      render(<Home />)

      expect(screen.getByText('The Complete Journey')).toBeInTheDocument()
    })

    it('should render at least 4 feature cards', () => {
      const { container } = render(<Home />)

      // Features grid should have multiple cards
      const featureCards = container.querySelectorAll(
        '.bg-white.rounded-xl'
      )
      expect(featureCards.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('Interactive Elements', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })
    })

    it('should have clickable CTA buttons', () => {
      render(<Home />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)

      buttons.forEach((button) => {
        expect(button).toBeEnabled()
      })
    })

    it('should apply hover styles to buttons', () => {
      render(<Home />)

      const button = screen.getAllByText('Get Started')[0]
      expect(button).toHaveClass('hover:bg-blue-700')
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })
    })

    it('should use responsive text sizes', () => {
      render(<Home />)

      const headline = screen.getAllByText(/From Idea to/i)[0]
      expect(headline).toHaveClass('text-6xl', 'md:text-7xl')
    })

    it('should use responsive grid layout', () => {
      const { container } = render(<Home />)

      const grids = container.querySelectorAll('.grid')
      expect(grids.length).toBeGreaterThan(0)
    })

    it('should use responsive padding on main sections', () => {
      const { container } = render(<Home />)

      // Check that at least one section has responsive padding
      const sections = container.querySelectorAll('section')
      expect(sections.length).toBeGreaterThan(0)

      const firstSection = sections[0]
      expect(firstSection).toHaveClass('max-w-7xl', 'mx-auto')
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })
    })

    it('should have accessible headings hierarchy', () => {
      render(<Home />)

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toBeInTheDocument()
    })

    it('should have semantic HTML structure', () => {
      render(<Home />)

      expect(screen.getByRole('banner')).toBeInTheDocument() // header
      expect(screen.getByRole('main')).toBeInTheDocument() // main
    })

    it('should have keyboard-accessible buttons', () => {
      render(<Home />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.tagName).toBe('BUTTON')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle session transition from loading to authenticated', async () => {
      const { rerender } = render(<Home />)

      // Initially loading
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })
      rerender(<Home />)
      expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0)

      // Then authenticated
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123' } },
        status: 'authenticated',
      })
      rerender(<Home />)
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    })

    it('should handle session transition from loading to unauthenticated', async () => {
      const { rerender } = render(<Home />)

      // Initially loading
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })
      rerender(<Home />)

      // Then unauthenticated
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })
      rerender(<Home />)
      expect(screen.getAllByText('Get Started').length).toBeGreaterThan(0)
    })

    it('should handle multiple rapid clicks on CTA button', () => {
      render(<Home />)

      const button = screen.getAllByText('Get Started')[0]

      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)

      // Should be called for each click
      expect(mockSignIn).toHaveBeenCalledTimes(3)
    })
  })

  describe('Styling', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })
    })

    it('should use gradient background', () => {
      const { container } = render(<Home />)

      const main = container.querySelector('main')
      expect(main).toHaveClass('bg-gradient-to-br')
    })

    it('should apply blue theme colors', () => {
      render(<Home />)

      const button = screen.getAllByText('Get Started')[0]
      expect(button).toHaveClass('bg-blue-600', 'text-white')
    })

    it('should use backdrop blur on header', () => {
      const { container } = render(<Home />)

      const header = container.querySelector('header')
      expect(header).toHaveClass('backdrop-blur-sm')
    })
  })
})
