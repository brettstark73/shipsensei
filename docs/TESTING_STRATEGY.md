# ShipSensei - Testing Strategy

**Version**: 1.0
**Last Updated**: 2025-11-19

## Testing Philosophy

**Objectives**:
1. **Confidence**: Ship with certainty that features work as expected
2. **Speed**: Fast feedback loops, don't slow down development
3. **Quality**: Catch bugs before users do, maintain high standards
4. **Coverage**: Test critical paths thoroughly, pragmatic about edge cases

**Principles**:
- Test behavior, not implementation
- Unit test logic, integrate test flows, E2E test critical journeys
- Automate everything, make testing frictionless
- Test pyramid: Many unit tests, fewer integration tests, critical E2E tests

## Test Pyramid

```
         /\
        /  \  E2E Tests (5%)
       /    \  Critical user journeys
      /------\
     /        \  Integration Tests (25%)
    /          \  API routes, database interactions
   /------------\
  /              \  Unit Tests (70%)
 /                \  Business logic, utilities, components
/------------------\
```

## Unit Testing

**Scope**: Pure functions, utilities, component logic

**Framework**: Vitest (faster than Jest, native ESM)

**Coverage Target**: 80%+ for business logic

**Example**:
```typescript
// lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, validateEmail } from './utils';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('handles negative numbers', () => {
    expect(formatCurrency(-100, 'USD')).toBe('-$100.00');
  });
});

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test+tag@domain.co.uk')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });
});
```

**What to Test**:
- ✅ Business logic (requirements parsing, tech stack recommendations)
- ✅ Utilities (formatting, validation, transformations)
- ✅ Component logic (state management, event handlers)
- ❌ Framework internals (React rendering, Next.js routing)
- ❌ Third-party libraries (trust they're tested)

## Integration Testing

**Scope**: API routes, database interactions, service integrations

**Framework**: Vitest + Supertest (for API testing)

**Example**:
```typescript
// app/api/projects/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { testClient } from '@/tests/helpers';
import { prisma } from '@/lib/db';

describe('POST /api/projects', () => {
  beforeEach(async () => {
    await prisma.project.deleteMany();
  });

  it('creates project for authenticated user', async () => {
    const session = await createTestSession();
    const response = await testClient
      .post('/api/projects')
      .set('Cookie', session.cookie)
      .send({ name: 'Test Project', description: 'A test' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Test Project',
      userId: session.userId,
    });

    // Verify in database
    const project = await prisma.project.findFirst({
      where: { name: 'Test Project' },
    });
    expect(project).toBeTruthy();
  });

  it('returns 401 for unauthenticated user', async () => {
    const response = await testClient
      .post('/api/projects')
      .send({ name: 'Test Project' });

    expect(response.status).toBe(401);
  });

  it('validates input', async () => {
    const session = await createTestSession();
    const response = await testClient
      .post('/api/projects')
      .set('Cookie', session.cookie)
      .send({ name: 'ab' }); // Too short

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Validation');
  });

  it('enforces project limits by tier', async () => {
    const session = await createTestSession({ tier: 'free' });

    // Create first project (allowed)
    await testClient
      .post('/api/projects')
      .set('Cookie', session.cookie)
      .send({ name: 'Project 1' });

    // Try to create second project (should fail for free tier)
    const response = await testClient
      .post('/api/projects')
      .set('Cookie', session.cookie)
      .send({ name: 'Project 2' });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('limit');
  });
});
```

**What to Test**:
- ✅ API routes (CRUD operations, validation, authorization)
- ✅ Database operations (queries, mutations, transactions)
- ✅ External services (mocked: Anthropic API, Stripe, etc.)
- ✅ Authentication/authorization flows

## E2E Testing

**Scope**: Critical user journeys end-to-end

**Framework**: Playwright

**Coverage**: 5-10 critical flows

**Example**:
```typescript
// tests/e2e/create-project.spec.ts
import { test, expect } from '@playwright/test';

test('user can create and deploy project', async ({ page }) => {
  // Login
  await page.goto('/');
  await page.click('text=Login with GitHub');
  // ... handle OAuth flow (use test account) ...
  await expect(page).toHaveURL('/dashboard');

  // Create project
  await page.click('text=New Project');
  await page.fill('[name="idea"]', 'A recipe sharing app for home cooks');
  await page.click('text=Continue');

  // Answer requirements questions
  await expect(page.locator('text=Target users?')).toBeVisible();
  await page.fill('[name="answer"]', 'Home cooks who want to share recipes');
  await page.click('text=Next');

  // ... answer more questions ...

  // Review generated requirements
  await expect(page.locator('h2:has-text("Requirements")')).toBeVisible();
  await page.click('text=Looks good');

  // Tech stack recommendation
  await expect(page.locator('text=Recommended Stack')).toBeVisible();
  await expect(page.locator('text=Next.js')).toBeVisible();
  await page.click('text=Use this stack');

  // Project initialization
  await expect(page.locator('text=Setting up project')).toBeVisible();
  await expect(page.locator('text=Project ready!')).toBeVisible({ timeout: 30000 });

  // Deploy
  await page.click('text=Deploy to production');
  await expect(page.locator('text=Deploying')).toBeVisible();
  await expect(page.locator('text=Deployment successful')).toBeVisible({ timeout: 120000 });

  // Verify deployment URL
  const deploymentUrl = await page.locator('[data-testid="deployment-url"]').textContent();
  expect(deploymentUrl).toMatch(/https:\/\/.*\.vercel\.app/);

  // Visit deployed site
  await page.goto(deploymentUrl);
  await expect(page).toHaveTitle(/Recipe/);
});

test('free tier user cannot create more than 1 project', async ({ page }) => {
  // Login as free tier user with existing project
  await loginAsTestUser(page, { tier: 'free', projectCount: 1 });

  // Try to create second project
  await page.click('text=New Project');
  await expect(page.locator('text=Upgrade required')).toBeVisible();
  await expect(page.locator('text=PRO plan')).toBeVisible();
});
```

**Critical Flows to Test**:
1. ✅ Signup → Create project → Deploy
2. ✅ Login → Edit project → Redeploy
3. ✅ Free tier limits enforcement
4. ✅ PRO tier upgrade flow
5. ✅ Settings update → API key change → Redeploy

## Test Data Management

**Strategy**: Isolated test database per environment

**Setup**:
```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL,
});

export async function setupTestDb() {
  await prisma.$executeRaw`CREATE DATABASE IF NOT EXISTS shipsensei_test`;
  await prisma.$migrate.deploy();
}

export async function teardownTestDb() {
  await prisma.$executeRaw`DROP DATABASE IF EXISTS shipsensei_test`;
  await prisma.$disconnect();
}

export async function resetTestDb() {
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
}

// Test helpers
export async function createTestUser(override = {}) {
  return prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      tier: 'free',
      ...override,
    },
  });
}

export async function createTestSession(userOverride = {}) {
  const user = await createTestUser(userOverride);
  const session = await createSession(user);
  return { user, session, cookie: session.cookie };
}
```

**Principles**:
- Fresh database for each test run
- Seed minimal data (only what test needs)
- Clean up after each test (avoid test pollution)

## Continuous Testing

**Local Development**:
```bash
# Watch mode (auto-run on file changes)
pnpm test:watch

# Run all tests
pnpm test

# Run specific test file
pnpm test path/to/file.test.ts

# Coverage report
pnpm test:coverage
```

**CI/CD** (GitHub Actions):
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:unit
      - uses: codecov/codecov-action@v3

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:integration
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: npx playwright install
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-screenshots
          path: tests/e2e/screenshots/
```

## Performance Testing

**Scope**: API response times, page load times

**Framework**: Artillery (load testing)

**Example**:
```yaml
# artillery-config.yml
config:
  target: 'https://shipsensei.dev'
  phases:
    - duration: 60
      arrivalRate: 10 # 10 users per second
    - duration: 120
      arrivalRate: 50 # Ramp to 50 users per second

scenarios:
  - name: "Create project"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
          capture:
            - json: "$.token"
              as: "authToken"
      - post:
          url: "/api/projects"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            name: "Test Project {{ $randomString() }}"
          expect:
            - statusCode: 201
            - contentType: json
            - hasProperty: id
```

**Thresholds**:
- API routes: p95 < 500ms
- Page loads: p95 < 2s
- Code generation: p95 < 30s

## Security Testing

**Scope**: Vulnerability scanning, penetration testing

**Tools**:
- **Snyk**: Dependency vulnerabilities
- **OWASP ZAP**: Web application scanning (post-MVP)
- **Burp Suite**: Manual penetration testing (annual)

**Automated Checks**:
```yaml
# .github/workflows/security.yml
jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          command: test
          args: --severity-threshold=high
```

## Test Coverage Goals

**Overall**: 80%+ coverage

**By Layer**:
- Unit tests: 90%+ (business logic, utilities)
- Integration tests: 70%+ (API routes)
- E2E tests: 100% of critical flows

**Monitoring**:
- Codecov integration (PR comments with coverage change)
- Block PRs if coverage drops > 2%

## Testing Checklist

**Before Every Commit**:
- [ ] Unit tests pass locally
- [ ] Lint passes (ESLint)
- [ ] Type check passes (TypeScript)

**Before Every PR**:
- [ ] All tests pass in CI
- [ ] Coverage maintained or improved
- [ ] Integration tests added for new API routes
- [ ] E2E tests updated if user flow changed

**Before Every Release**:
- [ ] Full test suite passes
- [ ] E2E tests run against staging
- [ ] Performance tests meet thresholds
- [ ] Security scan clean (no critical/high issues)

**Manual Testing** (Spot Check):
- [ ] Create project flow (end-to-end)
- [ ] Deploy to production
- [ ] Free → PRO upgrade
- [ ] Settings changes persist

---

**Owner**: Engineering Team
**Review Cadence**: Quarterly (adjust strategy based on learnings)
