# CLAUDE.md - AI Assistant Guide for ShipSensei

This document provides AI assistants with comprehensive information about the ShipSensei codebase, architecture, conventions, and workflows.

## Project Overview

**ShipSensei** is an AI-powered mentorship platform that guides complete beginners from idea to launched product. It provides end-to-end guidance through requirements discovery, tech stack recommendations, project scaffolding, development assistance, and deployment.

**Target Users**: Non-technical founders, creators, and entrepreneurs
**Core Value**: Democratize software development through intelligent mentorship
**Current Status**: Early Development / MVP Foundation (Week 1)

### Business Model

- **FREE**: 1 active project, community support, deploy to free tier
- **PRO** ($19/mo): 5 projects, priority support, custom domains
- **TEAM** ($49/mo): Unlimited projects, team collaboration, white-label

## Repository Structure

```
shipsensei/
├── .github/
│   └── workflows/
│       └── quality.yml          # CI/CD quality checks
├── .husky/
│   └── pre-commit               # Git pre-commit hooks
├── docs/                        # Project documentation
│   ├── MVP.md                   # MVP roadmap (4-week plan)
│   ├── ROADMAP.md               # Long-term roadmap
│   ├── SECURITY.md              # Security essentials
│   ├── STACK.md                 # Tech stack decisions
│   └── VISION.md                # Project vision
├── prisma/
│   └── schema.prisma            # Database schema (Postgres)
├── projects/
│   └── create-quality-automation/  # Quality automation CLI
├── src/
│   ├── app/                     # Next.js 14 App Router
│   │   ├── page.tsx             # Home page
│   │   ├── layout.tsx           # Root layout
│   │   └── api/
│   │       └── auth/[...nextauth]/  # NextAuth.js routes
│   ├── lib/                     # Shared utilities
│   │   ├── auth.config.ts       # NextAuth configuration
│   │   ├── auth-provider.tsx    # Auth context provider
│   │   └── prisma.ts            # Prisma client singleton
│   └── types/                   # TypeScript type definitions
│       └── next-auth.d.ts       # NextAuth type extensions
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── eslint.config.cjs            # ESLint 9 configuration
├── .prettierrc                  # Prettier configuration
├── .stylelintrc.json            # Stylelint configuration
└── .env.example                 # Environment variable template
```

## Tech Stack

### Core Technologies

- **Framework**: Next.js 14.2.18 (App Router)
- **Language**: TypeScript 5+ (strict mode enabled)
- **Runtime**: Node.js 20.11.1 (via Volta)
- **Package Manager**: npm (10.2.4)

### Frontend

- **UI Library**: React 18.3.1
- **Styling**: Tailwind CSS 3.4.1
- **Component Library**: shadcn/ui (planned)

### Backend

- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Prisma 7.0.0
- **Authentication**: NextAuth.js 4.24.13
  - Providers: GitHub OAuth, Google OAuth
  - Strategy: Database sessions (not JWT)
  - Adapter: Prisma Adapter

### AI/LLM

- **Primary**: Anthropic Claude (best reasoning)
- **Fallback**: OpenAI GPT-4
- **Use Cases**: Requirements discovery, tech stack recommendations, code generation

### Development Tools

- **Linting**: ESLint 8 with TypeScript support
- **Formatting**: Prettier 3.3.3
- **CSS Linting**: Stylelint 16.8.0
- **Git Hooks**: Husky 9.1.4 + lint-staged 15.2.10
- **Performance**: Lighthouse CI (@lhci/cli 0.14.0)

### Deployment & Infrastructure

- **Hosting**: Vercel (zero-config)
- **Database**: Neon (serverless Postgres)
- **CDN**: Vercel Edge Network
- **SSL**: Automatic via Vercel

### Future Additions (Not Yet Implemented)

- **Caching**: Upstash Redis
- **Storage**: Cloudflare R2
- **Monitoring**: Sentry (error tracking), PostHog (analytics)
- **Payments**: Stripe
- **Email**: Resend with React Email

## Database Schema

### Authentication Models (NextAuth.js)

```prisma
User
├── id: String (cuid)
├── name: String?
├── email: String (unique)
├── emailVerified: DateTime?
├── image: String?
├── createdAt: DateTime
├── updatedAt: DateTime
├── accounts: Account[]
├── sessions: Session[]
└── projects: Project[]

Account (OAuth providers)
Session (user sessions)
VerificationToken (email verification)
```

### ShipSensei Models

```prisma
Project
├── id: String (cuid)
├── name: String
├── description: String?
├── userId: String (FK → User)
├── status: String (draft|generating|ready|deployed)
├── techStack: String? (Text)
├── repository: String?
├── deployment: String?
├── createdAt: DateTime
├── updatedAt: DateTime
├── user: User
└── requirements: Requirement[]

Requirement
├── id: String (cuid)
├── projectId: String (FK → Project)
├── question: String (Text)
├── answer: String? (Text)
├── order: Int
├── createdAt: DateTime
├── updatedAt: DateTime
└── project: Project
```

## Development Workflows

### Initial Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/shipsensei.git
cd shipsensei

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with actual credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev              # Start development server (localhost:3000)
npm run build            # Build production bundle
npm run start            # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without changes
npm run prepare          # Install Husky hooks

# Security & Quality
npm run security:audit   # Check for vulnerable dependencies
npm run security:secrets # Scan for hardcoded secrets
npm run security:config  # Run security config validation
npm run validate:docs    # Validate documentation
npm run validate:comprehensive  # Comprehensive validation
npm run validate:all     # All validation checks

# Performance
npm run lighthouse:ci    # Run Lighthouse CI checks
npm run lighthouse:upload  # Upload Lighthouse results
```

### Git Workflow

1. **Feature Branches**: Create from `main` with descriptive names
2. **Commits**: Use conventional commit messages:
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `test:` - Test additions/changes
   - `chore:` - Maintenance tasks
   - `refactor:` - Code refactoring
   - `style:` - Formatting changes
3. **Pre-commit Hooks**: Automatically run lint-staged
   - ESLint auto-fix
   - Prettier formatting
   - Stylelint auto-fix
4. **CI/CD**: GitHub Actions runs on push/PR (quality.yml)

### CI/CD Pipeline (.github/workflows/quality.yml)

Runs on: `push` and `pull_request` to `main`, `master`, `develop`

**Quality Checks:**

1. Dependency integrity verification
2. Prettier formatting check
3. ESLint (max warnings: 0)
4. Stylelint
5. Security audit (high-level vulnerabilities)
6. Hardcoded secrets detection
7. XSS vulnerability pattern detection
8. Input validation checks
9. Configuration security validation
10. Documentation validation
11. Lighthouse CI (performance)

**Security Patterns Detected:**

- `innerHTML` with template literal interpolation
- `eval()` with interpolation
- `document.write()` with interpolation
- `onclick` handlers with interpolation
- Hardcoded secrets (passwords, keys, tokens)
- Private keys in codebase

## Code Conventions

### TypeScript

- **Strict Mode**: Enabled (`strict: true`)
- **Path Aliases**: `@/*` → `./src/*`
- **File Extensions**: `.ts` for modules, `.tsx` for React components
- **Type Safety**: Prefer interfaces over types for objects
- **No `any`**: Use `unknown` or proper types

### React/Next.js Patterns

```typescript
// Server Components (default in App Router)
export default function Page() {
  // Async components allowed
  return <div>...</div>
}

// Client Components (when needed)
'use client'
export default function InteractiveComponent() {
  const [state, setState] = useState()
  return <div>...</div>
}

// API Routes (app/api/*)
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: ... })
}
```

### Authentication Patterns

```typescript
// Protect API routes
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Always filter by user ID
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId: session.user.id, // CRITICAL: Prevent unauthorized access
    },
  })

  return NextResponse.json({ project })
}
```

### Database Access

```typescript
// Use Prisma client singleton (src/lib/prisma.ts)
import { prisma } from '@/lib/prisma'

// Always use prepared statements (Prisma handles this)
const projects = await prisma.project.findMany({
  where: { userId: session.user.id },
  include: { requirements: true },
})

// Use transactions for related operations
await prisma.$transaction([
  prisma.project.create({ data: projectData }),
  prisma.requirement.createMany({ data: requirementsData }),
])
```

### Security Best Practices

#### Input Validation

- **Use Zod schemas** for all API inputs
- **Validate string lengths** (prevent DoS)
- **Sanitize user inputs** before storage
- **Never trust client data**

#### XSS Prevention

- ❌ **NEVER use** `dangerouslySetInnerHTML`
- ❌ **NEVER use** `eval()` with user input
- ❌ **NEVER use** `innerHTML` with interpolation
- ✅ **Use** React's automatic escaping
- ✅ **Use** DOMPurify if HTML rendering required

#### Authentication & Authorization

- ✅ **OAuth only** (no password storage)
- ✅ **httpOnly cookies** (prevent XSS token theft)
- ✅ **Check session** on every API route
- ✅ **Filter queries** by `userId`
- ✅ **HTTPS only** (Vercel enforces)

#### Secrets Management

- ✅ **Environment variables** for all secrets
- ✅ **Never commit** `.env` or `.env.local`
- ✅ **Use `.env.example`** as template
- ✅ **Rotate API keys** every 90 days
- ❌ **Never hardcode** credentials in code

#### Rate Limiting (Planned)

- Max 100 API requests/min per user
- Max 10 AI generations/min
- Max 5 deployments/hour

### Styling Conventions

- **Tailwind Utility Classes**: Prefer utility classes over custom CSS
- **Component Composition**: Use Tailwind's composition patterns
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Will use Tailwind's dark mode utilities

### File Naming

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **API Routes**: kebab-case (e.g., `user-projects.ts`)
- **Types**: PascalCase (e.g., `UserTypes.ts`)

### Code Organization

```
src/
├── app/              # Routes and pages
├── components/       # Reusable React components (future)
├── lib/              # Utilities and configurations
├── hooks/            # Custom React hooks (future)
├── types/            # TypeScript types/interfaces
└── styles/           # Global styles (future)
```

## Common Tasks

### Adding a New API Route

1. Create file in `src/app/api/[route]/route.ts`
2. Implement HTTP methods (GET, POST, PUT, DELETE)
3. Add authentication check with `getServerSession()`
4. Validate inputs with Zod schema
5. Filter database queries by `userId`
6. Return JSON responses with proper status codes

### Adding a New Page

1. Create file in `src/app/[route]/page.tsx`
2. Use Server Component by default
3. Add `'use client'` only if interactive state needed
4. Import styles and components
5. Add metadata with Next.js `Metadata` API

### Adding a New Database Model

1. Update `prisma/schema.prisma`
2. Add relations to existing models
3. Run `npx prisma migrate dev --name descriptive_name`
4. Update TypeScript types if needed
5. Run `npx prisma generate` to update client

### Running Database Migrations

```bash
# Development migration
npx prisma migrate dev --name migration_description

# Production migration
npx prisma migrate deploy

# Reset database (caution!)
npx prisma migrate reset

# Generate Prisma Client after schema changes
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio
```

### Adding Environment Variables

1. Add to `.env.example` with placeholder
2. Add to `.env.local` with actual value
3. Add to Vercel environment variables
4. Use in code: `process.env.VARIABLE_NAME`
5. Never commit `.env.local`

### Debugging

```bash
# View server logs
npm run dev  # Check terminal output

# Database inspection
npx prisma studio  # Opens GUI at localhost:5555

# Type checking
npx tsc --noEmit

# Check build errors
npm run build
```

## Important Files & Configurations

### TypeScript Configuration (tsconfig.json)

- **Strict mode**: Enabled
- **Path aliases**: `@/*` maps to `./src/*`
- **JSX**: Preserve (Next.js handles transformation)
- **Module resolution**: Bundler mode

### ESLint Configuration (eslint.config.cjs)

- **Base**: ESLint 9 flat config
- **Security Plugin**: `eslint-plugin-security`
- **Key Rules**:
  - `no-eval`: error
  - `no-implied-eval`: error
  - `no-new-func`: error
  - `security/detect-eval-with-expression`: error
  - `security/detect-unsafe-regex`: error

### Prettier Configuration (.prettierrc)

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 80
}
```

### Husky + lint-staged

- **Pre-commit hook**: Runs lint-staged
- **Staged files**: Auto-fix linting, format with Prettier
- **Prevents commits**: If linting/formatting fails

## MVP Roadmap (Current Focus)

### Week 1-2: Requirements Chat ✓ (Foundation Complete)

- Database schema designed
- Authentication implemented
- Project scaffolding complete

### Week 2: Tech Stack Picker (Next)

- Build recommendation engine
- One opinionated stack: Next.js + Tailwind + Prisma + Neon + Vercel

### Week 3: Project Generator

- Template-based generation
- AI customization layer
- GitHub repository creation

### Week 3-4: One-Click Deploy

- Vercel integration
- Environment variable setup
- Return live URL

### Week 4: Landing Page

- Goal: 500 waitlist signups
- Problem/solution presentation
- Demo video
- Email collection

## Key Principles for AI Assistants

### When Making Changes

1. **Read before writing**: Always read existing files before modifying
2. **Follow conventions**: Match existing code style and patterns
3. **Security first**: Never introduce vulnerabilities
4. **Type safety**: Ensure TypeScript types are correct
5. **Test locally**: Verify changes work before committing
6. **Update docs**: Keep documentation in sync with code

### What NOT to Do

- ❌ Don't bypass authentication checks
- ❌ Don't use `any` types in TypeScript
- ❌ Don't hardcode secrets or credentials
- ❌ Don't skip input validation
- ❌ Don't introduce XSS vulnerabilities
- ❌ Don't commit `.env.local` files
- ❌ Don't disable security linting rules
- ❌ Don't use `dangerouslySetInnerHTML`

### Code Review Checklist

- [ ] Authentication check present in API routes
- [ ] Database queries filtered by `userId`
- [ ] Inputs validated with Zod or similar
- [ ] No hardcoded secrets
- [ ] TypeScript types are correct
- [ ] Error handling implemented
- [ ] Security patterns followed
- [ ] Code formatted with Prettier
- [ ] ESLint passes with 0 warnings

## Resources

### Documentation

- `/docs/MVP.md` - MVP scope and timeline
- `/docs/STACK.md` - Tech stack decisions and rationale
- `/docs/SECURITY.md` - Security best practices
- `/docs/ROADMAP.md` - Long-term project roadmap
- `/docs/VISION.md` - Project vision and goals
- `CONTRIBUTING.md` - Contribution guidelines
- `CODE_OF_CONDUCT.md` - Community guidelines

### External Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## Contact & Support

- **Repository**: https://github.com/[username]/shipsensei
- **Issues**: GitHub Issues
- **Security**: security@shipsensei.dev (planned)
- **Discord**: Community server (coming soon)

---

**Last Updated**: 2025-11-19
**Version**: 0.1.0 (MVP Foundation)
**Status**: Early Development

_This document is maintained automatically. When making significant changes to the codebase structure, conventions, or workflows, please update this file accordingly._
