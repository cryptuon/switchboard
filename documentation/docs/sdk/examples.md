# SDK Examples

Real-world examples of using the ChainSync SDK.

## Token Deployment

Deploy an ERC20 token across multiple chains.

```typescript
import { ChainSync } from '@chainsync/sdk';
import { readFileSync } from 'fs';

async function deployToken() {
  const chainSync = new ChainSync({
    solana: { rpcUrl: process.env.SOLANA_RPC_URL! },
    networks: {
      ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL!,
        privateKey: process.env.PRIVATE_KEY!,
      },
      polygon: {
        rpcUrl: process.env.POLYGON_RPC_URL!,
        privateKey: process.env.PRIVATE_KEY!,
      },
      arbitrum: {
        rpcUrl: process.env.ARBITRUM_RPC_URL!,
        privateKey: process.env.PRIVATE_KEY!,
      },
    },
  });

  // Load compiled contract
  const artifact = JSON.parse(
    readFileSync('./artifacts/MyToken.json', 'utf-8')
  );

  // Deploy across chains
  const deployment = await chainSync.deployContract({
    name: 'MyToken',
    bytecode: artifact.bytecode,
    abi: artifact.abi,
    constructorArgs: ['My Token', 'MTK', 1000000],
    chains: ['ethereum', 'polygon', 'arbitrum'],
    options: {
      verify: true,
      gasMultiplier: 1.2,
    },
  });

  console.log('Deployment ID:', deployment.id);

  // Wait for completion
  let status = await chainSync.trackDeployment(deployment.id);
  while (status.status !== 'completed' && status.status !== 'failed') {
    console.log(`Status: ${status.status}`);
    console.log(`Completed: ${status.completedChains.join(', ')}`);
    await new Promise((r) => setTimeout(r, 5000));
    status = await chainSync.trackDeployment(deployment.id);
  }

  console.log('Final addresses:', status.addresses);
}

deployToken();
```

## Real-time State Monitoring

Monitor state changes across chains in real-time.

```typescript
import { ChainSync } from '@chainsync/sdk';

async function monitorState() {
  const chainSync = new ChainSync({
    solana: { rpcUrl: process.env.SOLANA_RPC_URL! },
    networks: {
      ethereum: { rpcUrl: process.env.ETHEREUM_RPC_URL! },
      polygon: { rpcUrl: process.env.POLYGON_RPC_URL! },
    },
  });

  const contractAddress = '0x...'; // Your deployed contract

  // Subscribe to state changes
  const unsubscribe = chainSync.onStateChange(contractAddress, (event) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Chain: ${event.chain}`);
    console.log(`State Hash: ${event.stateHash}`);
    console.log(`Block: ${event.blockNumber}`);
    console.log(`Latency: ${event.latency}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });

  // Handle conflicts
  chainSync.onConflict((conflict) => {
    console.error('⚠️ STATE CONFLICT DETECTED');
    console.error(`Type: ${conflict.type}`);
    console.error(`Chains: ${conflict.chains.join(', ')}`);

    // Auto-resolve using source of truth
    chainSync.resolveConflict(conflict.id, {
      strategy: 'use_source_of_truth',
      sourceChain: 'ethereum',
    });
  });

  // Keep running
  console.log('Monitoring state changes... Press Ctrl+C to stop');
  process.on('SIGINT', () => {
    unsubscribe();
    process.exit();
  });
}

monitorState();
```

## Fee Estimation

Estimate deployment costs before executing.

```typescript
import { ChainSync } from '@chainsync/sdk';

async function estimateCosts() {
  const chainSync = new ChainSync({
    solana: { rpcUrl: process.env.SOLANA_RPC_URL! },
    networks: {
      ethereum: { rpcUrl: process.env.ETHEREUM_RPC_URL! },
      polygon: { rpcUrl: process.env.POLYGON_RPC_URL! },
      arbitrum: { rpcUrl: process.env.ARBITRUM_RPC_URL! },
      optimism: { rpcUrl: process.env.OPTIMISM_RPC_URL! },
    },
  });

  // Estimate fees for deployment
  const fees = await chainSync.estimateFees({
    bytecodeSize: 5000, // bytes
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
  });

  console.log('\n📊 Fee Estimation Report');
  console.log('═══════════════════════════════════════');

  for (const [chain, estimate] of Object.entries(fees.byChain)) {
    console.log(`\n${chain.toUpperCase()}`);
    console.log(`  Gas Estimate: ${estimate.gasEstimate.toLocaleString()}`);
    console.log(`  Gas Price: ${estimate.gasPriceGwei} gwei`);
    console.log(`  Cost: ${estimate.costNative} ${chain === 'ethereum' ? 'ETH' : 'Native'}`);
    console.log(`  USD: $${estimate.costUsd.toFixed(2)}`);
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`TOTAL: $${fees.totalUsd.toFixed(2)} USD`);
}

estimateCosts();
```

## Cross-Chain Transaction Tracking

Track transactions across multiple chains.

```typescript
import { ChainSync } from '@chainsync/sdk';

async function trackCrossChainTx() {
  const chainSync = new ChainSync({
    solana: { rpcUrl: process.env.SOLANA_RPC_URL! },
    networks: {
      ethereum: { rpcUrl: process.env.ETHEREUM_RPC_URL! },
      polygon: { rpcUrl: process.env.POLYGON_RPC_URL! },
    },
  });

  // Track a transaction
  const txStatus = await chainSync.trackTransaction({
    hash: '0x...',
    chain: 'ethereum',
  });

  console.log('Transaction Status:', txStatus);

  // Get cross-chain history for an address
  const history = await chainSync.getTransactionHistory({
    address: '0x...',
    chains: ['ethereum', 'polygon', 'arbitrum'],
    limit: 10,
  });

  console.log('\nRecent Transactions:');
  for (const tx of history.transactions) {
    console.log(`${tx.chain}: ${tx.hash} - ${tx.status}`);
  }
}

trackCrossChainTx();
```

## Express.js API Integration

Build an API service with ChainSync.

```typescript
import express from 'express';
import { ChainSync } from '@chainsync/sdk';

const app = express();
app.use(express.json());

const chainSync = new ChainSync({
  solana: { rpcUrl: process.env.SOLANA_RPC_URL! },
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

// Deploy endpoint
app.post('/deploy', async (req, res) => {
  try {
    const { name, bytecode, abi, args, chains } = req.body;

    const deployment = await chainSync.deployContract({
      name,
      bytecode,
      abi,
      constructorArgs: args,
      chains,
    });

    res.json({ success: true, deployment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Status endpoint
app.get('/deploy/:id', async (req, res) => {
  try {
    const status = await chainSync.trackDeployment(req.params.id);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Estimate fees
app.post('/estimate', async (req, res) => {
  try {
    const { bytecodeSize, chains } = req.body;
    const fees = await chainSync.estimateFees({ bytecodeSize, chains });
    res.json({ success: true, fees });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log('ChainSync API running on port 3000');
});
```

## Error Handling Pattern

Robust error handling for production applications.

```typescript
import {
  ChainSync,
  NetworkError,
  DeploymentError,
  ValidationError,
  TimeoutError,
} from '@chainsync/sdk';

async function robustDeployment() {
  const chainSync = new ChainSync({
    solana: { rpcUrl: process.env.SOLANA_RPC_URL! },
    networks: {
      ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL!,
        privateKey: process.env.PRIVATE_KEY!,
      },
    },
    options: {
      retries: 3,
      retryDelay: 2000,
      timeout: 60000,
    },
  });

  try {
    const deployment = await chainSync.deployContract({
      name: 'MyContract',
      bytecode: '0x...',
      abi: [],
      chains: ['ethereum', 'polygon'],
    });

    return deployment;
  } catch (error) {
    if (error instanceof NetworkError) {
      console.error(`Network error on ${error.chain}:`);
      console.error(`  Message: ${error.message}`);
      console.error(`  Code: ${error.code}`);
      // Retry with backup RPC
    } else if (error instanceof DeploymentError) {
      console.error('Deployment failed:');
      console.error(`  Failed chains: ${error.failedChains.join(', ')}`);
      console.error(`  Errors: ${JSON.stringify(error.errors)}`);
      // Partial deployment - handle completed chains
    } else if (error instanceof ValidationError) {
      console.error('Invalid configuration:');
      console.error(`  Field: ${error.field}`);
      console.error(`  Message: ${error.message}`);
      // Fix configuration
    } else if (error instanceof TimeoutError) {
      console.error('Operation timed out');
      // Check status and retry
    } else {
      throw error;
    }
  }
}

robustDeployment();
```

## Next Steps

- [API Reference](../api/index.md) - REST API documentation
- [Deployment Guide](../deployment/index.md) - Production deployment
- [Configuration](../configuration/index.md) - Advanced configuration
