// Vercel deployment integration using REST API
// https://vercel.com/docs/rest-api

type VercelDeployment = {
  id: string
  url: string
  name: string
  state: string
  ready: number
  readyState: string
  inspectorUrl: string
}

type VercelProject = {
  id: string
  name: string
  accountId: string
}

// Create or get Vercel project
export async function createOrGetVercelProject(
  vercelToken: string,
  projectName: string,
  githubRepo: string // format: "owner/repo"
): Promise<VercelProject> {
  // First try to get existing project
  const getResponse = await fetch(
    `https://api.vercel.com/v9/projects/${projectName}`,
    {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
      },
    }
  )

  if (getResponse.ok) {
    const existingProject = await getResponse.json()
    return existingProject
  }

  // Create new project if it doesn't exist
  const createResponse = await fetch('https://api.vercel.com/v10/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      gitRepository: {
        type: 'github',
        repo: githubRepo,
      },
      framework: 'nextjs',
      buildCommand: 'npm run build',
      devCommand: 'npm run dev',
      installCommand: 'npm install',
      outputDirectory: '.next',
    }),
  })

  if (!createResponse.ok) {
    const error = await createResponse.json()
    throw new Error(
      `Failed to create Vercel project: ${error.error?.message || createResponse.statusText}`
    )
  }

  const project = await createResponse.json()
  return project
}

// Deploy project to Vercel
export async function deployToVercel(
  vercelToken: string,
  projectName: string,
  githubRepo: string,
  production: boolean = true
): Promise<VercelDeployment> {
  // Ensure project exists
  await createOrGetVercelProject(vercelToken, projectName, githubRepo)

  // Trigger deployment using Git Deploy webhook
  // This triggers Vercel to pull from GitHub and deploy
  const response = await fetch(`https://api.vercel.com/v13/deployments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      gitSource: {
        type: 'github',
        repo: githubRepo,
        ref: 'main', // or 'master'
      },
      target: production ? 'production' : 'preview',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(
      `Failed to deploy to Vercel: ${error.error?.message || response.statusText}`
    )
  }

  const deployment: VercelDeployment = await response.json()
  return deployment
}

// Get deployment status
export async function getDeploymentStatus(
  vercelToken: string,
  deploymentId: string
): Promise<VercelDeployment> {
  const response = await fetch(
    `https://api.vercel.com/v13/deployments/${deploymentId}`,
    {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to get deployment status')
  }

  const deployment: VercelDeployment = await response.json()
  return deployment
}

// Wait for deployment to complete
export async function waitForDeployment(
  vercelToken: string,
  deploymentId: string,
  maxWaitMs: number = 600000 // 10 minutes
): Promise<VercelDeployment> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const deployment = await getDeploymentStatus(vercelToken, deploymentId)

    if (deployment.readyState === 'READY') {
      return deployment
    }

    if (deployment.readyState === 'ERROR') {
      throw new Error('Deployment failed')
    }

    if (deployment.readyState === 'CANCELED') {
      throw new Error('Deployment was canceled')
    }

    // Wait 5 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  throw new Error('Deployment timed out')
}

// Get user's Vercel account info
export async function getVercelUser(vercelToken: string) {
  const response = await fetch('https://api.vercel.com/v2/user', {
    headers: {
      Authorization: `Bearer ${vercelToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get Vercel user info')
  }

  const user = await response.json()
  return user
}
