#!/usr/bin/env npx tsx

/**
 * Token Encryption Migration Script
 *
 * Encrypts existing OAuth tokens in the database.
 * Run this ONCE after deploying token encryption to production.
 *
 * Usage:
 *   npx tsx scripts/encrypt-existing-tokens.ts
 *
 * Prerequisites:
 *   - ENCRYPTION_KEY environment variable must be set
 *   - Database must be accessible
 */

import { PrismaClient } from '@prisma/client'
import {
  encryptExistingTokens,
  validateTokenEncryption,
} from '../src/lib/prisma-encryption'

async function main() {
  console.log('🔐 Starting OAuth token encryption migration...')

  if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY environment variable is required')
    console.error('Generate one with: openssl rand -hex 32')
    process.exit(1)
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const prisma = new PrismaClient()

  try {
    // Validate current state
    console.log('📊 Checking current token encryption status...')
    const beforeStatus = await validateTokenEncryption(prisma)
    console.log(`Current status:
- Total accounts: ${beforeStatus.totalAccounts}
- Already encrypted: ${beforeStatus.encryptedAccounts}
- Unencrypted: ${beforeStatus.unencryptedAccounts}
- Corrupted/invalid: ${beforeStatus.corruptedAccounts}`)

    if (beforeStatus.unencryptedAccounts === 0) {
      console.log('✅ All tokens are already encrypted. No migration needed.')
      return
    }

    // Confirm migration
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ PRODUCTION MIGRATION DETECTED')
      console.log('This will encrypt OAuth tokens in production database.')
      console.log('Make sure you have a backup before proceeding.')

      // In production, require explicit confirmation
      if (process.env.CONFIRM_ENCRYPTION_MIGRATION !== 'yes') {
        console.log(
          '❌ Set CONFIRM_ENCRYPTION_MIGRATION=yes to proceed with production migration'
        )
        process.exit(1)
      }
    }

    // Perform encryption
    console.log('🔄 Encrypting existing tokens...')
    const encryptedCount = await encryptExistingTokens(prisma)

    // Validate results
    console.log('✅ Verifying encryption results...')
    const afterStatus = await validateTokenEncryption(prisma)
    console.log(`Final status:
- Total accounts: ${afterStatus.totalAccounts}
- Encrypted: ${afterStatus.encryptedAccounts}
- Still unencrypted: ${afterStatus.unencryptedAccounts}
- Corrupted/invalid: ${afterStatus.corruptedAccounts}`)

    if (
      afterStatus.unencryptedAccounts === 0 &&
      afterStatus.corruptedAccounts === 0
    ) {
      console.log('🎉 Token encryption migration completed successfully!')
      console.log(`Encrypted tokens in ${encryptedCount} accounts.`)
    } else {
      console.warn('⚠️ Migration completed but some issues remain:')
      if (afterStatus.unencryptedAccounts > 0) {
        console.warn(
          `- ${afterStatus.unencryptedAccounts} accounts still have unencrypted tokens`
        )
      }
      if (afterStatus.corruptedAccounts > 0) {
        console.warn(
          `- ${afterStatus.corruptedAccounts} accounts have corrupted tokens`
        )
      }
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Self-validation: Check if encryption key is valid before running
function validateEnvironment() {
  const encryptionKey = process.env.ENCRYPTION_KEY

  if (!encryptionKey) {
    console.error('❌ ENCRYPTION_KEY is required')
    return false
  }

  if (encryptionKey.length !== 64) {
    console.error(
      '❌ ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)'
    )
    console.error('Current length:', encryptionKey.length)
    console.error('Generate a valid key with: openssl rand -hex 32')
    return false
  }

  // Test that the key is valid hex
  try {
    Buffer.from(encryptionKey, 'hex')
  } catch {
    console.error('❌ ENCRYPTION_KEY must be valid hexadecimal')
    console.error('Generate a valid key with: openssl rand -hex 32')
    return false
  }

  return true
}

// Run migration
if (require.main === module) {
  if (!validateEnvironment()) {
    process.exit(1)
  }

  main().catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
}
