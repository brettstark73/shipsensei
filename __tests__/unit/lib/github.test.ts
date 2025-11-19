import {
  createGitHubClient,
  createRepository,
  createOrUpdateFile,
  createFiles,
  getUserProfile,
} from '@/lib/github'
import { Octokit } from '@octokit/rest'

// Mock Octokit
jest.mock('@octokit/rest')

const mockReposCreateForAuthenticatedUser = jest.fn()
const mockReposGetContent = jest.fn()
const mockReposCreateOrUpdateFileContents = jest.fn()
const mockUsersGetAuthenticated = jest.fn()

beforeEach(() => {
  ;(Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(
    () =>
      ({
        repos: {
          createForAuthenticatedUser: mockReposCreateForAuthenticatedUser,
          getContent: mockReposGetContent,
          createOrUpdateFileContents: mockReposCreateOrUpdateFileContents,
        },
        users: {
          getAuthenticated: mockUsersGetAuthenticated,
        },
      }) as unknown as Octokit
  )
})

describe('GitHub Service', () => {
  describe('createGitHubClient', () => {
    it('should create Octokit client with access token', () => {
      const accessToken = 'test-token'
      const client = createGitHubClient(accessToken)

      expect(client).toBeInstanceOf(Octokit)
      expect(Octokit).toHaveBeenCalledWith({
        auth: accessToken,
      })
    })
  })

  describe('createRepository', () => {
    it('should create a new repository successfully', async () => {
      const mockRepo = {
        html_url: 'https://github.com/user/test-repo',
        clone_url: 'https://github.com/user/test-repo.git',
        full_name: 'user/test-repo',
        owner: { login: 'user' },
      }

      mockReposCreateForAuthenticatedUser.mockResolvedValue({
        data: mockRepo,
      })

      const result = await createRepository(
        'test-token',
        'test-repo',
        'Test repository',
        false
      )

      expect(result).toEqual({
        url: mockRepo.html_url,
        cloneUrl: mockRepo.clone_url,
        fullName: mockRepo.full_name,
        owner: mockRepo.owner.login,
      })

      expect(mockReposCreateForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'test-repo',
        description: 'Test repository',
        private: false,
        auto_init: true,
      })
    })

    it('should create a private repository when specified', async () => {
      const mockRepo = {
        html_url: 'https://github.com/user/private-repo',
        clone_url: 'https://github.com/user/private-repo.git',
        full_name: 'user/private-repo',
        owner: { login: 'user' },
      }

      mockReposCreateForAuthenticatedUser.mockResolvedValue({
        data: mockRepo,
      })

      await createRepository(
        'test-token',
        'private-repo',
        'Private repository',
        true
      )

      expect(mockReposCreateForAuthenticatedUser).toHaveBeenCalledWith(
        expect.objectContaining({
          private: true,
        })
      )
    })

    it('should throw error when repository already exists', async () => {
      mockReposCreateForAuthenticatedUser.mockRejectedValue({
        status: 422,
        message: 'Repository already exists',
      })

      await expect(
        createRepository('test-token', 'existing-repo', 'Test', false)
      ).rejects.toThrow('Repository "existing-repo" already exists')
    })

    it('should throw original error for non-422 errors', async () => {
      const originalError = new Error('Network error')
      mockReposCreateForAuthenticatedUser.mockRejectedValue(originalError)

      await expect(
        createRepository('test-token', 'test-repo', 'Test', false)
      ).rejects.toThrow('Network error')
    })
  })

  describe('createOrUpdateFile', () => {
    it('should create a new file when it does not exist', async () => {
      mockReposGetContent.mockRejectedValue(new Error('Not found'))

      const mockFileData = {
        content: { sha: 'new-sha' },
      }

      mockReposCreateOrUpdateFileContents.mockResolvedValue({
        data: mockFileData,
      })

      const result = await createOrUpdateFile(
        'test-token',
        'user',
        'repo',
        'README.md',
        'Hello World',
        'Initial commit'
      )

      expect(result).toEqual(mockFileData)

      expect(mockReposCreateOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        path: 'README.md',
        message: 'Initial commit',
        content: Buffer.from('Hello World').toString('base64'),
        sha: undefined,
      })
    })

    it('should update an existing file', async () => {
      mockReposGetContent.mockResolvedValue({
        data: {
          sha: 'existing-sha',
        },
      })

      const mockFileData = {
        content: { sha: 'updated-sha' },
      }

      mockReposCreateOrUpdateFileContents.mockResolvedValue({
        data: mockFileData,
      })

      const result = await createOrUpdateFile(
        'test-token',
        'user',
        'repo',
        'README.md',
        'Updated content',
        'Update README'
      )

      expect(result).toEqual(mockFileData)

      expect(mockReposCreateOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: 'existing-sha',
        })
      )
    })
  })

  describe('createFiles', () => {
    it('should create multiple files successfully', async () => {
      mockReposGetContent.mockRejectedValue(new Error('Not found'))

      const mockFileData = {
        content: { sha: 'file-sha' },
      }

      mockReposCreateOrUpdateFileContents.mockResolvedValue({
        data: mockFileData,
      })

      const files = [
        { path: 'README.md', content: 'Read me' },
        { path: 'package.json', content: '{}' },
        { path: 'index.js', content: 'console.log("hello")' },
      ]

      const results = await createFiles('test-token', 'user', 'repo', files)

      expect(results).toHaveLength(3)
      expect(mockReposCreateOrUpdateFileContents).toHaveBeenCalledTimes(3)

      expect(mockReposCreateOrUpdateFileContents).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          path: 'README.md',
          message: 'Add README.md',
        })
      )

      expect(mockReposCreateOrUpdateFileContents).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          path: 'package.json',
          message: 'Add package.json',
        })
      )

      expect(mockReposCreateOrUpdateFileContents).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          path: 'index.js',
          message: 'Add index.js',
        })
      )
    })

    it('should handle empty file array', async () => {
      const results = await createFiles('test-token', 'user', 'repo', [])

      expect(results).toHaveLength(0)
      expect(mockReposCreateOrUpdateFileContents).not.toHaveBeenCalled()
    })
  })

  describe('getUserProfile', () => {
    it('should get authenticated user profile', async () => {
      const mockUser = {
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://github.com/avatar.png',
      }

      mockUsersGetAuthenticated.mockResolvedValue({
        data: mockUser,
      })

      const result = await getUserProfile('test-token')

      expect(result).toEqual({
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatarUrl: 'https://github.com/avatar.png',
      })

      expect(mockUsersGetAuthenticated).toHaveBeenCalled()
    })
  })
})
