import { anthropic } from './ai'
import { validateTypeScriptCode, validateMarkdown } from './code-validator'

export type ProjectTemplate = {
  files: Array<{
    path: string
    content: string
  }>
}

export type ValidationError = {
  file: string
  errors: string[]
  warnings: string[]
  securityIssues: string[]
}

export class ProjectGenerationError extends Error {
  constructor(
    message: string,
    public validationErrors: ValidationError[]
  ) {
    super(message)
    this.name = 'ProjectGenerationError'
  }
}

// Generate package.json content
function generatePackageJson(projectName: string): string {
  const sanitizedName = projectName.toLowerCase().replace(/\s+/g, '-')

  return JSON.stringify(
    {
      name: sanitizedName,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        next: '^14.2.18',
      },
      devDependencies: {
        typescript: '^5',
        '@types/node': '^20',
        '@types/react': '^18',
        '@types/react-dom': '^18',
        tailwindcss: '^3.4.1',
        postcss: '^8',
        autoprefixer: '^10.4.20',
        eslint: '^8',
        'eslint-config-next': '14.2.18',
      },
    },
    null,
    2
  )
}

// Generate tsconfig.json
function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [
          {
            name: 'next',
          },
        ],
        paths: {
          '@/*': ['./src/*'],
        },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    null,
    2
  )
}

// Generate next.config.js
function generateNextConfig(): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = {}

export default nextConfig
`
}

// Generate tailwind.config.ts
function generateTailwindConfig(): string {
  return `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
`
}

// Generate postcss.config.mjs
function generatePostCssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`
}

// Generate .gitignore
function generateGitignore(): string {
  return `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`
}

// Generate README.md with AI
async function generateReadme(
  projectName: string,
  projectDescription: string,
  requirements: Array<{ question: string; answer: string }>
): Promise<string> {
  const prompt = `Generate a professional README.md for a Next.js project called "${projectName}".

Description: ${projectDescription}

Requirements summary:
${requirements.map((r, i) => `${i + 1}. ${r.question}: ${r.answer}`).join('\n')}

Include:
- Project title and description
- Features list
- Getting started instructions
- Tech stack
- Folder structure

Return ONLY the markdown content, no code fences.`

  try {
    const response = await anthropic().messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return content.text
    }
  } catch (error) {
    console.error('Failed to generate README with AI:', error)
  }

  // Fallback README
  return `# ${projectName}

${projectDescription}

## Getting Started

First, install dependencies:

\`\`\`bash
npm install
\`\`\`

Then, run the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling

## Project Structure

\`\`\`
src/
├── app/          # Next.js App Router pages
├── components/   # Reusable components
└── lib/          # Utility functions
\`\`\`

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
`
}

// Generate home page with AI customization
async function generateHomePage(
  projectName: string,
  requirements: Array<{ question: string; answer: string }>
): Promise<string> {
  const prompt = `Generate a Next.js 14 App Router page.tsx component for "${projectName}".

Requirements:
${requirements.map((r, i) => `${i + 1}. ${r.question}: ${r.answer}`).join('\n')}

Create a simple, professional landing page with:
- Hero section with project name
- Brief description
- 2-3 feature cards based on requirements
- Tailwind CSS styling
- TypeScript
- Use "use client" if needed

Return ONLY the React component code, no explanation.`

  try {
    const response = await anthropic().messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type === 'text') {
      // Extract code from potential markdown code blocks
      // eslint-disable-next-line security/detect-unsafe-regex
      const code = content.text
        // eslint-disable-next-line security/detect-unsafe-regex
        .replace(/```(?:tsx?|jsx?|typescript|javascript)?\n?/g, '')
        .replace(/```$/g, '')
        .trim()
      return code
    }
  } catch (error) {
    console.error('Failed to generate home page with AI:', error)
  }

  // Fallback home page
  return `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-6xl font-bold text-center mb-8">
          ${projectName}
        </h1>
        <p className="text-xl text-center text-gray-600 mb-12">
          Welcome to your new Next.js project!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">⚡ Fast</h2>
            <p className="text-gray-600">
              Built with Next.js 14 for optimal performance
            </p>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">🎨 Styled</h2>
            <p className="text-gray-600">
              Tailwind CSS for beautiful, responsive design
            </p>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">🔒 Type-Safe</h2>
            <p className="text-gray-600">
              TypeScript for better developer experience
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
`
}

// Generate complete project template
export async function generateProjectTemplate(
  projectName: string,
  projectDescription: string,
  requirements: Array<{ question: string; answer: string }>
): Promise<ProjectTemplate> {
  // Generate AI content
  const [readme, homePage] = await Promise.all([
    generateReadme(projectName, projectDescription, requirements),
    generateHomePage(projectName, requirements),
  ])

  // Validate AI-generated content
  const validationErrors: ValidationError[] = []

  // Validate README.md
  const readmeValidation = validateMarkdown(readme)
  if (!readmeValidation.isValid || readmeValidation.securityIssues.length > 0) {
    validationErrors.push({
      file: 'README.md',
      errors: readmeValidation.errors,
      warnings: readmeValidation.warnings,
      securityIssues: readmeValidation.securityIssues,
    })
  }

  // Validate page.tsx (React component)
  const pageValidation = await validateTypeScriptCode(homePage, 'page.tsx', {
    enableTypeCheck: false, // Skip TypeScript checking to avoid dependency issues
    enableLinting: false, // Skip ESLint to avoid setup complexity
    enableSecurityScan: true,
    maxFileSize: 50_000,
  })

  if (!pageValidation.isValid || pageValidation.securityIssues.length > 0) {
    validationErrors.push({
      file: 'src/app/page.tsx',
      errors: pageValidation.errors,
      warnings: pageValidation.warnings,
      securityIssues: pageValidation.securityIssues,
    })
  }

  // If validation failed, throw error with details
  if (validationErrors.length > 0) {
    const hasSecurityIssues = validationErrors.some(
      e => e.securityIssues.length > 0
    )
    const hasCriticalErrors = validationErrors.some(e => e.errors.length > 0)

    if (hasSecurityIssues || hasCriticalErrors) {
      throw new ProjectGenerationError(
        'AI-generated code failed security and quality validation',
        validationErrors
      )
    }
  }

  const files = [
    // Configuration files
    { path: 'package.json', content: generatePackageJson(projectName) },
    { path: 'tsconfig.json', content: generateTsConfig() },
    { path: 'next.config.js', content: generateNextConfig() },
    { path: 'tailwind.config.ts', content: generateTailwindConfig() },
    { path: 'postcss.config.mjs', content: generatePostCssConfig() },
    { path: '.gitignore', content: generateGitignore() },
    { path: 'README.md', content: readme },

    // App structure
    {
      path: 'src/app/layout.tsx',
      content: `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '${projectName}',
  description: '${projectDescription}',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
`,
    },
    { path: 'src/app/page.tsx', content: homePage },
    {
      path: 'src/app/globals.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
    },

    // Environment example
    {
      path: '.env.example',
      content: `# Add your environment variables here
# DATABASE_URL=
# API_KEY=
`,
    },
  ]

  return { files }
}
