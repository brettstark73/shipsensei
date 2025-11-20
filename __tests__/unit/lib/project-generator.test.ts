import { generateProjectTemplate } from '@/lib/project-generator'
import { anthropic } from '@/lib/ai'

// Mock the Anthropic client
jest.mock('@/lib/ai', () => ({
  anthropic: {
    messages: {
      create: jest.fn(),
    },
  },
}))

const mockAnthropicCreate = anthropic.messages.create as jest.MockedFunction<
  typeof anthropic.messages.create
>

describe('Project Generator', () => {
  describe('generateProjectTemplate', () => {
    it('should generate complete project template with AI-generated content', async () => {
      const mockReadme = '# Test Project\n\nGenerated README content'
      const mockHomePage =
        'export default function Home() { return <div>Home</div> }'

      // Mock README generation
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: mockReadme,
          },
        ],
      } as never)

      // Mock home page generation
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: mockHomePage,
          },
        ],
      } as never)

      const requirements = [
        {
          question: 'Who is your target user?',
          answer: 'Small business owners',
        },
        {
          question: 'What are you building?',
          answer: 'A task management app',
        },
      ]

      const result = await generateProjectTemplate(
        'Test Project',
        'A test application',
        requirements
      )

      expect(result.files).toBeInstanceOf(Array)
      expect(result.files.length).toBeGreaterThan(0)

      // Check for essential files
      const fileNames = result.files.map(f => f.path)
      expect(fileNames).toContain('package.json')
      expect(fileNames).toContain('tsconfig.json')
      expect(fileNames).toContain('next.config.js')
      expect(fileNames).toContain('tailwind.config.ts')
      expect(fileNames).toContain('postcss.config.mjs')
      expect(fileNames).toContain('.gitignore')
      expect(fileNames).toContain('README.md')
      expect(fileNames).toContain('src/app/layout.tsx')
      expect(fileNames).toContain('src/app/page.tsx')
      expect(fileNames).toContain('src/app/globals.css')
      expect(fileNames).toContain('.env.example')

      // Check README content
      const readmeFile = result.files.find(f => f.path === 'README.md')
      expect(readmeFile?.content).toBe(mockReadme)

      // Check home page content
      const homePageFile = result.files.find(f => f.path === 'src/app/page.tsx')
      expect(homePageFile?.content).toBe(mockHomePage)
    })

    it('should use fallback content when AI generation fails', async () => {
      // Mock AI failures
      mockAnthropicCreate.mockRejectedValue(new Error('API error'))

      const requirements = [
        {
          question: 'Who is your target user?',
          answer: 'Developers',
        },
      ]

      const result = await generateProjectTemplate(
        'Fallback Project',
        'Should use fallback content',
        requirements
      )

      expect(result.files).toBeInstanceOf(Array)
      expect(result.files.length).toBeGreaterThan(0)

      // Check that fallback README is used
      const readmeFile = result.files.find(f => f.path === 'README.md')
      expect(readmeFile?.content).toContain('# Fallback Project')
      expect(readmeFile?.content).toContain('Getting Started')

      // Check that fallback home page is used
      const homePageFile = result.files.find(f => f.path === 'src/app/page.tsx')
      expect(homePageFile?.content).toContain('export default function Home()')
      expect(homePageFile?.content).toContain('Fallback Project')
    })

    it('should sanitize project name in package.json', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Mock content',
          },
        ],
      } as never)

      const result = await generateProjectTemplate(
        'My Test Project With Spaces',
        'Description',
        []
      )

      const packageJsonFile = result.files.find(f => f.path === 'package.json')
      const packageJson = JSON.parse(packageJsonFile?.content || '{}')

      expect(packageJson.name).toBe('my-test-project-with-spaces')
      expect(packageJson.name).not.toContain(' ')
    })

    it('should include project metadata in layout.tsx', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Mock content',
          },
        ],
      } as never)

      const projectName = 'Metadata Test'
      const projectDescription = 'Test metadata injection'

      const result = await generateProjectTemplate(
        projectName,
        projectDescription,
        []
      )

      const layoutFile = result.files.find(f => f.path === 'src/app/layout.tsx')

      expect(layoutFile?.content).toContain(`title: '${projectName}'`)
      expect(layoutFile?.content).toContain(
        `description: '${projectDescription}'`
      )
    })

    it('should generate valid package.json with all required fields', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Mock content',
          },
        ],
      } as never)

      const result = await generateProjectTemplate('Test', 'Description', [])

      const packageJsonFile = result.files.find(f => f.path === 'package.json')
      const packageJson = JSON.parse(packageJsonFile?.content || '{}')

      // Check required fields
      expect(packageJson.name).toBeDefined()
      expect(packageJson.version).toBe('0.1.0')
      expect(packageJson.private).toBe(true)
      expect(packageJson.scripts).toBeDefined()
      expect(packageJson.scripts.dev).toBe('next dev')
      expect(packageJson.scripts.build).toBe('next build')
      expect(packageJson.scripts.start).toBe('next start')
      expect(packageJson.scripts.lint).toBe('next lint')

      // Check dependencies
      expect(packageJson.dependencies.react).toBeDefined()
      expect(packageJson.dependencies['react-dom']).toBeDefined()
      expect(packageJson.dependencies.next).toBeDefined()

      // Check devDependencies
      expect(packageJson.devDependencies.typescript).toBeDefined()
      expect(packageJson.devDependencies.tailwindcss).toBeDefined()
      expect(packageJson.devDependencies.eslint).toBeDefined()
    })

    it('should generate valid tsconfig.json', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Mock content',
          },
        ],
      } as never)

      const result = await generateProjectTemplate('Test', 'Description', [])

      const tsconfigFile = result.files.find(f => f.path === 'tsconfig.json')
      const tsconfig = JSON.parse(tsconfigFile?.content || '{}')

      expect(tsconfig.compilerOptions).toBeDefined()
      expect(tsconfig.compilerOptions.strict).toBe(true)
      expect(tsconfig.compilerOptions.paths).toBeDefined()
      expect(tsconfig.compilerOptions.paths['@/*']).toEqual(['./src/*'])
    })

    it('should generate .gitignore with essential entries', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Mock content',
          },
        ],
      } as never)

      const result = await generateProjectTemplate('Test', 'Description', [])

      const gitignoreFile = result.files.find(f => f.path === '.gitignore')

      expect(gitignoreFile?.content).toContain('/node_modules')
      expect(gitignoreFile?.content).toContain('/.next/')
      expect(gitignoreFile?.content).toContain('.env*.local')
      expect(gitignoreFile?.content).toContain('.vercel')
      expect(gitignoreFile?.content).toContain('*.tsbuildinfo')
    })

    it('should generate globals.css with Tailwind directives', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Mock content',
          },
        ],
      } as never)

      const result = await generateProjectTemplate('Test', 'Description', [])

      const globalsCssFile = result.files.find(
        f => f.path === 'src/app/globals.css'
      )

      expect(globalsCssFile?.content).toContain('@tailwind base;')
      expect(globalsCssFile?.content).toContain('@tailwind components;')
      expect(globalsCssFile?.content).toContain('@tailwind utilities;')
    })

    it('should strip markdown code fences from home page', async () => {
      const codeWithFences =
        '```tsx\nexport default function Home() { return <div>Test</div> }\n```'

      mockAnthropicCreate
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'README' }],
        } as never)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: codeWithFences }],
        } as never)

      const result = await generateProjectTemplate('Test', 'Description', [])

      const homePageFile = result.files.find(f => f.path === 'src/app/page.tsx')

      expect(homePageFile?.content).not.toContain('```')
      expect(homePageFile?.content).toContain('export default function Home()')
    })
  })
})
