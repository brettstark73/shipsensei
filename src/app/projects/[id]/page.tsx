'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type Requirement = {
  id: string
  question: string
  answer: string | null
  order: number
}

type Project = {
  id: string
  name: string
  description: string | null
  status: string
  techStack: string | null
  repository: string | null
  deployment: string | null
  createdAt: string
  updatedAt: string
  requirements: Requirement[]
}

type TechStackRecommendation = {
  stack: string
  rationale: string
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { status } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [chatStarted, setChatStarted] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showRecommendation, setShowRecommendation] = useState(false)
  const [recommendation, setRecommendation] =
    useState<TechStackRecommendation | null>(null)
  const [generatingStack, setGeneratingStack] = useState(false)
  const [generatingProject, setGeneratingProject] = useState(false)
  const [repositoryUrl, setRepositoryUrl] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    params.then((p) => setProjectId(p.id))
  }, [params])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }

    if (status === 'authenticated' && projectId) {
      fetchProject()
    }
  }, [status, projectId, router])

  useEffect(() => {
    // Auto-scroll to bottom when new questions appear
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [project?.requirements])

  const fetchProject = async () => {
    if (!projectId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Project not found')
        }
        throw new Error('Failed to fetch project')
      }

      const data = await response.json()
      setProject(data.project)
      setChatStarted(data.project.requirements.length > 0)

      // Check if tech stack exists
      if (data.project.techStack) {
        try {
          setRecommendation(JSON.parse(data.project.techStack))
          setShowRecommendation(true)
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Check if repository exists
      if (data.project.repository) {
        setRepositoryUrl(data.project.repository)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const startChat = async () => {
    if (!projectId) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })

      if (!response.ok) {
        throw new Error('Failed to start chat')
      }

      const data = await response.json()
      setProject((prev) =>
        prev ? { ...prev, requirements: data.requirements } : null
      )
      setChatStarted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const submitAnswer = async (requirementId: string) => {
    if (!projectId || !currentAnswer.trim()) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer',
          requirementId,
          answer: currentAnswer.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit answer')
      }

      const data = await response.json()
      setProject((prev) =>
        prev ? { ...prev, requirements: data.requirements } : null
      )
      setCurrentAnswer('')

      // If chat is completed, show recommendation option
      if (data.completed) {
        setShowRecommendation(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const generateStackRecommendation = async () => {
    if (!projectId) return

    try {
      setGeneratingStack(true)
      const response = await fetch(
        `/api/projects/${projectId}/recommend-stack`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to generate recommendation')
      }

      const data = await response.json()
      setRecommendation(data.recommendation)
      setProject(data.project)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setGeneratingStack(false)
    }
  }

  const generateProject = async () => {
    if (!projectId) return

    try {
      setGeneratingProject(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate project')
      }

      const data = await response.json()
      setProject(data.project)
      setRepositoryUrl(data.repository.url)

      // Show success message
      alert(
        `Success! Your project has been generated and pushed to GitHub:\n\n${data.repository.url}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setGeneratingProject(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </button>
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            {error || 'Project not found'}
          </div>
        </div>
      </div>
    )
  }

  if (!project) return null

  const currentQuestion = project.requirements.find((r) => !r.answer)
  const answeredCount = project.requirements.filter((r) => r.answer).length
  const allAnswered = project.requirements.every((r) => r.answer)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </button>

          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-gray-600 mt-2">{project.description}</p>
              )}
            </div>

            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                project.status === 'deployed'
                  ? 'bg-purple-100 text-purple-800'
                  : project.status === 'ready'
                    ? 'bg-green-100 text-green-800'
                    : project.status === 'generating'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
              }`}
            >
              {project.status}
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content */}
        {!chatStarted ? (
          /* Welcome Screen */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="text-6xl mb-6">💬</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Let's Discover Your Requirements
              </h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                I'll ask you 5-10 smart questions to understand what you want
                to build. This helps us recommend the right tech stack and
                generate a project that fits your needs.
              </p>
              <button
                onClick={startChat}
                disabled={submitting}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? 'Starting...' : 'Start Requirements Chat'}
              </button>
            </div>
          </div>
        ) : (
          /* Chat Interface */
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progress
                </span>
                <span className="text-sm text-gray-600">
                  {answeredCount} / {project.requirements.length} answered
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(answeredCount / project.requirements.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Chat Messages */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-h-[600px] overflow-y-auto">
              <div className="space-y-6">
                {project.requirements.map((req, index) => (
                  <div key={req.id}>
                    {/* Question from AI */}
                    <div className="flex items-start mb-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        AI
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-gray-900">{req.question}</p>
                        </div>
                      </div>
                    </div>

                    {/* User Answer */}
                    {req.answer && (
                      <div className="flex items-start justify-end mb-4">
                        <div className="mr-3 flex-1 text-right">
                          <div className="bg-gray-100 rounded-lg p-4 inline-block text-left">
                            <p className="text-gray-900">{req.answer}</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold">
                          U
                        </div>
                      </div>
                    )}

                    {/* Answer Input (for current question) */}
                    {!req.answer && currentQuestion?.id === req.id && (
                      <div className="mt-4">
                        <textarea
                          value={currentAnswer}
                          onChange={(e) => setCurrentAnswer(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              submitAnswer(req.id)
                            }
                          }}
                          placeholder="Type your answer... (Press Enter to send, Shift+Enter for new line)"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                          rows={3}
                          disabled={submitting}
                        />
                        <div className="mt-2 flex justify-between items-center">
                          <p className="text-xs text-gray-500">
                            {currentAnswer.length} / 5000 characters
                          </p>
                          <button
                            onClick={() => submitAnswer(req.id)}
                            disabled={submitting || !currentAnswer.trim()}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting ? 'Sending...' : 'Send'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Completion Message */}
                {allAnswered && !recommendation && (
                  <div className="text-center py-6 border-t border-gray-200">
                    <div className="text-4xl mb-4">🎉</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Requirements Complete!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Great! Now let's get you a tech stack recommendation.
                    </p>
                    <button
                      onClick={generateStackRecommendation}
                      disabled={generatingStack}
                      className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {generatingStack
                        ? 'Generating...'
                        : 'Get Tech Stack Recommendation'}
                    </button>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Tech Stack Recommendation */}
            {recommendation && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-sm border border-green-200 p-8">
                <div className="flex items-start mb-4">
                  <div className="text-4xl mr-4">🛠️</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Recommended Tech Stack
                    </h3>
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <p className="text-lg font-semibold text-blue-600">
                        {recommendation.stack}
                      </p>
                    </div>
                    <p className="text-gray-700 mb-6">
                      {recommendation.rationale}
                    </p>
                    <div className="flex gap-4">
                      {repositoryUrl ? (
                        <>
                          <a
                            href={repositoryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                          >
                            View on GitHub →
                          </a>
                          <button
                            onClick={() => router.push('/dashboard')}
                            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                          >
                            Back to Dashboard
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={generateProject}
                            disabled={generatingProject}
                            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingProject
                              ? 'Generating... (This may take 1-2 min)'
                              : 'Generate Project on GitHub'}
                          </button>
                          <button
                            onClick={() => router.push('/dashboard')}
                            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                          >
                            Back to Dashboard
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
