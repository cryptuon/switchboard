# SDK Documentation

The Switchboard SDK provides a unified TypeScript/JavaScript interface for cross-chain development.

## Overview

The SDK enables you to:

- Deploy contracts across multiple chains with a single function call
- Monitor cross-chain state synchronization
- Track transactions across networks
- Calculate and optimize gas fees
- Subscribe to real-time events

## Key Features

| Feature | Description |
|---------|-------------|
| **Unified Interface** | Single API for 50+ blockchains |
| **Type Safety** | Full TypeScript support |
| **Real-time Events** | WebSocket-based event streaming |
| **Gas Optimization** | Automatic fee calculation |
| **Error Handling** | Comprehensive error types |

## Quick Example

```typescript
import { Switchboard } from '@switchboard/sdk';

// Initialize the SDK
const switchboard = new Switchboard({
  solana: {
    rpcUrl: 'https://api.devnet.solana.com',
  },
  networks: {
    ethereum: { rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/KEY' },
    polygon: { rpcUrl: 'https://polygon-mumbai.g.alchemy.com/v2/KEY' },
  },
});

// Deploy contract across chains
const deployment = await switchboard.deployContract({
  name: 'MyToken',
  bytecode: '0x...',
  abi: [...],
  constructorArgs: [1000000],
  chains: ['ethereum', 'polygon', 'arbitrum'],
});

// Track deployment status
const status = await switchboard.trackDeployment(deployment.id);
console.log(`Deployed to ${status.completedChains.length} chains`);

// Subscribe to state changes
switchboard.onStateChange(deployment.contractAddress, (event) => {
  console.log(`State updated on ${event.chain}`);
});
```

## Installation

```bash
npm install @switchboard/sdk
```

Or with yarn:

```bash
yarn add @switchboard/sdk
```

## Documentation Sections

- [Installation](installation.md) - Detailed setup instructions
- [Core Methods](core-methods.md) - API reference
- [Examples](examples.md) - Real-world usage examples

## Requirements

- Node.js 18+
- TypeScript 4.7+ (recommended)

## Next Steps

Start with the [Installation Guide](installation.md) to set up the SDK in your project.
