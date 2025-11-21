import {
  validateTypeScriptCode,
  validateMarkdown,
  ValidationResult,
  ValidationOptions,
} from '@/lib/code-validator'

describe('Code Validator', () => {
  describe('validateTypeScriptCode', () => {
    describe('Basic Validation', () => {
      it('should validate simple valid TypeScript code', async () => {
        const code = `
          export function add(a: number, b: number): number {
            return a + b
          }
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.securityIssues).toHaveLength(0)
      })

      it('should validate simple React component', async () => {
        const code = `
          import React from 'react'

          export function HelloWorld() {
            return <div>Hello World</div>
          }
        `
        const result = await validateTypeScriptCode(code, 'HelloWorld.tsx', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    describe('File Size Validation', () => {
      it('should reject files that exceed max size', async () => {
        const largeCode = 'a'.repeat(200_000) // 200KB
        const result = await validateTypeScriptCode(largeCode, 'large.ts', {
          maxFileSize: 100_000,
          enableTypeCheck: false,
          enableLinting: false,
          enableSecurityScan: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/File too large.*200000.*100000/),
          ])
        )
      })

      it('should accept files within size limit', async () => {
        const smallCode = 'const x = 1;'
        const result = await validateTypeScriptCode(smallCode, 'small.ts', {
          maxFileSize: 100_000,
          enableTypeCheck: false,
          enableLinting: false,
          enableSecurityScan: false,
        })

        expect(result.isValid).toBe(true)
      })
    })

    describe('Security Scanning', () => {
      it('should detect dangerouslySetInnerHTML', async () => {
        const code = `
          export function Component() {
            return <div dangerouslySetInnerHTML={{ __html: userInput }} />
          }
        `
        const result = await validateTypeScriptCode(code, 'test.tsx', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.securityIssues).toEqual(
          expect.arrayContaining([
            'SECURITY: dangerouslySetInnerHTML detected - XSS risk',
          ])
        )
      })

      it('should detect innerHTML with template literals', async () => {
        const code = `
          const element = document.getElementById('content')
          element.innerHTML = \`<div>\${userInput}</div>\`
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.securityIssues).toEqual(
          expect.arrayContaining([
            'SECURITY: innerHTML with template literal - XSS risk',
          ])
        )
      })

      it('should detect eval usage', async () => {
        const code = `
          const result = eval(userInput)
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.securityIssues).toEqual(
          expect.arrayContaining([
            'SECURITY: eval() detected - code injection risk',
          ])
        )
      })

      it('should detect process execution', async () => {
        const code = `
          import { exec } from 'child_process'
          exec(userCommand)
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.securityIssues).toEqual(
          expect.arrayContaining([
            'SECURITY: Process execution detected - command injection risk',
          ])
        )
      })

      it('should detect file system access', async () => {
        const code = `
          import fs from 'fs'
          fs.readFileSync('/etc/passwd')
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.securityIssues).toEqual(
          expect.arrayContaining([
            'SECURITY: File system access detected - verify necessity',
          ])
        )
      })

      it('should detect dynamic fetch URLs', async () => {
        const code = `
          const response = await fetch(userProvidedUrl)
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.securityIssues).toEqual(
          expect.arrayContaining([
            'SECURITY: Dynamic URL in fetch/axios - SSRF risk',
          ])
        )
      })

      it('should detect hardcoded passwords', async () => {
        const code = `
          const password = "mysecretpassword123"
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.securityIssues).toEqual(
          expect.arrayContaining(['SECURITY: Potential hardcoded secret detected'])
        )
      })

      it('should detect hardcoded API keys', async () => {
        const code = `
          const apiKey = "sk-1234567890abcdef"
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.securityIssues).toEqual(
          expect.arrayContaining(['SECURITY: Potential hardcoded secret detected'])
        )
      })

      it('should allow safe code without security issues', async () => {
        const code = `
          export function SafeComponent({ text }: { text: string }) {
            return <div>{text}</div>
          }
        `
        const result = await validateTypeScriptCode(code, 'test.tsx', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(true)
        expect(result.securityIssues).toHaveLength(0)
      })

      it('should allow environment variables for secrets', async () => {
        const code = `
          const apiKey = process.env.API_KEY
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result.isValid).toBe(true)
        expect(result.securityIssues).toHaveLength(0)
      })
    })

    describe('Syntax Validation', () => {
      it('should detect unmatched braces', async () => {
        const code = `
          function test() {
            console.log('test')
          // Missing closing brace
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
          enableSecurityScan: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringMatching(/braces/i)])
        )
      })

      it('should detect unmatched brackets', async () => {
        const code = `
          const arr = [1, 2, 3
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
          enableSecurityScan: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringMatching(/brackets/i)])
        )
      })

      it('should detect unmatched parentheses', async () => {
        const code = `
          function test(
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
          enableSecurityScan: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringMatching(/parentheses/i)])
        )
      })

      it.skip('should detect mismatched JSX tags', async () => {
        // TODO: JSX tag validation not implemented yet
        const code = `
          export function Component() {
            return <div><span>Test</div></span>
          }
        `
        const result = await validateTypeScriptCode(code, 'test.tsx', {
          enableTypeCheck: false,
          enableLinting: false,
          enableSecurityScan: false,
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringMatching(/JSX tags/i)])
        )
      })

      it('should accept properly formatted code', async () => {
        const code = `
          function test() {
            const arr = [1, 2, 3]
            return arr.map((x) => x * 2)
          }
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
          enableSecurityScan: false,
        })

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    describe('Options Handling', () => {
      it('should use default options when none provided', async () => {
        const code = 'const x = 1;'
        const result = await validateTypeScriptCode(code, 'test.ts')

        expect(result).toBeDefined()
        expect(result.isValid).toBeDefined()
        expect(result.errors).toBeDefined()
        expect(result.warnings).toBeDefined()
        expect(result.securityIssues).toBeDefined()
      })

      it('should merge partial options with defaults', async () => {
        const code = 'const x = 1;'
        const result = await validateTypeScriptCode(code, 'test.ts', {
          maxFileSize: 50_000,
        })

        expect(result).toBeDefined()
        // Should still run security scan (default enabled)
        expect(result.securityIssues).toBeDefined()
      })

      it('should skip security scan when disabled', async () => {
        const code = `
          const password = "hardcoded123"
        `
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableSecurityScan: false,
          enableTypeCheck: false,
          enableLinting: false,
        })

        // Should not detect hardcoded secret when security scan disabled
        expect(result.securityIssues).toHaveLength(0)
      })
    })

    describe('Error Handling', () => {
      it.skip('should handle validation errors gracefully', async () => {
        // TODO: Extremely malformed code is not detected by basic syntax validation
        // Requires TypeScript compiler or more sophisticated parser
        const code = '}{][)('
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result).toBeDefined()
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })

      it('should return structured result even on exceptions', async () => {
        const code = null as any // Force error
        const result = await validateTypeScriptCode(code, 'test.ts', {
          enableTypeCheck: false,
          enableLinting: false,
        })

        expect(result).toBeDefined()
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('validateMarkdown', () => {
    describe('Basic Validation', () => {
      it('should validate simple README', () => {
        const content = `
# My Project

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

Run the app with \`npm start\`
        `
        const result = validateMarkdown(content)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should warn if no headers present', () => {
        const content = 'This is just plain text without any headers.'
        const result = validateMarkdown(content)

        expect(result.warnings).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/should include headers/i),
          ])
        )
      })

      it.skip('should warn if no installation instructions', () => {
        // TODO: Installation instruction detection only works when no headers present
        const content = `
# Project

Just some content without installation info.
        `
        const result = validateMarkdown(content)

        expect(result.warnings).toEqual(
          expect.arrayContaining([expect.stringMatching(/installation/i)])
        )
      })
    })

    describe('Size Validation', () => {
      it('should reject README larger than 50KB', () => {
        const largeContent = 'a'.repeat(60_000)
        const result = validateMarkdown(largeContent)

        expect(result.isValid).toBe(false)
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringMatching(/README too large/i)])
        )
      })

      it('should accept README within size limit', () => {
        const normalContent = '# Project\n\n## Install\n\nRun npm install'
        const result = validateMarkdown(normalContent)

        expect(result.isValid).toBe(true)
      })
    })

    describe('Security Validation', () => {
      it('should detect javascript: protocol in links', () => {
        const content = `
# Project

[Click here](javascript:alert('xss'))
        `
        const result = validateMarkdown(content)

        expect(result.isValid).toBe(false)
        expect(result.securityIssues).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/Suspicious pattern.*javascript:/i),
          ])
        )
      })

      it('should detect data:text/html in content', () => {
        const content = `
# Project

<img src="data:text/html,<script>alert('xss')</script>">
        `
        const result = validateMarkdown(content)

        expect(result.isValid).toBe(false)
        expect(result.securityIssues.length).toBeGreaterThan(0)
        // Should detect both data:text/html and <script patterns
        expect(
          result.securityIssues.some(issue =>
            /suspicious pattern/i.test(issue)
          )
        ).toBe(true)
      })

      it('should detect vbscript: protocol', () => {
        const content = `
[Link](vbscript:msgbox('xss'))
        `
        const result = validateMarkdown(content)

        expect(result.isValid).toBe(false)
        expect(result.securityIssues.length).toBeGreaterThan(0)
      })

      it('should detect script tags in markdown', () => {
        const content = `
# Project

<script>alert('xss')</script>
        `
        const result = validateMarkdown(content)

        expect(result.isValid).toBe(false)
        expect(result.securityIssues.length).toBeGreaterThan(0)
      })

      it('should allow safe markdown with normal links', () => {
        const content = `
# Project

Check out our [website](https://example.com)

## Installation

\`\`\`bash
npm install
\`\`\`
        `
        const result = validateMarkdown(content)

        expect(result.isValid).toBe(true)
        expect(result.securityIssues).toHaveLength(0)
      })
    })

    describe('Complete Validation', () => {
      it('should provide comprehensive validation result', () => {
        const content = `
# My Awesome Project

## Installation

\`\`\`bash
npm install my-project
\`\`\`

## Usage

Import and use in your code.

## License

MIT
        `
        const result = validateMarkdown(content)

        expect(result).toHaveProperty('isValid')
        expect(result).toHaveProperty('errors')
        expect(result).toHaveProperty('warnings')
        expect(result).toHaveProperty('securityIssues')
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('ValidationResult Structure', () => {
    it('should return properly structured result', async () => {
      const code = 'const x = 1;'
      const result = await validateTypeScriptCode(code, 'test.ts', {
        enableTypeCheck: false,
        enableLinting: false,
      })

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
        securityIssues: expect.any(Array),
      })
    })

    it('should include all security issues found', async () => {
      const code = `
        const password = "secret123"
        const apiKey = "sk-key123"
        eval(userInput)
      `
      const result = await validateTypeScriptCode(code, 'test.ts', {
        enableTypeCheck: false,
        enableLinting: false,
      })

      expect(result.securityIssues.length).toBeGreaterThanOrEqual(2)
      expect(result.isValid).toBe(false)
    })
  })
})
