# Contributing to Pi Hooks

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pi-hooks.git
   cd pi-hooks
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests to ensure everything works:
   ```bash
   npm test
   ```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

- Write your code
- Add tests for new functionality
- Update documentation if needed

### 3. Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode during development
npm run test:watch
```

### 4. Type Check

```bash
npm run typecheck
```

### 5. Commit Changes

Use conventional commits:

```bash
git commit -m "feat: add new permission rule type"
git commit -m "fix: handle edge case in command splitting"
git commit -m "docs: update README with examples"
git commit -m "test: add integration tests for path safety"
```

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

## Code Style

### TypeScript

- Use strict mode
- Prefer `const` over `let`
- Use explicit types for function parameters and return values
- Avoid `any` - use proper types
- Use interfaces for object shapes

### Naming

- Functions: camelCase (`checkPermission`)
- Types/Interfaces: PascalCase (`PermissionRule`)
- Constants: UPPER_SNAKE_CASE (`HARD_BLOCKS`)
- Files: kebab-case (`hooks.test.ts`)

### Formatting

- 2 spaces indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in multi-line objects

### Comments

- JSDoc for public functions
- Inline comments for complex logic
- TODO comments with issue reference

## Testing Guidelines

### What to Test

- ✅ All public functions
- ✅ Edge cases (empty input, null, undefined)
- ✅ Error conditions
- ✅ Integration scenarios
- ✅ Security-critical paths

### Test Structure

```typescript
describe("feature name", () => {
  it("should do something specific", () => {
    expect(actual).toBe(expected);
  });

  it("should handle edge case", () => {
    expect(() => functionThatThrows()).toThrow();
  });
});
```

### Test Coverage

Aim for:
- 90%+ statement coverage
- 85%+ branch coverage
- All security-critical paths tested

## Documentation

### README Updates

Update README.md when:
- Adding new features
- Changing configuration format
- Modifying API
- Adding examples

### Code Comments

```typescript
/**
 * Brief description of what the function does.
 *
 * @param param1 - Description of parameter
 * @param param2 - Description of parameter
 * @returns Description of return value
 * @internal - Mark internal functions
 */
export function myFunction(param1: string, param2: number): boolean {
  // Implementation
}
```

## Pull Request Process

### Before Submitting

1. ✅ All tests pass
2. ✅ Type checking passes
3. ✅ Code follows style guidelines
4. ✅ Documentation updated
5. ✅ Commit messages are clear

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No commented-out code
```

### Review Process

1. Maintainer reviews code
2. Automated checks run (CI)
3. Feedback provided if needed
4. Changes requested if necessary
5. PR merged when approved

## Issue Reporting

### Bug Reports

Include:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment (Node version, OS)
- Code examples if applicable

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternatives considered
- Additional context

## Security Issues

**DO NOT** report security issues via GitHub Issues.

Email: [your-email@example.com]

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Release Process

Releases are managed by maintainers:

1. Version bumped in package.json
2. CHANGELOG.md updated
3. Tag created
4. Published to npm (if applicable)
5. GitHub release created

## Community Guidelines

### Be Respectful

- Treat everyone with respect
- No harassment or discrimination
- Constructive feedback only

### Be Helpful

- Answer questions when you can
- Share knowledge
- Help newcomers

### Be Professional

- Keep discussions on-topic
- No spam or self-promotion
- Follow project goals

## Questions?

- Open an issue for bugs/features
- Start a discussion for questions
- Email maintainers for private matters

Thank you for contributing! 🎉
