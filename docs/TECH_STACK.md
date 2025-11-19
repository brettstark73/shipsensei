# ShipSensei - Technology Stack

**Version**: 1.0
**Last Updated**: 2025-11-19
**Decision Status**: Finalized

## Stack Overview

ShipSensei's technology stack is optimized for:
- **Beginner-friendly defaults** - Battle-tested, well-documented technologies
- **Development speed** - Fast iteration, hot reload, TypeScript safety
- **Cost efficiency** - Generous free tiers, serverless architecture
- **Production quality** - Enterprise-grade security, performance, scalability

## Frontend Stack

### Framework: Next.js 14 (App Router)

**Decision**: ✅ CHOSEN

**Rationale**:
- **SSR + SSG**: SEO-friendly out of the box (critical for marketing pages)
- **App Router**: React Server Components reduce client-side JavaScript
- **File-based routing**: Intuitive structure for beginners to understand
- **API Routes**: Eliminates need for separate backend initially
- **Vercel optimization**: First-class deployment experience
- **Huge ecosystem**: Largest React framework community, extensive learning resources

**Alternatives Considered**:
| Framework | Pros | Cons | Why Not? |
|-----------|------|------|----------|
| Remix | Excellent DX, nested routing | Smaller community, fewer templates | Less beginner content |
| SvelteKit | Fastest performance, simplest syntax | Smaller ecosystem | Harder to find developers later |
| Astro | Best for static sites | Limited for dynamic apps | Not suitable for SaaS |

**Version**: `next@14.2.0`

**Key Features Used**:
- App Router (stable)
- Server Actions (for form handling)
- Streaming (real-time AI responses)
- Middleware (auth, rate limiting)
- Image Optimization (automatic)

---

### Language: TypeScript

**Decision**: ✅ CHOSEN

**Rationale**:
- **Type safety**: Catch errors at compile time, not runtime
- **Better DX**: Autocomplete, refactoring, inline documentation
- **Industry standard**: Overwhelming preference in modern web development
- **Beginner-friendly**: Clear error messages help learning
- **Tooling**: Best-in-class editor support (VS Code)

**Configuration**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### UI Framework: React 18

**Decision**: ✅ CHOSEN (via Next.js)

**Rationale**:
- **Market leader**: Largest ecosystem, most jobs, best learning resources
- **Server Components**: Reduce client-side JavaScript automatically
- **Concurrent features**: Suspense, transitions for better UX
- **Stability**: Mature, battle-tested, clear upgrade paths

**Version**: `react@18.3.0`

---

### Styling: Tailwind CSS

**Decision**: ✅ CHOSEN

**Rationale**:
- **Utility-first**: Rapid prototyping without leaving HTML
- **Consistency**: Design system constraints prevent inconsistency
- **Performance**: Purges unused CSS automatically
- **DX**: Excellent VS Code extension, JIT mode for fast builds
- **Popularity**: Industry standard, huge community

**Configuration**:
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { /* brand colors */ },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};
```

**Alternatives Considered**:
| Solution | Pros | Cons | Why Not? |
|----------|------|------|----------|
| CSS Modules | True scoping, familiar CSS | Verbose, harder to maintain | Slower development |
| Styled Components | True CSS-in-JS | Runtime cost, complex setup | Performance overhead |
| Vanilla CSS | No dependencies | Hard to maintain at scale | Doesn't scale |

---

### Component Library: shadcn/ui

**Decision**: ✅ CHOSEN

**Rationale**:
- **Copy-paste components**: Own the code, no package dependency
- **Accessible**: Built on Radix UI primitives (WCAG compliant)
- **Customizable**: Full control over styling and behavior
- **TypeScript**: Fully typed, great DX
- **Tailwind-based**: Consistent with our styling approach

**Components Used**:
- Button, Input, Select, Dialog, Dropdown, Tabs
- Form components (integrated with React Hook Form)
- Data table (for project listings)
- Command palette (power user navigation)

**Alternatives Considered**:
| Library | Pros | Cons | Why Not? |
|---------|------|------|----------|
| Material UI | Comprehensive | Heavy, opinionated design | Not customizable enough |
| Chakra UI | Easy to use | Bundle size | Harder to customize |
| Mantine | Rich features | Less popular | Smaller ecosystem |

---

### State Management: Zustand

**Decision**: ✅ CHOSEN

**Rationale**:
- **Simple**: Minimal boilerplate, easy to learn
- **TypeScript-first**: Excellent type inference
- **No context needed**: Avoids re-render issues
- **Devtools**: Redux DevTools integration
- **Small bundle**: 1KB gzipped

**Usage**:
```typescript
// stores/projectStore.ts
import { create } from 'zustand';

interface ProjectState {
  currentProject: Project | null;
  setCurrentProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
}));
```

**Alternatives Considered**:
| Library | Pros | Cons | Why Not? |
|---------|------|------|----------|
| Redux Toolkit | Industry standard, DevTools | Boilerplate, complex | Overkill for our needs |
| Jotai | Atomic, flexible | Less familiar | Learning curve |
| Context API | Built-in | Re-render issues | Performance problems |

---

### Form Handling: React Hook Form + Zod

**Decision**: ✅ CHOSEN

**Rationale**:
- **Performance**: Minimal re-renders (uncontrolled inputs)
- **DX**: Simple API, excellent TypeScript support
- **Validation**: Zod integration for type-safe validation
- **Accessibility**: Built-in ARIA attributes
- **Small bundle**: 9KB gzipped

**Example**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export function ProjectForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  const onSubmit = (data: ProjectFormData) => {
    // Type-safe data
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}
```

---

### AI Integration: Vercel AI SDK

**Decision**: ✅ CHOSEN

**Rationale**:
- **Streaming**: Real-time AI responses (better UX)
- **Edge-ready**: Works on Vercel Edge Functions
- **Multi-provider**: Supports OpenAI, Anthropic, Cohere, etc.
- **UI components**: Pre-built chat interface
- **React hooks**: `useChat`, `useCompletion` simplify state management

**Example**:
```typescript
import { useChat } from 'ai/react';

export function RequirementsChat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat/requirements',
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.role}: {m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

---

## Backend Stack

### Runtime: Node.js 20

**Decision**: ✅ CHOSEN

**Rationale**:
- **Next.js requirement**: Native support in Next.js API routes
- **LTS**: Long-term support until 2026
- **Performance**: Fast execution, V8 optimizations
- **Ecosystem**: npm has everything we need

**Version**: `node@20.11.0` (LTS)

---

### API Framework: Next.js API Routes (App Router)

**Decision**: ✅ CHOSEN

**Rationale**:
- **Integrated**: Same codebase as frontend, no separate backend
- **Serverless**: Auto-scales, pay-per-request
- **Edge support**: Deploy globally for low latency
- **TypeScript**: End-to-end type safety
- **Simple deployment**: Single Vercel deployment

**Example**:
```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const validated = createProjectSchema.parse(body);

  const project = await db.project.create({
    data: { ...validated, userId: session.user.id },
  });

  return NextResponse.json(project, { status: 201 });
}
```

**Alternatives Considered**:
| Framework | Pros | Cons | Why Not? |
|-----------|------|------|----------|
| Express.js | Familiar, flexible | Separate deployment, more setup | Extra complexity |
| tRPC | End-to-end type safety | Harder for beginners | Adds abstraction layer |
| GraphQL | Flexible queries | Over-engineered for our use case | Too complex |

---

### ORM: Prisma

**Decision**: ✅ CHOSEN

**Rationale**:
- **Type-safe**: Auto-generated types from schema
- **Great DX**: Intuitive API, excellent autocomplete
- **Migrations**: Built-in migration system
- **Prisma Studio**: Visual database browser
- **Wide support**: PostgreSQL, MySQL, SQLite, MongoDB

**Example**:
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  projects  Project[]
  createdAt DateTime @default(now())
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Usage**:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type-safe queries
const projects = await prisma.project.findMany({
  where: { userId: 'user123' },
  include: { user: true },
});
```

**Alternatives Considered**:
| ORM | Pros | Cons | Why Not? |
|-----|------|------|----------|
| Drizzle | Lightweight, SQL-like | Newer, less mature | Less documentation |
| TypeORM | Feature-rich | Complex, verbose | Steeper learning curve |
| Kysely | Type-safe SQL builder | Lower-level | More manual work |

---

## Database Stack

### Primary Database: PostgreSQL (Neon)

**Decision**: ✅ CHOSEN

**Provider**: Neon (serverless Postgres)

**Rationale**:
- **Serverless**: Auto-scaling, pay-per-use
- **PostgreSQL**: Industry-standard relational database
- **Generous free tier**: 500MB storage, unlimited projects
- **Branching**: Database branches for development
- **Low latency**: Edge-optimized connections

**Pricing**:
- Free: 500MB, 0.5 compute units
- Scale: $19/mo, 10GB, autoscaling compute
- Business: $69/mo, 50GB, higher performance

**Alternatives Considered**:
| Database | Pros | Cons | Why Not? |
|----------|------|------|----------|
| Supabase Postgres | Includes auth, realtime | More expensive at scale | We use NextAuth instead |
| PlanetScale | MySQL, great free tier | MySQL syntax differences | Prefer Postgres |
| MongoDB | Flexible schema | NoSQL not ideal for relational data | Relational model fits better |

---

### Caching: Upstash Redis

**Decision**: ✅ CHOSEN

**Rationale**:
- **Serverless**: Pay-per-request, no idle costs
- **Global**: Replicas in multiple regions
- **REST API**: Works in serverless environments (no persistent connections)
- **Free tier**: 10K requests/day

**Use Cases**:
- Session storage (NextAuth.js)
- Rate limiting (API throttling)
- Cache LLM responses (common requests)
- Cache tech stack recommendations

**Example**:
```typescript
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Cache tech stack recommendation
await redis.set(
  `stack:${requirementsHash}`,
  JSON.stringify(recommendation),
  { ex: 3600 } // 1 hour TTL
);

// Retrieve cached recommendation
const cached = await redis.get(`stack:${requirementsHash}`);
```

---

### File Storage: Cloudflare R2

**Decision**: ✅ CHOSEN

**Rationale**:
- **S3-compatible**: Easy migration if needed
- **Zero egress fees**: Unlike S3 ($0.09/GB)
- **Global CDN**: Fast access worldwide
- **Free tier**: 10GB storage, 1M requests/mo

**Use Cases**:
- Generated project code (zip archives)
- User-uploaded assets (images, files)
- Template storage (code templates)
- Backups (project snapshots)

**Alternatives Considered**:
| Storage | Pros | Cons | Why Not? |
|---------|------|------|----------|
| AWS S3 | Industry standard | Egress fees expensive | Cost prohibitive at scale |
| Vercel Blob | Integrated with Vercel | Expensive ($0.15/GB) | R2 is 75% cheaper |
| Supabase Storage | Includes in Supabase plan | Less flexible | Using Neon instead |

---

## AI/LLM Stack

### Primary LLM: Anthropic Claude

**Decision**: ✅ CHOSEN

**Model**: `claude-3-5-sonnet-20241022`

**Rationale**:
- **Best for reasoning**: Superior code understanding and generation
- **Longer context**: 200K tokens (handle large codebases)
- **Safety**: Strong instruction following, less prone to jailbreaks
- **Streaming**: Excellent real-time response quality

**Pricing**:
- Input: $3 / 1M tokens
- Output: $15 / 1M tokens
- Typical project creation: ~20K tokens ($0.30)

**Use Cases**:
- Requirements generation (conversation)
- Tech stack recommendations (structured reasoning)
- Code review (deep understanding)
- Explanations (teaching mode)

---

### Secondary LLM: OpenAI GPT-4

**Decision**: ✅ CHOSEN (for specific tasks)

**Model**: `gpt-4-turbo`

**Rationale**:
- **Code generation**: Slightly better for complex code
- **Function calling**: Excellent for structured outputs
- **Fallback**: Redundancy if Claude unavailable

**Pricing**:
- Input: $10 / 1M tokens
- Output: $30 / 1M tokens

**Use Cases**:
- Code generation (specific features)
- Structured data extraction
- Backup provider

**Strategy**: A/B test Claude vs GPT-4 for code generation, choose winner.

---

## Authentication & Security

### Auth: NextAuth.js (Auth.js v5)

**Decision**: ✅ CHOSEN

**Rationale**:
- **OAuth providers**: GitHub, Google, etc. built-in
- **Magic links**: Passwordless email authentication
- **Session management**: JWT or database sessions
- **Middleware**: Protect routes easily
- **TypeScript**: Fully typed

**Providers**:
- GitHub OAuth (primary for developers)
- Google OAuth (broad appeal)
- Magic link email (fallback, no OAuth dependency)

**Example**:
```typescript
// auth.config.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
```

---

### Security Scanning: Snyk

**Decision**: ✅ CHOSEN

**Rationale**:
- **Dependency scanning**: Detects known CVEs
- **Code scanning**: Finds security issues in code
- **License compliance**: Checks OSS licenses
- **Fix PRs**: Auto-generates update PRs
- **Free for open source**: ShipSensei core is open source

**Integration**: GitHub Actions (automated on every PR)

**Alternatives**: npm audit (less comprehensive), Socket.dev (focused on supply chain)

---

## Deployment & Hosting

### Hosting: Vercel

**Decision**: ✅ CHOSEN

**Rationale**:
- **Next.js native**: Built by same team, perfect integration
- **Zero config**: Push to GitHub, auto-deploys
- **Edge network**: Global CDN, low latency worldwide
- **Preview deployments**: Every PR gets unique URL
- **Automatic HTTPS**: SSL certificates included
- **Generous free tier**: Hobby plan sufficient for MVP

**Pricing**:
- Hobby: $0 (personal projects, 100GB bandwidth/mo)
- Pro: $20/user/mo (commercial use, 1TB bandwidth/mo)
- Enterprise: Custom (SLA, advanced security)

**Alternatives Considered**:
| Platform | Pros | Cons | Why Not? |
|----------|------|------|----------|
| Netlify | Similar features | Less Next.js optimized | Vercel is better for Next.js |
| Railway | Full-stack, databases | More complex setup | Overkill for serverless app |
| Cloudflare Pages | Excellent performance | Limited server-side | Need API routes |

---

### CI/CD: GitHub Actions

**Decision**: ✅ CHOSEN

**Rationale**:
- **Free**: Unlimited minutes for public repos
- **Integrated**: Already using GitHub for code
- **Flexible**: YAML configuration, huge marketplace
- **Fast**: Parallel jobs, caching

**Workflows**:
- **CI**: Lint, type-check, test, build (on every PR)
- **Security**: Snyk scan, secret detection (on push)
- **Deploy**: Vercel deployment (on merge to main)

---

## Monitoring & Analytics

### Error Tracking: Sentry

**Decision**: ✅ CHOSEN

**Rationale**:
- **Industry standard**: Best error tracking available
- **Source maps**: Show original TypeScript code in errors
- **Performance monitoring**: APM for backend
- **Free tier**: 5K errors/mo (sufficient for MVP)

**Integration**:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

---

### Analytics: PostHog

**Decision**: ✅ CHOSEN

**Rationale**:
- **Open source**: Can self-host if needed
- **Product analytics**: User behavior, funnels, retention
- **Feature flags**: A/B testing, gradual rollouts
- **Privacy-friendly**: GDPR compliant, EU hosting
- **Free tier**: 1M events/mo

**Events Tracked**:
- User signup, login
- Project created, deployed
- Feature usage (code generation, security scan)
- Conversion events (free → pro)

**Alternatives Considered**:
| Tool | Pros | Cons | Why Not? |
|------|------|------|----------|
| Google Analytics | Free, familiar | Privacy concerns, basic features | PostHog more powerful |
| Mixpanel | Great product analytics | Expensive | PostHog free tier better |
| Plausible | Privacy-first, simple | Limited features | Too basic |

---

## Email & Communication

### Email: Resend

**Decision**: ✅ CHOSEN

**Rationale**:
- **Developer-friendly**: Modern API, excellent DX
- **React Email**: Type-safe, beautiful email templates
- **Reliable**: Built by former Postmark team
- **Free tier**: 100 emails/day, 3K/mo

**Email Templates** (React Email):
```tsx
import { Html, Button } from '@react-email/components';

export function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html>
      <h1>Welcome to ShipSensei, {name}!</h1>
      <p>Let's build your first project.</p>
      <Button href="https://shipsensei.dev/projects/new">
        Start building
      </Button>
    </Html>
  );
}
```

**Alternatives Considered**:
| Service | Pros | Cons | Why Not? |
|---------|------|------|----------|
| SendGrid | Established, reliable | Complex API, expensive | Poor DX |
| Postmark | Excellent deliverability | More expensive | Resend is better DX |
| AWS SES | Very cheap | Complex setup, poor DX | Too much work |

---

## Payments

### Payment Processing: Stripe

**Decision**: ✅ CHOSEN

**Rationale**:
- **Industry standard**: Trusted by users
- **Excellent docs**: Best-in-class developer experience
- **Subscription support**: Built-in recurring billing
- **Customer portal**: Self-service billing
- **PCI compliance**: Handled by Stripe

**Pricing**:
- 2.9% + 30¢ per transaction
- No monthly fees

**Integration**: Stripe Checkout (hosted payment page), Webhooks (subscription events)

---

## Development Tools

### Package Manager: pnpm

**Decision**: ✅ CHOSEN

**Rationale**:
- **Fast**: 2x faster than npm, hard links instead of copying
- **Disk efficient**: Single store for all dependencies
- **Strict**: Better dependency resolution than npm/yarn
- **Monorepo support**: Built-in workspace support

**Alternatives**: npm (slower, more disk), yarn (deprecated)

---

### Code Quality: ESLint + Prettier

**Decision**: ✅ CHOSEN

**ESLint**:
- Next.js config (`eslint-config-next`)
- TypeScript rules (`@typescript-eslint`)
- Accessibility rules (`eslint-plugin-jsx-a11y`)

**Prettier**:
- Automatic formatting (on save)
- Pre-commit hook (Husky + lint-staged)

---

### Git Hooks: Husky + lint-staged

**Decision**: ✅ CHOSEN

**Purpose**: Run linting, type-checking, tests before commit

**Configuration**:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## Complete Dependency List

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.9.0",
    "next-auth": "^5.0.0-beta.4",
    "zod": "^3.22.4",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.4",
    "ai": "^3.0.0",
    "@anthropic-ai/sdk": "^0.17.0",
    "openai": "^4.28.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "tailwindcss": "^3.4.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1",
    "zustand": "^4.5.0",
    "@upstash/redis": "^1.28.2",
    "@sentry/nextjs": "^7.100.0",
    "posthog-js": "^1.108.0",
    "resend": "^3.2.0",
    "react-email": "^2.0.0",
    "stripe": "^14.14.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.48",
    "prisma": "^5.9.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.2.0",
    "prettier": "^3.2.4",
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0",
    "@playwright/test": "^1.41.0"
  }
}
```

---

## Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:pass@host:5432/shipsensei"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
GITHUB_CLIENT_ID="your-github-oauth-app-id"
GITHUB_CLIENT_SECRET="your-github-oauth-app-secret"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# AI/LLM
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."

# Redis
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Storage
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="shipsensei-storage"

# Monitoring
SENTRY_DSN="https://...@sentry.io/..."
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Payments
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email
RESEND_API_KEY="re_..."
```

---

## Technology Decision Matrix

| Category | Choice | Confidence | Risk |
|----------|--------|------------|------|
| Frontend Framework | Next.js 14 | 🟢 High | Low |
| Language | TypeScript | 🟢 High | Low |
| Styling | Tailwind CSS | 🟢 High | Low |
| Component Library | shadcn/ui | 🟢 High | Low |
| State Management | Zustand | 🟢 High | Low |
| Backend | Next.js API Routes | 🟢 High | Low |
| Database | PostgreSQL (Neon) | 🟢 High | Low |
| ORM | Prisma | 🟢 High | Low |
| Cache | Upstash Redis | 🟢 High | Low |
| File Storage | Cloudflare R2 | 🟡 Medium | Low |
| Primary LLM | Anthropic Claude | 🟢 High | Medium* |
| Secondary LLM | OpenAI GPT-4 | 🟢 High | Medium* |
| Auth | NextAuth.js v5 | 🟡 Medium | Medium** |
| Hosting | Vercel | 🟢 High | Low |
| CI/CD | GitHub Actions | 🟢 High | Low |
| Error Tracking | Sentry | 🟢 High | Low |
| Analytics | PostHog | 🟢 High | Low |
| Email | Resend | 🟢 High | Low |
| Payments | Stripe | 🟢 High | Low |

**Risk Notes**:
- *LLM Risk: API costs could spiral, quality variations. **Mitigation**: Caching, fallbacks, budget alerts.
- **NextAuth Risk: v5 is beta. **Mitigation**: Well-tested beta, stable API, large community.

---

## Migration & Upgrade Strategy

### LLM Provider Flexibility

**Abstraction Layer**:
```typescript
// lib/ai/client.ts
interface LLMProvider {
  generateCompletion(prompt: string, options: CompletionOptions): Promise<string>;
  streamCompletion(prompt: string, options: CompletionOptions): ReadableStream;
}

class AnthropicProvider implements LLMProvider { /* ... */ }
class OpenAIProvider implements LLMProvider { /* ... */ }

export function getLLMProvider(task: AITask): LLMProvider {
  // Route based on task type, costs, availability
  if (task === 'code') return new OpenAIProvider();
  return new AnthropicProvider();
}
```

**Benefits**: Easy to swap providers, test alternatives, avoid lock-in.

---

### Database Scaling

**Current**: Neon (serverless Postgres)

**Growth Path** (if needed):
1. **Neon Pro**: More compute, storage, connections
2. **Supabase Pro**: If we need built-in realtime/auth
3. **Self-hosted Postgres**: For enterprise, full control

**Migration**: Prisma makes this easy (change `DATABASE_URL`, run migrations)

---

### Hosting Alternatives

**Current**: Vercel

**Alternatives** (if needed):
- **Cloudflare Pages**: Cheaper at scale, excellent performance
- **Self-hosted**: Docker + Kubernetes for complete control
- **Railway**: For full-stack with database included

**Migration**: Next.js is portable, can deploy anywhere Node.js runs.

---

## Development Workflow

### Local Development

```bash
# Clone repo
git clone https://github.com/shipsensei/shipsensei.git
cd shipsensei

# Install dependencies
pnpm install

# Setup database
pnpm prisma migrate dev

# Start dev server
pnpm dev
```

**Hot Reload**: Instant feedback on code changes
**Type Safety**: Compile errors shown immediately
**API Testing**: Use Postman or `curl` for API routes

---

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm type-check

# Linting
pnpm lint
```

---

### Deployment

```bash
# Automatic on push to main (via Vercel GitHub integration)
git push origin main

# Manual (if needed)
vercel deploy --prod
```

---

## Conclusion

This tech stack is optimized for:
- **Speed**: Fast development, fast deployment, fast iteration
- **Quality**: Type safety, automated testing, security scanning
- **Cost**: Generous free tiers, serverless economics
- **Scale**: Proven technologies that scale to millions of users
- **Beginner-Friendly**: Excellent documentation, large communities, clear error messages

**Total Initial Cost**: ~$220/mo (mostly LLM API)
**Time to MVP**: 2-3 months (with focused effort)
**Confidence**: 🟢 High - All technologies are battle-tested, production-proven

**Next Steps**:
1. Setup local development environment
2. Initialize project with chosen stack
3. Build proof of concept (requirements wizard)
4. Iterate based on user feedback
