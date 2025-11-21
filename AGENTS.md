# Repository Guidelines

## Project Structure & Modules

- `src/app` uses the Next.js App Router for routes/pages; shared utilities live in `src/lib`, types in `src/types`, and middleware in `src/middleware.ts`.
- Tests are grouped under `__tests__/unit`, `__tests__/integration`, and Playwright specs in `__tests__/e2e`.
- Data layer lives in `prisma/` (schema, migrations) with config in `prisma.config.ts`.
- Developer docs sit in `docs/` (current) and `docs-archive/`; quality tooling lives in `projects/create-quality-automation/`.

## Build, Test, and Development Commands

- `npm install` (Node 20+, Volta pins 20.11.1) to set up; copy envs via `cp .env.example .env.local` before running anything that hits external services.
- `npm run dev` starts the Next.js dev server; `npm run build` + `npm start` mimic production.
- `npm run lint` checks ESLint/TypeScript rules; `npm run lint:fix` also runs Stylelint on CSS and auto-fixes.
- `npm run format` / `npm run format:check` enforce Prettier 2-space style.
- Testing: `npm test` (all Jest suites), `npm run test:unit`, `npm run test:integration`, `npm run test:coverage`, `npm run test:e2e` (Playwright headless), `npm run test:e2e:ui` (visual runner).
- Quality/safety: `npm run validate:all` (docs + security audit), `npm run security:audit`, `npm run lighthouse:ci`.

## Coding Style & Naming Conventions

- TypeScript-first; path alias `@/` maps to `src/`.
- Prettier governs formatting (2-space indent, single quotes per ESLint config). Keep JSX/TSX lean; prefer server components unless client behavior is required.
- Tests and helpers: camelCase for functions/vars, PascalCase for React components/types; file names kebab-case except React components which mirror component name when isolated.

## Testing Guidelines

- Jest 30 + Testing Library for unit/integration; jsdom environment configured in `jest.config.ts`.
- Test files end with `.test.ts|.test.tsx` and sit under the matching `__tests__` folder; Playwright specs use `.spec.ts`.
- Service-layer files in `src/lib` target >90% coverage with explicit thresholds (see `jest.config.ts`); add focused tests when modifying those files.
- Use MSW for HTTP mocks and prefer data builders over raw objects to keep fixtures readable.

## Commit & Pull Request Guidelines

- Git history follows Conventional Commits (`feat:`, `fix:`, `chore:`, `style:`). Match that pattern and keep scopes brief.
- Before opening a PR: run `npm run lint` and the relevant test subsets; attach Playwright report link when e2e changes are involved.
- PR description should state intent, summarize changes, list tests run, and reference any issues. Add screenshots/GIFs for UI changes.
- Keep commits small and reviewable; avoid bundling refactors with behavior changes unless tightly coupled.

## Security & Configuration Tips

- Never commit secrets; use `.env.local` for local values and follow `security:secrets` script if unsure.
- Prisma: run `npx prisma migrate dev` after schema edits; regenerate client if needed with `npx prisma generate`.
- Sentry configs (`sentry.*.config.ts`) are present—verify DSN in envs before enabling error reporting locally.
