import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
// import { tokenEncryptionMiddleware } from './prisma-encryption' // TODO: Update for Prisma v7 extensions

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    // Prisma v7 requires adapter for PostgreSQL connections
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)

    const client = new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    })

    // Encryption is mandatory in all environments for security
    // Fail fast if ENCRYPTION_KEY is not configured
    if (!process.env.ENCRYPTION_KEY) {
      const error = new Error(
        'ENCRYPTION_KEY environment variable is required for OAuth token security.\n' +
          'Generate with: openssl rand -hex 32\n' +
          'Set in .env.local: ENCRYPTION_KEY=your_generated_key'
      )
      console.error('🔐 CRITICAL SECURITY ERROR:', error.message)
      throw error
    }

    // TODO: Token encryption middleware needs to be updated for Prisma v7
    // client.$use(tokenEncryptionMiddleware) // $use is deprecated in Prisma v7

    return client
  })()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
