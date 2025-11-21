-- AlterTable
ALTER TABLE "users" ADD COLUMN "vercelToken" TEXT,
ADD COLUMN "githubToken" TEXT;

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- Comment
COMMENT ON COLUMN "users"."vercelToken" IS 'Encrypted Vercel API token';
COMMENT ON COLUMN "users"."githubToken" IS 'Encrypted GitHub personal access token';
