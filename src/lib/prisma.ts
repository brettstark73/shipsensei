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

    // Add token encryption middleware only if encryption key is available
    // Skip in development/test if ENCRYPTION_KEY is not set
    if (process.env.ENCRYPTION_KEY) {
      client.$use(tokenEncryptionMiddleware)
    } else if (process.env.NODE_ENV === 'production') {
      console.warn(
        '⚠️ ENCRYPTION_KEY not set in production - OAuth tokens will not be encrypted'
      )
    }

    return client
  })()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
