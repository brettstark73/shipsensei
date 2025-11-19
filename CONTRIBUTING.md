# Contributing to ShipSensei

Thank you for your interest in contributing to ShipSensei! We're building in public and welcome contributions from the community.

## How to Contribute

### Reporting Bugs

Found a bug? Please open an issue with:
- Clear title and description
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots (if applicable)
- Environment (OS, browser, Node version)

### Suggesting Features

Have an idea? Open an issue with:
- Clear description of the feature
- Use case (why is this valuable?)
- Proposed implementation (optional)

### Contributing Code

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**:
   - Follow existing code style
   - Add tests for new features
   - Update documentation if needed
4. **Run checks**:
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   ```
5. **Commit your changes**: Use clear, descriptive commit messages
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Open a Pull Request**:
   - Describe what you changed and why
   - Reference any related issues
   - Ensure CI passes

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/shipsensei.git
cd shipsensei

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
pnpm prisma migrate dev

# Start development server
pnpm dev
```

## Code Style

- **TypeScript**: All new code must be TypeScript
- **Formatting**: Prettier (runs automatically on commit)
- **Linting**: ESLint (must pass before merge)
- **Naming**: Descriptive variable names, camelCase for functions/variables

## Commit Guidelines

Use conventional commits:
- `feat: Add requirements wizard`
- `fix: Resolve deployment timeout`
- `docs: Update architecture documentation`
- `test: Add integration tests for API routes`
- `chore: Update dependencies`

## Pull Request Process

1. **Self-review**: Review your own code first
2. **Tests**: Ensure all tests pass
3. **Documentation**: Update docs if needed
4. **CI**: All checks must pass
5. **Review**: Wait for maintainer review
6. **Merge**: Maintainers will merge when approved

## Community Guidelines

- Be respectful and constructive
- Help others learn and grow
- Celebrate successes (yours and others')
- Give credit where it's due
- Follow our [Code of Conduct](CODE_OF_CONDUCT.md)

## Questions?

- **Discord**: Join our community server (link in README)
- **Issues**: Open an issue for questions
- **Email**: hello@shipsensei.dev

## License

By contributing, you agree that your contributions will be licensed under the MIT License (for open source core) or the ShipSensei Proprietary License (for proprietary components), as applicable.

---

**Thank you for contributing to ShipSensei!** Every contribution, big or small, helps make building and launching products more accessible to everyone.
