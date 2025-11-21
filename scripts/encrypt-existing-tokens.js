#!/usr/bin/env node

/**
 * Encrypt Existing Tokens Migration Script
 *
 * Encrypts any existing unencrypted OAuth tokens in the database
 * Run with: npm run encrypt-existing-tokens
 */

const { PrismaClient } = require('@prisma/client')

// Import the encryption utilities
const { encryptExistingTokens, validateTokenEncryption } = require('../src/lib/prisma-encryption')

async function main() {
  console.log('🔐 Starting OAuth token encryption migration...\n')

  // Validate encryption key is set
  if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY environment variable is required')
    console.error('Run: npm run setup-encryption')
    process.exit(1)
  }

  if (process.env.ENCRYPTION_KEY.length !== 64) {
    console.error('❌ ENCRYPTION_KEY must be exactly 64 hex characters')
    console.error('Run: npm run setup-encryption')
    process.exit(1)
  }

  const prisma = new PrismaClient()

  try {
    // Check current encryption status
    console.log('📊 Checking current token encryption status...')
    const before = await validateTokenEncryption(prisma)

    console.log(`Found ${before.totalAccounts} total accounts:`)
    console.log(`• ${before.encryptedAccounts} already encrypted`)
    console.log(`• ${before.unencryptedAccounts} unencrypted`)
    console.log(`• ${before.corruptedAccounts} corrupted\n`)

    if (before.unencryptedAccounts === 0) {
      console.log('✅ All tokens are already encrypted!')
      return
    }

    if (before.corruptedAccounts > 0) {
      console.log(`⚠️ Found ${before.corruptedAccounts} accounts with corrupted tokens`)
      console.log('These will be skipped during migration\n')
    }

    // Perform encryption
    console.log(`🔄 Encrypting ${before.unencryptedAccounts} accounts...`)
    await encryptExistingTokens(prisma)

    // Validate results
    console.log('\n📊 Validation after encryption...')
    const after = await validateTokenEncryption(prisma)

    console.log(`Results:`)
    console.log(`• ${after.encryptedAccounts} encrypted (+${after.encryptedAccounts - before.encryptedAccounts})`)
    console.log(`• ${after.unencryptedAccounts} unencrypted (-${before.unencryptedAccounts - after.unencryptedAccounts})`)
    console.log(`• ${after.corruptedAccounts} corrupted`)

    if (after.unencryptedAccounts === 0) {
      console.log('\n🎉 Migration completed successfully!')
      console.log('All OAuth tokens are now encrypted in the database.')
    } else {
      console.log(`\n⚠️ ${after.unencryptedAccounts} tokens remain unencrypted`)
      console.log('This may indicate corrupted data or migration issues.')
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)

    if (error.message.includes('ENCRYPTION_KEY')) {
      console.error('\n🔧 Fix: Ensure ENCRYPTION_KEY is properly set in your environment')
      console.error('Run: npm run setup-encryption')
    }

    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})