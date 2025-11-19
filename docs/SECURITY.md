# ShipSensei - Security Essentials

**Goal**: Don't get hacked. Don't expose user data. Ship securely by default.

## Critical Security (Must-Have for MVP)

### 1. Authentication

- ✅ OAuth only (GitHub, Google via NextAuth.js)
- ✅ No password storage (providers handle it)
- ✅ httpOnly cookies (no XSS risk)
- ✅ HTTPS only (Vercel provides SSL)

**Why secure**: No passwords = no password breaches.

### 2. Authorization

- ✅ Users can only access their projects
- ✅ Check `session.user.id === project.userId` on every API call
- ✅ Database queries filtered by user ID

**Code pattern**:

```typescript
// Every API route
const session = await getServerSession()
if (!session) return 401

const project = await prisma.project.findUnique({
  where: { id: projectId, userId: session.user.id }, // Critical!
})
```

### 3. Input Validation

- ✅ Zod schemas for all API inputs
- ✅ Never trust user input
- ✅ Prisma automatically escapes SQL

**What we check**:

- String lengths (prevent DoS)
- Email format
- Alphanumeric where needed
- No code injection

### 4. Secrets Management

- ✅ Environment variables for all secrets
- ✅ Never commit `.env` files
- ✅ Vercel encrypts environment variables
- ✅ Rotate API keys every 90 days

**Pattern**:

```bash
# .env.example (committed)
DATABASE_URL="postgresql://..."
ANTHROPIC_API_KEY="sk-ant-..."

# .env.local (NEVER committed)
DATABASE_URL="real-connection-string"
ANTHROPIC_API_KEY="real-api-key"
```

### 5. Rate Limiting

- ✅ Max 100 API requests/min per user (Upstash Redis)
- ✅ Max 10 AI generations/min (prevent abuse)
- ✅ Max 5 deployments/hour

**Why**: Prevent API cost explosions from abuse.

## Generated Project Security

**User projects get**:

- ✅ Environment variable template (`.env.example`)
- ✅ `.gitignore` (prevents secret commits)
- ✅ Security headers configured (CSP, HSTS)
- ✅ Input validation examples (Zod schemas)

**User projects DON'T get** (they add if needed):

- Custom authentication (we scaffold, they implement)
- Payment processing (Stripe integration separate)

## What We Monitor

**Sentry alerts on**:

- Unauthorized access attempts (401 errors spike)
- Failed authentication (potential brute force)
- Unusual API usage patterns

**PostHog tracks**:

- Failed login attempts per IP
- Project creation rate (detect abuse)

## Dependency Security

- ✅ Snyk scans dependencies weekly (GitHub Actions)
- ✅ Dependabot auto-updates (minor versions)
- ✅ Block deployment on critical vulnerabilities

## What We DON'T Need Yet

❌ SOC 2 compliance (post-launch, for enterprise)
❌ Penetration testing (once we have users)
❌ Bug bounty program (too early)
❌ Advanced threat detection (overkill for MVP)

## Security Checklist (Pre-Launch)

- [ ] All API routes check authentication
- [ ] All database queries filter by user ID
- [ ] No secrets in Git history
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] Dependency scan passing (no critical CVEs)
- [ ] `.env.example` up to date

## If We Get Hacked

**Response plan**:

1. Take app offline immediately
2. Rotate all API keys and secrets
3. Assess data breach scope
4. Notify affected users (GDPR requirement)
5. Fix vulnerability
6. Post-mortem documentation

**Contact**: security@shipsensei.dev

## Security Reviews

- **Weekly**: Check Snyk + Sentry for issues
- **Monthly**: Review access patterns in PostHog
- **Quarterly**: Update dependencies, rotate secrets
