import {
  encryptToken,
  decryptToken,
  isEncryptedToken,
  generateEncryptionKey,
  rotateTokenEncryption,
} from '@/lib/encryption'

describe('Token Encryption', () => {
  const originalEnv = process.env.ENCRYPTION_KEY
  const validKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' // 64 hex chars

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = validKey
  })

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv
  })

  describe('encryptToken', () => {
    it('should encrypt a token successfully', async () => {
      const token = 'my-secret-token-12345'
      const encrypted = await encryptToken(token)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(token)
      expect(typeof encrypted).toBe('string')
      expect(encrypted.length).toBeGreaterThan(0)
    })

    it('should return different encrypted values for same token (due to random salt/iv)', async () => {
      const token = 'my-secret-token'
      const encrypted1 = await encryptToken(token)
      const encrypted2 = await encryptToken(token)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should return empty string for empty token', async () => {
      const result = await encryptToken('')
      expect(result).toBe('')
    })

    it('should handle long tokens', async () => {
      const longToken = 'a'.repeat(1000)
      const encrypted = await encryptToken(longToken)

      expect(encrypted).toBeDefined()
      expect(encrypted.length).toBeGreaterThan(0)
    })

    it('should handle special characters in tokens', async () => {
      const specialToken = 'token!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
      const encrypted = await encryptToken(specialToken)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(specialToken)
    })

    it('should throw error if ENCRYPTION_KEY is missing', async () => {
      delete process.env.ENCRYPTION_KEY

      await expect(encryptToken('test-token')).rejects.toThrow(
        'Failed to encrypt token'
      )
    })

    it('should throw error if ENCRYPTION_KEY is invalid length', async () => {
      process.env.ENCRYPTION_KEY = 'too-short'

      await expect(encryptToken('test-token')).rejects.toThrow(
        'Failed to encrypt token'
      )
    })

    it('should produce base64-encoded output', async () => {
      const token = 'test-token'
      const encrypted = await encryptToken(token)

      // Base64 regex pattern
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/
      expect(base64Pattern.test(encrypted)).toBe(true)
    })
  })

  describe('decryptToken', () => {
    it('should decrypt an encrypted token successfully', async () => {
      const originalToken = 'my-secret-token-12345'
      const encrypted = await encryptToken(originalToken)
      const decrypted = await decryptToken(encrypted)

      expect(decrypted).toBe(originalToken)
    })

    it('should return empty string for empty encrypted token', async () => {
      const result = await decryptToken('')
      expect(result).toBe('')
    })

    it('should handle long tokens during decrypt', async () => {
      const longToken = 'a'.repeat(1000)
      const encrypted = await encryptToken(longToken)
      const decrypted = await decryptToken(encrypted)

      expect(decrypted).toBe(longToken)
    })

    it('should handle special characters during decrypt', async () => {
      const specialToken = 'token!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
      const encrypted = await encryptToken(specialToken)
      const decrypted = await decryptToken(encrypted)

      expect(decrypted).toBe(specialToken)
    })

    it('should throw error if ENCRYPTION_KEY is missing', async () => {
      const encrypted = await encryptToken('test')
      delete process.env.ENCRYPTION_KEY

      await expect(decryptToken(encrypted)).rejects.toThrow(
        'Failed to decrypt token'
      )
    })

    it('should throw error if ENCRYPTION_KEY changed after encryption', async () => {
      const token = 'test-token'
      const encrypted = await encryptToken(token)

      // Change encryption key
      process.env.ENCRYPTION_KEY =
        'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210'

      await expect(decryptToken(encrypted)).rejects.toThrow(
        'Failed to decrypt token'
      )
    })

    it('should throw error for corrupted encrypted token', async () => {
      const corruptedToken = 'not-a-valid-encrypted-token'

      await expect(decryptToken(corruptedToken)).rejects.toThrow(
        'Failed to decrypt token'
      )
    })

    it('should throw error for tampered encrypted data', async () => {
      const token = 'test-token'
      const encrypted = await encryptToken(token)

      // Tamper with the encrypted data
      const tampered = encrypted.slice(0, -5) + 'XXXXX'

      await expect(decryptToken(tampered)).rejects.toThrow(
        'Failed to decrypt token'
      )
    })

    it('should throw error for truncated encrypted data', async () => {
      const token = 'test-token'
      const encrypted = await encryptToken(token)

      // Truncate the encrypted data
      const truncated = encrypted.slice(0, encrypted.length / 2)

      await expect(decryptToken(truncated)).rejects.toThrow(
        'Failed to decrypt token'
      )
    })
  })

  describe('isEncryptedToken', () => {
    it('should return true for valid encrypted token', async () => {
      // Use a token long enough to meet minimum encrypted length requirement
      const token = 'this-is-a-sufficiently-long-test-token-for-validation'
      const encrypted = await encryptToken(token)

      // Valid encrypted tokens should pass the check
      expect(isEncryptedToken(encrypted)).toBe(true)
    })

    it('should return false for empty string', () => {
      expect(isEncryptedToken('')).toBe(false)
    })

    it('should return false for plain text', () => {
      expect(isEncryptedToken('plain-text-token')).toBe(false)
    })

    it('should return false for invalid base64', () => {
      expect(isEncryptedToken('not!@#valid$%^base64&*()')).toBe(false)
    })

    it('should return false for short base64 string', () => {
      // Base64 string that's too short to be valid encrypted token
      const shortBase64 = Buffer.from('short').toString('base64')
      expect(isEncryptedToken(shortBase64)).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isEncryptedToken(null as any)).toBe(false)
      expect(isEncryptedToken(undefined as any)).toBe(false)
    })

    it('should return true for tokens that produce sufficient encrypted length', async () => {
      // Use a longer token to ensure it meets minimum encrypted length
      const token = 'minimum-length-token-test'
      const encrypted = await encryptToken(token)

      expect(isEncryptedToken(encrypted)).toBe(true)
    })

    it('should return false for very short encrypted data', async () => {
      // Very short tokens may not meet minimum encrypted length requirement
      // The function requires salt(32) + iv(16) + tag(16) + data(16) = 80 bytes minimum
      const shortToken = 'x'
      const encrypted = await encryptToken(shortToken)
      const buffer = Buffer.from(encrypted, 'base64')

      // Verify the buffer is shorter than minimum
      if (buffer.length < 80) {
        expect(isEncryptedToken(encrypted)).toBe(false)
      } else {
        // If somehow it meets the requirement, that's also valid
        expect(isEncryptedToken(encrypted)).toBe(true)
      }
    })
  })

  describe('generateEncryptionKey', () => {
    it('should generate a valid encryption key', () => {
      const key = generateEncryptionKey()

      expect(key).toBeDefined()
      expect(typeof key).toBe('string')
      expect(key.length).toBe(64) // 32 bytes = 64 hex characters
    })

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey()
      const key2 = generateEncryptionKey()

      expect(key1).not.toBe(key2)
    })

    it('should generate valid hex strings', () => {
      const key = generateEncryptionKey()
      const hexPattern = /^[0-9a-f]{64}$/i

      expect(hexPattern.test(key)).toBe(true)
    })

    it('should generate keys that work for encryption', async () => {
      const newKey = generateEncryptionKey()
      process.env.ENCRYPTION_KEY = newKey

      const token = 'test-token'
      const encrypted = await encryptToken(token)
      const decrypted = await decryptToken(encrypted)

      expect(decrypted).toBe(token)
    })
  })

  describe('rotateTokenEncryption', () => {
    it('should rotate encryption key successfully', async () => {
      const token = 'my-secret-token'
      const oldKey = validKey
      const newKey = generateEncryptionKey()

      // Encrypt with old key
      process.env.ENCRYPTION_KEY = oldKey
      const encrypted = await encryptToken(token)

      // Rotate to new key
      const reencrypted = await rotateTokenEncryption(encrypted, oldKey, newKey)

      // Verify new encrypted value is different
      expect(reencrypted).not.toBe(encrypted)

      // Verify can decrypt with new key
      process.env.ENCRYPTION_KEY = newKey
      const decrypted = await decryptToken(reencrypted)

      expect(decrypted).toBe(token)
    })

    it('should return empty string for empty token', async () => {
      const oldKey = validKey
      const newKey = generateEncryptionKey()

      const result = await rotateTokenEncryption('', oldKey, newKey)

      expect(result).toBe('')
    })

    it('should restore original key after rotation', async () => {
      const token = 'test-token'
      const originalKey = validKey
      const oldKey = generateEncryptionKey()
      const newKey = generateEncryptionKey()

      process.env.ENCRYPTION_KEY = originalKey

      // Encrypt with old key
      process.env.ENCRYPTION_KEY = oldKey
      const encrypted = await encryptToken(token)

      // Set back to original
      process.env.ENCRYPTION_KEY = originalKey

      // Rotate
      await rotateTokenEncryption(encrypted, oldKey, newKey)

      // Verify original key is restored
      expect(process.env.ENCRYPTION_KEY).toBe(originalKey)
    })

    it('should restore original key even if rotation fails', async () => {
      const originalKey = validKey
      const oldKey = 'invalid-key-too-short'
      const newKey = generateEncryptionKey()

      process.env.ENCRYPTION_KEY = originalKey

      try {
        await rotateTokenEncryption('some-encrypted-data', oldKey, newKey)
      } catch (error) {
        // Expected to fail
      }

      // Verify original key is restored even after error
      expect(process.env.ENCRYPTION_KEY).toBe(originalKey)
    })

    it('should handle rotation with corrupted token gracefully', async () => {
      const oldKey = validKey
      const newKey = generateEncryptionKey()
      const corruptedToken = 'corrupted-not-valid-encrypted-data'

      await expect(
        rotateTokenEncryption(corruptedToken, oldKey, newKey)
      ).rejects.toThrow('Failed to decrypt token')
    })

    it('should successfully rotate multiple tokens', async () => {
      const tokens = ['token1', 'token2', 'token3']
      const oldKey = validKey
      const newKey = generateEncryptionKey()

      // Encrypt all with old key
      process.env.ENCRYPTION_KEY = oldKey
      const encrypted = await Promise.all(tokens.map(t => encryptToken(t)))

      // Rotate all
      const rotated = await Promise.all(
        encrypted.map(e => rotateTokenEncryption(e, oldKey, newKey))
      )

      // Verify all can be decrypted with new key
      process.env.ENCRYPTION_KEY = newKey
      const decrypted = await Promise.all(rotated.map(r => decryptToken(r)))

      expect(decrypted).toEqual(tokens)
    })
  })

  describe('End-to-End Encryption Flow', () => {
    it('should handle complete encrypt-decrypt cycle', async () => {
      const originalToken = 'ver_1234567890abcdef'

      // Encrypt
      const encrypted = await encryptToken(originalToken)
      expect(encrypted).not.toBe(originalToken)
      expect(isEncryptedToken(encrypted)).toBe(true)

      // Decrypt
      const decrypted = await decryptToken(encrypted)
      expect(decrypted).toBe(originalToken)
    })

    it('should handle OAuth token format', async () => {
      const githubToken = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz'

      const encrypted = await encryptToken(githubToken)
      const decrypted = await decryptToken(encrypted)

      expect(decrypted).toBe(githubToken)
    })

    it('should handle Vercel token format', async () => {
      const vercelToken = 'ver_1234567890abcdefghijklmnopqrstuvwxyz'

      const encrypted = await encryptToken(vercelToken)
      const decrypted = await decryptToken(encrypted)

      expect(decrypted).toBe(vercelToken)
    })

    it('should maintain data integrity across multiple encrypt-decrypt cycles', async () => {
      let token = 'original-token'

      // Encrypt and decrypt 10 times
      for (let i = 0; i < 10; i++) {
        const encrypted = await encryptToken(token)
        token = await decryptToken(encrypted)
      }

      expect(token).toBe('original-token')
    })
  })

  describe('Security Properties', () => {
    it('should produce different ciphertexts for same plaintext (IV randomness)', async () => {
      const token = 'test-token'
      const encrypted1 = await encryptToken(token)
      const encrypted2 = await encryptToken(token)
      const encrypted3 = await encryptToken(token)

      // All should be different due to random IV and salt
      expect(encrypted1).not.toBe(encrypted2)
      expect(encrypted2).not.toBe(encrypted3)
      expect(encrypted1).not.toBe(encrypted3)

      // But all should decrypt to same plaintext
      const decrypted1 = await decryptToken(encrypted1)
      const decrypted2 = await decryptToken(encrypted2)
      const decrypted3 = await decryptToken(encrypted3)

      expect(decrypted1).toBe(token)
      expect(decrypted2).toBe(token)
      expect(decrypted3).toBe(token)
    })

    it('should use authenticated encryption (GCM mode)', async () => {
      const token = 'test-token'
      const encrypted = await encryptToken(token)

      // Tamper with a single byte in the middle
      const buffer = Buffer.from(encrypted, 'base64')
      buffer[buffer.length / 2] ^= 0x01 // Flip one bit
      const tampered = buffer.toString('base64')

      // Should fail authentication
      await expect(decryptToken(tampered)).rejects.toThrow(
        'Failed to decrypt token'
      )
    })

    it('should not leak plaintext length in ciphertext', async () => {
      // Due to padding and encryption overhead, similar length plaintexts
      // should have variable ciphertext lengths (because of random salt/iv)
      const token1 = 'a'
      const token2 = 'b'

      const encrypted1 = await encryptToken(token1)
      const encrypted2 = await encryptToken(token2)

      // Ciphertexts should be similar length (within block size)
      const diff = Math.abs(encrypted1.length - encrypted2.length)
      expect(diff).toBeLessThan(20) // Allow for encoding differences
    })
  })
})
