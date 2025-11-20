// Manual mock for @anthropic-ai/sdk

const mockCreate = jest.fn()

class Anthropic {
  constructor() {
    this.messages = {
      create: mockCreate,
    }
  }
}

// Export a singleton instance that tests can access
Anthropic.mockCreate = mockCreate

module.exports = Anthropic
module.exports.default = Anthropic
