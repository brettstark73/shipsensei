-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'DEPLOYED');

-- AlterTable: Convert existing string status to enum
-- First, update the existing values to uppercase (if they exist)
UPDATE "projects" SET "status" = 'DRAFT' WHERE LOWER("status") = 'draft';
UPDATE "projects" SET "status" = 'GENERATING' WHERE LOWER("status") = 'generating';
UPDATE "projects" SET "status" = 'READY' WHERE LOWER("status") = 'ready';
UPDATE "projects" SET "status" = 'DEPLOYED' WHERE LOWER("status") = 'deployed';

-- Change column type to enum
ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "status" TYPE "ProjectStatus" USING ("status"::text::"ProjectStatus");
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Add string length constraints to projects table
ALTER TABLE "projects" ALTER COLUMN "name" TYPE VARCHAR(255);
ALTER TABLE "projects" ALTER COLUMN "description" TYPE VARCHAR(1000);
ALTER TABLE "projects" ALTER COLUMN "repository" TYPE VARCHAR(500);
ALTER TABLE "projects" ALTER COLUMN "deployment" TYPE VARCHAR(500);

-- Add string length constraints to requirements table
ALTER TABLE "requirements" ALTER COLUMN "question" TYPE VARCHAR(1000);
ALTER TABLE "requirements" ALTER COLUMN "answer" TYPE VARCHAR(5000);

-- CreateIndex for status (for filtering by status)
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex for composite (projectId, order) for efficient ordering
CREATE INDEX "requirements_projectId_order_idx" ON "requirements"("projectId", "order");

-- Add comments
COMMENT ON TYPE "ProjectStatus" IS 'Valid project status values';
COMMENT ON COLUMN "projects"."status" IS 'Current project status: DRAFT, GENERATING, READY, or DEPLOYED';
