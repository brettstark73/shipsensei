# ShipSensei - Deployment Guide

This guide covers deploying ShipSensei to production on Vercel with Neon PostgreSQL.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
- [Database Migrations](#database-migrations)
- [Environment Variables](#environment-variables)
- [Vercel Deployment](#vercel-deployment)
- [Post-Deployment Checks](#post-deployment-checks)
- [Monitoring & Logging](#monitoring--logging)
- [Rollback Strategy](#rollback-strategy)

---

## Prerequisites

Before deploying to production, ensure you have:

- ✅ Vercel account connected to your GitHub repository
- ✅ Neon PostgreSQL database (production instance)
- ✅ OAuth applications configured (GitHub, Google)
- ✅ Sentry account for error monitoring (optional but recommended)
- ✅ All environment variables ready

---

## Database Setup

### 1. Create Production Database on Neon

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project: `shipsensei-production`
3. Copy the connection string

### 2. Configure Connection Pooling

**IMPORTANT**: Vercel serverless functions require connection pooling.

Neon provides two connection strings:
- **Direct connection**: `postgresql://...` (for migrations)
- **Pooled connection**: `postgresql://...?pgbouncer=true` (for application)

**In production, use:**
- `DATABASE_URL` = Pooled connection (for Prisma queries)
- `DIRECT_DATABASE_URL` = Direct connection (for migrations)

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // Pooled connection
  directUrl = env("DIRECT_DATABASE_URL") // Direct connection for migrations
}
```

---

## Database Migrations

### Migration Strategy

**For production deployments:**

1. **Run migrations BEFORE deploying code**
2. **Use direct connection (not pooled)**
3. **Test migrations on staging first**

### Running Migrations

#### Option 1: Manual Migration (Recommended for First Deploy)

```bash
# Set direct database URL
export DIRECT_DATABASE_URL="postgresql://user:password@host/db"

# Run migration
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

#### Option 2: Automatic Migration on Vercel Build

Add to `package.json`:

```json
{
  "scripts": {
    "vercel-build": "prisma migrate deploy && next build"
  }
}
```

⚠️ **Warning**: This runs migrations during build. If migration fails, deployment fails.

#### Option 3: Separate Migration Job (Enterprise)

For zero-downtime deployments:

1. Run migrations in separate GitHub Action
2. Wait for completion
3. Then deploy application code

**Example GitHub Action:**

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DIRECT_DATABASE_URL: ${{ secrets.DIRECT_DATABASE_URL }}

  deploy:
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - run: vercel --prod
```

### Migration Best Practices

✅ **DO:**
- Test migrations on staging database first
- Back up database before migrations
- Use `prisma migrate deploy` (not `prisma migrate dev`)
- Keep migrations small and focused
- Review generated SQL before deploying

❌ **DON'T:**
- Run migrations from pooled connection
- Skip testing migrations
- Make breaking schema changes without code changes
- Delete migration files after they've been deployed

### Rollback Strategy

If a migration fails:

```bash
# 1. Restore database from backup
pg_restore -d shipsensei_production backup.dump

# 2. Revert code deployment on Vercel
vercel rollback

# 3. Fix migration locally
# 4. Test on staging
# 5. Re-deploy
```

---

## Environment Variables

### Required Production Variables

Set these in Vercel dashboard:

```bash
# Database (use pooled connection)
DATABASE_URL="postgresql://...?pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://..."  # For migrations

# Authentication
NEXTAUTH_URL="https://shipsensei.com"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"

# OAuth Providers (production apps)
GITHUB_CLIENT_ID="prod-github-oauth-id"
GITHUB_CLIENT_SECRET="prod-github-secret"
GOOGLE_CLIENT_ID="prod-google-oauth-id"
GOOGLE_CLIENT_SECRET="prod-google-secret"

# AI/LLM
ANTHROPIC_API_KEY="sk-ant-api03-..."
OPENAI_API_KEY="sk-..." # Fallback

# Error Monitoring
SENTRY_DSN="https://...@sentry.io/..."
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
SENTRY_ORG="your-org"
SENTRY_PROJECT="shipsensei"
SENTRY_AUTH_TOKEN="..." # For source maps

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

### Generate Secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# Verify all variables are set
vercel env ls
```

---

## Vercel Deployment

### Initial Deployment

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link to Vercel project
vercel link

# 3. Add environment variables
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
# ... add all other variables

# 4. Deploy to production
vercel --prod
```

### Automatic Deployments

Once set up, deployments are automatic:

- **Push to `main`** → Production deployment
- **Push to other branches** → Preview deployment
- **Pull requests** → Preview deployment with unique URL

### Build Configuration

Vercel settings (vercel.json optional):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

---

## Post-Deployment Checks

After deploying, verify:

### 1. Health Check

```bash
curl https://shipsensei.com/api/health
# Should return: {"status":"healthy","timestamp":"...","checks":{"database":"connected"}}
```

### 2. Authentication Flow

1. Visit https://shipsensei.com
2. Click "Sign In"
3. Test GitHub OAuth
4. Verify redirect back to dashboard

### 3. Database Connection

```bash
# Check Prisma can connect
npx prisma db pull --schema=./prisma/schema.prisma
```

### 4. Error Tracking

1. Visit Sentry dashboard
2. Verify events are being received
3. Test error by triggering a 500 error

### 5. Performance

```bash
# Run Lighthouse CI
npm run lighthouse:ci

# Check for:
# - Performance score > 90
# - Accessibility score > 90
# - Best Practices score > 90
```

---

## Monitoring & Logging

### Vercel Logs

```bash
# Real-time logs
vercel logs --follow

# Filter by function
vercel logs --follow api/projects
```

### Sentry Monitoring

Monitor these metrics:
- Error rate (should be < 1%)
- Response time (p95 should be < 500ms)
- Availability (should be > 99.9%)

Set up alerts:
- Error spike (> 10 errors/min)
- Performance degradation (p95 > 2s)
- Health check failures

### Database Monitoring

Neon dashboard shows:
- Connection count
- Query performance
- Storage usage
- Active queries

**Set alerts for:**
- Connection pool exhaustion (> 80% used)
- Slow queries (> 1s)
- Storage usage (> 80% capacity)

---

## Rollback Strategy

### If deployment fails:

```bash
# 1. Quick rollback on Vercel
vercel rollback

# 2. Check logs for errors
vercel logs --since 1h

# 3. Fix issue locally
# 4. Test on preview deployment
vercel --preview

# 5. Re-deploy when ready
vercel --prod
```

### If database migration fails:

1. **Don't panic** - Vercel deployment will fail if migration fails
2. Database should be unchanged (migrations are transactional)
3. Fix migration locally
4. Test on staging database
5. Re-deploy

### Zero-Downtime Migration Pattern

For breaking changes:

1. **Phase 1**: Deploy code that supports both old and new schema
2. **Phase 2**: Run migration
3. **Phase 3**: Deploy code that uses only new schema
4. **Phase 4**: Clean up old schema (after verification)

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests passing (`npm run test:ci`)
- [ ] Linting passes (`npm run lint`)
- [ ] Security audit clean (`npm audit --audit-level high`)
- [ ] Environment variables set in Vercel
- [ ] Database migrations tested on staging
- [ ] OAuth apps configured for production URLs
- [ ] Sentry project created and DSN configured
- [ ] Rate limiting tested
- [ ] Health check endpoint working
- [ ] Error boundaries in place
- [ ] Loading states implemented
- [ ] User-facing error messages reviewed
- [ ] Analytics tracking verified (if enabled)
- [ ] Backup strategy documented
- [ ] Rollback plan understood by team

---

## Production Best Practices

### Security

- ✅ All secrets in environment variables (never in code)
- ✅ HTTPS enforced (automatic on Vercel)
- ✅ OAuth only (no password authentication)
- ✅ Rate limiting enabled
- ✅ Input validation on all API routes
- ✅ CSRF protection (built into NextAuth)
- ✅ SQL injection prevention (Prisma handles this)

### Performance

- ✅ Database connection pooling enabled
- ✅ Image optimization (Next.js automatic)
- ✅ Code splitting (Next.js automatic)
- ✅ Caching headers set appropriately
- ✅ CDN enabled (Vercel Edge Network)

### Reliability

- ✅ Error monitoring (Sentry)
- ✅ Health checks configured
- ✅ Database backups enabled (Neon automatic)
- ✅ Logs retention configured
- ✅ Uptime monitoring (optional: UptimeRobot, Pingdom)

---

## Troubleshooting

### Common Issues

**1. "Cannot connect to database"**
- Check `DATABASE_URL` ends with `?pgbouncer=true`
- Verify IP whitelist in Neon (should allow all)
- Check Neon database is not paused

**2. "NextAuth.js error"**
- Verify `NEXTAUTH_URL` matches production URL
- Check OAuth redirect URLs in GitHub/Google
- Ensure `NEXTAUTH_SECRET` is set

**3. "Rate limit store not working across instances"**
- Current implementation is in-memory
- For production, upgrade to Upstash Redis
- See `src/middleware.ts` for implementation

**4. "Migrations failing"**
- Use `DIRECT_DATABASE_URL` (not pooled)
- Check migration SQL in `prisma/migrations`
- Test on staging first

---

## Support

- **Documentation**: `/docs`
- **Issues**: GitHub Issues
- **Security**: Report to security@shipsensei.dev (planned)

---

**Last Updated**: 2025-11-20
**Next Review**: Before public launch
