# ShipSensei - MVP (Ship in 4 Weeks)

**Goal**: Get one non-technical person from idea → deployed product in under 30 minutes.

## What We're Building

### 1. Requirements Chat (Week 1-2)

**User inputs**: "I want to build a recipe sharing app"
**ShipSensei asks**: 5-10 smart questions
**Output**: Clean requirements doc

**Why first**: If we can't help users figure out WHAT to build, nothing else matters.

### 2. Tech Stack Picker (Week 2)

**Input**: Requirements
**Output**: "Use Next.js + Vercel because..."
**Rationale**: One opinionated choice, explained simply

**Stack**: Next.js 14, Tailwind, Prisma, Neon, Vercel. That's it. No options.

### 3. Project Generator (Week 3)

**Input**: Requirements + Stack
**Output**: Working Next.js project, push to GitHub
**Result**: User has code they can modify

**Key**: Use templates (fast) + AI customization, not pure generation (slow/expensive).

### 4. One-Click Deploy (Week 3-4)

**User clicks**: "Deploy"
**ShipSensei does**: Push to Vercel, return live URL
**Result**: "Your product is live at: shipsensei-demo.vercel.app"

### 5. Landing Page (Week 4)

**Purpose**: Collect 500 waitlist emails before launch
**Content**: Problem, solution, demo video, signup

## What We're NOT Building (Yet)

❌ Code editing in browser (use GitHub/VS Code)
❌ Team collaboration (solo only)
❌ Marketplace (one stack only)
❌ Launch guidance (just deploy)
❌ Multiple tech stacks (Next.js only)
❌ Mobile apps (web only)
❌ Payment processing (free tier only)

**Philosophy**: Ship ONE happy path, perfectly executed.

## MVP Success Criteria

**Week 4**: Beta ready

- 1 person (non-technical) → deployed project in 30 min
- Works end-to-end, no errors
- 500 waitlist signups

**Week 6**: 10 beta users

- 5+ successfully deploy projects
- Gather feedback, iterate

**Week 8**: Public launch (Product Hunt)

- 1,000 signups in first week
- 100 deployed projects

## Technical Scope

**What ships with generated projects:**

- ✅ Next.js 14 boilerplate
- ✅ Tailwind styling
- ✅ Basic routing structure
- ✅ Database setup (Neon + Prisma)
- ✅ Environment variables configured
- ✅ Vercel deployment ready

**What we defer:**

- Auth (user adds later with NextAuth)
- Payments (user adds later with Stripe)
- Testing (we test our generator, not user's code)
- CI/CD (Vercel handles this)

## The 30-Minute User Journey

```
1. Land on shipsensei.dev (1 min)
2. Login with GitHub OAuth (1 min)
3. Chat with AI: "I want to build..." (5 min)
4. Review requirements, confirm (2 min)
5. See tech stack recommendation (1 min)
6. Click "Generate Project" (3 min wait)
7. Project created, pushed to GitHub (automatic)
8. Click "Deploy to Vercel" (5 min wait)
9. Live URL: "your-app.vercel.app" (automatic)
10. Celebrate! (rest of life)
```

## Validation Questions

After beta (Week 6), answer:

1. Did users actually deploy? (target: 50%+)
2. Are projects still live after 7 days? (target: 40%+)
3. Would users pay $19/mo for more projects? (target: 20%+ say yes)

If yes to all three: **Build PRO tier. If no: Pivot or iterate.**

## Constraints

- **Budget**: Bootstrap, minimize costs
- **Time**: Ship MVP in 4 weeks
- **Team**: Solo (you + Claude Code)
- **Quality**: Good enough > perfect
- **Scope**: One happy path only
