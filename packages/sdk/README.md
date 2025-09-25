# ChainSync SDK

The ChainSync SDK provides developers with a unified interface for building cross-chain applications. With the SDK, you can write code once and deploy everywhere, achieving 90% code reuse across all supported chains.

## Features

- **Unified API**: Single interface for cross-chain interactions
- **Universal Transaction IDs**: Track transactions across all chains with a single ID
- **Cryptographic Proofs**: Verify cross-chain consistency with cryptographic proofs
- **Real-time Analytics**: Monitor cross-chain activity in real-time
- **50+ Network Support**: Support for EVM, NEAR, Sui, Aptos, Cosmos and more

## Installation

```bash
npm install @chainsync/sdk
```

## CLI Tool

ChainSync includes a powerful CLI for quick project setup and management:

```bash
# Install globally
npm install -g @chainsync/cli

# Initialize a new cross-chain project
chainsync init my-project

# Deploy to multiple networks
chainsync deploy --networks ethereum,polygon,arbitrum

# Check system status
chainsync status

# Explore supported networks
chainsync networks --category evm
```

## Quick Start with SDK

```typescript
import { ChainSync } from '@chainsync/sdk';

// Initialize with 50+ network support
const chainSync = new ChainSync({
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
  ethereumRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-key',
  polygonRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/your-key',
  arbitrumRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/your-key',
  nearRpcUrl: 'https://rpc.mainnet.near.org',
  suiRpcUrl: 'https://fullnode.mainnet.sui.io:443'
  // ... configure any of 50+ supported networks
});

// Deploy across multiple blockchain ecosystems
const deployment = await chainSync.deployContract({
  bytecode: contractBytecode,
  chains: ['ethereum', 'polygon', 'near', 'sui', 'cosmos'],
  options: {
    gasOptimization: true,
    verificationEnabled: true
  }
});

console.log('Universal Deployment ID:', deployment.id);
console.log('Network Deployments:', deployment.networkDeployments);

// Real-time cross-chain tracking
const transaction = await chainSync.trackTransaction(deployment.id);
console.log('Cross-chain status:', transaction.status);
console.log('Verification proofs:', transaction.proofs);
```

## Network Categories

ChainSync supports networks across all major blockchain ecosystems:

### EVM Compatible (40+ networks)
```typescript
// Configure EVM networks
const config = {
  ethereumRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/key',
  polygonRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/key',
  arbitrumRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/key',
  optimismRpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/key',
  bscRpcUrl: 'https://bsc-dataseed.binance.org/',
  avalancheRpcUrl: 'https://api.avax.network/ext/bc/C/rpc'
  // ... 30+ more EVM networks
};
```

### Alternative Layer 1s
```typescript
// Non-EVM blockchain support
const config = {
  nearRpcUrl: 'https://rpc.mainnet.near.org',
  cosmosRpcUrl: 'https://cosmos-rpc.polkachu.com',
  suiRpcUrl: 'https://fullnode.mainnet.sui.io:443',
  aptosRpcUrl: 'https://fullnode.mainnet.aptoslabs.com/v1'
};
```

### Layer 2 Solutions
```typescript
// L2 and scaling solutions
const config = {
  baseRpcUrl: 'https://base-mainnet.g.alchemy.com/v2/key',
  zksyncRpcUrl: 'https://mainnet.era.zksync.io',
  lineaRpcUrl: 'https://rpc.linea.build',
  scrollRpcUrl: 'https://rpc.scroll.io'
};
```

## CLI Integration Examples

### Project Initialization
```bash
# Create new project with multiple networks
chainsync init my-dapp
cd my-dapp

# The CLI will generate:
# - Multi-network configuration
# - Example contracts for each ecosystem
# - Deployment scripts
# - Testing framework setup
```

### Cross-Chain Deployment
```bash
# Deploy to specific networks
chainsync deploy --networks ethereum,polygon,arbitrum

# Deploy to network categories
chainsync deploy --category evm --exclude mainnet

# Deploy with custom configuration
chainsync deploy --config custom-networks.json
```

### Network Management
```bash
# List all supported networks
chainsync networks

# Filter by ecosystem
chainsync networks --type evm
chainsync networks --type alt-l1

# Get network details
chainsync networks --info ethereum
chainsync networks --info near
```

### System Monitoring
```bash
# Check overall system health
chainsync status

# Monitor specific chains
chainsync status --chains ethereum,polygon,near

# Real-time monitoring
chainsync monitor --interval 30
```

## Advanced Features

### Cryptographic Verification
```typescript
// Enable cross-chain verification
const deployment = await chainSync.deployContract({
  bytecode: contractBytecode,
  chains: ['ethereum', 'polygon'],
  verification: {
    enabled: true,
    merkleProofs: true,
    stateSnapshots: true
  }
});

// Verify cross-chain state consistency
const verification = await chainSync.verifyState(deployment.id);
console.log('State consistency:', verification.isConsistent);
console.log('Merkle proof:', verification.merkleProof);
```

### Fee Optimization
```typescript
// Optimize deployment costs across networks
const deployment = await chainSync.deployContract({
  bytecode: contractBytecode,
  chains: ['ethereum', 'polygon', 'arbitrum'],
  feeOptimization: {
    strategy: 'minimize_total_cost',
    maxGasPrice: {
      ethereum: '50000000000', // 50 gwei
      polygon: '100000000000', // 100 gwei
      arbitrum: '1000000000' // 1 gwei
    }
  }
});
```

### Real-time Analytics
```typescript
// Monitor cross-chain activity
const analytics = chainSync.getAnalytics();

analytics.on('deployment', (event) => {
  console.log('New deployment:', event.id);
  console.log('Networks:', event.networks);
});

analytics.on('transaction', (event) => {
  console.log('Transaction update:', event.status);
  console.log('Network:', event.network);
});
```

## Documentation

- [Complete API Reference](../../docs/api/README.md)
- [CLI Documentation](../../docs/cli/README.md)
- [Supported Networks](../../docs/supported-chains.md)
- [Architecture Guide](../../docs/architecture/core-system-architecture.md)
- [Examples](./examples/)
- [Contributing](../../docs/development/contributing.md)

## License

MIT