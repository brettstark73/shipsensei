# ShipSensei - Security Strategy

**Version**: 1.0
**Last Updated**: 2025-11-19
**Status**: Security Baseline

## Security Philosophy

**Core Principles**:

1. **Security by Default** - Secure configurations out of the box, not opt-in
2. **Defense in Depth** - Multiple layers of security, not single point of failure
3. **Least Privilege** - Minimal permissions necessary for each operation
4. **Fail Safely** - Errors expose no sensitive data, default to denying access
5. **Transparency** - Security practices documented, auditable, improvable

**Threat Model**:

- **Primary Threats**: Data breaches, account takeover, malicious code injection
- **Secondary Threats**: DoS attacks, API abuse, dependency vulnerabilities
- **Out of Scope** (for MVP): Nation-state attacks, physical security, social engineering at scale

## Authentication Security

### OAuth Implementation

**Providers**: GitHub, Google (via NextAuth.js)

**Security Measures**:

**1. OAuth Configuration**

```typescript
// auth.config.ts
export const authConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'read:user user:email', // Minimal scopes
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Rate limiting: Max 5 login attempts per IP per hour
      const loginAttempts = await rateLimit.check(ipAddress, 'login', 5, 3600)
      if (loginAttempts.exceeded) {
        return false // Block login
      }

      // Email domain validation (if needed for B2B)
      if (requireEmailDomain && !user.email?.endsWith('@allowed-domain.com')) {
        return false
      }

      return true
    },
    async session({ session, user }) {
      // Attach minimal user data to session
      session.user.id = user.id
      session.user.tier = user.tier // For authorization
      return session
    },
  },
  session: {
    strategy: 'jwt', // Stateless sessions, no DB lookup per request
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true, // No JavaScript access
        sameSite: 'lax', // CSRF protection
        path: '/',
        secure: true, // HTTPS only (production)
      },
    },
  },
}
```

**Security Benefits**:

- No password storage (OAuth providers handle it)
- Multi-factor authentication (if provider supports)
- Account recovery via OAuth provider
- Reduced phishing risk (users recognize GitHub/Google)

**Attack Mitigations**:

- **OAuth redirect attacks**: Validate `redirect_uri` against whitelist
- **CSRF**: `state` parameter verified automatically by NextAuth
- **Session fixation**: New session token on login

---

### Session Management

**Strategy**: JWT (JSON Web Tokens) for stateless sessions

**JWT Configuration**:

```typescript
jwt: {
  secret: process.env.NEXTAUTH_SECRET, // 256-bit secret (openssl rand -base64 32)
  maxAge: 30 * 24 * 60 * 60, // 30 days
  // JWT automatically includes: iat (issued at), exp (expiration)
}
```

**Session Validation**:

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const session = await getServerSession()

  // Check if session exists and is valid
  if (!session) {
    return NextResponse.redirect('/login')
  }

  // Check if session is expired (already handled by JWT exp)
  // Check if user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, tier: true, isActive: true },
  })

  if (!user || !user.isActive) {
    // User deleted or deactivated, invalidate session
    return NextResponse.redirect('/login')
  }

  return NextResponse.next()
}
```

**Session Security**:

- **Tokens**: httpOnly cookies (no XSS risk)
- **Expiration**: 30-day sliding window (renews on activity)
- **Revocation**: Logout clears cookie, JWT blacklist for critical events
- **Rotation**: New token on sensitive actions (payment, settings change)

---

### Magic Link Authentication (Alternative)

**Use Case**: Users without GitHub/Google accounts

**Implementation**:

```typescript
// Send magic link
async function sendMagicLink(email: string) {
  const token = await generateSecureToken() // crypto.randomBytes(32)
  const expires = Date.now() + 15 * 60 * 1000 // 15 minutes

  await redis.set(`magic:${token}`, email, { ex: 900 })

  await resend.emails.send({
    from: 'ShipSensei <auth@shipsensei.dev>',
    to: email,
    subject: 'Your login link',
    html: `<a href="https://shipsensei.dev/auth/verify?token=${token}">Click to login</a>`,
  })
}

// Verify magic link
async function verifyMagicLink(token: string) {
  const email = await redis.get(`magic:${token}`)
  if (!email) throw new Error('Invalid or expired link')

  await redis.del(`magic:${token}`) // Single-use token
  return email
}
```

**Security**:

- **Tokens**: Cryptographically random, 256-bit entropy
- **Expiration**: 15 minutes (short-lived)
- **Single-use**: Token deleted after verification
- **Rate limiting**: Max 3 magic links per email per hour

---

## Authorization

### Role-Based Access Control (RBAC)

**Roles**:

- **Free**: 1 project, community support
- **Pro**: 5 projects, priority support, custom domains
- **Team**: Unlimited projects, team collaboration, SLA

**Tier Enforcement**:

```typescript
// Middleware for tier-gated features
export function requireTier(minTier: 'free' | 'pro' | 'team') {
  return async function (req: NextRequest) {
    const session = await getServerSession()
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tierLevel = { free: 0, pro: 1, team: 2 }
    if (tierLevel[session.user.tier] < tierLevel[minTier]) {
      return NextResponse.json({ error: 'Upgrade required' }, { status: 403 })
    }

    return NextResponse.next()
  }
}

// Usage
// app/api/projects/route.ts
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  const projectCount = await prisma.project.count({
    where: { userId: session.user.id },
  })

  const limits = { free: 1, pro: 5, team: Infinity }
  if (projectCount >= limits[session.user.tier]) {
    return NextResponse.json(
      { error: 'Project limit reached' },
      { status: 403 }
    )
  }

  // Create project
}
```

---

### Resource-Level Authorization

**Principle**: Users can only access their own projects.

**Enforcement**:

```typescript
// app/api/projects/[id]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({
    where: { id: params.id },
  })

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Authorization check
  if (project.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(project)
}
```

**Database-Level Security** (Prisma Row-Level Security):

```prisma
// Future: Postgres RLS for defense in depth
// CREATE POLICY user_projects ON projects
//   FOR ALL USING (user_id = current_user_id());
```

---

## Input Validation

### Validation Strategy

**Rule**: Never trust user input. Validate everything.

**Tools**: Zod schemas for type-safe validation

**Example**:

```typescript
import { z } from 'zod'

// Define schemas
const createProjectSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9-_ ]+$/), // Alphanumeric + basic chars
  description: z.string().max(500).optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  description: z.string().max(500).optional(),
  techStack: z
    .object({
      frontend: z.string(),
      backend: z.string(),
      database: z.string(),
    })
    .optional(),
})

// API route
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Validate input
  const result = createProjectSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: result.error.flatten(),
      },
      { status: 400 }
    )
  }

  const validated = result.data // Type-safe, validated data
  // Use validated data only, never raw body
}
```

**Validation Rules**:

- **Length limits**: Prevent buffer overflows, DoS
- **Character whitelist**: Only allow safe characters (no SQL special chars)
- **Type checking**: Ensure number is number, string is string
- **Range limits**: Numeric values within reasonable bounds
- **Nested validation**: Validate deeply nested objects

---

### SQL Injection Prevention

**ORM Protection**: Prisma automatically escapes all inputs.

**Example** (Safe):

```typescript
// Safe: Prisma parameterizes queries
const projects = await prisma.project.findMany({
  where: { userId: userId }, // Automatically escaped
})
```

**Example** (Unsafe, NEVER DO THIS):

```typescript
// UNSAFE: Raw SQL with string concatenation
const projects =
  await prisma.$queryRaw`SELECT * FROM projects WHERE userId = ${userId}` // Still safe (template literals)

// EXTREMELY UNSAFE (never use):
const query = `SELECT * FROM projects WHERE userId = '${userId}'` // SQL injection risk!
```

**Protection**:

- Use Prisma queries (automatic escaping)
- If using raw SQL, use parameterized queries (`$queryRaw` with template literals)
- Never concatenate strings for SQL queries

---

### XSS (Cross-Site Scripting) Prevention

**React Protection**: React escapes all rendered values by default.

**Safe**:

```tsx
<div>{userInput}</div> // Automatically escaped
```

**Unsafe**:

```tsx
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // XSS risk!
```

**Rules**:

- Never use `dangerouslySetInnerHTML` with user input
- If HTML needed, use sanitization library (DOMPurify)
- Content Security Policy (CSP) headers as backup

**CSP Headers**:

```typescript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.anthropic.com https://api.openai.com;
  frame-src 'self' https://js.stripe.com;
`

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}
```

---

## API Security

### Rate Limiting

**Purpose**: Prevent abuse, DoS attacks, API cost exploitation.

**Implementation** (Upstash Redis):

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

// Different limits for different endpoints
const ratelimits = {
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  }),
  aiGeneration: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 AI requests per minute
  }),
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 login attempts per hour
  }),
}

// Middleware
export async function rateLimit(
  req: NextRequest,
  type: keyof typeof ratelimits = 'api'
) {
  const ip = req.ip ?? '127.0.0.1'
  const { success, limit, remaining, reset } = await ratelimits[type].limit(ip)

  if (!success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        limit,
        remaining,
        reset,
      },
      { status: 429 }
    )
  }

  return NextResponse.next()
}
```

**Rate Limit Tiers**:
| Tier | API Requests | AI Generation | Deployments |
|------|--------------|---------------|-------------|
| Free | 100/min | 10/min | 5/day |
| Pro | 500/min | 50/min | 50/day |
| Team | 2000/min | 200/min | 500/day |

---

### CSRF Protection

**Built-in**: NextAuth.js includes CSRF protection.

**Additional** (for API routes):

```typescript
// Use SameSite cookies (already configured)
// Verify Origin/Referer headers for state-changing requests

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const allowedOrigins = ['https://shipsensei.dev', 'http://localhost:3000']

  if (!allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // Process request
}
```

---

### CORS (Cross-Origin Resource Sharing)

**Configuration**:

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://shipsensei.dev',
          }, // Specific origin, not '*'
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ]
  },
}
```

**Rule**: Never use `Access-Control-Allow-Origin: *` in production.

---

## Data Security

### Encryption at Rest

**Database**: Neon provides encryption at rest (AES-256)

**File Storage**: Cloudflare R2 encryption (AES-256)

**Secrets**: Environment variables encrypted by Vercel

**User Secrets** (Environment variables for projects):

```typescript
import crypto from 'crypto'

// Encrypt user secrets before storing
function encryptSecret(secret: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex') // 32-byte key
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)

  let encrypted = cipher.update(secret, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return JSON.stringify({
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex'),
  })
}

function decryptSecret(encryptedData: string): string {
  const { iv, encrypted, authTag } = JSON.parse(encryptedData)
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex')

  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  )
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

---

### Encryption in Transit

**HTTPS Enforcement**:

- Vercel automatically provides SSL certificates (Let's Encrypt)
- All HTTP requests redirected to HTTPS
- TLS 1.3 (modern, secure)

**Certificate Pinning**: Not needed (Vercel handles)

---

### Secret Management

**Environment Variables**:

```bash
# .env.example (public, no secrets)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
```

**Vercel Environment Variables**:

- Stored encrypted
- Scoped (Development, Preview, Production)
- Injected at build/runtime

**Rules**:

- ❌ NEVER commit secrets to Git (.env in .gitignore)
- ❌ NEVER log secrets (mask in logs)
- ❌ NEVER expose secrets to client-side (use `NEXT_PUBLIC_` prefix only for public values)
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use different secrets for dev/prod

---

### Secret Detection

**Tool**: GitGuardian (GitHub integration)

**Pre-commit Hook**:

```bash
# .husky/pre-commit
#!/bin/sh

# Detect hardcoded secrets
if git diff --cached --name-only | xargs grep -E "(sk-|sk_test_|ghp_)" > /dev/null; then
  echo "ERROR: Potential secret detected!"
  exit 1
fi
```

---

## Code Security

### Dependency Scanning

**Tool**: Snyk (GitHub Actions integration)

**Workflow**:

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

**Policy**:

- **Critical vulnerabilities**: Block deployment
- **High vulnerabilities**: Require acknowledgment + remediation plan
- **Medium/Low**: Monitor, fix in regular releases

---

### Code Scanning

**Tool**: GitHub Advanced Security (CodeQL)

**Configuration**:

```yaml
# .github/workflows/codeql.yml
name: CodeQL
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript
      - uses: github/codeql-action/analyze@v2
```

**Detects**:

- SQL injection
- XSS vulnerabilities
- Path traversal
- Command injection
- Insecure randomness

---

### Generated Code Security

**Challenge**: Users' generated code might have security issues.

**Mitigation**:

**1. Static Analysis** (pre-deployment):

```typescript
async function scanGeneratedCode(code: string): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = []

  // Check for common patterns
  if (code.includes('eval(')) {
    issues.push({
      severity: 'critical',
      message: 'eval() detected',
      line: findLine(code, 'eval('),
    })
  }

  if (code.match(/innerHTML\s*=\s*[^`]/)) {
    issues.push({
      severity: 'high',
      message: 'Potential XSS via innerHTML',
      line: findLine(code, 'innerHTML'),
    })
  }

  if (code.match(/\$\{[^}]+\}/)) {
    issues.push({
      severity: 'medium',
      message: 'Template literal - ensure safe usage',
      line: findLine(code, '${'),
    })
  }

  // Run ESLint with security plugins
  const eslintResults = await runESLint(code)
  issues.push(...eslintResults)

  return issues
}
```

**2. Template Validation** (pre-generation):

- All templates reviewed by security team
- Templates updated when vulnerabilities discovered
- Version control for templates (rollback if needed)

**3. User Education** (in-app):

- Security tips shown during code generation
- Warnings for risky patterns
- Links to security best practices

---

## Deployment Security

### Environment Separation

**Environments**:

- **Development**: Local, relaxed security for DX
- **Preview**: Production-like, test security features
- **Production**: Full security, real data

**Configuration**:

```typescript
// config.ts
export const config = {
  env: process.env.NODE_ENV,
  security: {
    csrfProtection: process.env.NODE_ENV === 'production',
    strictCors: process.env.NODE_ENV === 'production',
    httpsOnly: process.env.NODE_ENV === 'production',
  },
}
```

---

### Secrets in CI/CD

**GitHub Actions Secrets**:

- Encrypted at rest
- Masked in logs
- Access controlled (org/repo level)

**Usage**:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
```

**Rules**:

- ❌ Never echo secrets in CI logs
- ✅ Use secrets for all sensitive values
- ✅ Rotate secrets if CI job logs leaked

---

### Deployment Validation

**Pre-Deploy Checks**:

```yaml
# .github/workflows/deploy.yml
jobs:
  security-checks:
    runs-on: ubuntu-latest
    steps:
      - name: Dependency Audit
        run: npm audit --audit-level=high
      - name: Security Scan
        run: npm run security:scan
      - name: Secrets Detection
        run: npm run security:secrets

  deploy:
    needs: security-checks
    runs-on: ubuntu-latest
    steps:
      - uses: vercel/actions/cli@v1
        with:
          args: deploy --prod
```

**Deployment Gates**:

- All security checks pass
- No critical/high vulnerabilities
- Tests pass (including security tests)

---

## Monitoring & Incident Response

### Security Monitoring

**Logging** (Sentry, Vercel Logs):

- Failed login attempts (detect brute force)
- Unauthorized access attempts (detect enumeration)
- Rate limit violations (detect abuse)
- Unusual API patterns (detect exploitation)

**Alerts** (PagerDuty):

- **Critical**: Account takeover, data breach, mass exploitation
- **High**: Vulnerability discovered, suspicious patterns
- **Medium**: Rate limit exceeded, failed deployments

---

### Incident Response Plan

**Phase 1: Detection** (Minutes)

- Alert triggered (Sentry, logs, user report)
- Incident commander assigned
- Initial assessment (severity, impact)

**Phase 2: Containment** (Minutes to Hours)

- Stop the bleeding (disable feature, block IPs, rotate secrets)
- Preserve evidence (logs, database snapshots)
- Notify stakeholders (internal team, affected users if needed)

**Phase 3: Eradication** (Hours to Days)

- Fix vulnerability (patch, update, remove)
- Verify fix (penetration test, security audit)
- Deploy fix (emergency deployment if critical)

**Phase 4: Recovery** (Hours to Days)

- Restore normal operations
- Monitor for recurrence
- Validate security posture

**Phase 5: Post-Mortem** (Days to Weeks)

- Root cause analysis
- Document lessons learned
- Update security practices
- Communicate to users (transparency)

**Contact**: security@shipsensei.dev

---

## Compliance & Privacy

### GDPR Compliance

**User Rights**:

- **Access**: Users can export their data (account, projects, usage)
- **Deletion**: Users can delete their account and all data
- **Portability**: Data export in JSON format
- **Consent**: Clear privacy policy, opt-in for marketing

**Implementation**:

```typescript
// API route: Export user data
export async function GET(req: NextRequest) {
  const session = await getServerSession()
  const userData = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { projects: true, usage: true },
  })

  return NextResponse.json(userData, {
    headers: {
      'Content-Disposition': 'attachment; filename="user-data.json"',
    },
  })
}

// API route: Delete user account
export async function DELETE(req: NextRequest) {
  const session = await getServerSession()

  // Cascade delete (Prisma handles via schema)
  await prisma.user.delete({
    where: { id: session.user.id },
  })

  // Delete files from storage
  await deleteUserFiles(session.user.id)

  return NextResponse.json({ success: true })
}
```

---

### Data Retention

**Policy**:

- **Active users**: Data retained indefinitely (while account active)
- **Deleted accounts**: Data deleted within 30 days
- **Backups**: 30-day retention (for disaster recovery)
- **Logs**: 90-day retention (for security analysis)

**Exception**: Legal hold (if required by law enforcement)

---

### Privacy Policy

**Key Points**:

- What data we collect (email, projects, usage metrics)
- Why we collect it (provide service, improve product)
- Who we share with (Vercel for hosting, Stripe for payments)
- How to delete data (in-app deletion, email request)
- Cookies usage (authentication, analytics)

**Transparency**: Privacy policy publicly accessible, plain language

---

## Security Checklist (MVP)

**Authentication**:

- [x] OAuth via GitHub/Google (NextAuth.js)
- [x] httpOnly cookies (no XSS risk)
- [x] Session expiration (30-day max)
- [x] Rate limiting on login (5 attempts/hour)

**Authorization**:

- [x] Resource-level checks (users can only access their projects)
- [x] Tier enforcement (project limits by tier)

**Input Validation**:

- [x] Zod schemas for all API routes
- [x] SQL injection prevention (Prisma ORM)
- [x] XSS prevention (React escaping + CSP headers)

**API Security**:

- [x] Rate limiting (Upstash Redis)
- [x] CORS configuration (specific origins)
- [x] Security headers (CSP, X-Frame-Options, etc.)

**Data Security**:

- [x] Encryption at rest (Neon, R2)
- [x] Encryption in transit (HTTPS, TLS 1.3)
- [x] Secret management (Vercel env vars, encryption for user secrets)

**Code Security**:

- [x] Dependency scanning (Snyk)
- [x] Secret detection (GitGuardian, pre-commit hooks)
- [x] Code scanning (CodeQL)

**Deployment**:

- [x] Environment separation (dev/preview/prod)
- [x] Pre-deploy security checks (CI/CD gates)

**Monitoring**:

- [x] Security logging (Sentry)
- [x] Incident response plan (documented)

**Compliance**:

- [x] GDPR compliance (data export, deletion)
- [x] Privacy policy (public)

---

## Future Security Enhancements (Post-MVP)

**Phase 2** (Growth):

- [ ] Multi-factor authentication (TOTP, SMS)
- [ ] Audit logs (comprehensive activity tracking)
- [ ] Security training (for generated code users)
- [ ] Penetration testing (annual external audit)

**Phase 3** (Scale):

- [ ] SOC 2 Type II compliance (enterprise requirement)
- [ ] Bug bounty program (HackerOne)
- [ ] Advanced threat detection (ML-based anomaly detection)
- [ ] Dedicated security team

---

## Security Contact

**Report Vulnerabilities**: security@shipsensei.dev

**Expected Response**:

- **Acknowledgment**: Within 24 hours
- **Initial assessment**: Within 72 hours
- **Fix timeline**: Based on severity (Critical: 7 days, High: 30 days, Medium: 90 days)

**Responsible Disclosure**: We appreciate responsible disclosure and will credit researchers (with permission) in our security acknowledgments.

---

**Last Review**: 2025-11-19
**Next Review**: Every 6 months or after security incident
**Owner**: Security Team (Brett Stark)
