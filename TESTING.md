# ShipSensei Testing Strategy

## Overview

ShipSensei has a comprehensive testing infrastructure targeting >90% code coverage with unit, integration, and end-to-end tests.

## Testing Stack

- **Jest 30**: Test runner with TypeScript support via ts-jest
- **React Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking
- **Playwright**: End-to-end testing (configured, tests pending)

## Test Structure

```
__tests__/
├── unit/           # Unit tests for services and utilities
│   └── lib/
│       ├── ai.test.ts              # AI service tests (13 tests)
│       ├── github.test.ts          # GitHub service tests (10 tests)
│       ├── vercel.test.ts          # Vercel service tests (11 tests)
│       └── project-generator.test.ts  # Generator tests (9 tests)
├── integration/    # Integration tests for API routes
│   └── api/
│       └── projects.test.ts        # Projects API tests (12 tests)
└── e2e/           # End-to-end tests (Playwright)
    └── (pending)
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (for development)
npm run test:watch

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in CI mode
npm run test:ci
```

## Coverage Goals

**Current Target**: 80% coverage across all metrics
**Final Goal**: >90% coverage

### Coverage Thresholds

```javascript
{
  global: {
    branches: 80%,
    functions: 80%,
    lines: 80%,
    statements: 80%
  }
}
```

### Files Excluded from Coverage

- `src/**/*.d.ts` - TypeScript declaration files
- `src/types/**/*` - Type definitions
- `src/app/layout.tsx` - Root layout (mostly boilerplate)
- `src/lib/prisma.ts` - Prisma client singleton
- `src/lib/auth-provider.tsx` - Simple wrapper component

## Test Suites

### Unit Tests

#### AI Service (`__tests__/unit/lib/ai.test.ts`)

Tests for Claude AI integration covering:

- ✅ Requirements question generation (with/without project description)
- ✅ Follow-up question generation
- ✅ Tech stack recommendations
- ✅ Fallback handling when AI fails
- ✅ Error handling for invalid responses
- ✅ Conversation history management

**Coverage**: 13 tests

#### GitHub Service (`__tests__/unit/lib/github.test.ts`)

Tests for GitHub API integration:

- ✅ Client creation with access token
- ✅ Repository creation (public/private)
- ✅ Duplicate repository error handling
- ✅ File creation and updates
- ✅ Multiple file operations
- ✅ User profile retrieval

**Coverage**: 10 tests
**Known Issue**: ES module mocking for @octokit/rest

#### Vercel Service (`__tests__/unit/lib/vercel.test.ts`)

Tests for Vercel deployment API:

- ✅ Project creation and retrieval
- ✅ Deployment creation (production/preview)
- ✅ Deployment status monitoring
- ✅ Deployment state handling (READY, ERROR, CANCELED)
- ✅ Timeout handling
- ✅ User account info retrieval

**Coverage**: 11 tests

#### Project Generator (`__tests__/unit/lib/project-generator.test.ts`)

Tests for Next.js project template generation:

- ✅ Complete template generation with AI
- ✅ Fallback content when AI fails
- ✅ Project name sanitization
- ✅ Valid package.json generation
- ✅ Valid tsconfig.json generation
- ✅ .gitignore essential entries
- ✅ Tailwind CSS configuration
- ✅ Markdown code fence stripping

**Coverage**: 9 tests

### Integration Tests

#### Projects API (`__tests__/integration/api/projects.test.ts`)

Tests for /api/projects endpoint:

**GET /api/projects:**
- ✅ Return projects for authenticated user
- ✅ Return 401 for unauthenticated requests
- ✅ Handle database errors gracefully

**POST /api/projects:**
- ✅ Create project with valid data
- ✅ Create project without description
- ✅ Return 401 for unauthenticated requests
- ✅ Validate required fields (name)
- ✅ Validate empty name
- ✅ Validate max length (name: 100 chars)
- ✅ Validate max length (description: 500 chars)
- ✅ Handle database errors

**Coverage**: 12 tests
**Known Issue**: Next.js API route environment setup

## Test Configuration

### Jest Configuration (`jest.config.ts`)

```typescript
{
  testEnvironment: 'jsdom',           // React component testing
  setupFilesAfterEnv: ['jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'   // Path aliases
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coverageThreshold: { global: { ... } }
}
```

### Global Setup (`jest.setup.js`)

- Extends Jest with @testing-library/jest-dom matchers
- Polyfills TextEncoder/TextDecoder
- Mocks environment variables for tests
- Mocks global fetch API
- Resets all mocks before each test

## Writing New Tests

### Unit Test Template

```typescript
import { functionToTest } from '@/lib/service'

// Mock dependencies
jest.mock('@/lib/dependency')

describe('Service Name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle success case', async () => {
    // Arrange
    const mockData = { ... }

    // Act
    const result = await functionToTest(input)

    // Assert
    expect(result).toEqual(expected)
  })

  it('should handle error case', async () => {
    mockDependency.mockRejectedValue(new Error('Test error'))

    await expect(functionToTest(input)).rejects.toThrow('Test error')
  })
})
```

### Integration Test Template

```typescript
import { GET, POST } from '@/app/api/route/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

jest.mock('next-auth')
jest.mock('@/lib/prisma')

describe('API Route', () => {
  it('should handle authenticated request', async () => {
    const mockSession = { user: { id: 'user-123' } }
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost:3000/api/route')
    const response = await GET(request)

    expect(response.status).toBe(200)
  })
})
```

## Known Issues

### 1. @octokit/rest ES Module Mocking

**Issue**: GitHub tests fail due to ES module import issues with @octokit/rest

**Workaround Options**:
- Use `jest.unstable_mockModule()` (experimental)
- Mock at the module boundary
- Use manual mocks in `__mocks__/@octokit/rest.js`

**Status**: Tests written, mocking strategy needs refinement

### 2. Next.js API Route Environment

**Issue**: Integration tests need proper Next.js Request/Response environment

**Current Approach**: Using NextRequest/NextResponse from next/server

**Status**: Tests written, environment setup needs verification

## Best Practices

### 1. Test Organization

- **Arrange-Act-Assert** pattern
- One assertion per test when possible
- Clear, descriptive test names
- Group related tests in describe blocks

### 2. Mocking Strategy

- Mock at module boundaries
- Reset mocks before each test
- Use realistic mock data
- Verify mock calls with expect()

### 3. Coverage Goals

- Aim for 100% coverage on services
- Test both success and failure paths
- Cover edge cases and validation
- Don't test implementation details

### 4. Async Testing

- Always use async/await for async tests
- Use `resolves`/`rejects` matchers
- Handle promise rejections properly

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to main, master, develop branches
- Pull requests

### CI Command

```bash
npm run test:ci
```

Runs tests with:
- CI mode enabled
- Coverage collection
- Limited workers (2) for stability

## Roadmap

### Phase 1: Foundation ✅ (Complete)

- [x] Install testing dependencies
- [x] Configure Jest for Next.js
- [x] Create test directory structure
- [x] Write unit tests for core services (AI, GitHub, Vercel, Generator)
- [x] Write integration tests for Projects API
- [x] Add test scripts to package.json
- [x] Configure coverage reporting

### Phase 2: Coverage Expansion (Next)

- [ ] Resolve ES module mocking issues
- [ ] Add integration tests for remaining API routes:
  - [ ] Chat API (/api/projects/[id]/chat)
  - [ ] Generation API (/api/projects/[id]/generate)
  - [ ] Deployment API (/api/projects/[id]/deploy)
  - [ ] Requirements API (/api/projects/[id]/requirements)
- [ ] Add React component tests
- [ ] Increase coverage to 90%+

### Phase 3: E2E Testing (Planned)

- [ ] Configure Playwright
- [ ] Write E2E tests for critical user flows:
  - [ ] User authentication
  - [ ] Project creation
  - [ ] Requirements discovery
  - [ ] Code generation
  - [ ] Deployment
- [ ] Add visual regression testing

### Phase 4: Advanced Testing (Future)

- [ ] Performance testing with Lighthouse
- [ ] Accessibility testing
- [ ] Load testing
- [ ] Security testing

## Metrics

### Current Status

- **Total Tests Written**: 54 tests
- **Passing Tests**: ~43 tests (4/6 suites)
- **Test Suites**: 6 (4 unit, 2 integration)
- **Current Coverage**: ~40% (estimated)
- **Target Coverage**: 90%

### Coverage Breakdown (Estimated)

| Category | Current | Target |
|----------|---------|--------|
| AI Service | 85% | 95% |
| GitHub Service | 80% | 95% |
| Vercel Service | 85% | 95% |
| Project Generator | 90% | 95% |
| API Routes | 60% | 90% |
| Components | 0% | 80% |
| **Overall** | **~40%** | **90%** |

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [Playwright](https://playwright.dev/docs/intro)
- [MSW (Mock Service Worker)](https://mswjs.io/docs/)

## Contributing

When adding new features:

1. Write tests **before** or **alongside** implementation (TDD)
2. Ensure tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Aim for >90% coverage on new code
5. Update this documentation if adding new test patterns

## Questions?

See [CLAUDE.md](./CLAUDE.md) for general development guidelines.
