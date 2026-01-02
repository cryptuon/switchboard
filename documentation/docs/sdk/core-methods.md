# Core Methods

Complete API reference for the ChainSync SDK.

## Initialization

### Constructor

```typescript
const chainSync = new ChainSync(config: ChainSyncConfig);
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | `ChainSyncConfig` | Yes | Configuration object |

## Deployment Methods

### deployContract

Deploy a contract across multiple chains.

```typescript
const deployment = await chainSync.deployContract({
  name: 'MyToken',
  bytecode: '0x...',
  abi: [...],
  constructorArgs: [1000000],
  chains: ['ethereum', 'polygon', 'arbitrum'],
  options: {
    gasMultiplier: 1.2,
    verify: true,
  },
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Contract name |
| `bytecode` | `string` | Yes | Compiled bytecode |
| `abi` | `ABI[]` | Yes | Contract ABI |
| `constructorArgs` | `any[]` | No | Constructor arguments |
| `chains` | `string[]` | Yes | Target chains |
| `options` | `DeployOptions` | No | Deployment options |

**Returns:** `Promise<Deployment>`

```typescript
interface Deployment {
  id: string;
  name: string;
  chains: string[];
  addresses: Record<string, string>;
  status: 'pending' | 'deploying' | 'completed' | 'failed';
  createdAt: Date;
}
```

### trackDeployment

Track the status of a deployment.

```typescript
const status = await chainSync.trackDeployment(deploymentId);
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deploymentId` | `string` | Yes | Deployment ID |

**Returns:** `Promise<DeploymentStatus>`

```typescript
interface DeploymentStatus {
  id: string;
  status: 'pending' | 'deploying' | 'completed' | 'failed';
  completedChains: string[];
  pendingChains: string[];
  failedChains: string[];
  addresses: Record<string, string>;
  errors: Record<string, string>;
}
```

## Transaction Methods

### trackTransaction

Track a transaction across chains.

```typescript
const txStatus = await chainSync.trackTransaction({
  hash: '0x...',
  chain: 'ethereum',
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hash` | `string` | Yes | Transaction hash |
| `chain` | `string` | Yes | Chain name |

**Returns:** `Promise<TransactionStatus>`

### getTransactionHistory

Get transaction history for an address.

```typescript
const history = await chainSync.getTransactionHistory({
  address: '0x...',
  chains: ['ethereum', 'polygon'],
  limit: 100,
});
```

## State Methods

### getState

Get the current state of a contract.

```typescript
const state = await chainSync.getState({
  contractAddress: '0x...',
  chains: ['ethereum', 'polygon', 'arbitrum'],
});
```

**Returns:** `Promise<StateInfo>`

```typescript
interface StateInfo {
  contractAddress: string;
  states: Record<string, {
    chain: string;
    stateHash: string;
    blockNumber: number;
    timestamp: Date;
  }>;
  isConsistent: boolean;
}
```

### verifyState

Verify state consistency across chains.

```typescript
const isConsistent = await chainSync.verifyState({
  contractAddress: '0x...',
  chains: ['ethereum', 'polygon'],
});
```

**Returns:** `Promise<boolean>`

### registerState

Register a state on the Solana coordination layer.

```typescript
await chainSync.registerState({
  chainId: 1,
  contractAddress: '0x...',
  stateHash: '0x...',
});
```

## Event Methods

### onStateChange

Subscribe to state changes.

```typescript
const unsubscribe = chainSync.onStateChange(
  '0xContractAddress',
  (event) => {
    console.log(`State changed on ${event.chain}`);
    console.log(`New hash: ${event.stateHash}`);
    console.log(`Latency: ${event.latency}ms`);
  }
);

// Later, unsubscribe
unsubscribe();
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `contractAddress` | `string` | Contract to monitor |
| `callback` | `Function` | Event handler |

### onDeploymentUpdate

Subscribe to deployment updates.

```typescript
const unsubscribe = chainSync.onDeploymentUpdate(
  deploymentId,
  (update) => {
    console.log(`Deployment ${update.status}`);
    if (update.status === 'completed') {
      console.log('Addresses:', update.addresses);
    }
  }
);
```

### onConflict

Subscribe to state conflicts.

```typescript
chainSync.onConflict((conflict) => {
  console.log(`Conflict detected: ${conflict.type}`);
  console.log(`Affected chains: ${conflict.chains.join(', ')}`);
});
```

## Fee Methods

### estimateFees

Estimate deployment fees across chains.

```typescript
const fees = await chainSync.estimateFees({
  bytecodeSize: 5000,
  chains: ['ethereum', 'polygon', 'arbitrum'],
});
```

**Returns:** `Promise<FeeEstimate>`

```typescript
interface FeeEstimate {
  totalUsd: number;
  byChain: Record<string, {
    chain: string;
    gasEstimate: bigint;
    gasPriceGwei: number;
    costNative: string;
    costUsd: number;
  }>;
}
```

### getGasPrices

Get current gas prices for chains.

```typescript
const prices = await chainSync.getGasPrices(['ethereum', 'polygon']);
```

**Returns:** `Promise<Record<string, GasPrice>>`

## Utility Methods

### getSupportedChains

Get list of supported chains.

```typescript
const chains = await chainSync.getSupportedChains();
// ['ethereum', 'polygon', 'arbitrum', ...]
```

### getChainInfo

Get information about a specific chain.

```typescript
const info = await chainSync.getChainInfo('ethereum');
```

**Returns:** `Promise<ChainInfo>`

```typescript
interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  blockTime: number;
  isEvm: boolean;
  explorerUrl: string;
}
```

### getStatus

Get ChainSync service status.

```typescript
const status = await chainSync.getStatus();
```

**Returns:** `Promise<ServiceStatus>`

```typescript
interface ServiceStatus {
  healthy: boolean;
  solanaConnected: boolean;
  networksConnected: Record<string, boolean>;
  latency: number;
}
```

## Error Handling

The SDK throws typed errors for different scenarios:

```typescript
import {
  ChainSync,
  ChainSyncError,
  NetworkError,
  DeploymentError,
  ValidationError,
} from '@chainsync/sdk';

try {
  await chainSync.deployContract(config);
} catch (error) {
  if (error instanceof NetworkError) {
    console.log(`Network issue on ${error.chain}: ${error.message}`);
  } else if (error instanceof DeploymentError) {
    console.log(`Deployment failed: ${error.message}`);
    console.log(`Failed chains: ${error.failedChains}`);
  } else if (error instanceof ValidationError) {
    console.log(`Invalid config: ${error.message}`);
  } else {
    throw error;
  }
}
```

## Type Definitions

Full TypeScript definitions are included with the package. Key types:

```typescript
import type {
  ChainSyncConfig,
  Deployment,
  DeploymentStatus,
  TransactionStatus,
  StateInfo,
  FeeEstimate,
  ChainInfo,
  ServiceStatus,
} from '@chainsync/sdk';
```

## Next Steps

- [Examples](examples.md) - See real-world usage patterns
- [API Reference](../api/index.md) - REST API documentation
