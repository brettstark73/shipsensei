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
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-6xl font-bold text-center mb-8">
          Ship<span className="text-blue-600">Sensei</span>
        </h1>
        <p className="text-xl text-center text-gray-600 mb-12">
          AI mentor that guides you from idea → launched product
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">📝 Requirements</h2>
            <p className="text-gray-600">
              Chat with AI to discover what you really need to build
            </p>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">🛠️ Tech Stack</h2>
            <p className="text-gray-600">
              Get opinionated recommendations that just work
            </p>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">🚀 Deploy</h2>
            <p className="text-gray-600">
              One-click deployment to get your product live
            </p>
          </div>
        </div>
        <div className="mt-12 text-center">
          <button
            onClick={handleGetStarted}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
          >
            {status === 'loading'
              ? 'Loading...'
              : session
                ? 'Go to Dashboard'
                : 'Start Building'}
          </button>
          {!session && status !== 'loading' && (
            <p className="text-sm text-gray-500 mt-4">
              Sign in with GitHub or Google to get started
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
