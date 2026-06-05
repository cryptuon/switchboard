# Configuration

This section covers all configuration options for Switchboard.

## Configuration Overview

Switchboard is configured through environment variables and configuration files.

| Configuration | Purpose |
|---------------|---------|
| [Environment Variables](environment.md) | Service and security settings |
| [Database](database.md) | Database connection and options |
| [Networks](networks.md) | Blockchain network configuration |

## Quick Reference

### Essential Variables

```bash
# Service Mode
NODE_ENV=production

# Database (choose one)
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb://localhost:27017/switchboard

# Solana Coordination
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Security
JWT_SECRET=your-secure-secret
```

## Configuration Files

### Project Configuration

For CLI projects, use `switchboard.config.js`:

```javascript
module.exports = {
  mode: 'development',
  networks: {
    ethereum: {
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      chainId: 1,
    },
  },
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
  },
  deployment: {
    gasOptimization: true,
    verification: true,
  },
};
```

### Service Configuration

For deploying the platform, use environment variables (`.env`):

```bash
# Copy template
cp .env.example .env

# Edit configuration
nano .env
```

## Configuration Priority

Configuration is loaded in this order (later overrides earlier):

1. Default values
2. Configuration file (`switchboard.config.js`)
3. Environment variables
4. CLI arguments

## Validation

Validate your configuration:

```bash
# Validate project configuration
switchboard validate

# Check specific settings
switchboard validate --config

# Verify network connectivity
switchboard health
```

## Next Steps

- [Environment Variables](environment.md) - Complete variable reference
- [Database Configuration](database.md) - Database setup
- [Network Configuration](networks.md) - Blockchain networks
