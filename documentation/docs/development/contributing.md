# Contributing

Thank you for your interest in contributing to ChainSync!

## Getting Started

### 1. Fork the Repository

Click the "Fork" button on GitHub to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/chainsync
cd chainsync
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/chainsync/chainsync
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Create a Branch

```bash
git checkout -b feature/my-feature
```

## Development Guidelines

### Code Style

- Use TypeScript for all code
- Follow existing patterns in the codebase
- Run linting before committing

```bash
npm run lint
npm run format
```

### Commit Messages

Use conventional commits:

```
feat: add new chain support
fix: resolve connection timeout issue
docs: update SDK examples
refactor: simplify deployment logic
test: add integration tests for billing
```

### Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update the changelog
5. Request review from maintainers

## Types of Contributions

### Bug Reports

Open an issue with:

- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details

### Feature Requests

Open an issue with:

- Use case description
- Proposed solution
- Alternatives considered

### Code Contributions

1. Check existing issues
2. Discuss significant changes first
3. Follow the development workflow

### Documentation

- Fix typos and errors
- Add examples
- Improve clarity

## Testing

### Run Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Specific package
npm run test --workspace=packages/sdk
```

### Write Tests

- Add unit tests for new functions
- Add integration tests for APIs
- Test edge cases

## Code Review

### For Contributors

- Respond to feedback promptly
- Keep PRs focused and small
- Be open to suggestions

### For Reviewers

- Be constructive and respectful
- Explain the "why" behind suggestions
- Approve when ready

## Community

### Communication

- GitHub Issues for bugs/features
- GitHub Discussions for questions
- Discord for real-time chat

### Code of Conduct

Be respectful and inclusive. See [CODE_OF_CONDUCT.md](https://github.com/chainsync/chainsync/blob/main/CODE_OF_CONDUCT.md).

## Recognition

Contributors are:

- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Appreciated by the community!

## Questions?

- Ask in [GitHub Discussions](https://github.com/chainsync/chainsync/discussions)
- Join [Discord](https://discord.gg/chainsync)
