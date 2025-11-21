#!/usr/bin/env node

/**
 * Redis Configuration Check Script
 *
 * Validates Redis configuration for rate limiting
 * Run with: npm run check-redis
 */

async function validateRedisConnection() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  console.log('🔍 Checking Redis configuration...\n')

  // Check environment variables
  if (!redisUrl) {
    console.error('❌ UPSTASH_REDIS_REST_URL is not set')
    return false
  }

  if (!redisToken) {
    console.error('❌ UPSTASH_REDIS_REST_TOKEN is not set')
    return false
  }

  console.log('✅ Redis environment variables are configured')

  // Validate URL format
  try {
    new URL(redisUrl)
  } catch {
    console.error('❌ UPSTASH_REDIS_REST_URL is not a valid URL')
    return false
  }

  console.log('✅ Redis URL format is valid')

  // Test connection
  try {
    console.log('🔄 Testing Redis connection...')

    const response = await fetch(`${redisUrl.replace(/\/$/, '')}/ping`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['PING']),
    })

    if (!response.ok) {
      console.error(`❌ Redis connection failed: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error('Response:', errorText)
      return false
    }

    const result = await response.json()
    if (result.error) {
      console.error(`❌ Redis error: ${result.error}`)
      return false
    }

    if (result.result === 'PONG') {
      console.log('✅ Redis connection successful')
      return true
    } else {
      console.error(`❌ Unexpected Redis response: ${JSON.stringify(result)}`)
      return false
    }
  } catch (error) {
    console.error(`❌ Redis connection test failed: ${error.message}`)
    return false
  }
}

async function testRateLimitingStorage() {
  console.log('\n🧪 Testing rate limiting storage...')

  try {
    // Import the rate limiting functions
    const { checkRateLimit } = await import('../src/lib/edge-rate-limit.js')

    // Test rate limiting
    const testKey = `test-${Date.now()}`
    const result = await checkRateLimit(testKey, 10, 60000)

    console.log('✅ Rate limiting storage test successful')
    console.log(`   Limited: ${result.limited}`)
    console.log(`   Remaining: ${result.remaining}`)

    return true
  } catch (error) {
    console.error(`❌ Rate limiting storage test failed: ${error.message}`)
    return false
  }
}

async function checkProductionReadiness() {
  console.log('\n🏭 Checking production readiness...')

  const isProduction = process.env.NODE_ENV === 'production'
  const redisConfigured = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN

  if (isProduction && !redisConfigured) {
    console.error('❌ Production environment requires Redis configuration')
    console.error('   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
    return false
  }

  if (isProduction && redisConfigured) {
    console.log('✅ Production Redis configuration is valid')
  } else if (!isProduction && !redisConfigured) {
    console.log('⚠️ Development mode: Using in-memory rate limiting (resets on cold starts)')
  } else if (!isProduction && redisConfigured) {
    console.log('✅ Development mode with Redis configuration')
  }

  return true
}

async function main() {
  console.log('🔐 ShipSensei Redis Configuration Check\n')

  let allChecksPass = true

  // Basic configuration check
  const configValid = await validateRedisConnection()
  if (!configValid) {
    allChecksPass = false
  }

  // Production readiness check
  const productionReady = await checkProductionReadiness()
  if (!productionReady) {
    allChecksPass = false
  }

  // Storage test (if basic config is valid)
  if (configValid) {
    const storageWorks = await testRateLimitingStorage()
    if (!storageWorks) {
      allChecksPass = false
    }
  }

  if (allChecksPass) {
    console.log('\n🎉 All Redis checks passed!')
    console.log('Rate limiting is properly configured for production use.')
  } else {
    console.log('\n❌ Redis configuration issues found')
    console.log('\n🔧 To fix:')
    console.log('1. Sign up at https://upstash.com')
    console.log('2. Create a Redis database')
    console.log('3. Copy the REST URL and Token')
    console.log('4. Set environment variables:')
    console.log('   UPSTASH_REDIS_REST_URL="https://..."')
    console.log('   UPSTASH_REDIS_REST_TOKEN="..."')

    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  })
}

module.exports = { validateRedisConnection, testRateLimitingStorage, checkProductionReadiness }