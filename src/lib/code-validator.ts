import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Code Validation System for AI-Generated Content
 *
 * Validates AI-generated code before pushing to GitHub repositories
 * Prevents security vulnerabilities and syntax errors
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  securityIssues: string[]
}

export interface ValidationOptions {
  enableTypeCheck: boolean
  enableLinting: boolean
  enableSecurityScan: boolean
  maxFileSize: number // bytes
}

const DEFAULT_OPTIONS: ValidationOptions = {
  enableTypeCheck: true,
  enableLinting: true,
  enableSecurityScan: true,
  maxFileSize: 100_000, // 100KB limit
}

/**
 * Validate AI-generated TypeScript/React code
 */
export async function validateTypeScriptCode(
  code: string,
  filename: string,
  options: Partial<ValidationOptions> = {}
): Promise<ValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    securityIssues: [],
  }

  try {
    // Size validation
    if (code.length > opts.maxFileSize) {
      result.errors.push(
        `File too large: ${code.length} bytes (max: ${opts.maxFileSize})`
      )
      result.isValid = false
    }

    // Security validation - check for dangerous patterns
    if (opts.enableSecurityScan) {
      const securityIssues = scanForSecurityIssues(code)
      result.securityIssues.push(...securityIssues)
      if (securityIssues.length > 0) {
        result.isValid = false
      }
    }

    // Basic syntax validation
    const syntaxIssues = validateSyntax(code)
    result.errors.push(...syntaxIssues)
    if (syntaxIssues.length > 0) {
      result.isValid = false
    }

    // TypeScript validation (if enabled)
    if (opts.enableTypeCheck && filename.endsWith('.tsx')) {
      try {
        const typeErrors = await validateTypeScript(code, filename)
        result.errors.push(...typeErrors)
        if (typeErrors.length > 0) {
          result.isValid = false
        }
      } catch (error) {
        result.warnings.push(`TypeScript validation failed: ${error}`)
      }
    }

    // ESLint validation (if enabled)
    if (opts.enableLinting) {
      try {
        const lintIssues = await validateWithESLint(code, filename)
        result.warnings.push(...lintIssues.warnings)
        result.errors.push(...lintIssues.errors)
        if (lintIssues.errors.length > 0) {
          result.isValid = false
        }
      } catch (error) {
        result.warnings.push(`ESLint validation failed: ${error}`)
      }
    }
  } catch (error) {
    result.errors.push(`Validation error: ${error}`)
    result.isValid = false
  }

  return result
}

/**
 * Validate README.md content
 */
export function validateMarkdown(content: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    securityIssues: [],
  }

  // Size check
  if (content.length > 50_000) {
    result.errors.push('README too large (max 50KB)')
    result.isValid = false
  }

  // Basic structure validation
  if (!content.includes('#')) {
    result.warnings.push('README should include headers')
  }

  if (!content.toLowerCase().includes('install')) {
    result.warnings.push('README should include installation instructions')
  }

  // Security check for malicious links
  const suspiciousPatterns = [
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /<script/gi,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      result.securityIssues.push(`Suspicious pattern detected: ${pattern}`)
      result.isValid = false
    }
  }

  return result
}

/**
 * Scan for security vulnerabilities in code
 */
function scanForSecurityIssues(code: string): string[] {
  const issues: string[] = []

  // XSS vulnerabilities
  if (code.includes('dangerouslySetInnerHTML')) {
    issues.push('SECURITY: dangerouslySetInnerHTML detected - XSS risk')
  }

  if (/innerHTML\s*=\s*[^"']*\$\{/.test(code)) {
    issues.push('SECURITY: innerHTML with template literal - XSS risk')
  }

  if (/eval\s*\(/.test(code)) {
    issues.push('SECURITY: eval() detected - code injection risk')
  }

  // Process execution
  if (/exec\s*\(|spawn\s*\(|system\s*\(/.test(code)) {
    issues.push('SECURITY: Process execution detected - command injection risk')
  }

  // File system access
  if (/fs\.\w+\s*\(|readFile|writeFile|unlinkSync/.test(code)) {
    issues.push('SECURITY: File system access detected - verify necessity')
  }

  // Network requests to variable URLs
  if (/fetch\s*\(\s*[^"'`]|axios\.\w+\s*\([^"'`]/.test(code)) {
    issues.push('SECURITY: Dynamic URL in fetch/axios - SSRF risk')
  }

  // Hardcoded secrets patterns
  const secretPatterns = [
    /password\s*[:=]\s*["'][^"']+["']/gi,
    /secret\s*[:=]\s*["'][^"']+["']/gi,
    /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi,
    /token\s*[:=]\s*["'][^"']+["']/gi,
  ]

  for (const pattern of secretPatterns) {
    if (pattern.test(code)) {
      issues.push('SECURITY: Potential hardcoded secret detected')
    }
  }

  return issues
}

/**
 * Basic syntax validation
 */
function validateSyntax(code: string): string[] {
  const errors: string[] = []

  // Check for unmatched braces/brackets/parens
  const braces =
    (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length
  const brackets =
    (code.match(/\[/g) || []).length - (code.match(/\]/g) || []).length
  const parens =
    (code.match(/\(/g) || []).length - (code.match(/\)/g) || []).length

  if (braces !== 0) errors.push(`Unmatched braces: ${braces}`)
  if (brackets !== 0) errors.push(`Unmatched brackets: ${brackets}`)
  if (parens !== 0) errors.push(`Unmatched parentheses: ${parens}`)

  // Check for incomplete JSX tags
  const jsxOpenTags = code.match(/<\w+[^>]*>/g) || []
  const jsxCloseTags = code.match(/<\/\w+>/g) || []
  const jsxSelfClosing = code.match(/<\w+[^>]*\/>/g) || []

  const expectedClosing = jsxOpenTags.length - jsxSelfClosing.length
  if (jsxCloseTags.length !== expectedClosing) {
    errors.push('Mismatched JSX tags detected')
  }

  return errors
}

/**
 * TypeScript validation using temporary file
 */
async function validateTypeScript(
  code: string,
  filename: string
): Promise<string[]> {
  const tempDir = tmpdir()
  const tempFile = join(tempDir, `validation-${Date.now()}-${filename}`)

  try {
    // Write code to temporary file
    await fs.writeFile(tempFile, code, 'utf8')

    // Run TypeScript compiler
    const { stderr } = await execAsync(
      `npx tsc --noEmit --strict "${tempFile}"`
    )

    if (stderr) {
      return [stderr]
    }

    return []
  } catch (error: unknown) {
    // TypeScript errors are returned in stderr
    if (error.stderr) {
      return [error.stderr]
    }
    return [`TypeScript validation error: ${error.message}`]
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempFile)
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * ESLint validation
 */
async function validateWithESLint(
  code: string,
  filename: string
): Promise<{
  errors: string[]
  warnings: string[]
}> {
  const tempDir = tmpdir()
  const tempFile = join(tempDir, `eslint-${Date.now()}-${filename}`)

  try {
    await fs.writeFile(tempFile, code, 'utf8')

    const { stdout } = await execAsync(`npx eslint --format json "${tempFile}"`)
    const results = JSON.parse(stdout)

    const errors: string[] = []
    const warnings: string[] = []

    for (const result of results) {
      for (const message of result.messages) {
        const msg = `Line ${message.line}: ${message.message} (${message.ruleId})`
        if (message.severity === 2) {
          errors.push(msg)
        } else {
          warnings.push(msg)
        }
      }
    }

    return { errors, warnings }
  } catch (error: unknown) {
    // ESLint returns non-zero exit code for errors, parse the output
    if (error.stdout) {
      try {
        const results = JSON.parse(error.stdout)
        const errors: string[] = []
        const warnings: string[] = []

        for (const result of results) {
          for (const message of result.messages) {
            const msg = `Line ${message.line}: ${message.message}`
            if (message.severity === 2) {
              errors.push(msg)
            } else {
              warnings.push(msg)
            }
          }
        }

        return { errors, warnings }
      } catch {
        return { errors: [`ESLint error: ${error.message}`], warnings: [] }
      }
    }

    return { errors: [`ESLint error: ${error.message}`], warnings: [] }
  } finally {
    try {
      await fs.unlink(tempFile)
    } catch {
      // Ignore cleanup errors
    }
  }
}
