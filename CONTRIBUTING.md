# Contributing to GardenSpace 🌱

First off, thank you for considering contributing to GardenSpace! It's people like you that make GardenSpace such a great tool for productivity and mindfulness.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure Guide](#project-structure-guide)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/gardenspace.git`
3. Add the upstream remote: `git remote add upstream https://github.com/original-owner/gardenspace.git`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## 🤔 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear, descriptive title**
- **Steps to reproduce** (be specific!)
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **System details** (OS, browser, Node version)

Use this template:
```markdown
**Describe the bug**
A clear and concise description of the bug.

**To Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome 120, Safari 17]
- Node version: [e.g. 20.11.0]
```

### 💡 Suggesting Features

Feature suggestions are welcome! Please provide:

- **Use case** - Why is this needed?
- **Proposed solution** - How should it work?
- **Alternatives considered** - What other solutions did you think about?
- **Additional context** - Mockups, examples, etc.

### 🔧 Code Contributions

#### First Time Contributing?

- Look for issues labeled `good first issue` or `help wanted`
- Check our [project board](https://github.com/your-username/gardenspace/projects) for current priorities
- Comment on an issue to claim it before starting work

#### For Experienced Contributors

- Check the roadmap in README.md
- Discuss major changes in an issue first
- Keep pull requests focused - one feature/fix per PR

## 💻 Development Setup

### Prerequisites

- Node.js 18+ (we recommend using [nvm](https://github.com/nvm-sh/nvm))
- Git
- A code editor (we recommend [VS Code](https://code.visualstudio.com/))

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Copy environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your credentials (see README for details)

3. **Set up the database**
   ```bash
   npx instant-cli push
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Run tests** (if available)
   ```bash
   npm test
   ```

### Working with InstantDB

- Schema changes go in `instant.schema.ts`
- Permissions are in `instant.perms.ts`
- After schema changes, run: `npx instant-cli push`
- Test database queries in the InstantDB dashboard

### Working with Stripe (Optional)

See [STRIPE_SETUP.md](STRIPE_SETUP.md) for detailed Stripe integration setup.

## 🎨 Style Guidelines

### Code Style

We use ESLint and Prettier for code formatting. Run before committing:

```bash
npm run lint
npm run format
```

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types - be explicit
- Prefer interfaces over type aliases for objects
- Use proper return types for functions

Example:
```typescript
// ✅ Good
interface UserProfile {
  username: string;
  supporter: boolean;
  createdAt: Date;
}

function getUserProfile(userId: string): Promise<UserProfile | null> {
  // implementation
}

// ❌ Avoid
function getUserProfile(userId: any): any {
  // implementation
}
```

### React/Next.js

- Use functional components with hooks
- Keep components small and focused
- Use proper TypeScript types for props
- Place components in logical folders

Example:
```tsx
// ✅ Good
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export default function Button({ onClick, children, variant = 'primary' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}
```

### CSS/Tailwind

- Use Tailwind classes over custom CSS
- Keep className strings readable
- Extract complex styles to component files
- Use CSS variables for theming

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Examples

```bash
feat(garden): add new plant varieties
fix(auth): resolve Google OAuth redirect issue
docs: update README with new setup instructions
refactor(components): simplify IsometricGarden logic
```

## 🔄 Pull Request Process

1. **Before submitting:**
   - Update documentation if needed
   - Add tests for new features
   - Ensure all tests pass
   - Run linter and fix issues
   - Update README.md if adding new dependencies

2. **PR Description should include:**
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Screenshots for UI changes
   - Link to related issue(s)

3. **PR Template:**
   ```markdown
   ## Description
   Brief description of the changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Tests pass locally
   - [ ] Added new tests (if applicable)
   
   ## Screenshots
   (if applicable)
   
   ## Related Issues
   Fixes #(issue number)
   ```

4. **Review Process:**
   - At least one maintainer review required
   - Address review feedback promptly
   - Keep discussion respectful and constructive

## 📂 Project Structure Guide

Understanding where code belongs:

```
app/
├── (public)/         # Public routes (profiles)
├── api/              # API endpoints
│   └── */route.ts    # Next.js API routes
├── components/       # Reusable React components
│   ├── *Modal.tsx    # Modal components
│   └── *.tsx         # Other components
├── contexts/         # React context providers
├── constants/        # App-wide constants
└── page.tsx          # Page components

lib/                  # Utility functions and configs
├── db.ts            # InstantDB client
├── stripe.ts        # Stripe configuration
└── *.ts             # Other utilities

public/              # Static assets
├── blocks/          # Block textures
└── plants/          # Plant images

trigger/             # Background jobs (Trigger.dev)
```

### Adding New Features

1. **New Component:** Place in `app/components/`
2. **New API Route:** Create in `app/api/[endpoint]/route.ts`
3. **New Database Entity:** Update `instant.schema.ts`
4. **New Plant/Block:** Add images to `public/` and update `app/constants/`
5. **New Background Job:** Add to `trigger/`

## 🧪 Testing

### Running Tests

```bash
npm test              # Run all tests
npm test:watch       # Run tests in watch mode
npm test:coverage    # Generate coverage report
```

### Writing Tests

- Test files should be colocated with code
- Name test files as `*.test.ts(x)` or `*.spec.ts(x)`
- Focus on user behavior over implementation details
- Aim for >80% coverage on new code

## 🚀 Deployment

The main branch auto-deploys to production. Feature branches can be deployed to preview environments.

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [InstantDB Documentation](https://www.instantdb.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 🤝 Getting Help

- **Discord:** Join our [Discord server](https://discord.gg/your-invite)
- **Discussions:** Use [GitHub Discussions](https://github.com/your-username/gardenspace/discussions)
- **Issues:** For bugs and feature requests

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Our Discord community

Thank you for contributing to GardenSpace! 🌱✨
