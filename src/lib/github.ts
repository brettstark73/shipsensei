import { Octokit } from '@octokit/rest'

// Initialize GitHub client with user's OAuth token
export function createGitHubClient(accessToken: string) {
  return new Octokit({
    auth: accessToken,
  })
}

// Create a new GitHub repository
export async function createRepository(
  accessToken: string,
  repoName: string,
  description: string,
  isPrivate: boolean = false
) {
  const octokit = createGitHubClient(accessToken)

  try {
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description,
      private: isPrivate,
      auto_init: true, // Initialize with README
    })

    return {
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      fullName: repo.full_name,
      owner: repo.owner.login,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const githubError = error as { status: number; message: string }
      if (githubError.status === 422) {
        throw new Error(`Repository "${repoName}" already exists`)
      }
    }
    throw error
  }
}

// Retry configuration for GitHub API calls
const MAX_RETRIES = 3
const INITIAL_DELAY = 1000 // 1 second

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute function with exponential backoff retry
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: unknown) {
      lastError = error as Error

      // Don't retry on client errors (4xx), only server errors (5xx) and rate limits
      if (error && typeof error === 'object' && 'status' in error) {
        const githubError = error as { status: number; message?: string }

        // Don't retry on 4xx errors (except 429 rate limit)
        if (
          githubError.status >= 400 &&
          githubError.status < 500 &&
          githubError.status !== 429
        ) {
          throw error
        }
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError
      }

      // Wait before retrying with exponential backoff
      const delay = INITIAL_DELAY * Math.pow(2, attempt)
      const jitter = Math.random() * 0.1 * delay // Add 10% jitter
      await sleep(delay + jitter)
    }
  }

  throw lastError!
}

// Create or update a file in the repository with retry logic
export async function createOrUpdateFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string
) {
  return withRetry(async () => {
    const octokit = createGitHubClient(accessToken)

    // Get the current file (if it exists) to get its SHA
    let sha: string | undefined

    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner,
        repo,
        path,
      })

      if ('sha' in existingFile) {
        sha = existingFile.sha
      }
    } catch {
      // File doesn't exist, which is fine for creation
    }

    // Create or update the file
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      sha, // Required for updates, omitted for creation
    })

    return data
  })
}

// Create multiple files in a repository with parallel uploads
export async function createFiles(
  accessToken: string,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string }>
) {
  // Validate repository name to prevent injection
  if (!repo || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
    throw new Error('Invalid repository name')
  }

  // Batch size to avoid overwhelming GitHub API
  const BATCH_SIZE = 5
  const results: unknown[] = []

  // Process files in batches to respect rate limits
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE)

    // Upload files in parallel within each batch
    const batchPromises = batch.map(async file => {
      // Validate file path to prevent directory traversal
      if (file.path.includes('..') || file.path.includes('//')) {
        throw new Error(`Invalid file path: ${file.path}`)
      }

      return createOrUpdateFile(
        accessToken,
        owner,
        repo,
        file.path,
        file.content,
        `Add ${file.path}`
      )
    })

    try {
      // Wait for all files in this batch to complete
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches to be respectful to GitHub API
      if (i + BATCH_SIZE < files.length) {
        await sleep(200) // 200ms between batches
      }
    } catch (error) {
      console.error(`Failed to upload batch starting at index ${i}:`, error)

      // Try to provide partial results and detailed error info
      const errorInfo = error instanceof Error ? error.message : String(error)
      throw new Error(
        `Failed to upload files (completed ${results.length}/${files.length}): ${errorInfo}`
      )
    }
  }

  return results
}

// Get user's GitHub profile
export async function getUserProfile(accessToken: string) {
  const octokit = createGitHubClient(accessToken)
  const { data: user } = await octokit.users.getAuthenticated()

  return {
    login: user.login,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url,
  }
}
