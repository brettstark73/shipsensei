#!/usr/bin/env node

/**
 * Generate Encryption Key Script
 *
 * Generates a secure 256-bit encryption key for OAuth token encryption.
 *
 * Usage:
 *   node scripts/generate-encryption-key.js
 *   npm run generate:encryption-key
 */

const crypto = require('crypto')

function generateEncryptionKey() {
  const key = crypto.randomBytes(32).toString('hex')

  console.log('🔐 Generated encryption key:')
  console.log('')
  console.log(`ENCRYPTION_KEY=${key}`)
  console.log('')
  console.log('📝 Add this to your .env file:')
  console.log('')
  console.log(`echo "ENCRYPTION_KEY=${key}" >> .env.local`)
  console.log('')
  console.log('⚠️  Security Notes:')
  console.log('• Keep this key secret and secure')
  console.log(
    '• Back up this key safely - losing it means losing access to encrypted tokens'
  )
  console.log(
    '• Use different keys for different environments (dev/staging/prod)'
  )
  console.log('• Rotate keys periodically for enhanced security')
  console.log('')
  console.log('🔄 To rotate keys in production:')
  console.log('1. Set new ENCRYPTION_KEY in environment')
  console.log('2. Run: npx tsx scripts/encrypt-existing-tokens.ts')

  return key
}

if (require.main === module) {
  generateEncryptionKey()
}
