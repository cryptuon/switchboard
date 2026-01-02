# First Deployment

This guide walks you through deploying your first cross-chain application with ChainSync.

## Prerequisites

Before starting, ensure you have:

- [x] Installed ChainSync CLI (`npm install -g @chainsync/cli`)
- [x] Node.js 18+ installed
- [x] Test tokens for target networks (see [Quick Start](quickstart.md#step-4-get-test-tokens))

## Step 1: Initialize Your Project

### Using a Template

ChainSync provides templates for common use cases:

```bash
# Simple token deployment
chainsync init my-token --template token --dev-mode

# DeFi protocol
chainsync init my-defi --template defi --dev-mode

# NFT collection
chainsync init my-nft --template nft --dev-mode

# Cross-chain bridge
chainsync init my-bridge --template bridge --dev-mode
```

### Interactive Initialization

For more control, use interactive mode:

```bash
chainsync init
# Follow the prompts to configure your project
```

## Step 2: Configure Your Project

### Environment Setup

```bash
cd my-token
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Solana coordination layer
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_solana_private_key

# EVM Networks
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
ARBITRUM_RPC_URL=https://goerli-rollup.arbitrum.io/rpc

# Your wallet private key (test key only!)
PRIVATE_KEY=your_test_private_key
```

### ChainSync Configuration

Review `chainsync.config.js`:

```javascript
module.exports = {
  // Development mode uses testnets
  mode: 'development',

  // Target networks
  networks: {
    sepolia: {
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY]
    },
    mumbai: {
      rpcUrl: process.env.POLYGON_RPC_URL,
      chainId: 80001,
      accounts: [process.env.PRIVATE_KEY]
    },
    fuji: {
      rpcUrl: process.env.AVALANCHE_RPC_URL,
      chainId: 43113,
      accounts: [process.env.PRIVATE_KEY]
    }
  },

  // Solana coordination
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
    commitment: 'confirmed'
  },

  // Deployment settings
  deployment: {
    gasOptimization: true,
    verification: true,
    confirmations: 2
  }
};
```

## Step 3: Write Your Contract

For a simple token, edit `contracts/evm/Token.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") {
        _mint(msg.sender, initialSupply);
    }
}
```

## Step 4: Test Locally

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration
```

## Step 5: Deploy to Testnets

### Validate Configuration

```bash
# Check configuration is valid
chainsync validate

# Verify network connectivity
chainsync health
```

### Deploy

```bash
# Deploy to all configured testnets
chainsync deploy --dev-mode

# Or deploy to specific networks
chainsync deploy --networks sepolia,mumbai
```

### Monitor Deployment

```bash
# Check status
chainsync status

# Real-time monitoring
chainsync status --watch

# View logs
chainsync logs --deployment-id <ID>
```

## Step 6: Verify Deployment

### Check Contract Addresses

```bash
# List deployed contracts
chainsync contracts list

# Get contract details
chainsync contracts info --contract MyToken
```

### Verify on Block Explorers

```bash
# Verify contract source code
chainsync verify --contract MyToken --network sepolia
```

## Step 7: Interact with Your Contracts

### Using the CLI

```bash
# Call contract function
chainsync call --contract MyToken --method balanceOf --args "0xYourAddress" --network sepolia
```

### Using the SDK

```javascript
import { ChainSync } from '@chainsync/sdk';

const chainSync = new ChainSync({
  solana: { rpcUrl: process.env.SOLANA_RPC_URL }
});

// Get token balance across chains
const balances = await chainSync.getBalances('MyToken', '0xYourAddress');
console.log(balances);
```

## Understanding Cross-Chain Sync

When you deploy with ChainSync, your contracts are synchronized across chains:

1. **Deployment** - Contracts deployed to each target chain
2. **Registration** - Contract addresses registered on Solana coordination layer
3. **State Sync** - Initial state synchronized across chains
4. **Monitoring** - Continuous state verification (< 400ms latency)

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Sepolia  │    │  Mumbai  │    │  Fuji    │
│ Contract │    │ Contract │    │ Contract │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     └───────────────┼───────────────┘
                     │
              ┌──────┴──────┐
              │   Solana    │
              │ Coordinator │
              └─────────────┘
```

## Next Steps

- [Architecture Overview](../architecture/index.md) - Understand how ChainSync works
- [SDK Documentation](../sdk/index.md) - Build applications with the SDK
- [Examples](../examples/index.md) - See more deployment examples

## Production Checklist

Before deploying to production:

- [ ] Complete testing on testnets
- [ ] Audit smart contracts
- [ ] Configure mainnet RPC URLs
- [ ] Set up monitoring and alerts
- [ ] Review gas price strategies
- [ ] Enable contract verification

See [Production Deployment](../deployment/production.md) for detailed guidance.
