'use client'

import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const handleGetStarted = () => {
    if (session) {
      router.push('/dashboard')
    } else {
      signIn()
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">
                Ship<span className="text-blue-600">Sensei</span>
              </h1>
            </div>
            <button
              onClick={handleGetStarted}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {status === 'loading'
                ? 'Loading...'
                : session
                  ? 'Dashboard'
                  : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            🚀 Ship your idea in under 30 minutes
          </div>
          <h2 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6">
            From Idea to
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Launched Product
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
            AI-powered mentorship that guides complete beginners through
            requirements, development, and deployment
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleGetStarted}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
            >
              {session ? 'Go to Dashboard →' : 'Start Building Free →'}
            </button>
            {!session && (
              <p className="text-sm text-gray-500">
                No credit card required • Sign in with GitHub or Google
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            The Complete Journey
          </h3>
          <p className="text-lg text-gray-600">
            Everything you need to go from idea to production
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition border border-gray-100">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-3">
              AI Requirements Discovery
            </h4>
            <p className="text-gray-600">
              Chat with Claude to refine your idea through intelligent Q&A. Get
              clear requirements in minutes.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition border border-gray-100">
            <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-3">
              Smart Tech Stack
            </h4>
            <p className="text-gray-600">
              Get personalized recommendations. We suggest battle-tested tools
              that fit your needs.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition border border-gray-100">
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-3">
              Auto-Generate Project
            </h4>
            <p className="text-gray-600">
              AI creates a complete Next.js app customized to your requirements.
              Code pushed to GitHub automatically.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition border border-gray-100">
            <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-3">
              One-Click Deploy
            </h4>
            <p className="text-gray-600">
              Deploy to Vercel with a single click. Get a live URL in minutes.
              Share your creation with the world.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h3>
            <p className="text-lg text-gray-600">
              Four simple steps to your launched product
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    Describe Your Idea
                  </h4>
                  <p className="text-gray-600">
                    Tell us what you want to build. Our AI asks smart questions
                    to understand your vision.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    Get Recommendations
                  </h4>
                  <p className="text-gray-600">
                    Receive a personalized tech stack recommendation with clear
                    explanations.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    Generate Code
                  </h4>
                  <p className="text-gray-600">
                    AI creates your complete project with custom features based
                    on your answers.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    Deploy & Share
                  </h4>
                  <p className="text-gray-600">
                    One-click deployment to Vercel. Your product goes live and
                    you get a URL to share.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">⏱️</div>
              <div className="text-5xl font-bold text-gray-900 mb-2">
                &lt; 30min
              </div>
              <p className="text-lg text-gray-700">From idea to live product</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Ship Your Idea?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Join creators building the future with AI-powered mentorship
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition shadow-lg hover:shadow-xl"
          >
            {session ? 'Go to Dashboard' : 'Start Building Free'}
          </button>
          {!session && (
            <p className="text-sm mt-4 opacity-75">
              No credit card required • Get started in seconds
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-600">
            <p className="text-lg font-semibold mb-2">
              Ship<span className="text-blue-600">Sensei</span>
            </p>
            <p className="text-sm">
              Built with ❤️ for creators, founders, and dreamers
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
