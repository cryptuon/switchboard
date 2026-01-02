# SDK Installation

## Install the Package

=== "npm"

    ```bash
    npm install @chainsync/sdk
    ```

=== "yarn"

    ```bash
    yarn add @chainsync/sdk
    ```

=== "pnpm"

    ```bash
    pnpm add @chainsync/sdk
    ```

## Basic Setup

### TypeScript

```typescript
import { ChainSync } from '@chainsync/sdk';

const chainSync = new ChainSync({
  // Solana coordination layer
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL!,
    keypairPath: process.env.SOLANA_KEYPAIR_PATH,
  },

  // Target networks
  networks: {
    ethereum: {
      rpcUrl: process.env.ETHEREUM_RPC_URL!,
      privateKey: process.env.PRIVATE_KEY!,
    },
    polygon: {
      rpcUrl: process.env.POLYGON_RPC_URL!,
      privateKey: process.env.PRIVATE_KEY!,
    },
  },
});
```

### JavaScript (CommonJS)

```javascript
const { ChainSync } = require('@chainsync/sdk');

const chainSync = new ChainSync({
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
  },
  networks: {
    ethereum: {
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      privateKey: process.env.PRIVATE_KEY,
    },
  },
});
```

## Configuration Options

### Full Configuration

```typescript
import { ChainSync, ChainSyncConfig } from '@chainsync/sdk';

const config: ChainSyncConfig = {
  // Solana configuration
  solana: {
    rpcUrl: 'https://api.devnet.solana.com',
    keypairPath: '/path/to/keypair.json',
    commitment: 'confirmed',
  },

  // Network configurations
  networks: {
    ethereum: {
      rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/KEY',
      privateKey: '0x...',
      chainId: 11155111,
    },
    polygon: {
      rpcUrl: 'https://polygon-mumbai.g.alchemy.com/v2/KEY',
      privateKey: '0x...',
      chainId: 80001,
    },
    arbitrum: {
      rpcUrl: 'https://arb-goerli.g.alchemy.com/v2/KEY',
      privateKey: '0x...',
      chainId: 421613,
    },
  },

  // Optional settings
  options: {
    // Retry configuration
    retries: 3,
    retryDelay: 1000,

    // Timeout settings
    timeout: 30000,

    // Logging
    logLevel: 'info',

    // Gas settings
    gasMultiplier: 1.2,
    maxGasPrice: '100000000000', // 100 gwei
  },
};

const chainSync = new ChainSync(config);
```

### Environment Variables

Create a `.env` file:

```bash
# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_KEYPAIR_PATH=/path/to/keypair.json

# EVM Networks
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-goerli.g.alchemy.com/v2/YOUR_KEY

# Wallet
PRIVATE_KEY=0x...
```

Load with dotenv:

```typescript
import 'dotenv/config';
import { ChainSync } from '@chainsync/sdk';

const chainSync = new ChainSync({
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL!,
  },
  networks: {
    ethereum: {
      rpcUrl: process.env.ETHEREUM_RPC_URL!,
      privateKey: process.env.PRIVATE_KEY!,
    },
  },
});
```

## Verifying Installation

```typescript
import { ChainSync } from '@chainsync/sdk';

async function verify() {
  const chainSync = new ChainSync({
    solana: {
      rpcUrl: 'https://api.devnet.solana.com',
    },
  });

  // Check connection
  const status = await chainSync.getStatus();
  console.log('ChainSync Status:', status);

  // List supported chains
  const chains = await chainSync.getSupportedChains();
  console.log('Supported Chains:', chains);
}

verify();
```

## Framework Integration

### Next.js

```typescript
// lib/chainsync.ts
import { ChainSync } from '@chainsync/sdk';

let chainSync: ChainSync | null = null;

export function getChainSync(): ChainSync {
  if (!chainSync) {
    chainSync = new ChainSync({
      solana: {
        rpcUrl: process.env.SOLANA_RPC_URL!,
      },
      networks: {
        ethereum: {
          rpcUrl: process.env.ETHEREUM_RPC_URL!,
          privateKey: process.env.PRIVATE_KEY!,
        },
      },
    });
  }
  return chainSync;
}
```

### Express.js

```typescript
import express from 'express';
import { ChainSync } from '@chainsync/sdk';

const app = express();

const chainSync = new ChainSync({
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL!,
  },
});

app.get('/deploy', async (req, res) => {
  const deployment = await chainSync.deployContract({
    // ... deployment config
  });
  res.json(deployment);
});
```

## TypeScript Configuration

For best results, use these TypeScript settings:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

## Troubleshooting

### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Type Errors

Ensure TypeScript 4.7+:

```bash
npm install typescript@latest --save-dev
```

### Connection Issues

Test RPC connectivity:

```typescript
const chainSync = new ChainSync({
  solana: {
    rpcUrl: 'https://api.devnet.solana.com',
  },
  options: {
    logLevel: 'debug', // Enable debug logging
  },
});
```

## Next Steps

- [Core Methods](core-methods.md) - Learn the API
- [Examples](examples.md) - See real-world usage
