# Switchboard CLI Documentation

The Switchboard CLI is a powerful command-line tool that simplifies cross-chain development and deployment across 50+ blockchain networks.

## Installation

```bash
# Install globally
npm install -g @switchboard/cli

# Verify installation
switchboard --version
```

## Quick Start

```bash
# Initialize a new cross-chain project
switchboard init my-cross-chain-app

# Navigate to project
cd my-cross-chain-app

# Deploy to multiple networks
switchboard deploy --networks ethereum,polygon,arbitrum

# Check deployment status
switchboard status
```

## Commands Reference

### Project Management

#### `switchboard init <project-name>`
Initialize a new cross-chain project with multi-network support.

```bash
switchboard init my-dapp

# Interactive mode with network selection
switchboard init my-dapp --interactive

# Use specific template
switchboard init my-dapp --template defi
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
└── switchboard.config.js # Main configuration
```

### Network Management

#### `switchboard networks`
Explore and manage supported blockchain networks.

```bash
# List all supported networks
switchboard networks

# Filter by network type
switchboard networks --type evm
switchboard networks --type alt-l1
switchboard networks --type layer2

# Get detailed network information
switchboard networks --info ethereum
switchboard networks --info near

# Search networks
switchboard networks --search arbitrum
```

**Network Categories:**
- **EVM**: Ethereum, Polygon, Arbitrum, Optimism, BSC, Avalanche, Base, etc.
- **Alt-L1**: NEAR, Cosmos, Sui, Aptos, Solana, Terra, etc.
- **Layer2**: zkSync, Linea, Scroll, Mantle, Starknet, etc.
- **Emerging**: Celestia, Flow, Kroma, Celo, etc.

### Deployment & Contracts

#### `switchboard deploy`
Deploy contracts across multiple blockchain networks.

```bash
# Deploy to specific networks
switchboard deploy --networks ethereum,polygon,arbitrum

# Deploy to network categories
switchboard deploy --category evm

# Deploy with custom gas settings
switchboard deploy --networks ethereum --gas-price 20000000000

# Deploy with verification
switchboard deploy --networks ethereum,polygon --verify

# Dry run deployment
switchboard deploy --networks ethereum --dry-run
```

**Deployment Options:**
- `--networks`: Comma-separated list of networks
- `--category`: Deploy to all networks in category (evm, alt-l1, layer2)
- `--gas-price`: Custom gas price for EVM networks
- `--verify`: Enable contract verification
- `--dry-run`: Simulate deployment without executing

#### `switchboard config`
Manage project configuration and network settings.

```bash
# View current configuration
switchboard config

# Set network RPC URL
switchboard config set ethereum.rpcUrl https://eth-mainnet.g.alchemy.com/v2/key

# Set global settings
switchboard config set global.gasOptimization true

# Reset configuration
switchboard config reset

# Validate configuration
switchboard config validate
```

### Monitoring & Status

#### `switchboard status`
Check system health and deployment status.

```bash
# Overall system status
switchboard status

# Check specific networks
switchboard status --networks ethereum,polygon

# Detailed status with metrics
switchboard status --detailed

# Real-time monitoring
switchboard status --watch --interval 30
```

**Status Information:**
- Network health and connectivity
- Recent deployment status
- Transaction confirmations
- Gas prices and network congestion
- Solana coordination layer status

#### `switchboard monitor`
Real-time monitoring of cross-chain operations.

```bash
# Monitor all active deployments
switchboard monitor

# Monitor specific deployment
switchboard monitor --deployment-id abc123

# Monitor with custom interval
switchboard monitor --interval 15

# Monitor specific networks
switchboard monitor --networks ethereum,polygon
```

### Validation & Testing

#### `switchboard validate`
Validate contracts and configurations.

```bash
# Validate all contracts
switchboard validate

# Validate specific contract
switchboard validate --contract Token.sol

# Validate network configuration
switchboard validate --config

# Validate with specific networks
switchboard validate --networks ethereum,polygon
```

### Utilities

#### `switchboard help`
Get help for any command.

```bash
# General help
switchboard help

# Command-specific help
switchboard help deploy
switchboard help networks
```

## Configuration

### Project Configuration

Create a `switchboard.config.js` file in your project root:

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

Global CLI settings are stored in `~/.switchboard/config.json`:

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
switchboard init defi-protocol --template defi

cd defi-protocol

# Deploy to major DeFi networks
switchboard deploy --networks ethereum,polygon,arbitrum,avalanche \
  --gas-price 15000000000 \
  --verify

# Monitor deployment
switchboard status --watch
```

### NFT Collection Launch

```bash
# Initialize NFT project
switchboard init nft-collection --template nft

cd nft-collection

# Deploy to NFT-focused networks
switchboard deploy --networks ethereum,polygon,flow,near \
  --category layer2 \
  --verify

# Check network coverage
switchboard networks --type nft-focused
```

### Cross-Chain Bridge Setup

```bash
# Initialize bridge project
switchboard init cross-chain-bridge --template bridge

cd cross-chain-bridge

# Deploy bridge contracts
switchboard deploy --networks ethereum,polygon,arbitrum,optimism \
  --gas-price 20000000000 \
  --confirmations 3

# Monitor bridge health
switchboard monitor --interval 10
```

## Advanced Features

### Custom Templates

Create custom project templates for specific use cases:

```bash
# Create template
switchboard template create my-template --from ./template-source

# Use custom template
switchboard init my-project --template my-template

# List available templates
switchboard template list
```

### Scripting & Automation

Use Switchboard CLI in scripts and CI/CD pipelines:

```bash
#!/bin/bash
# Automated deployment script

# Deploy to testnet first
switchboard deploy --networks sepolia,mumbai --dry-run

# If successful, deploy to mainnet
if [ $? -eq 0 ]; then
    switchboard deploy --networks ethereum,polygon --verify
fi

# Send notification
switchboard status --json | jq '.deployments[] | select(.status=="success")'
```

### Environment-Specific Configuration

```bash
# Development environment
export CHAINSYNC_ENV=development
switchboard deploy --networks sepolia,mumbai

# Production environment
export CHAINSYNC_ENV=production
switchboard deploy --networks ethereum,polygon
```

## Troubleshooting

### Common Issues

1. **RPC Connection Errors**
   ```bash
   # Test network connectivity
   switchboard networks --test ethereum

   # Use alternative RPC
   switchboard config set ethereum.rpcUrl https://alternative-rpc.com
   ```

2. **Gas Estimation Failures**
   ```bash
   # Set manual gas price
   switchboard deploy --gas-price 20000000000

   # Enable gas optimization
   switchboard config set global.gasOptimization true
   ```

3. **Contract Verification Issues**
   ```bash
   # Skip verification temporarily
   switchboard deploy --no-verify

   # Verify manually later
   switchboard verify --contract MyContract --network ethereum
   ```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Enable debug mode
export DEBUG=switchboard:*

# Run command with debug output
switchboard deploy --networks ethereum --verbose
```

## Integration with SDK

The CLI works seamlessly with the Switchboard SDK:

```typescript
import { Switchboard } from '@switchboard/sdk';

// Load configuration from CLI project
const config = require('./switchboard.config.js');

const switchboard = new Switchboard(config.networks);

// Use SDK for programmatic operations
const deployment = await switchboard.deployContract({
  bytecode: contractBytecode,
  chains: ['ethereum', 'polygon']
});
```

## Contributing

See [Contributing Guide](../development/contributing.md) for information on contributing to the CLI.

## Support

- [GitHub Issues](https://github.com/switchboard/switchboard/issues)
- [Discord Community](https://discord.gg/switchboard)
- [Documentation](https://docs.switchboard.network)