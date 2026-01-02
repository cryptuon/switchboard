# Examples

Practical examples and templates for common cross-chain use cases.

## Available Examples

| Example | Description | Complexity |
|---------|-------------|------------|
| [Token Deployment](token.md) | Deploy ERC20 tokens across chains | Beginner |
| [DeFi Protocol](defi.md) | Cross-chain DeFi with liquidity pools | Intermediate |
| [NFT Collection](nft.md) | Multi-chain NFT collection | Intermediate |

## Quick Start Templates

Use templates to quickly scaffold projects:

```bash
# Token deployment
chainsync init my-token --template token --dev-mode

# DeFi protocol
chainsync init my-defi --template defi --dev-mode

# NFT collection
chainsync init my-nft --template nft --dev-mode

# Cross-chain bridge
chainsync init my-bridge --template bridge --dev-mode

# GameFi platform
chainsync init my-game --template gamefi --dev-mode
```

## Project Structure

All templates follow this structure:

```
my-project/
├── chainsync.config.js     # ChainSync configuration
├── contracts/              # Smart contracts
│   ├── evm/               # Solidity contracts
│   ├── near/              # NEAR contracts
│   ├── sui/               # Move contracts
│   └── cosmos/            # CosmWasm contracts
├── scripts/               # Deployment scripts
│   ├── deploy.js
│   └── verify.js
├── tests/                 # Test suites
│   ├── unit/
│   └── integration/
├── .env.example           # Environment template
└── package.json
```

## Common Patterns

### Multi-Chain Deploy Script

```javascript
// scripts/deploy.js
import { ChainSync } from '@chainsync/sdk';
import artifact from '../artifacts/MyContract.json';

async function main() {
  const chainSync = new ChainSync({
    solana: { rpcUrl: process.env.SOLANA_RPC_URL },
    networks: {
      ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL,
        privateKey: process.env.PRIVATE_KEY,
      },
      polygon: {
        rpcUrl: process.env.POLYGON_RPC_URL,
        privateKey: process.env.PRIVATE_KEY,
      },
    },
  });

  const deployment = await chainSync.deployContract({
    name: 'MyContract',
    bytecode: artifact.bytecode,
    abi: artifact.abi,
    constructorArgs: [],
    chains: ['ethereum', 'polygon'],
  });

  console.log('Deployment ID:', deployment.id);
  console.log('Addresses:', deployment.addresses);
}

main().catch(console.error);
```

### State Monitoring

```javascript
// scripts/monitor.js
import { ChainSync } from '@chainsync/sdk';

async function main() {
  const chainSync = new ChainSync({
    solana: { rpcUrl: process.env.SOLANA_RPC_URL },
  });

  const contractAddress = '0x...';

  // Subscribe to state changes
  chainSync.onStateChange(contractAddress, (event) => {
    console.log(`Chain: ${event.chain}`);
    console.log(`State: ${event.stateHash}`);
    console.log(`Latency: ${event.latency}ms`);
  });

  console.log('Monitoring state changes...');
}

main().catch(console.error);
```

### Fee Estimation

```javascript
// scripts/estimate.js
import { ChainSync } from '@chainsync/sdk';

async function main() {
  const chainSync = new ChainSync({
    solana: { rpcUrl: process.env.SOLANA_RPC_URL },
  });

  const fees = await chainSync.estimateFees({
    bytecodeSize: 5000,
    chains: ['ethereum', 'polygon', 'arbitrum'],
  });

  console.log('Fee Estimates:');
  for (const [chain, estimate] of Object.entries(fees.byChain)) {
    console.log(`  ${chain}: $${estimate.costUsd.toFixed(2)}`);
  }
  console.log(`Total: $${fees.totalUsd.toFixed(2)}`);
}

main().catch(console.error);
```

## Running Examples

### Prerequisites

1. Clone the repository
2. Install dependencies
3. Configure environment

```bash
git clone https://github.com/chainsync/examples
cd examples/token-deployment

npm install
cp .env.example .env
# Edit .env with your configuration
```

### Run Tests

```bash
npm test
```

### Deploy to Testnets

```bash
npm run deploy:testnet
```

### Deploy to Mainnets

```bash
npm run deploy:mainnet
```

## Next Steps

- [Token Deployment](token.md) - Start with a simple token
- [DeFi Protocol](defi.md) - Build cross-chain DeFi
- [NFT Collection](nft.md) - Launch NFTs across chains
