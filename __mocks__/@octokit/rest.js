// Manual mock for @octokit/rest to handle ES module issues

const mockOctokit = jest.fn().mockImplementation(() => ({
  repos: {
    createForAuthenticatedUser: jest.fn(),
    getContent: jest.fn(),
    createOrUpdateFileContents: jest.fn(),
  },
  users: {
    getAuthenticated: jest.fn(),
  },
}))

module.exports = {
  Octokit: mockOctokit,
}
