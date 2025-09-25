# Development Environment Setup

This guide will help you set up your development environment for ChainSync.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Rust** - For Solana program development
2. **Node.js** (v16 or higher) - For SDK and service development
3. **Solana CLI Tools** - For deploying and testing Solana programs
4. **Docker** - For containerized services
5. **Git** - For version control

## Installing Prerequisites

### Rust and Solana Tools

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Solana CLI tools
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor framework
cargo install --git https://github.com/coral-xyz/anchor --tag v0.28.0 anchor-cli --locked
```

### Node.js

We recommend using nvm (Node Version Manager) to install and manage Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js
nvm install node
nvm use node
```

## Project Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/chainsync.git
   cd chainsync
   ```

2. Install project dependencies:
   ```bash
   npm install
   ```

3. Build all packages:
   ```bash
   npm run build
   ```

## Directory Structure

After setup, your project structure should look like:

```
chainsync/
├── docs/                    # Documentation
├── packages/                # Core code packages
│   ├── programs/           # Solana on-chain programs
│   ├── sdk/                # Developer SDK
│   ├── services/           # Off-chain services
│   └── demo/               # Demo applications
├── scripts/                # Deployment and utility scripts
├── tests/                  # Integration and end-to-end tests
├── README.md              # Project overview
└── package.json           # Workspace configuration
```

## Development Workflow

1. **For Solana Programs**:
   ```bash
   cd packages/programs/state-oracle
   anchor build
   anchor test
   ```

2. **For SDK Development**:
   ```bash
   cd packages/sdk
   npm run build
   npm run test
   ```

3. **For Services**:
   ```bash
   cd packages/services/oracle-service
   npm start
   ```

## Testing

To run all tests:
```bash
npm test
```

To run tests for a specific package:
```bash
npm test -- --scope=@chainsync/sdk
```

## Useful Commands

- `npm run build` - Build all packages
- `npm run clean` - Clean build artifacts
- `npm run lint` - Run linter on all packages
- `npm run format` - Format code with prettier

## Troubleshooting

If you encounter any issues during setup:

1. Ensure all prerequisites are properly installed and accessible from your PATH
2. Check that you're using compatible versions of the tools
3. If you get permission errors, try running commands with sudo (though this shouldn't be necessary)

For additional help, please refer to the specific documentation for each component or reach out to the team.