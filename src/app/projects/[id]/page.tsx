'use client'

import { useEffect, useState } from 'react'
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
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

  if (error || !project) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

        {/* Coming Soon Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-bold text-blue-900 mb-2">
            Requirements Chat Coming Soon
          </h2>
          <p className="text-blue-800 mb-6">
            The AI-powered requirements discovery chat interface is currently in
            development. This feature will help you refine your project idea
            through intelligent Q&A.
          </p>
          <div className="bg-white rounded-lg p-6 text-left max-w-2xl mx-auto">
            <h3 className="font-semibold text-gray-900 mb-3">
              What you'll be able to do:
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>
                ✅ Chat with AI to discover your true requirements
              </li>
              <li>
                ✅ Answer 5-10 smart questions about your project
              </li>
              <li>
                ✅ Get personalized tech stack recommendations
              </li>
              <li>
                ✅ Generate a working project based on your answers
              </li>
            </ul>
          </div>
        </div>

        {/* Project Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Project Details
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">
                  {new Date(project.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="text-gray-900">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Requirements</dt>
                <dd className="text-gray-900">
                  {project.requirements.length} question
                  {project.requirements.length !== 1 ? 's' : ''}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Next Steps</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">1.</span>
                <span>Complete requirements discovery (coming soon)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2.</span>
                <span>Review tech stack recommendation</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3.</span>
                <span>Generate your project</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">4.</span>
                <span>Deploy to production</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
