# ShipSensei - CI/CD Pipeline

**Version**: 1.0
**Last Updated**: 2025-11-19

## CI/CD Philosophy

**Goals**:

1. **Fast Feedback**: Know within minutes if code works
2. **Confidence**: Automated checks catch issues before production
3. **Efficiency**: Minimize manual work, maximize automation
4. **Safety**: Never ship broken code, easy rollbacks

**Principles**:

- Automate everything (tests, linting, deployment)
- Fail fast (catch errors early)
- Keep main branch deployable (always green)
- Deploy often (continuous delivery)

## Pipeline Overview

```
┌─────────────┐
│  Git Push   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│           Continuous Integration            │
├─────────────────────────────────────────────┤
│  1. Lint Code (ESLint, Prettier)            │
│  2. Type Check (TypeScript)                 │
│  3. Unit Tests (Vitest)                     │
│  4. Integration Tests (API routes)          │
│  5. Security Scan (Snyk, Secret Detection)  │
│  6. Build Check (next build)                │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│      Continuous Deployment (on main)        │
├─────────────────────────────────────────────┤
│  1. E2E Tests (Playwright, Staging)         │
│  2. Build Production (next build)           │
│  3. Deploy to Vercel (automatic)            │
│  4. Health Check (verify deployment)        │
│  5. Smoke Tests (critical flows)            │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│ Production  │
└─────────────┘
```

## GitHub Actions Workflows

### 1. Continuous Integration

**Trigger**: Every push, pull request

**File**: `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm format:check

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm type-check

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:unit
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  test-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build
      - uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next
```

### 2. Security Scanning

**Trigger**: Push to main, pull requests

**File**: `.github/workflows/security.yml`

```yaml
name: Security
on:
  push:
    branches: [main]
  pull_request:

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

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

  codeql:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript
      - uses: github/codeql-action/autobuild@v2
      - uses: github/codeql-action/analyze@v2
```

### 3. Deployment (Production)

**Trigger**: Push to main branch (after CI passes)

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  e2e-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: npx playwright install
      - run: pnpm build
      - run: pnpm test:e2e
        env:
          PLAYWRIGHT_TEST_BASE_URL: https://staging.shipsensei.dev
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  deploy-production:
    needs: e2e-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/actions/cli@v1
        with:
          args: 'deploy --prod'
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

  smoke-test:
    needs: deploy-production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check homepage
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://shipsensei.dev)
          if [ $response -ne 200 ]; then
            echo "Homepage check failed with status $response"
            exit 1
          fi
      - name: Check API health
        run: |
          response=$(curl -s https://shipsensei.dev/api/health)
          if [ "$(echo $response | jq -r '.status')" != "ok" ]; then
            echo "API health check failed"
            exit 1
          fi
```

### 4. Database Migrations

**Trigger**: Manual workflow dispatch (for safety)

**File**: `.github/workflows/migrate.yml`

```yaml
name: Database Migration
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to migrate'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - name: Notify on Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Database migration completed for ${{ github.event.inputs.environment }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Branch Strategy

**Main Branch** (`main`):

- Always deployable
- Protected (requires PR, passing CI)
- Auto-deploys to production on push

**Feature Branches** (`feature/*`):

- Created for new features
- Must pass CI before merging
- Squash merge to main (clean history)

**Hotfix Branches** (`hotfix/*`):

- For urgent production fixes
- Same CI requirements
- Merge to main → auto-deploy

**Example Flow**:

```bash
# Create feature branch
git checkout -b feature/requirements-wizard

# Work, commit, push
git add .
git commit -m "Add requirements wizard UI"
git push origin feature/requirements-wizard

# Create PR → CI runs → Review → Merge → Deploy
```

## Deployment Environments

### Development

- **URL**: `http://localhost:3000`
- **Purpose**: Local development
- **Database**: Local Postgres or SQLite
- **Secrets**: `.env.local` (not committed)

### Staging (Vercel Preview)

- **URL**: `https://shipsensei-pr-123.vercel.app` (per PR)
- **Purpose**: Test before production
- **Database**: Staging database (safe to reset)
- **Secrets**: Vercel environment variables (staging scope)

### Production (Vercel)

- **URL**: `https://shipsensei.dev`
- **Purpose**: Live application
- **Database**: Production database (Neon)
- **Secrets**: Vercel environment variables (production scope)

## Deployment Process

### Automatic Deployment (via Vercel GitHub Integration)

**Trigger**: Git push

**Flow**:

1. Push to branch → Vercel creates preview deployment
2. CI passes → Preview URL ready
3. Merge to main → Vercel deploys to production

**Configuration**: `vercel.json`

```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret"
  }
}
```

### Manual Deployment (Emergency)

**When**: Critical fix can't wait for CI

**Process**:

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Verify
curl https://shipsensei.dev/api/health
```

**Note**: Still requires post-deploy smoke tests.

## Rollback Strategy

### Automatic Rollback (Vercel)

**Trigger**: Health check fails, high error rate

**Method**: Vercel automatically routes traffic to previous deployment

### Manual Rollback

**When**: Discovered issue after deployment

**Process**:

1. Go to Vercel dashboard
2. Find previous deployment
3. Click "Promote to Production"
4. Verify health checks pass

**Time**: ~2 minutes

## Environment Variables

### Managing Secrets

**Vercel Dashboard**:

1. Project Settings → Environment Variables
2. Add variable (Development, Preview, Production scopes)
3. Redeploy to apply

**CLI** (for automation):

```bash
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production

# Pull secrets locally (for development)
vercel env pull .env.local
```

**Security**:

- ❌ Never commit `.env` files to Git
- ✅ Use `.env.example` for documentation
- ✅ Rotate secrets every 90 days
- ✅ Use different secrets for dev/staging/prod

## Monitoring Deployments

### Health Checks

**Endpoint**: `/api/health`

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`

    // Check external services
    const anthropicOk = await fetch('https://api.anthropic.com/v1/health').then(
      r => r.ok
    )

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        anthropic: anthropicOk ? 'ok' : 'degraded',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
      },
      { status: 500 }
    )
  }
}
```

**Monitoring**: Vercel monitors this endpoint, alerts on failures.

### Deployment Notifications

**Slack Integration**:

```yaml
# Add to deploy.yml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "🚀 Deployment to production successful!",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Deployment: ${{ github.sha }}*\n<https://shipsensei.dev|Visit Site>"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Performance Budgets

**Enforced in CI**:

```yaml
# package.json
{
  "scripts": {
    "build": "next build",
    "build:analyze": "ANALYZE=true next build"
  }
}

# .github/workflows/ci.yml (add to build job)
- name: Check bundle size
  run: |
    pnpm build:analyze
    MAX_SIZE=500
    ACTUAL_SIZE=$(stat -f%z .next/static/chunks/main-*.js | awk '{print int($1/1024)}')
    if [ $ACTUAL_SIZE -gt $MAX_SIZE ]; then
      echo "Bundle size $ACTUAL_SIZE KB exceeds limit of $MAX_SIZE KB"
      exit 1
    fi
```

**Budgets**:

- Main bundle: < 500 KB
- Total page weight: < 2 MB
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s

## Feature Flags

**Tool**: PostHog (built-in feature flags)

**Use Cases**:

- Gradual rollouts (10% → 50% → 100%)
- A/B testing (Claude vs GPT-4 for code generation)
- Kill switches (disable feature if issues)

**Example**:

```typescript
import { useFeatureFlag } from 'posthog-js/react'

export function CodeGenerator() {
  const useGPT4 = useFeatureFlag('use-gpt4-for-code')

  const generateCode = async () => {
    if (useGPT4) {
      return await generateWithGPT4()
    } else {
      return await generateWithClaude()
    }
  }
}
```

## CI/CD Checklist

**Before Merging PR**:

- [ ] All CI checks pass (lint, type-check, tests)
- [ ] Security scan clean (no critical/high issues)
- [ ] Code review approved
- [ ] Preview deployment tested manually (if UI changes)

**After Deployment**:

- [ ] Health check passes
- [ ] Smoke tests pass (critical flows)
- [ ] Monitor error rate (Sentry)
- [ ] Monitor performance (Vercel Analytics)

**If Issues Detected**:

- [ ] Rollback immediately (Vercel dashboard)
- [ ] Investigate root cause
- [ ] Fix in new PR
- [ ] Post-mortem (document lessons learned)

---

**Owner**: Engineering Team
**Review Cadence**: Quarterly (optimize based on learnings)
