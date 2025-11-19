# ShipSensei - System Architecture

**Version**: 1.0
**Last Updated**: 2025-11-19
**Status**: Draft

## Architecture Overview

ShipSensei is designed as a **modular, AI-powered mentorship platform** with clear separation between:

1. **User-facing wizard** (guides non-technical users)
2. **AI orchestration layer** (coordinates LLM calls, decision-making)
3. **Code generation engine** (produces production-ready code)
4. **Quality enforcement** (security, testing, best practices)
5. **Deployment automation** (one-click to production)

### Design Principles

**1. Simplicity First**

- Default to simplest solution that works
- Progressive complexity (advanced features opt-in)
- Minimize user decisions (make smart defaults)

**2. Safety by Default**

- Security built-in, not bolted-on
- Validate everything (inputs, outputs, dependencies)
- Fail safely (graceful degradation, clear errors)

**3. Modular & Composable**

- Each component has single responsibility
- Components communicate via well-defined interfaces
- Easy to swap implementations (e.g., different LLM providers)

**4. Observable & Debuggable**

- Comprehensive logging (user actions, system decisions, errors)
- Traceability (track generated code to prompts/decisions)
- Metrics everywhere (performance, usage, quality)

**5. Cost-Conscious**

- Optimize LLM token usage (caching, prompt engineering)
- Serverless-first (pay for actual usage)
- Smart batching (reduce API calls)

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Wizard UI   │  │  Dashboard   │  │  Code Editor │          │
│  │  (Guided)    │  │  (Projects)  │  │  (Advanced)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Gateway Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   REST API   │  │  WebSocket   │  │  Webhooks    │          │
│  │  (Projects)  │  │  (Real-time) │  │  (Deploy)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Orchestration Layer                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              LLM Router & Prompt Manager               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐   │    │
│  │  │  Anthropic   │  │    OpenAI    │  │   Local    │   │    │
│  │  │   (Claude)   │  │    (GPT-4)   │  │   Models   │   │    │
│  │  └──────────────┘  └──────────────┘  └────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Context     │  │   Decision   │  │  Explanation │          │
│  │  Manager     │  │   Engine     │  │  Generator   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                       │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  Requirements  │  │   Tech Stack   │  │  Code Generation │  │
│  │    Engine      │  │  Recommender   │  │      Engine      │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │   Security     │  │    Testing     │  │    Deployment    │  │
│  │   Scanner      │  │   Automator    │  │     Manager      │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                               │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │   PostgreSQL   │  │     Redis      │  │   File Storage   │  │
│  │  (User Data)   │  │   (Caching)    │  │   (S3/R2)        │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
│  ┌────────────────┐  ┌────────────────┐                        │
│  │     Vector     │  │    Git Repos   │                        │
│  │   DB (RAG)     │  │   (Projects)   │                        │
│  └────────────────┘  └────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     External Services                           │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │     Vercel     │  │     GitHub     │  │    Stripe        │  │
│  │   (Hosting)    │  │    (OAuth)     │  │   (Payments)     │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  PostHog/GA    │  │   Sentry       │  │   Resend         │  │
│  │  (Analytics)   │  │   (Errors)     │  │   (Email)        │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. User Interface Layer

#### Wizard UI (Guided Experience)

**Purpose**: Primary interface for complete beginners - step-by-step guided flow.

**Components**:

- **Idea Input**: Free text or voice input with example prompts
- **Requirements Chat**: Conversational interface for requirement gathering
- **Tech Stack Selector**: Visual cards showing recommended stack with explanations
- **Project Dashboard**: Overview of project status, next steps
- **Code Preview**: Read-only code view with explanations (optional for curious users)

**Tech Stack**:

- **Framework**: Next.js 14 (App Router)
  - Why: SSR for SEO, excellent DX, Vercel deployment
- **UI Library**: shadcn/ui + Tailwind CSS
  - Why: Accessible components, customizable, modern design
- **State Management**: Zustand
  - Why: Simple, TypeScript-friendly, no boilerplate
- **Form Handling**: React Hook Form + Zod
  - Why: Type-safe validation, great DX
- **Real-time**: Vercel AI SDK (streaming responses)
  - Why: Built-in streaming, UI components, edge-ready

**Key Features**:

- Progressive disclosure (simple view default, advanced opt-in)
- Real-time preview (see changes instantly)
- Undo/redo (every action reversible)
- Autosave (never lose work)
- Responsive (mobile-first design)

#### Dashboard (Project Management)

**Purpose**: Manage multiple projects, view status, access settings.

**Features**:

- Project list (name, status, last modified, quick actions)
- Quick actions (deploy, edit, delete, duplicate)
- Usage metrics (API calls, storage, deployments)
- Billing (for PRO/TEAM tiers)

#### Code Editor (Advanced Users)

**Purpose**: Direct code editing for users who want more control.

**Features**:

- Monaco Editor (VS Code experience)
- AI copilot integration (inline suggestions)
- Live preview (instant feedback)
- Git integration (commit, branch, PR)

**Note**: MVP focuses on Wizard UI, Code Editor is post-MVP.

### 2. API Gateway Layer

#### REST API

**Endpoints**:

```
POST   /api/projects                 # Create project
GET    /api/projects                 # List projects
GET    /api/projects/:id             # Get project details
PUT    /api/projects/:id             # Update project
DELETE /api/projects/:id             # Delete project

POST   /api/projects/:id/requirements  # Generate requirements
POST   /api/projects/:id/stack         # Recommend tech stack
POST   /api/projects/:id/scaffold      # Initialize project
POST   /api/projects/:id/generate      # Generate code
POST   /api/projects/:id/deploy        # Deploy to production

GET    /api/projects/:id/security      # Security scan results
GET    /api/projects/:id/tests         # Test results
GET    /api/projects/:id/analytics     # Project analytics

POST   /api/auth/login                 # OAuth login
POST   /api/auth/logout                # Logout
GET    /api/auth/session               # Check session

GET    /api/user/profile               # User profile
PUT    /api/user/profile               # Update profile
GET    /api/user/usage                 # Usage metrics
```

**Tech Stack**:

- **Runtime**: Next.js API Routes (App Router)
- **Validation**: Zod schemas
- **Auth**: NextAuth.js (OAuth + magic links)
- **Rate Limiting**: Upstash Rate Limit
- **Monitoring**: Vercel Analytics + Sentry

#### WebSocket (Real-time Updates)

**Use Cases**:

- Streaming LLM responses (requirements, explanations, code)
- Real-time deployment status
- Collaborative editing (post-MVP)

**Tech Stack**:

- **Implementation**: Vercel AI SDK streaming
- **Fallback**: Server-Sent Events (SSE)

#### Webhooks (External Integrations)

**Inbound**:

- GitHub: Deployment status, PR updates
- Vercel: Build/deploy events
- Stripe: Payment events

**Outbound**:

- User project deployments (notify on completion)
- Security alerts (critical vulnerabilities found)

### 3. AI Orchestration Layer

#### LLM Router & Prompt Manager

**Purpose**: Intelligent routing of AI requests to optimal provider/model.

**Routing Logic**:

```typescript
interface LLMRequest {
  task: 'requirements' | 'stack' | 'code' | 'explanation' | 'review'
  complexity: 'simple' | 'moderate' | 'complex'
  maxTokens: number
  budget: 'low' | 'normal' | 'high'
}

function selectProvider(request: LLMRequest): Provider {
  // Requirements & explanations: Claude (better at conversation)
  if (request.task === 'requirements' || request.task === 'explanation') {
    return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
  }

  // Code generation: GPT-4 or Claude (A/B test)
  if (request.task === 'code') {
    return { provider: 'openai', model: 'gpt-4-turbo' }
  }

  // Code review: Claude (strong reasoning)
  if (request.task === 'review') {
    return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
  }

  // Tech stack: Claude (better at structured output)
  if (request.task === 'stack') {
    return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
  }
}
```

**Prompt Management**:

- Version-controlled prompts (Git-based, A/B testable)
- Template system (reusable prompt components)
- Dynamic context injection (user requirements, tech preferences)
- Token optimization (caching, compression)

**Caching Strategy**:

- Cache common tech stack recommendations (React + Next.js + Tailwind)
- Cache security patterns (input validation, auth setup)
- Cache project templates (scaffolding code)
- Invalidate on version updates

#### Context Manager

**Purpose**: Maintain conversation context across multiple LLM calls.

**State Tracked**:

- User profile (experience level, preferences, past projects)
- Project context (requirements, tech stack, code history)
- Conversation history (for coherent multi-turn interactions)

**Implementation**:

```typescript
interface Context {
  user: {
    id: string
    experienceLevel: 'beginner' | 'intermediate' | 'advanced'
    preferences: TechPreferences
  }
  project: {
    id: string
    requirements: Requirements
    techStack: TechStack
    codeHistory: CodeChange[]
  }
  conversation: Message[]
}
```

**Optimization**:

- Sliding window (keep last N messages, summarize older)
- Relevance filtering (only include context relevant to current task)
- Token budgeting (max context size per request)

#### Decision Engine

**Purpose**: Make technical decisions based on requirements and best practices.

**Decision Types**:

**1. Tech Stack Selection**

```typescript
interface TechStackDecision {
  frontend: {
    framework: 'Next.js' | 'React + Vite' | 'SvelteKit'
    reasoning: string
    alternatives: Alternative[]
  }
  backend: {
    approach: 'Serverless' | 'Node.js' | 'Python'
    reasoning: string
  }
  database: {
    type: 'PostgreSQL' | 'MongoDB' | 'SQLite'
    reasoning: string
  }
  hosting: {
    platform: 'Vercel' | 'Netlify' | 'Railway'
    reasoning: string
  }
}
```

**Decision Criteria**:

- **Scale**: Expected users, data volume
- **Complexity**: Feature richness, integration needs
- **Budget**: Monthly hosting costs
- **Timeline**: Development speed, learning curve
- **Team**: Solo vs. team, experience level

**2. Architecture Patterns**

- API structure: REST vs. GraphQL vs. tRPC
- State management: Client-side vs. server-side
- Authentication: OAuth vs. magic links vs. traditional
- File handling: Direct upload vs. signed URLs

**3. Security Configuration**

- Authentication strategy (based on user type: B2C vs. B2B)
- Authorization model (RBAC vs. ABAC)
- Data encryption (at-rest, in-transit)
- Secret management (env vars, vault)

#### Explanation Generator

**Purpose**: Transform technical concepts into beginner-friendly explanations.

**Explanation Levels**:

- **ELI5**: Metaphors and analogies (for complete beginners)
- **Simple**: Plain language, minimal jargon (default)
- **Technical**: Accurate terminology with explanations
- **Expert**: Full technical detail (advanced users)

**Example**:

```typescript
// Input: "Why did we choose Next.js?"
// Output (Simple level):
"Next.js is like a pre-built house framework instead of building from scratch.
It includes common features (routing, image optimization, SEO) out of the box,
so you can focus on your unique features rather than plumbing."

// Output (Technical level):
"Next.js provides server-side rendering (SSR) and static site generation (SSG)
out of the box, improving SEO and initial load performance. The App Router
supports React Server Components, reducing client-side JavaScript.
Built-in API routes eliminate need for separate backend."
```

### 4. Business Logic Layer

#### Requirements Engine

**Purpose**: Extract structured requirements from conversational input.

**Flow**:

1. **Initial Input**: User describes idea in free text
2. **Domain Detection**: Classify idea type (e-commerce, SaaS, marketplace, etc.)
3. **Question Generation**: Generate 5-10 clarifying questions based on domain
4. **Structured Extraction**: Parse answers into requirements document
5. **Validation**: Check completeness, identify missing requirements
6. **Document Generation**: Create formatted markdown document

**Question Templates** (Domain: E-commerce):

```yaml
questions:
  - 'Who are your target customers? (B2C consumers, B2B businesses, or both?)'
  - 'What products will you sell? (Physical goods, digital products, services?)'
  - 'Do you need inventory management? (Track stock levels, low-stock alerts?)'
  - 'Payment processing? (Stripe, PayPal, Cryptocurrency?)'
  - 'Shipping integration? (Domestic only, international?)'
  - 'User features needed? (Wishlists, reviews, recommendations?)'
  - 'Admin capabilities? (Product management, order fulfillment, analytics?)'
```

**Structured Output**:

```typescript
interface Requirements {
  projectName: string
  description: string
  targetUsers: UserPersona[]
  features: Feature[]
  dataModel: Entity[]
  userFlows: UserFlow[]
  constraints: Constraint[]
  successMetrics: Metric[]
}
```

#### Tech Stack Recommender

**Purpose**: Analyze requirements and recommend optimal technology stack.

**Recommendation Algorithm**:

**Step 1: Analyze Requirements**

```typescript
interface RequirementAnalysis {
  complexity: 'low' | 'medium' | 'high'
  scale: 'small' | 'medium' | 'large' // Expected users, data
  realtime: boolean // WebSocket/real-time features needed
  auth: 'simple' | 'complex' // OAuth, MFA, etc.
  payments: boolean
  integrations: string[] // Third-party APIs
  hosting: 'static' | 'dynamic' | 'hybrid'
}
```

**Step 2: Score Technologies**

```typescript
interface TechScore {
  technology: string
  scores: {
    fit: number // 0-100: How well it matches requirements
    maturity: number // 0-100: Production-readiness, community
    dx: number // 0-100: Developer experience
    cost: number // 0-100: Hosting + licensing costs (higher is cheaper)
    learning: number // 0-100: Ease of learning (higher is easier)
  }
  totalScore: number // Weighted average
  reasoning: string
  alternatives: Alternative[]
}
```

**Scoring Weights** (Beginner-focused):

```typescript
const weights = {
  fit: 0.25, // Must meet requirements
  maturity: 0.2, // Stable, well-documented
  dx: 0.2, // Good error messages, debugging
  cost: 0.2, // Affordable for bootstrappers
  learning: 0.15, // Easy for beginners
}
```

**Step 3: Generate Recommendation**

```typescript
interface Recommendation {
  stack: {
    frontend: Technology
    backend: Technology
    database: Technology
    hosting: Technology
    auth: Technology
    payments?: Technology
  }
  reasoning: string // Overall rationale
  tradeoffs: string // What we're optimizing for vs. against
  alternatives: StackAlternative[] // Other valid options
  estimatedCost: {
    monthly: number
    description: string
  }
}
```

**Example Recommendation** (Simple SaaS):

```yaml
stack:
  frontend:
    technology: 'Next.js 14 (App Router) + TypeScript + Tailwind CSS'
    reasoning: 'SSR for SEO, excellent docs, huge community, Vercel deployment'

  backend:
    technology: 'Next.js API Routes + tRPC'
    reasoning: 'Serverless (cost-effective), type-safe API, no separate backend needed'

  database:
    technology: 'PostgreSQL (Neon/Supabase)'
    reasoning: 'Relational data model fits your needs, generous free tier, easy auth integration'

  hosting:
    technology: 'Vercel'
    reasoning: 'Zero-config Next.js deployment, automatic HTTPS, preview deployments'

  auth:
    technology: 'NextAuth.js + OAuth (GitHub/Google)'
    reasoning: 'Social login (less friction), secure, well-maintained'

estimatedCost:
  monthly: $0-25
  description: 'Free tier for MVP (<100K requests/mo), ~$20/mo as you grow'
```

**Knowledge Base**:

- Technology database (frameworks, libraries, tools)
- Compatibility matrix (what works well together)
- Cost calculator (hosting + services)
- Maturity metrics (GitHub stars, npm downloads, Stack Overflow activity)

#### Code Generation Engine

**Purpose**: Generate production-ready, well-structured code from requirements.

**Generation Strategy**:

**1. Template-Based Generation** (MVP)

- Pre-built templates for common patterns (CRUD, auth, forms)
- Variable substitution (customize for specific requirements)
- Composable modules (combine templates for complex features)

**Advantages**:

- Fast (no LLM latency)
- Consistent quality (vetted code)
- Predictable output
- Cost-effective (no API calls)

**Limitations**:

- Less flexible (custom features harder)
- Requires template maintenance

**2. AI-Assisted Generation** (Post-MVP)

- LLM generates custom code for unique requirements
- Template retrieval (find similar examples, modify)
- Hybrid approach (templates + AI customization)

**Code Quality Gates**:

```typescript
interface QualityChecks {
  linting: {
    tool: 'ESLint' | 'Prettier'
    passed: boolean
    errors: LintError[]
  }
  security: {
    tool: 'Snyk' | 'npm audit'
    vulnerabilities: Vulnerability[]
  }
  testing: {
    coverage: number // %
    passing: boolean
  }
  performance: {
    bundleSize: number // KB
    lighthouse: number // Score
  }
}
```

**Code Generation Flow**:

1. **Parse Requirements**: Extract features to implement
2. **Select Templates**: Match requirements to code templates
3. **Customize**: Fill in variables (names, types, logic)
4. **Assemble**: Combine modules into project structure
5. **Validate**: Run linting, security scan, type checking
6. **Explain**: Generate code explanations for user

**Project Structure** (Example: Next.js SaaS):

```
project/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/
│   │   ├── page.tsx          # Main dashboard
│   │   └── settings/
│   ├── api/
│   │   ├── auth/              # NextAuth routes
│   │   └── [resource]/        # API endpoints
│   └── layout.tsx
├── components/
│   ├── ui/                    # shadcn components
│   └── features/              # Feature-specific components
├── lib/
│   ├── db.ts                  # Database client
│   ├── auth.ts                # Auth config
│   └── utils.ts
├── tests/
│   ├── unit/
│   └── integration/
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

#### Security Scanner

**Purpose**: Continuous security scanning and vulnerability prevention.

**Scan Types**:

**1. Dependency Scanning**

- Check for known CVEs (npm audit, Snyk)
- License compliance (avoid GPL if needed)
- Outdated packages (update recommendations)

**2. Code Pattern Detection**

- SQL injection risks (raw queries, string concatenation)
- XSS vulnerabilities (innerHTML, dangerouslySetInnerHTML)
- Exposed secrets (API keys, passwords in code)
- Insecure authentication (weak session management)
- CSRF vulnerabilities (missing tokens)

**3. Configuration Audit**

- Security headers (CSP, HSTS, X-Frame-Options)
- HTTPS enforcement
- CORS configuration
- Rate limiting setup
- Input validation

**4. Access Control Review**

- Authorization checks (API routes protected)
- Role-based access (proper role validation)
- Data isolation (users can only access their data)

**Severity Levels & Actions**:

```typescript
enum Severity {
  CRITICAL = 'critical', // Blocks deployment
  HIGH = 'high', // Warning, requires acknowledgment
  MEDIUM = 'medium', // Info, track in dashboard
  LOW = 'low', // FYI, best practice
}

interface SecurityIssue {
  severity: Severity
  category: 'dependency' | 'code' | 'config' | 'access'
  title: string
  description: string
  location: {
    file: string
    line?: number
  }
  remediation: string // How to fix
  references: string[] // Links to docs/CVE
}
```

**Automated Remediation**:

- Dependency updates (safe version bumps)
- Add missing security headers
- Generate .env.example (if secrets detected)
- Add input validation (Zod schemas)

#### Testing Automator

**Purpose**: Generate and run tests automatically.

**Test Generation**:

**1. Unit Tests** (Functions, Components)

```typescript
// Auto-generated test for utility function
describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56')
  })

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00')
  })

  it('handles negative numbers', () => {
    expect(formatCurrency(-100, 'USD')).toBe('-$100.00')
  })
})
```

**2. Integration Tests** (API Routes)

```typescript
// Auto-generated test for API endpoint
describe('POST /api/projects', () => {
  it('creates project for authenticated user', async () => {
    const session = await getTestSession()
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { Cookie: session.cookie },
      body: JSON.stringify({ name: 'Test Project' }),
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data).toHaveProperty('id')
    expect(data.name).toBe('Test Project')
  })

  it('returns 401 for unauthenticated user', async () => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Project' }),
    })

    expect(response.status).toBe(401)
  })
})
```

**3. E2E Tests** (Critical Flows)

```typescript
// Auto-generated Playwright test
test('user can create and deploy project', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Start building')

  // Login
  await page.click('text=Login with GitHub')
  // ... OAuth flow ...

  // Create project
  await page.fill('[name="idea"]', 'A todo app')
  await page.click('text=Generate requirements')
  await page.waitForSelector('text=Requirements generated')

  // Deploy
  await page.click('text=Deploy to production')
  await page.waitForSelector('text=Deployment successful', { timeout: 60000 })

  // Verify
  const url = await page.locator('[data-testid="project-url"]').textContent()
  expect(url).toContain('vercel.app')
})
```

**Test Execution Strategy**:

- On-demand (user triggers)
- Pre-deploy (gate deployment on tests passing)
- Scheduled (nightly regression tests)
- On code change (watch mode during development)

#### Deployment Manager

**Purpose**: Automate deployment to production hosting.

**Supported Platforms**:

**1. Vercel** (Primary for Next.js)

```typescript
interface VercelDeployment {
  projectId: string
  gitRepo: string
  framework: 'nextjs' | 'react' | 'vite'
  envVars: Record<string, string>
  domains: string[]
}
```

**Deployment Flow**:

1. Pre-deploy validation (tests pass, security clear)
2. Build project (optimize for production)
3. Push to GitHub (project repo)
4. Connect to Vercel (via API or GitHub integration)
5. Configure environment variables (inject secrets securely)
6. Deploy (automatic via Vercel)
7. Health check (verify deployment live)
8. Custom domain setup (if provided)

**2. Netlify** (Alternative for static sites)
**3. Railway** (For full-stack apps with backend)

**Deployment Status Tracking**:

```typescript
enum DeploymentStatus {
  PENDING = 'pending',
  BUILDING = 'building',
  DEPLOYING = 'deploying',
  READY = 'ready',
  ERROR = 'error',
}

interface Deployment {
  id: string
  projectId: string
  status: DeploymentStatus
  url?: string
  buildLogs: string[]
  createdAt: Date
  completedAt?: Date
}
```

**Rollback Capability**:

- Keep last 5 deployments
- One-click rollback to previous version
- Automatic rollback on critical errors

### 5. Data Layer

#### PostgreSQL (Primary Database)

**Purpose**: Store user data, projects, metadata.

**Schema Overview**:

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  tier VARCHAR(20) DEFAULT 'free',  -- free, pro, team
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft',  -- draft, active, deployed, archived
  requirements JSONB,
  tech_stack JSONB,
  deployment_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Deployments
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(20),
  url TEXT,
  build_logs TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Usage Tracking (for billing)
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  resource_type VARCHAR(50),  -- api_call, deployment, storage
  quantity INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Hosting**: Neon (serverless Postgres) or Supabase (includes auth)

#### Redis (Caching)

**Purpose**: Cache frequently accessed data, session storage.

**Cached Data**:

- User sessions (NextAuth.js)
- Tech stack recommendations (common stacks)
- LLM responses (for identical prompts)
- Rate limit counters (API throttling)

**Implementation**: Upstash Redis (serverless)

#### File Storage (S3/R2)

**Purpose**: Store generated code, assets, backups.

**Bucket Structure**:

```
shipsensei-storage/
├── projects/
│   └── {projectId}/
│       ├── code/               # Generated code files
│       ├── assets/             # Images, fonts, etc.
│       └── backups/            # Snapshots
├── templates/
│   └── {templateId}/           # Code templates
└── user-uploads/
    └── {userId}/               # User-uploaded files
```

**Implementation**: Cloudflare R2 (S3-compatible, zero egress fees)

#### Vector Database (RAG for AI)

**Purpose**: Semantic search for tech recommendations, code examples.

**Use Cases**:

- Find similar project requirements → recommend similar stacks
- Search code examples → provide relevant templates
- Retrieve documentation snippets → explain concepts

**Implementation**: Pinecone or Weaviate

**Indexed Data**:

- Tech stack recommendations (requirements → stack mapping)
- Code templates (description → template)
- Documentation (concept → explanation)
- User projects (for community sharing, post-MVP)

#### Git Repositories (Project Source)

**Purpose**: Version control for generated projects.

**Strategy**:

- **Option A**: ShipSensei GitHub org, repo per project
  - Pros: Easy integration, familiar to users
  - Cons: Costs (private repos), complexity

- **Option B**: Gitea/Gitlab self-hosted
  - Pros: Full control, no costs
  - Cons: Maintenance, less familiar

- **Recommendation**: Start with GitHub (simpler), migrate if needed

### 6. External Services

#### Hosting: Vercel

**Why Vercel**:

- Zero-config Next.js deployment
- Automatic HTTPS, CDN, preview deployments
- Generous free tier (perfect for MVPs)
- Edge functions (low latency globally)

**Pricing**:

- Free: Hobby tier (100GB bandwidth/mo)
- Pro: $20/mo per user (commercial use, 1TB bandwidth)

#### Authentication: GitHub + Google OAuth

**Why OAuth**:

- Reduce friction (no password to remember)
- Better security (no password storage/reset flow)
- Social proof (real GitHub/Google accounts)

**Implementation**: NextAuth.js

- Supports multiple providers
- Session management built-in
- Database adapter for user storage

#### Payments: Stripe

**Why Stripe**:

- Industry standard (trusted by users)
- Excellent docs and SDKs
- Subscription management built-in
- PCI compliance handled

**Implementation**:

- Stripe Checkout (hosted payment page)
- Webhook for subscription events
- Customer portal (self-service billing)

#### Analytics: PostHog

**Why PostHog**:

- Open source option (self-hostable)
- Product analytics + feature flags + A/B testing
- Privacy-friendly (GDPR compliant)

**Tracked Events**:

- User signup, login
- Project created, deployed
- Feature usage (code generation, security scan)
- Conversion events (free → pro upgrade)

#### Error Tracking: Sentry

**Why Sentry**:

- Excellent error grouping and insights
- Performance monitoring (APM)
- Release tracking (correlate errors to deployments)

**Configuration**:

- Frontend errors (React error boundary)
- Backend errors (API route exceptions)
- Performance monitoring (slow API calls)

#### Email: Resend

**Why Resend**:

- Modern API (excellent DX)
- React Email templates (type-safe, beautiful)
- Good deliverability

**Email Types**:

- Welcome email (onboarding)
- Magic link login
- Deployment notifications
- Security alerts
- Billing notifications

## Data Flow Examples

### Example 1: Create Project Flow

```
User: "I want to build a recipe sharing app"
   │
   ▼
┌─────────────────────────────────────────────┐
│ 1. Wizard UI: Capture idea                 │
│    - Display input field                   │
│    - Show example prompts                  │
└─────────────────────────────────────────────┘
   │
   ▼ POST /api/projects { idea: "..." }
┌─────────────────────────────────────────────┐
│ 2. API Gateway: Validate & Route           │
│    - Auth check (user logged in?)          │
│    - Rate limit check                      │
│    - Forward to Requirements Engine        │
└─────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────┐
│ 3. Requirements Engine                      │
│    a) Domain detection → "recipe sharing"  │
│    b) Generate questions (LLM)             │
│       - Target users?                       │
│       - Features? (search, ratings, etc.)  │
│       - Monetization?                       │
│    c) Stream questions to user             │
└─────────────────────────────────────────────┘
   │
   ▼ (User answers questions)
┌─────────────────────────────────────────────┐
│ 4. Generate Requirements Doc                │
│    - Parse answers                          │
│    - Extract: features, data model, flows  │
│    - Format as markdown                    │
│    - Save to DB (projects.requirements)    │
└─────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────┐
│ 5. Tech Stack Recommender                  │
│    a) Analyze requirements                 │
│       - Complexity: medium                  │
│       - Scale: small-medium                 │
│       - Features: search, user accounts    │
│    b) Score technologies                   │
│       - Frontend: Next.js (90)             │
│       - Backend: Next.js API (85)          │
│       - DB: PostgreSQL (88)                │
│    c) Generate recommendation              │
│    d) Save to DB (projects.tech_stack)     │
└─────────────────────────────────────────────┘
   │
   ▼ POST /api/projects/:id/scaffold
┌─────────────────────────────────────────────┐
│ 6. Code Generation Engine                  │
│    a) Select templates (Next.js + Auth)    │
│    b) Customize for requirements           │
│       - Recipe model                        │
│       - Search API                          │
│       - Rating system                       │
│    c) Run quality checks                   │
│       - Linting ✅                          │
│       - Security scan ✅                    │
│       - Type check ✅                       │
│    d) Commit to Git repo                   │
└─────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────┐
│ 7. Return to User                           │
│    - "Your project is ready!"              │
│    - Show code structure                   │
│    - Next step: "Let's deploy"             │
└─────────────────────────────────────────────┘
```

### Example 2: Deploy to Production Flow

```
User: Clicks "Deploy to production"
   │
   ▼ POST /api/projects/:id/deploy
┌─────────────────────────────────────────────┐
│ 1. Pre-Deploy Validation                   │
│    - Run tests ✅                           │
│    - Security scan ✅                       │
│    - Build check ✅                         │
└─────────────────────────────────────────────┘
   │
   ▼ (All checks pass)
┌─────────────────────────────────────────────┐
│ 2. Push to GitHub                           │
│    - Create repo (if not exists)           │
│    - Push code to main branch              │
└─────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────┐
│ 3. Connect to Vercel (via API)             │
│    - Create Vercel project                 │
│    - Link to GitHub repo                   │
│    - Configure env variables (encrypted)   │
└─────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────┐
│ 4. Vercel Auto-Deploy                      │
│    - Build (next build)                    │
│    - Stream build logs to user (WebSocket) │
│    - Deploy to edge network                │
└─────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────┐
│ 5. Health Check                             │
│    - Ping deployment URL                   │
│    - Verify 200 response                   │
│    - Check critical routes                 │
└─────────────────────────────────────────────┘
   │
   ▼ (Deployment successful)
┌─────────────────────────────────────────────┐
│ 6. Update Database                          │
│    - Save deployment record                │
│    - Update project.deployment_url         │
│    - Log usage (for billing)               │
└─────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────┐
│ 7. Notify User                              │
│    - Show success message                  │
│    - Display live URL                      │
│    - Next steps: "Share your product!"     │
└─────────────────────────────────────────────┘
```

## Scalability Considerations

### Current Architecture Limits

**MVP (0-1K users)**:

- Vercel: Hobby tier (sufficient)
- Neon: Free tier (1GB storage, 100 hours compute/mo)
- Upstash Redis: Free tier (10K requests/day)

**Growth (1K-10K users)**:

- Vercel: Pro tier ($20/user/mo)
- Neon: Scale tier (~$50/mo for 10GB + compute)
- Upstash: Pay-as-you-go (~$20/mo)

**Scale (10K-100K users)**:

- Vercel: Enterprise (custom pricing)
- Neon: Pro tier or self-hosted Postgres
- Redis: Managed Redis (AWS ElastiCache)

### Bottlenecks & Mitigation

**1. LLM API Costs**

**Issue**: At scale, LLM API calls can get expensive.

**Mitigation**:

- Aggressive caching (common requirements, tech stacks)
- Template-first approach (reduce AI generation)
- Tiered features (free tier uses more templates, pro uses more AI)
- Optimize prompts (reduce token usage)

**2. Database Connections**

**Issue**: Serverless functions can exhaust DB connection pool.

**Mitigation**:

- Connection pooling (PgBouncer)
- Neon autoscaling (handles serverless well)
- Query optimization (reduce DB calls)

**3. Build Queues**

**Issue**: Many concurrent deployments can queue up.

**Mitigation**:

- Vercel handles queueing (scales automatically)
- Rate limit deployments (prevent abuse)
- Stagger builds (batch less time-sensitive deployments)

## Security Architecture

### Defense in Depth

**Layer 1: Network**

- HTTPS only (redirect HTTP)
- Vercel DDoS protection
- Rate limiting (Upstash)

**Layer 2: Application**

- Input validation (Zod schemas)
- Output encoding (prevent XSS)
- CSRF protection (NextAuth.js)
- Security headers (Helmet.js)

**Layer 3: Data**

- Encryption at rest (DB level)
- Encryption in transit (TLS)
- Secret management (Vercel env vars, encrypted)
- Access control (row-level security in DB)

**Layer 4: Code**

- Dependency scanning (Snyk)
- Code scanning (SonarCloud)
- Secret detection (GitGuardian)

### Authentication & Authorization

**Authentication** (Who are you?):

- NextAuth.js with OAuth providers
- Session stored in JWT (httpOnly cookie)
- Refresh token rotation

**Authorization** (What can you do?):

```typescript
// Example authorization middleware
export async function requireAuth(req: Request) {
  const session = await getServerSession()
  if (!session?.user) throw new UnauthorizedError()
  return session.user
}

export async function requireProjectAccess(projectId: string, userId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } })
  if (project.userId !== userId) throw new ForbiddenError()
  return project
}
```

### Secrets Management

**Environment Variables**:

```bash
# .env.example (checked into Git)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="generate-with-openssl"
GITHUB_CLIENT_ID="your-github-app-id"
GITHUB_CLIENT_SECRET="your-github-app-secret"
```

**Vercel Environment Variables**:

- Development, Preview, Production scopes
- Encrypted at rest
- Never exposed to client-side

**User Project Secrets**:

- Stored encrypted in database
- Injected at deployment time
- Never logged or exposed in UI

## Monitoring & Observability

### Key Metrics

**Application Metrics**:

- Request latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Throughput (requests/sec)

**Business Metrics**:

- Signups per day
- Project creations per day
- Deployments per day
- Free → Pro conversions
- Churn rate

**AI Metrics**:

- LLM latency (by task type)
- Token usage (by task type)
- Cache hit rate
- Cost per request

**Quality Metrics**:

- Projects deployed successfully (%)
- Projects still live after 30 days (%)
- Average time to first deploy

### Alerting

**Critical Alerts** (PagerDuty):

- Site down (availability < 99%)
- Error rate spike (>5% errors)
- Database connection exhaustion
- Deployment failures (>50%)

**Warning Alerts** (Slack):

- Slow responses (p95 latency > 2s)
- High LLM costs (>$100/day unexpected)
- Low cache hit rate (<70%)

### Logging

**Structured Logging**:

```typescript
logger.info('Project created', {
  userId: user.id,
  projectId: project.id,
  techStack: project.techStack.frontend,
  duration: Date.now() - startTime,
})
```

**Log Levels**:

- ERROR: Exceptions, failures
- WARN: Degraded performance, retries
- INFO: Important state changes
- DEBUG: Detailed execution flow

**Log Aggregation**: Vercel Logs + Datadog (for advanced analysis)

## Deployment Strategy

### Environments

**1. Development**

- Local development (localhost)
- Hot reload, debug mode
- Local DB (SQLite or Docker Postgres)

**2. Preview** (Vercel)

- Every Git branch gets preview URL
- Use production-like data (sanitized)
- Test before merging to main

**3. Production** (Vercel)

- Main branch auto-deploys
- Health checks before traffic shift
- Rollback on errors

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  deploy:
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Cost Estimation

### MVP Costs (0-1K users)

**Infrastructure**:

- Vercel: $0 (Hobby tier)
- Neon DB: $0 (Free tier)
- Upstash Redis: $0 (Free tier)
- Cloudflare R2: $0 (10GB free)

**Services**:

- Anthropic API: ~$200/mo (10K projects × $0.02)
- Vercel Pro (for commercial): $20/mo
- Domain: $12/year

**Total**: ~$220/mo

### Growth Costs (1K-10K users)

**Infrastructure**:

- Vercel Pro: $20/mo
- Neon Scale: $50/mo
- Upstash: $20/mo
- R2 Storage: $5/mo

**Services**:

- Anthropic API: ~$2,000/mo (100K projects)
- Stripe: 2.9% + 30¢ per transaction
- PostHog: $0 (self-hosted) or $100/mo

**Total**: ~$2,200/mo

**Revenue** (10K users, 5% PRO conversion):

- 500 PRO users × $19/mo = $9,500/mo
- **Margin**: ~$7,300/mo

## Risks & Mitigations

### Technical Risks

**1. LLM Quality**

- **Risk**: Generated code has bugs or security issues
- **Mitigation**: Template-first approach, extensive testing, human review

**2. API Costs**

- **Risk**: LLM costs spiral out of control
- **Mitigation**: Aggressive caching, rate limiting, tiered pricing

**3. Vendor Lock-in**

- **Risk**: Too dependent on Vercel/Anthropic
- **Mitigation**: Abstraction layers, support multiple providers

### Business Risks

**1. Competition**

- **Risk**: Lovable/Bolt add mentorship features
- **Mitigation**: Focus on complete beginners, build community, superior UX

**2. Market Validation**

- **Risk**: Users don't want AI mentorship, just code generation
- **Mitigation**: Early user testing, pivot readiness

**3. Monetization**

- **Risk**: Users won't pay for hosting
- **Mitigation**: Freemium model, demonstrate value, alternative revenue (templates, consulting)

---

**Next Steps**:

1. Finalize tech stack (see TECH_STACK.md)
2. Build proof of concept (requirements wizard)
3. User testing with 5-10 target users
4. Iterate based on feedback
