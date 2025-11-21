import { PrismaClient } from '@prisma/client'
import { tokenEncryptionMiddleware } from './prisma-encryption'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const client = new PrismaClient({
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

    // Always apply token encryption middleware
    client.$use(tokenEncryptionMiddleware)

    return client
  })()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
