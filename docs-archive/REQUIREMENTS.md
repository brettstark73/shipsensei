# ShipSensei - Product Requirements Document

**Version**: 1.0
**Last Updated**: 2025-11-19
**Status**: Draft

## Executive Summary

ShipSensei is an AI-powered mentorship platform that guides complete beginners through the entire product development lifecycle - from idea conception to launched product. Unlike code generation tools (Bolt, Lovable) or developer assistants (Cursor, Copilot), ShipSensei provides **strategic guidance, best practices enforcement, and launch support** for users with zero technical knowledge.

## Product Vision

**Mission**: Democratize software development by making it accessible to anyone with an idea, regardless of technical background.

**Vision**: Every entrepreneur, creator, and founder can build and launch production-quality software products with confidence.

**Core Philosophy**:

- **Mentorship over automation** - Teach while building, don't just generate code
- **Opinionated excellence** - Make best-practice decisions for users, explain why
- **Complete journey** - Support from idea to launched product, not just development

## User Personas

### Primary Persona: "Non-Technical Sarah"

**Background**:

- Age: 28-45
- Role: Entrepreneur, product manager, marketer, designer
- Technical skill: Can use no-code tools, uncomfortable with code
- Pain: Has product ideas but can't evaluate feasibility or build MVPs

**Goals**:

- Validate business ideas with real MVPs
- Launch products without hiring developers (initially)
- Learn enough to communicate with future technical teams
- Ship quickly and iterate based on user feedback

**Frustrations**:

- No-code tools too limiting for custom needs
- Hiring developers expensive and risky for unvalidated ideas
- Overwhelmed by technical decisions (which framework? what's CI/CD?)
- Don't know what "good" looks like (security, testing, deployment)

### Secondary Persona: "Learning Luis"

**Background**:

- Age: 18-25
- Role: Student, career switcher, junior developer
- Technical skill: Basic HTML/CSS, learning to code
- Pain: Can write code but doesn't understand production-ready development

**Goals**:

- Learn professional development practices
- Build portfolio projects that demonstrate real skills
- Understand the "why" behind architectural decisions
- Ship projects end-to-end, not just tutorials

**Frustrations**:

- Tutorial hell - can follow guides but can't build from scratch
- Gaps between "hello world" and production applications
- Don't know what they don't know (security, testing, deployment)
- Imposter syndrome - "Am I doing this right?"

## User Stories & Use Cases

### Epic 1: Idea to Requirements

**US-1.1**: As a non-technical user, I want to describe my product idea in plain language so that I can get structured feedback without knowing technical terminology.

**US-1.2**: As a user, I want the system to ask me clarifying questions about my idea so that I discover requirements I hadn't considered.

**US-1.3**: As a user, I want to see example applications similar to my idea so that I can validate feasibility and understand what's possible.

**US-1.4**: As a user, I want a clear requirements document generated from our conversation so that I have a concrete specification to reference.

**Acceptance Criteria**:

- User can input idea as free text or through guided prompts
- System asks 5-10 intelligent follow-up questions based on idea type
- System generates requirements doc covering: features, user flows, data model, constraints
- Requirements are editable and version-controlled

### Epic 2: Architecture & Tech Stack

**US-2.1**: As a non-technical user, I want the system to recommend a technology stack without me needing to understand the options so that I can start building with confidence.

**US-2.2**: As a curious user, I want to understand why specific technologies were chosen so that I can learn and trust the recommendations.

**US-2.3**: As a user, I want the system to validate that recommended technologies are battle-tested and actively maintained so that I don't build on deprecated tools.

**US-2.4**: As a user with constraints, I want to specify budget, timeline, or technical preferences so that recommendations align with my situation.

**Acceptance Criteria**:

- System analyzes requirements and recommends complete stack (frontend, backend, database, hosting)
- Recommendations include: rationale, alternatives considered, trade-offs
- All recommendations are from production-proven, actively maintained technologies
- User can provide constraints: budget ($0, <$50/mo, <$500/mo), timeline (days, weeks, months), complexity preference

### Epic 3: Project Setup & Scaffolding

**US-3.1**: As a non-technical user, I want my project automatically set up with all necessary files and structure so that I don't need to configure anything manually.

**US-3.2**: As a user concerned about security, I want security best practices built in from the start so that I don't ship vulnerable code.

**US-3.3**: As a user who wants quality, I want testing infrastructure set up automatically so that I can validate my code works.

**US-3.4**: As a user planning to iterate, I want version control initialized and configured so that I can track changes safely.

**Acceptance Criteria**:

- One-click project initialization with chosen tech stack
- Project includes: proper structure, dependencies, environment variables, .gitignore, security configs
- Testing framework configured with example tests
- Git repository initialized with appropriate .gitignore and initial commit
- README generated with setup instructions

### Epic 4: Development Guidance (Vibe Coding)

**US-4.1**: As a user building features, I want real-time guidance on what to code next so that I don't get lost or make wrong architectural decisions.

**US-4.2**: As a user writing code, I want the system to catch common mistakes and suggest fixes so that I learn best practices.

**US-4.3**: As a non-technical user, I want to describe what I want in plain language and get working code so that I can build without knowing syntax.

**US-4.4**: As a learning user, I want explanations of generated code so that I understand what's happening and can modify it.

**Acceptance Criteria**:

- Task breakdown: Features decomposed into achievable steps with guidance
- Real-time code review: Catch security issues, anti-patterns, bugs before commit
- Natural language to code: User describes feature → system generates + explains code
- Progressive disclosure: Basic users see simplified view, curious users can drill into details

### Epic 5: Quality Assurance

**US-5.1**: As a user who doesn't understand testing, I want tests automatically generated for my features so that I can validate functionality.

**US-5.2**: As a user concerned about security, I want automatic security scanning so that I don't ship vulnerabilities.

**US-5.3**: As a user wanting production quality, I want code quality checks enforced so that my codebase stays maintainable.

**US-5.4**: As a user planning to scale, I want performance monitoring from day one so that I can identify bottlenecks early.

**Acceptance Criteria**:

- Automatic test generation for new features (unit + integration)
- Security scanning on every commit (dependencies, code patterns, secrets)
- Code quality gates: linting, formatting, complexity checks
- Basic performance monitoring: response times, error rates

### Epic 6: Deployment & Launch

**US-6.1**: As a non-technical user, I want one-click deployment so that I can get my product online without understanding infrastructure.

**US-6.2**: As a user launching publicly, I want a landing page automatically generated so that I can market my product.

**US-6.3**: As a founder, I want guidance on where and how to launch so that I can get initial users.

**US-6.4**: As a user gathering feedback, I want user analytics and feedback collection built in so that I can learn from real users.

**Acceptance Criteria**:

- One-click deployment to production (Vercel/Netlify/Railway style)
- Auto-generated landing page with: value prop, screenshots, waitlist/signup
- Launch checklist: Product Hunt, HN, Reddit, Twitter, communities
- Analytics integration: basic usage metrics, user feedback widget

### Epic 7: Iteration & Scaling

**US-7.1**: As a user with feedback, I want help prioritizing what to build next so that I focus on highest-impact improvements.

**US-7.2**: As a scaling product, I want guidance on when and how to optimize so that I don't over-engineer early or under-prepare late.

**US-7.3**: As a growing team, I want to add collaborators easily so that I can work with others.

**US-7.4**: As a successful product, I want migration paths to custom infrastructure so that I can graduate from ShipSensei when ready.

**Acceptance Criteria**:

- Feedback analysis: Synthesize user feedback into prioritized improvements
- Scaling alerts: System detects performance issues and suggests optimizations
- Team collaboration: Invite members, role-based permissions
- Export/migration: Full code export, documentation for self-hosting

## Functional Requirements

### FR-1: Intelligent Requirements Discovery

**Priority**: P0 (MVP Critical)

**Description**: Interactive wizard that extracts structured requirements from conversational input.

**Components**:

- Natural language input processing
- Context-aware follow-up question generation
- Domain detection (e-commerce, SaaS, marketplace, etc.)
- Requirements document generation (markdown format)
- Requirement validation and completeness checking

**Input**: User's idea description (text or voice)
**Output**: Structured requirements document (features, user flows, data model, constraints)

**Dependencies**: LLM for conversation, template system for doc generation

### FR-2: Tech Stack Recommendation Engine

**Priority**: P0 (MVP Critical)

**Description**: Analyzes requirements and recommends optimal, production-proven technology stack.

**Components**:

- Requirement analysis (scale, complexity, budget, timeline)
- Technology database (frameworks, libraries, tools with metadata: maturity, cost, learning curve)
- Decision matrix (scoring based on fit, popularity, maintainability)
- Explanation generator (why X over Y, trade-offs)
- Alternative presentation (show runner-ups with reasoning)

**Input**: Requirements document, user constraints
**Output**: Recommended stack with rationale, alternatives, setup commands

**Decision Criteria**:

- Maturity: Active maintenance, large community, production usage
- Fit: Matches requirements scale and complexity
- DX: Good documentation, clear error messages, fast iteration
- Cost: Aligns with budget constraints
- Future-proof: Not likely to be deprecated, good upgrade path

### FR-3: Project Scaffolding & Setup

**Priority**: P0 (MVP Critical)

**Description**: Automated project initialization with best practices built in.

**Components**:

- Template generation (project structure, config files, dependencies)
- Security baseline (environment variables, secret management, secure defaults)
- Testing setup (framework, example tests, coverage tools)
- Version control (Git init, .gitignore, commit templates)
- Development environment (local setup instructions, dev server config)

**Input**: Chosen tech stack, project name
**Output**: Fully configured project repository ready for development

**Security Defaults**:

- Environment variable template with examples
- CSP headers configured
- Input validation setup
- Authentication scaffolding (if needed)
- Dependency security scanning enabled

### FR-4: Vibe Coding Assistant

**Priority**: P0 (MVP Critical)

**Description**: Real-time development guidance with code generation and review.

**Components**:

- Task decomposition (features → implementable steps)
- Code generation (natural language → working code)
- Code explanation (generated code → understanding)
- Real-time review (security, performance, best practices)
- Refactoring suggestions (improve existing code)

**Input**: Feature description or existing code
**Output**: Generated code with explanations, improvement suggestions

**Quality Gates**:

- Security: No SQL injection, XSS, exposed secrets, insecure dependencies
- Performance: Avoid N+1 queries, unnecessary re-renders, memory leaks
- Best practices: Follow framework conventions, proper error handling, logging
- Maintainability: Clear naming, appropriate comments, DRY principle

### FR-5: Automated Testing

**Priority**: P1 (Post-MVP, High Priority)

**Description**: Automatic test generation and continuous validation.

**Components**:

- Test generation (unit tests for functions, integration tests for flows)
- Test execution (on-demand and automatic on save)
- Coverage tracking (visual coverage reports)
- Test recommendations (identify untested critical paths)

**Input**: Code changes, features
**Output**: Test suite, coverage report, recommendations

**Test Types**:

- Unit: Individual functions and components
- Integration: Feature flows and API endpoints
- E2E: Critical user journeys (using Playwright)
- Accessibility: Basic WCAG compliance checks

### FR-6: Security Enforcement

**Priority**: P0 (MVP Critical)

**Description**: Continuous security scanning and vulnerability prevention.

**Components**:

- Dependency scanning (known vulnerabilities in packages)
- Code pattern detection (SQL injection, XSS, exposed secrets)
- Security headers validation (CSP, HSTS, etc.)
- Authentication/authorization review (access control correctness)
- Secret detection (API keys, passwords in code)

**Input**: Code changes, dependencies
**Output**: Security report, blocking issues, recommendations

**Severity Levels**:

- **Critical**: Blocks deployment (exposed secrets, SQL injection, critical CVEs)
- **High**: Requires acknowledgment (missing auth checks, moderate CVEs)
- **Medium**: Warning (suboptimal security headers, weak validation)
- **Low**: Info (security improvements, best practices)

### FR-7: One-Click Deployment

**Priority**: P1 (Post-MVP, High Priority)

**Description**: Automated deployment to production hosting.

**Components**:

- Hosting provider integration (Vercel, Netlify, Railway, Render)
- Build optimization (bundling, minification, caching)
- Environment variable management (secure secret injection)
- Custom domain setup (DNS configuration guidance)
- SSL/HTTPS automatic (via hosting provider)

**Input**: Project repository, hosting choice, environment variables
**Output**: Live production URL, deployment status, rollback capability

**Deployment Flow**:

1. Pre-deploy validation (tests pass, security clear, build succeeds)
2. Build optimization (production mode, asset optimization)
3. Deploy to hosting (push to provider, environment config)
4. Health check (verify deployment successful)
5. Custom domain (if provided, configure DNS)

### FR-8: Landing Page Generation

**Priority**: P1 (Post-MVP, High Priority)

**Description**: Automatic marketing landing page creation.

**Components**:

- Value proposition extraction (from requirements, product description)
- Page generation (hero, features, pricing, CTA, FAQ)
- Responsive design (mobile-first, accessible)
- SEO optimization (meta tags, structured data, sitemap)
- Analytics integration (user tracking, conversion goals)

**Input**: Product name, description, screenshots, pricing
**Output**: Professional landing page (HTML/CSS/JS or framework-based)

**Page Sections**:

- Hero: Headline, subheadline, primary CTA, screenshot/demo
- Social proof: Testimonials, user count, logos (if available)
- Features: Key benefits with icons/screenshots
- Pricing: Plans comparison (if applicable)
- FAQ: Common questions answered
- Footer: Links, contact, legal

### FR-9: Launch Guidance

**Priority**: P2 (Nice-to-Have)

**Description**: Strategic advice on where and how to launch product.

**Components**:

- Launch platform recommendations (Product Hunt, Hacker News, Reddit, Twitter)
- Launch checklist (tasks before going public)
- Community identification (where target users congregate)
- Content templates (launch post, tweets, emails)
- Timing optimization (best days/times to launch)

**Input**: Product type, target audience, goals
**Output**: Launch plan, checklists, content templates

**Platforms**:

- Product Hunt: Timing, hunter outreach, asset preparation
- Hacker News: Show HN guidelines, title optimization
- Reddit: Relevant subreddits, community rules, posting strategy
- Twitter: Launch thread template, influencer outreach
- Communities: Slack/Discord communities, niche forums

### FR-10: Analytics & Feedback

**Priority**: P2 (Nice-to-Have)

**Description**: User behavior tracking and feedback collection.

**Components**:

- Analytics integration (Google Analytics, Plausible, or simple custom)
- Event tracking (key user actions, conversion funnels)
- Feedback widget (in-app feedback collection)
- User insights (common patterns, drop-off points)
- Feature request tracking (user suggestions prioritized)

**Input**: User interactions, feedback submissions
**Output**: Analytics dashboard, feedback summary, action items

**Metrics**:

- Traffic: Visitors, page views, sources
- Engagement: Session duration, bounce rate, returning users
- Conversion: Signup rate, activation rate, retention
- Feedback: User sentiment, feature requests, bug reports

## Non-Functional Requirements

### NFR-1: Performance

**Response Time**:

- Requirements generation: < 30 seconds
- Tech stack recommendation: < 10 seconds
- Code generation: < 15 seconds (simple), < 60 seconds (complex)
- Deployment: < 5 minutes (typical web app)

**Scalability**:

- Support 10,000 concurrent users (post-launch)
- Handle 100+ projects per user
- Process 1,000+ code generation requests/hour

### NFR-2: Reliability

**Uptime**: 99.9% availability (excluding planned maintenance)

**Error Handling**:

- Graceful degradation (if AI unavailable, fall back to templates)
- Clear error messages (what went wrong, how to fix)
- Automatic retry (transient failures)
- State preservation (no lost work from crashes)

**Data Durability**:

- Zero data loss for committed projects
- Automatic backups (daily snapshots)
- Version history (7-day rollback for PRO, 30-day for TEAM)

### NFR-3: Security

**Authentication**:

- Secure auth (OAuth via GitHub/Google + magic link email)
- MFA optional (PRO/TEAM)
- Session management (secure tokens, automatic timeout)

**Data Protection**:

- Encryption at rest (project code, user data)
- Encryption in transit (TLS 1.3)
- Secret management (encrypted environment variables, never logged)
- Access control (users can only access their projects)

**Compliance**:

- GDPR ready (data export, deletion on request)
- SOC 2 Type II (TEAM tier, future)

### NFR-4: Usability

**Target**: Complete beginners can ship a product within 1 day

**Principles**:

- **Zero jargon**: Explain technical concepts in plain language
- **Progressive disclosure**: Show simple view by default, advanced on request
- **Clear feedback**: Always indicate what's happening, what's next
- **Undo everything**: Allow rollback of any decision/change
- **Learn by doing**: Teach concepts as they become relevant

**Accessibility**:

- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatible
- High contrast mode

### NFR-5: Maintainability

**Code Quality**:

- Test coverage > 80% (core features)
- Linting enforced (Prettier, ESLint)
- Documentation (inline comments, architecture docs)

**Monitoring**:

- Application metrics (response times, error rates)
- Business metrics (signups, conversions, retention)
- Alerting (PagerDuty/Sentry for critical issues)

**Deployment**:

- CI/CD pipeline (automated testing, deployment)
- Feature flags (gradual rollout, A/B testing)
- Blue-green deployment (zero-downtime updates)

## Success Metrics

### Primary Metrics

**Activation**:

- Time to first deployed project: < 24 hours (target: < 4 hours)
- % users who complete requirements → deploy: > 40%

**Retention**:

- Day 7 retention: > 30%
- Day 30 retention: > 15%
- Monthly active users (MAU): 10,000 (6 months post-launch)

**Quality**:

- Deployed projects that get real users: > 50%
- Projects still live after 30 days: > 40%

### Secondary Metrics

**Engagement**:

- Projects per user: 2.5 average
- Sessions per week: 3+ for active users
- NPS score: > 50

**Revenue** (Post-MVP):

- Free → PRO conversion: > 5%
- PRO → TEAM conversion: > 10%
- MRR: $10K (6 months), $50K (12 months)

**Learning**:

- Users who can explain tech stack choices: > 60% (survey)
- Users who modify generated code successfully: > 40%

## Out of Scope (MVP)

**Deferred to Post-MVP**:

- Mobile app (web-only initially)
- Real-time collaboration (team features simplified)
- Custom AI model training (use existing LLMs)
- White-label branding (TEAM tier, future)
- Advanced analytics (basic metrics only)
- Marketplace for templates/components (future)

**Not Planned**:

- Native mobile development (web apps only)
- Low-level systems programming (focus on web/SaaS)
- Game development (different domain expertise)
- Blockchain/Web3 (too niche, rapidly changing)

## Constraints & Assumptions

### Constraints

**Technical**:

- Must use battle-tested technologies only (no bleeding edge)
- Must work on common devices (desktop, tablet, mobile browsers)
- Must integrate with existing AI APIs (OpenAI, Anthropic)

**Business**:

- Bootstrap budget initially (minimize costs)
- Build in public (open source core)
- MVP launch within 3 months

**Legal**:

- Cannot guarantee generated code is bug-free or secure
- Users own their code (ShipSensei has no rights)
- Must comply with AI provider terms of service

### Assumptions

**User Behavior**:

- Users willing to provide detailed requirements through conversation
- Users will iterate based on feedback (not one-and-done)
- Users want to learn, not just get code

**Market**:

- Demand exists for mentorship-focused tool (vs pure code gen)
- Users will pay for hosting/advanced features
- "Build in public" strategy attracts community

**Technology**:

- LLMs continue improving (better code generation)
- Hosting platforms remain affordable/accessible
- Modern web frameworks remain stable (React, Next.js, etc.)

## Appendices

### Appendix A: Technology Evaluation Criteria

When recommending tech stack, evaluate on:

1. **Maturity**: Production usage, years active, major version stability
2. **Community**: GitHub stars, npm downloads, Stack Overflow questions
3. **Documentation**: Quality, completeness, examples
4. **Performance**: Benchmarks for typical use cases
5. **Developer Experience**: Error messages, debugging tools, iteration speed
6. **Ecosystem**: Available libraries, integrations, tooling
7. **Cost**: Hosting requirements, licensing, team size needs
8. **Security**: CVE history, maintainer response time, security features
9. **Learning Curve**: Time to productivity for beginners
10. **Future-Proofing**: Active development, roadmap, adoption trends

### Appendix B: Security Checklist

Every generated project must include:

- [ ] Environment variables properly configured (.env.example, no secrets in code)
- [ ] Input validation on all user inputs (prevent injection attacks)
- [ ] Output encoding (prevent XSS)
- [ ] Authentication setup (if user accounts exist)
- [ ] Authorization checks (protect sensitive operations)
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Security headers (CSP, HSTS, X-Frame-Options, etc.)
- [ ] Dependency scanning (automated CVE checks)
- [ ] Rate limiting (prevent abuse)
- [ ] Error handling (no sensitive data in errors)
- [ ] Logging (security events, no sensitive data logged)
- [ ] Session management (secure cookies, timeouts)

### Appendix C: User Onboarding Flow

**First-Time User Experience**:

1. **Landing** (30 sec)
   - Value prop: "Build and launch products without coding"
   - Social proof: Example projects, user testimonials
   - CTA: "Start building for free"

2. **Signup** (30 sec)
   - OAuth (GitHub/Google) or magic link email
   - No password required
   - Instant access (no email verification delay)

3. **Idea Input** (2-5 min)
   - "What do you want to build?" free text input
   - Examples shown: "A recipe sharing app", "SaaS for freelancers"
   - AI asks 5-10 clarifying questions
   - Generate requirements doc

4. **Review Requirements** (2 min)
   - Show structured requirements
   - Editable (add/remove features)
   - Confirm to proceed

5. **Tech Stack** (1 min)
   - Recommended stack with simple explanations
   - "We chose React because..." (expandable details)
   - Confirm or request alternatives

6. **Project Setup** (30 sec)
   - Automatic scaffolding
   - Progress indicator
   - "Your project is ready!"

7. **First Feature** (5-10 min)
   - Guided tutorial: "Let's build your first feature"
   - User describes in plain language
   - System generates code with explanations
   - Deploy preview immediately

8. **Deploy to Production** (2 min)
   - One-click deployment
   - Live URL provided
   - "Your product is live! Now let's get users..."

9. **Launch Guidance** (5 min)
   - Where to share
   - Content templates
   - Analytics setup

**Total Time to First Deploy**: < 30 minutes (target: < 20 minutes)

---

**Document Status**: Living document, will evolve based on user feedback and market validation.

**Next Steps**:

1. Architecture design (see ARCHITECTURE.md)
2. Tech stack finalization (see TECH_STACK.md)
3. Prototype requirements wizard
4. User testing with 5-10 target personas
