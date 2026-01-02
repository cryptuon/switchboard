# Installation

Choose the installation method that best fits your needs.

## Installation Options

### Option A: CLI Only (Recommended for Beginners)

The CLI provides the fastest way to get started:

```bash
npm install -g @chainsync/cli

# Verify installation
chainsync --version
```

### Option B: SDK for Programmatic Use

For integrating ChainSync into your applications:

```bash
npm install @chainsync/sdk
```

### Option C: Full Development Setup

For contributing to ChainSync or running the full platform:

```bash
# Clone the repository
git clone https://github.com/chainsync/chainsync
cd chainsync

# Install dependencies
npm install

# Build all packages
npm run build
```

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **Node.js** | 18+ |
| **npm** | 8+ |
| **RAM** | 4GB |
| **Disk Space** | 10GB |
| **OS** | Linux, macOS, Windows |

### Recommended for Development

| Component | Recommendation |
|-----------|---------------|
| **Node.js** | 20 LTS |
| **RAM** | 8GB+ |
| **Disk Space** | 20GB+ |
| **Docker** | For local blockchain testing |

## Verifying Installation

### CLI Verification

```bash
# Check version
chainsync --version

# View available commands
chainsync --help

# Check system configuration
chainsync doctor
```

### SDK Verification

```javascript
import { ChainSync } from '@chainsync/sdk';

// Initialize the SDK
const chainSync = new ChainSync({
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
  },
});

// Verify connection
const status = await chainSync.getStatus();
console.log('ChainSync Status:', status);
```

## Docker Installation

For running ChainSync services locally:

```bash
# Clone repository
git clone https://github.com/chainsync/chainsync
cd chainsync

# Copy environment configuration
cp .env.example .env

# Start services with MongoDB (default)
docker-compose up -d

# Or start with PostgreSQL
DATABASE_TYPE=postgresql docker-compose --profile postgres up -d
```

Verify services are running:

```bash
# Check Customer API
curl http://localhost:3000/health

# Check Core Engine
curl http://localhost:3001/health
```

## Platform-Specific Notes

### Linux

No special requirements. Ensure Node.js is installed via nvm or your package manager.

### macOS

```bash
# Install Node.js via Homebrew
brew install node

# Install ChainSync CLI
npm install -g @chainsync/cli
```

### Windows

1. Install Node.js from [nodejs.org](https://nodejs.org/)
2. Use PowerShell or Windows Terminal
3. Install ChainSync:

```powershell
npm install -g @chainsync/cli
```

!!! tip "Windows Subsystem for Linux"
    For the best experience on Windows, consider using WSL2.

## Updating ChainSync

### CLI Updates

```bash
# Update to latest version
npm update -g @chainsync/cli

# Check for updates
chainsync update:check
```

### SDK Updates

```bash
# Update SDK in your project
npm update @chainsync/sdk
```

## Uninstalling

### Remove CLI

```bash
npm uninstall -g @chainsync/cli
```

### Remove SDK

```bash
npm uninstall @chainsync/sdk
```

## Troubleshooting Installation

### Permission Errors

If you encounter EACCES errors:

```bash
# Fix npm permissions (Linux/macOS)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Node Version Issues

```bash
# Check Node version
node --version

# Use nvm to manage versions
nvm install 20
nvm use 20
```

### Network Issues

```bash
# Use a different npm registry if needed
npm config set registry https://registry.npmjs.org/

# Clear npm cache
npm cache clean --force
```

## Next Steps

- Continue to [First Deployment](first-deployment.md)
- Learn about the [Architecture](../architecture/index.md)
- Explore [Configuration Options](../configuration/index.md)
