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

// Create or update a file in the repository
export async function createOrUpdateFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string
) {
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
}

// Create multiple files in a repository
export async function createFiles(
  accessToken: string,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string }>
) {
  const results = []

  for (const file of files) {
    const result = await createOrUpdateFile(
      accessToken,
      owner,
      repo,
      file.path,
      file.content,
      `Add ${file.path}`
    )
    results.push(result)
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
