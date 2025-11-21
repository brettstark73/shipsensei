-- DropTable: Remove orphaned rate_limits table
-- This table was created but never used in the application
-- Rate limiting is now handled by Redis/in-memory implementation

-- Drop indexes first
DROP INDEX IF EXISTS "rate_limits_identifier_createdAt_idx";
DROP INDEX IF EXISTS "rate_limits_expiresAt_idx";

-- Drop the table
DROP TABLE IF EXISTS "rate_limits";

-- Add comment explaining the removal
COMMENT ON SCHEMA public IS 'Rate limiting is now handled by Redis/in-memory implementation (edge-rate-limit.ts)';
