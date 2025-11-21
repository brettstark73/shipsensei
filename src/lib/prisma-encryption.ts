import { PrismaClient } from '@prisma/client'
import { encryptToken, decryptToken, isEncryptedToken } from './encryption'

/**
 * Prisma Middleware for Token Encryption
 *
 * Automatically encrypts/decrypts OAuth tokens in Account model
 * Transparent to application code
 */

// Fields that contain sensitive tokens to encrypt
const ENCRYPTED_FIELDS = ['access_token', 'refresh_token', 'id_token']

// Account data interface for encryption
interface AccountData {
  [key: string]: unknown
}

/**
 * Encrypt sensitive fields in account data
 */
async function encryptAccountTokens(data: AccountData): Promise<AccountData> {
  if (!data) return data

  const encrypted: AccountData = { ...data }

  for (const field of ENCRYPTED_FIELDS) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      // Only encrypt if not already encrypted
      if (!isEncryptedToken(encrypted[field])) {
        encrypted[field] = await encryptToken(encrypted[field])
      }
    }
  }

  return encrypted
}

/**
 * Decrypt sensitive fields in account data
 */
async function decryptAccountTokens(data: AccountData): Promise<AccountData> {
  if (!data) return data

  const decrypted: AccountData = { ...data }

  for (const field of ENCRYPTED_FIELDS) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      // Only decrypt if it appears to be encrypted
      if (isEncryptedToken(decrypted[field])) {
        try {
          decrypted[field] = await decryptToken(decrypted[field])
        } catch (error) {
          console.error(`Failed to decrypt ${field} for account:`, error)
          // Set to null if decryption fails (token is corrupted)
          decrypted[field] = null
        }
      }
    }
  }

  return decrypted
}

/**
 * Process array of accounts for decryption
 */
async function decryptAccountArray(
  accounts: AccountData[]
): Promise<AccountData[]> {
  if (!Array.isArray(accounts)) return accounts

  return Promise.all(accounts.map(account => decryptAccountTokens(account)))
}

/**
 * Prisma extension for automatic token encryption/decryption
 * Replaces deprecated $use middleware for Prisma v7 compatibility
 */
export const tokenEncryptionExtension = {
  name: 'tokenEncryption',
  query: {
    account: {
      async $allOperations({ model, operation, args, query }: any) {
        try {
          // Handle create/update operations (encrypt before storing)
          if (operation === 'create' || operation === 'update') {
            if (args.data) {
              args.data = await encryptAccountTokens(args.data)
            }
          }

          if (operation === 'upsert') {
            if (args.create) {
              args.create = await encryptAccountTokens(args.create)
            }
            if (args.update) {
              args.update = await encryptAccountTokens(args.update)
            }
          }

          if (operation === 'createMany') {
            if (args.data && Array.isArray(args.data)) {
              args.data = await Promise.all(
                args.data.map((item: any) => encryptAccountTokens(item))
              )
            }
          }

          if (operation === 'updateMany') {
            if (args.data) {
              args.data = await encryptAccountTokens(args.data)
            }
          }

          // Execute the query
          const result = await query(args)

          // Handle read operations (decrypt after reading)
          if (operation === 'findFirst' || operation === 'findUnique') {
            return result ? await decryptAccountTokens(result) : result
          }

          if (operation === 'findMany') {
            return Array.isArray(result)
              ? await decryptAccountArray(result)
              : result
          }

          if (
            operation === 'create' ||
            operation === 'update' ||
            operation === 'upsert'
          ) {
            return result ? await decryptAccountTokens(result) : result
          }

          return result
        } catch (error) {
          console.error('Token encryption extension error:', error)
          throw error
        }
      },
    },
  },
}

/**
 * Manual token encryption for legacy data migration
 */
export async function encryptExistingTokens(
  prisma: PrismaClient
): Promise<number> {
  console.log('Starting token encryption migration...')

  // Find all accounts with unencrypted tokens
  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      id_token: true,
    },
  })

  let encryptedCount = 0

  for (const account of accounts) {
    const updates: Record<string, string> = {}

    // Check each token field
    for (const field of ENCRYPTED_FIELDS) {
      const token = (account as any)[field]
      if (token && typeof token === 'string' && !isEncryptedToken(token)) {
        updates[field] = await encryptToken(token)
      }
    }

    // Update account if any tokens were encrypted
    if (Object.keys(updates).length > 0) {
      await prisma.account.update({
        where: { id: account.id },
        data: updates,
      })
      encryptedCount++
    }
  }

  console.log(
    `Token encryption migration complete. Encrypted ${encryptedCount} accounts.`
  )
  return encryptedCount
}

/**
 * Validate that all tokens are properly encrypted
 */
export async function validateTokenEncryption(prisma: PrismaClient): Promise<{
  totalAccounts: number
  encryptedAccounts: number
  unencryptedAccounts: number
  corruptedAccounts: number
}> {
  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      id_token: true,
    },
  })

  let encryptedCount = 0
  let unencryptedCount = 0
  let corruptedCount = 0

  for (const account of accounts) {
    let hasEncrypted = false
    let hasUnencrypted = false
    let hasCorrupted = false

    for (const field of ENCRYPTED_FIELDS) {
      const token = (account as any)[field]
      if (token && typeof token === 'string') {
        if (isEncryptedToken(token)) {
          try {
            await decryptToken(token)
            hasEncrypted = true
          } catch {
            hasCorrupted = true
          }
        } else {
          hasUnencrypted = true
        }
      }
    }

    if (hasCorrupted) {
      corruptedCount++
    } else if (hasUnencrypted) {
      unencryptedCount++
    } else if (hasEncrypted) {
      encryptedCount++
    }
  }

  return {
    totalAccounts: accounts.length,
    encryptedAccounts: encryptedCount,
    unencryptedAccounts: unencryptedCount,
    corruptedAccounts: corruptedCount,
  }
}
