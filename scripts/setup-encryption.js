#!/usr/bin/env node

/**
 * Encryption Setup Script
 *
 * Validates and generates ENCRYPTION_KEY for OAuth token security
 * Run with: node scripts/setup-encryption.js
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ENV_FILE = path.join(__dirname, '..', '.env.local')
const EXAMPLE_FILE = path.join(__dirname, '..', '.env.example')

/**
 * Generate a cryptographically secure 32-byte hex key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Validate encryption key format
 */
function validateEncryptionKey(key) {
  if (!key) {
    return { valid: false, error: 'Key is empty' }
  }

  if (typeof key !== 'string') {
    return { valid: false, error: 'Key must be a string' }
  }

  if (key.length !== 64) {
    return { valid: false, error: 'Key must be exactly 64 hex characters (32 bytes)' }
  }

  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    return { valid: false, error: 'Key must contain only hex characters (0-9, a-f)' }
  }

  return { valid: true }
}

/**
 * Check current environment configuration
 */
function checkCurrentConfig() {
  console.log('🔐 Checking OAuth token encryption setup...\n')

  // Check if .env.local exists
  if (!fs.existsSync(ENV_FILE)) {
    console.log('📄 .env.local file not found')
    return { exists: false, hasKey: false, keyValid: false }
  }

  console.log('📄 .env.local file found')

  // Read .env.local
  const envContent = fs.readFileSync(ENV_FILE, 'utf8')
  const keyMatch = envContent.match(/^ENCRYPTION_KEY\s*=\s*"?([^"\s]+)"?$/m)

  if (!keyMatch) {
    console.log('❌ ENCRYPTION_KEY not found in .env.local')
    return { exists: true, hasKey: false, keyValid: false }
  }

  const key = keyMatch[1]
  console.log('🔑 ENCRYPTION_KEY found in .env.local')

  const validation = validateEncryptionKey(key)
  if (validation.valid) {
    console.log('✅ ENCRYPTION_KEY is valid')
    return { exists: true, hasKey: true, keyValid: true, key }
  } else {
    console.log(`❌ ENCRYPTION_KEY is invalid: ${validation.error}`)
    return { exists: true, hasKey: true, keyValid: false, key }
  }
}

/**
 * Create or update .env.local with encryption key
 */
function setupEnvironment(newKey = null) {
  const key = newKey || generateEncryptionKey()

  let envContent = ''

  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf8')

    // Update existing key
    if (envContent.includes('ENCRYPTION_KEY')) {
      envContent = envContent.replace(
        /^ENCRYPTION_KEY\s*=.*$/m,
        `ENCRYPTION_KEY="${key}"`
      )
    } else {
      // Add key to existing file
      envContent += `\n# OAuth Token Encryption (REQUIRED)\nENCRYPTION_KEY="${key}"\n`
    }
  } else {
    // Create new file from example
    if (fs.existsSync(EXAMPLE_FILE)) {
      envContent = fs.readFileSync(EXAMPLE_FILE, 'utf8')
      envContent = envContent.replace(
        /^ENCRYPTION_KEY=.*$/m,
        `ENCRYPTION_KEY="${key}"`
      )
    } else {
      // Minimal .env.local
      envContent = `# OAuth Token Encryption (REQUIRED)\nENCRYPTION_KEY="${key}"\n`
    }
  }

  fs.writeFileSync(ENV_FILE, envContent)
  console.log('✅ .env.local updated with secure encryption key')

  return key
}

/**
 * Main setup function
 */
function main() {
  console.log('🔐 ShipSensei OAuth Token Encryption Setup\n')

  const config = checkCurrentConfig()

  if (config.exists && config.hasKey && config.keyValid) {
    console.log('\n🎉 Encryption is properly configured!')
    console.log('Your OAuth tokens will be encrypted in the database.')
    return
  }

  console.log('\n⚠️ Encryption key needs to be set up.')
  console.log('Generating new 32-byte encryption key...')

  const newKey = setupEnvironment()

  console.log('\n🎉 Encryption setup complete!')
  console.log('Key: ' + newKey)
  console.log('\n⚠️ IMPORTANT:')
  console.log('• Keep this key secure and backed up')
  console.log('• If you lose this key, you cannot decrypt existing tokens')
  console.log('• Users will need to reconnect their accounts if key is lost')
  console.log('• Set the same key in production environment variables')
}

/**
 * Migration function to encrypt existing tokens
 */
async function migrateExistingTokens() {
  console.log('\n🔄 Checking for existing unencrypted tokens...')

  try {
    // This would typically require the Prisma client
    // For now, just provide instructions
    console.log('📋 To encrypt existing tokens, run:')
    console.log('   npm run encrypt-existing-tokens')
  } catch (error) {
    console.log(`❌ Migration check failed: ${error.message}`)
  }
}

// Run if called directly
if (require.main === module) {
  main()
  migrateExistingTokens()
}

module.exports = {
  generateEncryptionKey,
  validateEncryptionKey,
  checkCurrentConfig,
  setupEnvironment
}