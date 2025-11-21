# ShipSensei Database Schema Review - Executive Summary

**Date**: 2025-11-21  
**Thoroughness**: Very Thorough  
**Overall Schema Health: 6.5/10** ⚠️

---

## CRITICAL FINDINGS

### 🔴 CRITICAL ISSUE: Schema/Migration Mismatch

**The `rate_limits` table exists in the migration.sql but NOT in the Prisma schema**

- Migration creates the table at lines 79-86
- Table has indexes at lines 110-111, 113  
- BUT: No `RateLimit` model in `prisma/schema.prisma`
- Application uses Redis/in-memory rate limiting instead
- Orphaned table consuming storage in production database

**Fix**: Drop the unused table
```bash
npx prisma migrate dev --name remove_unused_rate_limits_table
# Then drop table via migration.sql
```
**Effort**: 15 minutes

---

## HIGH PRIORITY ISSUES (Fix in Next Sprint)

### #1: Missing ENUM for Status Field (45 min)
- Currently uses String, allows invalid values
- Should be: `enum ProjectStatus { DRAFT, GENERATING, READY, DEPLOYED }`
- Requires data migration

### #2: No Database String Length Constraints (30 min)
- Project.name: 100 char max (Zod) but DB unlimited
- Requirements.question: 1000 char max (Zod) but DB unlimited  
- Zod can be bypassed, needs DB constraints
- Add `@db.VarChar(100)`, `@db.VarChar(1000)`, etc.

### #3: Missing Transaction in Generate Route (15 min)
- Separate project updates that can partially fail
- Updates status to "generating", calls external APIs, then updates again
- Should wrap in `prisma.$transaction()`
- File: `/src/app/api/projects/[id]/generate/route.ts`

---

## STRENGTHS

✅ **Excellent**:
- Perfect normalization (3NF/BCNF)
- All foreign keys properly cascading delete
- Great index coverage (all FKs indexed)
- Strong application validation with Zod
- OAuth token encryption implemented
- Secure query patterns (all filter by userId)
- No N+1 query issues
- Proper connection singleton pattern

✅ **Good**:
- Consistent naming conventions (snake_case tables)
- Appropriate nullable fields
- Security: SQL injection protected, no hardcoded secrets
- Scalability: Can handle 10K+ users year 1

---

## DATA INTEGRITY ASSESSMENT

| Category | Score | Notes |
|----------|-------|-------|
| Normalization | 9/10 | Perfect structure |
| Relationships | 9/10 | All cascade deletes correct |
| Constraints | 4/10 | Missing DB-level string/status constraints |
| Indexes | 8.5/10 | All essential indexes present |
| Validation | 7/10 | Good app-level, weak DB-level |
| Security | 8.5/10 | OAuth tokens encrypted, secure patterns |
| Naming | 9/10 | Excellent consistency |
| Scalability | 8/10 | MVP-appropriate, can grow to 10K+ users |

---

## MEDIUM PRIORITY ISSUES (v1.0)

- **No database-level RLS** (Row-Level Security) - application handles via userId filters
- **PII not encrypted** - email/names stored plaintext (but needed for auth/UX)
- **No audit trail** - who changed what not logged
- **No soft deletes** - hard deletes via cascade (acceptable for MVP)

---

## QUICK FIX SUMMARY

| # | Fix | Severity | Time | Action |
|---|-----|----------|------|--------|
| 1 | Remove rate_limits table | CRITICAL | 15 min | Run migration to DROP table |
| 2 | Add ProjectStatus ENUM | HIGH | 45 min | Schema + migration + data migration |
| 3 | Add string length constraints | HIGH | 30 min | Add @db.VarChar() to schema |
| 4 | Add transaction in generate route | HIGH | 15 min | Wrap external calls in prisma.$transaction() |

**Total Critical/High Fixes: 105 minutes**

---

## DETAILED FINDINGS BY CATEGORY

### Schema Design: 9/10
- Excellent normalization
- Proper relationships
- All constraints present
- Only issue: rate_limits table orphaned

### Data Types: 6/10
- CUIDs for IDs: Perfect
- Timestamps: Correct
- Status field: Should be ENUM (currently String)
- String fields: No DB-level length constraints

### Indexes: 8.5/10
- All FK indexed: ✓
- All unique constraints indexed: ✓
- Could add status index for future admin dashboards
- No over-indexing

### Validation: 7/10
- Zod validation excellent
- But DB doesn't enforce string lengths
- DB doesn't enforce status values
- Application validation can be bypassed

### Naming: 9/10
- Tables: snake_case (users, projects, requirements) ✓
- Fields: camelCase (userId, projectId) ✓
- Only exception: NextAuth.js standard fields (refresh_token, access_token)

### Security: 8.5/10
- OAuth tokens encrypted ✓
- No hardcoded secrets ✓
- SQL injection protected ✓
- All queries filter by userId ✓
- Gap: No database-level RLS (not critical for MVP)

### Relationships: 9/10
- All foreign keys have CASCADE DELETE ✓
- Prevents orphaned records ✓
- One-to-many properly defined ✓
- Only gap: Could have explicit many-to-many (none needed)

### Migrations: 5/10
- Single comprehensive initial migration
- No evolution migrations (expected for MVP)
- Missing reversibility documentation
- Contains orphaned table (rate_limits)

---

## CODE QUALITY PATTERNS

### Query Efficiency
✅ **Good patterns found**:
```typescript
// Always includes related data (no N+1)
prisma.project.findMany({
  where: { userId: session.user.id },
  include: { requirements: { orderBy: { order: 'asc' } } }
})

// Bulk operations
await prisma.requirement.createMany({ data: requirementsData })

// Always filters by userId (security)
prisma.project.findUnique({
  where: { id, userId: session.user.id }
})
```

❌ **Issues found**:
- No transaction in generate route
- No explicit error handling for Prisma-specific errors
- No retry logic for transient failures

---

## PRODUCTION READINESS

**Status**: MVP-ready after fixes

**Must fix before production**:
1. Remove rate_limits table (schema mismatch)
2. Add ProjectStatus ENUM (data integrity)
3. Add string length constraints (data validation)
4. Add transaction in generate route (consistency)

**Should fix before v1.0**:
1. Add database-level RLS
2. Implement audit trail
3. Encrypt email/names (PII protection)

**Nice to have**:
1. Add status index
2. Soft delete strategy
3. Migration reversibility

---

## SCALABILITY OUTLOOK

**Year 1 Projections**:
- 10,000 users
- 50,000 projects
- 500,000 requirements
- ~124 MB total data

**Scaling needs**:
- ✅ Current schema handles this fine
- Neon free tier supports this
- No partitioning needed yet
- No archiving needed yet

**Year 3 (Hypothetical)**:
- Would need table partitioning if 1M+ users
- Consider archive strategy for deleted projects
- Might want read replicas
- Could implement caching layer

---

## RECOMMENDATIONS PRIORITY

```
IMMEDIATE (Next 1-2 hours):
  - Remove rate_limits table [15 min]
  - Add ProjectStatus ENUM [45 min]
  - Add string length constraints [30 min]
  - Add transaction in generate route [15 min]

THIS SPRINT (Next week):
  - Database-level RLS [4 hours]
  - Audit logging [3 hours]

v1.0 (Before production):
  - PII encryption [2 hours]
  - Migration reversibility [2 hours]

Future (Post-MVP):
  - Soft delete strategy
  - Status index
  - Performance monitoring
```

---

## FILES ANALYZED

- `/home/user/shipsensei/prisma/schema.prisma` (106 lines)
- `/home/user/shipsensei/prisma/migrations/20250101000000_init/migration.sql` (125 lines)
- `/home/user/shipsensei/src/lib/prisma.ts` (Singleton pattern)
- `/home/user/shipsensei/src/lib/prisma-encryption.ts` (Token encryption middleware)
- `/home/user/shipsensei/src/lib/edge-rate-limit.ts` (Rate limiting logic)
- 10 API route files (all properly secured)
- `/home/user/shipsensei/src/middleware.ts` (Rate limit middleware)

---

## CONCLUSION

The ShipSensei database is **fundamentally sound** with excellent normalization, security, and query patterns. The main issues are:

1. **Schema/migration mismatch** (fixable in 15 min)
2. **Missing database constraints** (fixable in 75 min)
3. **Missing transaction** (fixable in 15 min)

After fixing these 4 issues (total 105 minutes), the database will be production-ready for MVP.

**Recommendation**: Fix all HIGH priority issues before the next release. The schema demonstrates strong fundamentals and good security practices.

---

**Generated**: 2025-11-21  
**Reviewer**: Claude Code  
**Confidence**: Very High  
**Next Review**: After fixes implemented

