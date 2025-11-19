# ShipSensei - Tech Stack

**Philosophy**: Battle-tested only. No bleeding edge. Optimize for speed of shipping, not perfection.

## What We Use (No Alternatives)

### Frontend: Next.js 14 + TypeScript

**Why**:

- Largest React framework (best docs, most jobs, easiest to hire later)
- Vercel deployment = zero config
- SSR = good SEO (for landing page)

**Not considering**: Remix, SvelteKit (smaller ecosystems)

### Styling: Tailwind CSS + shadcn/ui

**Why**:

- Fast to prototype
- Looks good by default with shadcn
- Industry standard

**Not considering**: CSS Modules, Styled Components (slower)

### Database: Neon (Serverless Postgres)

**Why**:

- Serverless = pay per use (cheap at start)
- Postgres = industry standard
- Free tier = perfect for MVP

**Not considering**: Supabase (more expensive), MongoDB (relational fits better)

### ORM: Prisma

**Why**:

- Type-safe
- Great DX
- Auto-migrations

**Not considering**: Drizzle (newer, less docs)

### AI: Anthropic Claude + OpenAI GPT-4

**Why**:

- Claude = best reasoning (requirements, recommendations)
- GPT-4 = backup + specific tasks
- Fallback if one is down

**Cost**: ~$0.30 per project generation (acceptable)

### Auth: NextAuth.js

**Why**:

- OAuth only (GitHub, Google) = no passwords to manage
- Free
- Well-documented

### Payments: Stripe

**Why**:

- Industry standard
- Best docs
- Trusted by users

### Hosting: Vercel

**Why**:

- Zero-config Next.js deployment
- Free tier = generous
- We deploy user projects here too

### Analytics: PostHog

**Why**:

- Open source option (can self-host)
- Free tier = enough for MVP
- Product analytics + feature flags

### Error Tracking: Sentry

**Why**:

- Free tier = 5K errors/month
- Best error debugging
- Source maps support

### Email: Resend

**Why**:

- Modern API
- React Email templates (type-safe)
- Free tier = 100/day

## What We Generate for Users

**User projects get**:

- Next.js 14 (same stack we use)
- Tailwind CSS
- Prisma + Neon
- Vercel deployment config
- create-quality-automation (ESLint, Prettier, Husky)

**One stack only for MVP.** We can add options later.

## Development Tools

- **Package Manager**: pnpm (fast, efficient)
- **Editor**: VS Code (assume users have this)
- **Git**: GitHub (OAuth + deployment integration)
- **CI/CD**: GitHub Actions (free for public repos)

## Costs (Monthly)

**MVP / Free Tier**:

- Vercel: $0 (hobby)
- Neon: $0 (500MB)
- Anthropic API: ~$200 (10K generations)
- Total: **~$200/month**

**Break-even**: ~10 PRO users ($19/mo each)

## What We're NOT Using

❌ GraphQL (REST is simpler)
❌ tRPC (adds complexity)
❌ Microservices (monolith first)
❌ Docker (Vercel handles deployment)
❌ Kubernetes (not at this scale)
❌ Redis (Vercel caching is enough)

**Keep it simple. Add complexity only when needed.**

## Decision Log

**Why Next.js over Remix?**

- 10x larger ecosystem
- Better Vercel integration
- More future hiring options

**Why Neon over Supabase?**

- Cheaper at scale
- Using NextAuth anyway (don't need Supabase auth)

**Why Claude over GPT-4 only?**

- Better reasoning for requirements
- Longer context (200K tokens)
- GPT-4 as fallback = reliability

## Stack Review

**Review every 6 months**: Are these still the right choices?
**Upgrade trigger**: Pain points, not trends
