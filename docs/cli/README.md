# ChainSync CLI Documentation

The ChainSync CLI is a powerful command-line tool that simplifies cross-chain development and deployment across 50+ blockchain networks.

## Installation

```bash
# Install globally
npm install -g @chainsync/cli

# Verify installation
chainsync --version
```

## Quick Start

```bash
# Initialize a new cross-chain project
chainsync init my-cross-chain-app

# Navigate to project
cd my-cross-chain-app

# Deploy to multiple networks
chainsync deploy --networks ethereum,polygon,arbitrum

# Check deployment status
chainsync status
```

## Commands Reference

### Project Management

#### `chainsync init <project-name>`
Initialize a new cross-chain project with multi-network support.

```bash
chainsync init my-dapp

# Interactive mode with network selection
chainsync init my-dapp --interactive

# Use specific template
chainsync init my-dapp --template defi
```

**Generated Project Structure:**
```
my-dapp/
├── contracts/           # Smart contracts
│   ├── evm/            # EVM-compatible contracts
│   ├── near/           # NEAR contracts
│   ├── sui/            # Sui Move contracts
│   └── cosmos/         # CosmWasm contracts
├── config/
│   ├── networks.json   # Network configurations
│   └── deployment.json # Deployment settings
├── scripts/
│   ├── deploy.js       # Deployment scripts
│   └── verify.js       # Verification scripts
└── chainsync.config.js # Main configuration
```

### Network Management

#### `chainsync networks`
Explore and manage supported blockchain networks.

```bash
# List all supported networks
chainsync networks

# Filter by network type
chainsync networks --type evm
chainsync networks --type alt-l1
chainsync networks --type layer2

# Get detailed network information
chainsync networks --info ethereum
chainsync networks --info near

# Search networks
chainsync networks --search arbitrum
```

**Network Categories:**
- **EVM**: Ethereum, Polygon, Arbitrum, Optimism, BSC, Avalanche, Base, etc.
- **Alt-L1**: NEAR, Cosmos, Sui, Aptos, Solana, Terra, etc.
- **Layer2**: zkSync, Linea, Scroll, Mantle, Starknet, etc.
- **Emerging**: Celestia, Flow, Kroma, Celo, etc.

### Deployment & Contracts

#### `chainsync deploy`
Deploy contracts across multiple blockchain networks.

```bash
# Deploy to specific networks
chainsync deploy --networks ethereum,polygon,arbitrum

# Deploy to network categories
chainsync deploy --category evm

# Deploy with custom gas settings
chainsync deploy --networks ethereum --gas-price 20000000000

# Deploy with verification
chainsync deploy --networks ethereum,polygon --verify

# Dry run deployment
chainsync deploy --networks ethereum --dry-run
```

**Deployment Options:**
- `--networks`: Comma-separated list of networks
- `--category`: Deploy to all networks in category (evm, alt-l1, layer2)
- `--gas-price`: Custom gas price for EVM networks
- `--verify`: Enable contract verification
- `--dry-run`: Simulate deployment without executing

#### `chainsync config`
Manage project configuration and network settings.

```bash
# View current configuration
chainsync config

# Set network RPC URL
chainsync config set ethereum.rpcUrl https://eth-mainnet.g.alchemy.com/v2/key

# Set global settings
chainsync config set global.gasOptimization true

# Reset configuration
chainsync config reset

# Validate configuration
chainsync config validate
```

### Monitoring & Status

#### `chainsync status`
Check system health and deployment status.

```bash
# Overall system status
chainsync status

# Check specific networks
chainsync status --networks ethereum,polygon

# Detailed status with metrics
chainsync status --detailed

# Real-time monitoring
chainsync status --watch --interval 30
```

**Status Information:**
- Network health and connectivity
- Recent deployment status
- Transaction confirmations
- Gas prices and network congestion
- Solana coordination layer status

#### `chainsync monitor`
Real-time monitoring of cross-chain operations.

```bash
# Monitor all active deployments
chainsync monitor

# Monitor specific deployment
chainsync monitor --deployment-id abc123

# Monitor with custom interval
chainsync monitor --interval 15

# Monitor specific networks
chainsync monitor --networks ethereum,polygon
```

### Validation & Testing

#### `chainsync validate`
Validate contracts and configurations.

```bash
# Validate all contracts
chainsync validate

# Validate specific contract
chainsync validate --contract Token.sol

# Validate network configuration
chainsync validate --config

# Validate with specific networks
chainsync validate --networks ethereum,polygon
```

### Utilities

#### `chainsync help`
Get help for any command.

```bash
# General help
chainsync help

# Command-specific help
chainsync help deploy
chainsync help networks
```

## Configuration

### Project Configuration

Create a `chainsync.config.js` file in your project root:

```javascript
module.exports = {
  networks: {
    ethereum: {
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-key',
      chainId: 1,
      gasPrice: '20000000000'
    },
    polygon: {
      rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/your-key',
      chainId: 137,
      gasPrice: '30000000000'
    },
    near: {
      rpcUrl: 'https://rpc.mainnet.near.org',
      networkId: 'mainnet'
    }
  },
  solana: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    programId: 'YourProgramId'
  },
  deployment: {
    gasOptimization: true,
    verification: true,
    confirmations: 2
  }
};
```

### Global Configuration

Global CLI settings are stored in `~/.chainsync/config.json`:

```json
{
  "defaultNetworks": ["ethereum", "polygon"],
  "gasOptimization": true,
  "verification": false,
  "confirmations": 2,
  "rpcTimeout": 30000
}
```

## Examples

### DeFi Protocol Deployment

```bash
# Initialize DeFi project
chainsync init defi-protocol --template defi

cd defi-protocol

# Deploy to major DeFi networks
chainsync deploy --networks ethereum,polygon,arbitrum,avalanche \
  --gas-price 15000000000 \
  --verify

# Monitor deployment
chainsync status --watch
```

### NFT Collection Launch

```bash
# Initialize NFT project
chainsync init nft-collection --template nft

cd nft-collection

# Deploy to NFT-focused networks
chainsync deploy --networks ethereum,polygon,flow,near \
  --category layer2 \
  --verify

# Check network coverage
chainsync networks --type nft-focused
```

### Cross-Chain Bridge Setup

```bash
# Initialize bridge project
chainsync init cross-chain-bridge --template bridge

cd cross-chain-bridge

# Deploy bridge contracts
chainsync deploy --networks ethereum,polygon,arbitrum,optimism \
  --gas-price 20000000000 \
  --confirmations 3

# Monitor bridge health
chainsync monitor --interval 10
```

## Advanced Features

### Custom Templates

Create custom project templates for specific use cases:

```bash
# Create template
chainsync template create my-template --from ./template-source

# Use custom template
chainsync init my-project --template my-template

# List available templates
chainsync template list
```

### Scripting & Automation

Use ChainSync CLI in scripts and CI/CD pipelines:

```bash
#!/bin/bash
# Automated deployment script

# Deploy to testnet first
chainsync deploy --networks sepolia,mumbai --dry-run

# If successful, deploy to mainnet
if [ $? -eq 0 ]; then
    chainsync deploy --networks ethereum,polygon --verify
fi

# Send notification
chainsync status --json | jq '.deployments[] | select(.status=="success")'
```

### Environment-Specific Configuration

```bash
# Development environment
export CHAINSYNC_ENV=development
chainsync deploy --networks sepolia,mumbai

# Production environment
export CHAINSYNC_ENV=production
chainsync deploy --networks ethereum,polygon
```

## Troubleshooting

### Common Issues

1. **RPC Connection Errors**
   ```bash
   # Test network connectivity
   chainsync networks --test ethereum

   # Use alternative RPC
   chainsync config set ethereum.rpcUrl https://alternative-rpc.com
   ```

2. **Gas Estimation Failures**
   ```bash
   # Set manual gas price
   chainsync deploy --gas-price 20000000000

   # Enable gas optimization
   chainsync config set global.gasOptimization true
   ```

3. **Contract Verification Issues**
   ```bash
   # Skip verification temporarily
   chainsync deploy --no-verify

   # Verify manually later
   chainsync verify --contract MyContract --network ethereum
   ```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Enable debug mode
export DEBUG=chainsync:*

# Run command with debug output
chainsync deploy --networks ethereum --verbose
```

## Integration with SDK

The CLI works seamlessly with the ChainSync SDK:

```typescript
import { ChainSync } from '@chainsync/sdk';

// Load configuration from CLI project
const config = require('./chainsync.config.js');

const chainSync = new ChainSync(config.networks);

// Use SDK for programmatic operations
const deployment = await chainSync.deployContract({
  bytecode: contractBytecode,
  chains: ['ethereum', 'polygon']
});
```

## Contributing

See [Contributing Guide](../development/contributing.md) for information on contributing to the CLI.

## Support

- [GitHub Issues](https://github.com/chainsync/chainsync/issues)
- [Discord Community](https://discord.gg/chainsync)
- [Documentation](https://docs.chainsync.network)