# ShipSensei - Monetization Strategy

**Version**: 1.0
**Last Updated**: 2025-11-19

## Business Model

**Strategy**: Freemium SaaS + Open Source Core

**Philosophy**:

- Lower barrier to entry (free tier)
- Monetize value delivered (deployed projects, advanced features)
- Build in public (open source core = trust + community)
- Align pricing with user success (they succeed → we succeed)

## Pricing Tiers

### FREE

**Price**: $0/month

**Limits**:

- 1 active project
- Community support (Discord, docs)
- Deploy to free hosting tiers
- Basic AI assistance
- Standard templates

**Purpose**: Acquisition, validation, learning

**Target**: Hobbyists, students, idea validation

**Conversion Goal**: 5% to PRO (industry average: 2-5%)

---

### PRO

**Price**: $19/month ($190/year, save $38)

**Limits**:

- 5 active projects
- Priority support (email, 24h response)
- Custom domains
- Advanced AI features (more tokens, faster responses)
- Premium templates
- Team collaboration (up to 3 members)

**Purpose**: Revenue, power users

**Target**: Indie hackers, small businesses, freelancers

**Value Proposition**: "Ship multiple products, get professional features"

---

### TEAM

**Price**: $49/month ($490/year, save $98)

**Limits**:

- Unlimited projects
- Priority support (chat, 4h response)
- White-label options
- SLA (99.9% uptime)
- Advanced analytics
- Team collaboration (unlimited members)
- Dedicated account manager (annual plan)

**Purpose**: High-value customers, expansion revenue

**Target**: Agencies, startups, small development teams

**Value Proposition**: "Build for clients, manage team, enterprise features"

---

## Pricing Comparison

| Feature         | FREE      | PRO         | TEAM         |
| --------------- | --------- | ----------- | ------------ |
| Active Projects | 1         | 5           | Unlimited    |
| AI Generation   | 10/day    | 100/day     | 500/day      |
| Deployments     | 5/month   | 50/month    | 500/month    |
| Custom Domains  | ❌        | ✅          | ✅           |
| Team Members    | 1         | 3           | Unlimited    |
| Support         | Community | Email (24h) | Chat (4h)    |
| Templates       | Standard  | Premium     | All + Custom |
| White-label     | ❌        | ❌          | ✅           |
| SLA             | ❌        | ❌          | 99.9%        |
| Price           | $0        | $19/mo      | $49/mo       |

## Revenue Projections

### Year 1 (Conservative)

**Assumptions**:

- Launch month: Month 3 (after MVP complete)
- Monthly user growth: 20% (viral + marketing)
- Free → PRO conversion: 5%
- PRO → TEAM conversion: 10%

| Month | Total Users | FREE  | PRO | TEAM | MRR    |
| ----- | ----------- | ----- | --- | ---- | ------ |
| 3     | 100         | 95    | 5   | 0    | $95    |
| 6     | 300         | 285   | 14  | 1    | $315   |
| 9     | 900         | 855   | 43  | 2    | $915   |
| 12    | 2,700       | 2,565 | 128 | 7    | $2,775 |

**Year 1 Total Revenue**: ~$10,000

### Year 2 (Growth)

**Assumptions**:

- Continued 15% monthly growth
- Improved conversion: 7% (better onboarding, social proof)
- PRO → TEAM: 15% (team features improved)

| Month | Total Users | FREE   | PRO   | TEAM | MRR     |
| ----- | ----------- | ------ | ----- | ---- | ------- |
| 15    | 4,500       | 4,185  | 293   | 22   | $6,645  |
| 18    | 7,000       | 6,510  | 455   | 35   | $10,360 |
| 21    | 11,000      | 10,230 | 716   | 54   | $16,250 |
| 24    | 17,000      | 15,810 | 1,106 | 84   | $25,130 |

**Year 2 Total Revenue**: ~$150,000

## Monetization Levers

### 1. Usage-Based Add-Ons (Future)

**Concept**: Pay for additional usage beyond tier limits

**Pricing**:

- Extra projects: $5/project/month
- Extra AI tokens: $10/100K tokens
- Extra deployments: $1/deployment

**Example**: Free user needs 2 projects → $5/month for second project (cheaper than upgrading to PRO)

**Benefits**:

- Flexible pricing (users pay for what they need)
- Higher ARPU without forcing tier upgrade
- Captures value from edge cases

---

### 2. Marketplace (Phase 2)

**Concept**: User-created templates, components, integrations

**Revenue Split**: 70% creator, 30% ShipSensei

**Pricing**:

- Templates: $19-99 (one-time)
- Premium integrations: $5-20/month
- Custom code snippets: $5-50

**Benefits**:

- Ecosystem growth (network effects)
- Community engagement (creators invested in platform)
- Passive income (marketplace commission)

---

### 3. Enterprise Plan (Phase 3)

**Price**: Custom (starts at $500/month)

**Features**:

- Self-hosted option (on-premise deployment)
- Custom AI model training (company-specific best practices)
- Dedicated support (Slack channel, phone)
- SLA: 99.95% uptime
- Security audits, compliance reports

**Target**: Enterprises, consulting firms, large agencies

**Sales**: High-touch sales process, annual contracts

---

### 4. Professional Services (Future)

**Offerings**:

- Code review: $500/project
- Custom development: $150/hour
- Training/workshops: $2,000/day
- Consulting: $200/hour

**Target**: Companies that need hands-on help

**Benefits**:

- High-margin revenue
- Deepens customer relationships
- Feedback loop (improve product based on consulting learnings)

## Pricing Psychology

### Anchoring

**Technique**: Show TEAM tier first (highest price), makes PRO seem affordable

**Implementation**: Pricing page layout (TEAM → PRO → FREE)

### Decoy Pricing

**Technique**: Make PRO most attractive (best value)

**Example**:

- FREE: 1 project ($0/project)
- PRO: 5 projects ($3.80/project) ← Best value!
- TEAM: Unlimited projects ($49/month)

**Result**: Nudge users toward PRO (sweet spot for revenue)

### Annual Discount

**Discount**: 2 months free (17% off)

**Rationale**:

- Upfront cash (improves cash flow)
- Reduces churn (sunk cost fallacy)
- Predictable revenue

**Example**: PRO annual = $190 (vs. $228 monthly)

## Stripe Integration

**Payment Processing**: Stripe Checkout (hosted page)

**Subscription Management**: Stripe Subscriptions

**Customer Portal**: Stripe Customer Portal (self-service billing)

**Implementation**:

```typescript
// Create checkout session
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [
    {
      price: 'price_pro_monthly', // Stripe price ID
      quantity: 1,
    },
  ],
  success_url: 'https://shipsensei.dev/dashboard?upgrade=success',
  cancel_url: 'https://shipsensei.dev/pricing',
})

// Webhook handling
app.post('/api/webhooks/stripe', async req => {
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers['stripe-signature'],
    webhookSecret
  )

  switch (event.type) {
    case 'checkout.session.completed':
      // Upgrade user to PRO
      await prisma.user.update({
        where: { id: userId },
        data: { tier: 'pro' },
      })
      break
    case 'customer.subscription.deleted':
      // Downgrade to FREE
      await prisma.user.update({
        where: { id: userId },
        data: { tier: 'free' },
      })
      break
  }
})
```

## Churn Reduction

### Retention Strategies

**1. Value Reminders**:

- Weekly email: "You deployed 3 projects this week!"
- Monthly report: Projects created, AI tokens used, time saved

**2. Win-Back Campaigns**:

- Cancelled PRO → Email: "What did we miss?" (feedback survey)
- 30 days post-cancel → Offer: "Come back, 50% off for 3 months"

**3. Feature Adoption**:

- Identify power users (high engagement) → Upsell to TEAM
- Identify struggling users (low usage) → Onboarding email series

**4. Customer Success**:

- PRO users: Check-in email after 30 days
- TEAM users: Quarterly business review (QBR)

**Target Churn**: < 5% monthly (SaaS average: 5-7%)

## Unit Economics

### Customer Acquisition Cost (CAC)

**Channels**:

- Product Hunt: ~$50/user (one-time launch)
- Content marketing: ~$20/user (blog, SEO)
- Paid ads: ~$100/user (Google, Twitter)

**Blended CAC**: $40/user (mostly organic)

### Lifetime Value (LTV)

**FREE**:

- ARPU: $0
- LTV: $0 (marketing value: word-of-mouth)

**PRO**:

- ARPU: $19/month
- Avg. lifetime: 18 months (churn: 5%/month)
- LTV: $342

**TEAM**:

- ARPU: $49/month
- Avg. lifetime: 24 months (churn: 3%/month)
- LTV: $1,176

**LTV:CAC Ratio**: 8.5:1 (PRO), excellent (target: >3:1)

### Break-Even Analysis

**Fixed Costs** (monthly):

- Infrastructure: $200 (Vercel, Neon, Upstash)
- Services: $100 (Sentry, PostHog, etc.)
- Domain, misc: $20

**Total Fixed**: $320/month

**Variable Costs** (per user):

- AI API calls: ~$2/PRO user, ~$8/TEAM user

**Break-Even** (PRO users):

- Revenue: $19/user
- Cost: $2/user
- Contribution margin: $17/user
- Fixed costs: $320
- **Break-even: 19 PRO users** (~100 total users at 5% conversion)

**Achievable**: Month 3-4 post-launch

## Key Metrics

**Acquisition**:

- Signups/week
- Activation rate (% who create first project)
- Time to first deploy

**Monetization**:

- Free → PRO conversion rate (target: 5%)
- PRO → TEAM conversion rate (target: 10%)
- ARPU (average revenue per user)

**Retention**:

- Monthly churn rate (target: <5%)
- Net revenue retention (target: >100%)
- LTV (lifetime value)

**Engagement**:

- Projects created/user
- Deployments/month
- Active users (7-day, 30-day)

## Pricing Experiments

**A/B Tests to Run**:

**1. Pricing Levels**:

- Control: $19 PRO, $49 TEAM
- Test: $15 PRO, $39 TEAM (lower price, higher volume?)

**2. Free Tier Limits**:

- Control: 1 project
- Test: 3 projects (higher engagement → higher conversion?)

**3. Annual Discount**:

- Control: 2 months free (17% off)
- Test: 3 months free (25% off)

**4. Positioning**:

- Control: "Build and launch products"
- Test: "Ship products 10x faster with AI"

**Methodology**: Stripe Billing + PostHog (analytics), 4-week tests, 95% confidence

---

**Owner**: Business/Product Team
**Review Cadence**: Monthly (adjust based on data)
