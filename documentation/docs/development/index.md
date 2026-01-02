# Development

Resources for contributing to and extending ChainSync.

## Overview

ChainSync is an open-source project that welcomes contributions. This section covers:

- [Contributing](contributing.md) - How to contribute
- [Testing](testing.md) - Running and writing tests

## Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Clone and Install

```bash
git clone https://github.com/chainsync/chainsync
cd chainsync
npm install
```

### Start Development Environment

```bash
# Start dependencies
docker-compose up -d mongodb redis clickhouse

# Start services in development mode
npm run dev
```

### Project Structure

```
chainsync/
├── packages/
│   ├── services/
│   │   ├── customer-api/      # Customer API service
│   │   └── core-engine/       # Core Engine service
│   ├── programs/
│   │   ├── state-oracle/      # Solana state oracle
│   │   └── coordinator/       # Solana coordinator
│   └── sdk/                   # TypeScript SDK
├── docs/                      # Internal documentation
├── documentation/             # User-facing docs (MkDocs)
├── scripts/                   # Build and utility scripts
└── tests/                     # Integration tests
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Changes

Follow the code style guide and write tests.

### 3. Run Tests

```bash
npm run test
npm run test:integration
```

### 4. Submit Pull Request

Push your branch and create a PR against `main`.

## Code Style

- TypeScript for all services
- ESLint + Prettier for formatting
- Conventional commits

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## Building

```bash
# Build all packages
npm run build

# Build specific service
npm run build:customer-api
npm run build:core-engine
```

## Next Steps

- [Contributing Guide](contributing.md) - Detailed contribution process
- [Testing Guide](testing.md) - How to write and run tests
