# SDK Installation

## Install the Package

=== "npm"

    ```bash
    npm install @switchboard/sdk
    ```

=== "yarn"

    ```bash
    yarn add @switchboard/sdk
    ```

=== "pnpm"

    ```bash
    pnpm add @switchboard/sdk
    ```

## Basic Setup

### TypeScript

```typescript
import { Switchboard } from '@switchboard/sdk';

const switchboard = new Switchboard({
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
const { Switchboard } = require('@switchboard/sdk');

const switchboard = new Switchboard({
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
import { Switchboard, ChainSyncConfig } from '@switchboard/sdk';

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

const switchboard = new Switchboard(config);
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
import { Switchboard } from '@switchboard/sdk';

const switchboard = new Switchboard({
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
import { Switchboard } from '@switchboard/sdk';

async function verify() {
  const switchboard = new Switchboard({
    solana: {
      rpcUrl: 'https://api.devnet.solana.com',
    },
  });

  // Check connection
  const status = await switchboard.getStatus();
  console.log('Switchboard Status:', status);

  // List supported chains
  const chains = await switchboard.getSupportedChains();
  console.log('Supported Chains:', chains);
}

verify();
```

## Framework Integration

### Next.js

```typescript
// lib/switchboard.ts
import { Switchboard } from '@switchboard/sdk';

let switchboard: Switchboard | null = null;

export function getSwitchboard(): Switchboard {
  if (!switchboard) {
    switchboard = new Switchboard({
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
  return switchboard;
}
```

### Express.js

```typescript
import express from 'express';
import { Switchboard } from '@switchboard/sdk';

const app = express();

const switchboard = new Switchboard({
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL!,
  },
});

app.get('/deploy', async (req, res) => {
  const deployment = await switchboard.deployContract({
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
const switchboard = new Switchboard({
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
