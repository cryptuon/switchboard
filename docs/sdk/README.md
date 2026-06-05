# Switchboard SDK Documentation

## Overview

The Switchboard SDK provides a unified interface for cross-chain development, enabling developers to deploy contracts and track transactions across multiple blockchain networks with minimal code changes.

## Installation

```bash
npm install @switchboard/sdk
```

## Quick Start

```typescript
import { Switchboard } from '@switchboard/sdk';

const switchboard = new Switchboard({
  solanaRpcUrl: 'https://api.devnet.solana.com',
  ethereumRpcUrl: 'https://eth-goerli.g.alchemy.com/v2/your-key',
  polygonRpcUrl: 'https://polygon-mumbai.g.alchemy.com/v2/your-key'
});
```

## API Reference

### Switchboard Class

#### Constructor

```typescript
new Switchboard(config: ChainSyncConfig)
```

**Parameters:**
- `config`: Configuration object containing RPC URLs for supported chains

**Example:**
```typescript
const config = {
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
  ethereumRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-key',
  polygonRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/your-key',
  arbitrumRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/your-key',
  apiKey: 'your-api-key' // Optional for billing tracking
};
```

#### Methods

##### deployContract()

Deploy a contract across multiple blockchain networks.

```typescript
async deployContract(options: {
  bytecode: string;
  chains: string[];
  value?: number;
}): Promise<{
  id: string;
  status: string;
  estimatedFee?: number;
  deployments: ChainDeployment[];
}>
```

**Parameters:**
- `bytecode`: Compiled contract bytecode (hex string)
- `chains`: Array of target chain names ('ethereum', 'polygon', 'arbitrum', etc.)
- `value`: Optional transaction value for fee calculation

**Returns:**
- `id`: Unique deployment identifier
- `status`: Current deployment status
- `estimatedFee`: Calculated fee in wei
- `deployments`: Array of per-chain deployment information

**Example:**
```typescript
const deployment = await switchboard.deployContract({
  bytecode: '0x608060405234801561001057600080fd5b50...',
  chains: ['ethereum', 'polygon'],
  value: 1000000 // 1M wei
});

console.log(`Deployment ID: ${deployment.id}`);
console.log(`Estimated fee: ${deployment.estimatedFee} wei`);
```

##### trackTransaction()

Track the status of a cross-chain transaction or deployment.

```typescript
async trackTransaction(transactionId: string): Promise<TransactionStatus>
```

**Parameters:**
- `transactionId`: Transaction or deployment ID to track

**Returns:**
- `TransactionStatus` object with current status and chain states

**Example:**
```typescript
const status = await switchboard.trackTransaction('deploy_1234567890_abc123');

console.log(`Status: ${status.status}`);
console.log(`Confirmations: ${status.confirmations}`);
status.chainStates.forEach(state => {
  console.log(`${state.chainName}: ${state.status} at block ${state.blockNumber}`);
});
```

## Supported Chains

| Chain | Chain ID | Network Name |
|-------|----------|--------------|
| Ethereum | 1 | ethereum |
| Polygon | 137 | polygon |
| Arbitrum | 42161 | arbitrum |
| Optimism | 10 | optimism |
| BSC | 56 | bsc |
| Avalanche | 43114 | avalanche |

## Types

### ChainSyncConfig

```typescript
interface ChainSyncConfig {
  solanaRpcUrl: string;
  apiKey?: string;
  ethereumRpcUrl?: string;
  polygonRpcUrl?: string;
  arbitrumRpcUrl?: string;
}
```

### ChainDeployment

```typescript
interface ChainDeployment {
  chainId: number;
  chainName: string;
  contractAddress: string;
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  deployedAt: string;
  error?: string;
}
```

### TransactionStatus

```typescript
interface TransactionStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'error';
  chainStates: ChainState[];
  confirmations: number;
  errors: string[];
  lastUpdated: string;
}
```

### ChainState

```typescript
interface ChainState {
  chainId: number;
  chainName: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber: number;
}
```

## Error Handling

The SDK provides comprehensive error handling for common scenarios:

```typescript
try {
  const deployment = await switchboard.deployContract({
    bytecode: '0xinvalid',
    chains: ['ethereum']
  });
} catch (error) {
  if (error.message.includes('Bytecode is required')) {
    console.error('Invalid bytecode provided');
  } else if (error.message.includes('At least one target chain')) {
    console.error('No target chains specified');
  } else {
    console.error('Deployment failed:', error.message);
  }
}
```

## Fee Calculation

Switchboard uses a standard fee structure:

- **Base fee rate**: 0.04% (4 basis points)
- **Multi-chain multiplier**: Fee calculated per target chain
- **Minimum fee**: 1000 wei per chain

**Example calculation:**
```typescript
// For a 1 ETH transaction across 3 chains:
// Base value: 1,000,000,000,000,000,000 wei
// Fee per chain: (1e18 * 4) / 10000 = 4e14 wei
// Total fee: 4e14 * 3 = 1.2e15 wei (0.0012 ETH)
```

## Best Practices

### 1. Environment Configuration

```typescript
// Use environment variables for RPC URLs
const switchboard = new Switchboard({
  solanaRpcUrl: process.env.SOLANA_RPC_URL,
  ethereumRpcUrl: process.env.ETHEREUM_RPC_URL,
  polygonRpcUrl: process.env.POLYGON_RPC_URL,
  apiKey: process.env.CHAINSYNC_API_KEY
});
```

### 2. Error Handling

```typescript
// Always wrap async calls in try-catch
try {
  const result = await switchboard.deployContract(options);
  // Handle success
} catch (error) {
  // Handle specific error types
  console.error('Operation failed:', error.message);
}
```

### 3. Status Polling

```typescript
// Poll for transaction status updates
async function waitForConfirmation(transactionId: string) {
  let status = await switchboard.trackTransaction(transactionId);

  while (status.status === 'pending') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    status = await switchboard.trackTransaction(transactionId);
  }

  return status;
}
```

### 4. Batch Operations

```typescript
// Deploy to multiple chains efficiently
const chains = ['ethereum', 'polygon', 'arbitrum'];
const deployment = await switchboard.deployContract({
  bytecode: contractBytecode,
  chains: chains
});

// Track all deployments
for (const chainDeployment of deployment.deployments) {
  console.log(`${chainDeployment.chainName}: ${chainDeployment.status}`);
}
```

## Examples

### Complete Deployment Flow

```typescript
import { Switchboard } from '@switchboard/sdk';

async function deployAndTrack() {
  const switchboard = new Switchboard({
    solanaRpcUrl: process.env.SOLANA_RPC_URL!,
    ethereumRpcUrl: process.env.ETHEREUM_RPC_URL!,
    polygonRpcUrl: process.env.POLYGON_RPC_URL!
  });

  try {
    // Deploy contract
    const deployment = await switchboard.deployContract({
      bytecode: '0x608060405234801561001057600080fd5b50...',
      chains: ['ethereum', 'polygon'],
      value: 1000000
    });

    console.log(`Deployment started: ${deployment.id}`);
    console.log(`Estimated fee: ${deployment.estimatedFee} wei`);

    // Track status
    let status = await switchboard.trackTransaction(deployment.id);
    console.log(`Initial status: ${status.status}`);

    // Wait for confirmation
    while (status.status === 'pending') {
      await new Promise(resolve => setTimeout(resolve, 10000));
      status = await switchboard.trackTransaction(deployment.id);

      console.log(`Status update: ${status.status}`);
      status.chainStates.forEach(chain => {
        console.log(`  ${chain.chainName}: ${chain.status}`);
      });
    }

    console.log('Deployment completed!');
    return status;

  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}

// Run the deployment
deployAndTrack()
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```

## Advanced Usage

### Custom Fee Calculation

```typescript
// Access the internal fee calculation method
const switchboard = new Switchboard(config);
const customFee = switchboard['calculateFee'](2000000); // 2M wei
console.log(`Custom fee: ${customFee} wei`);
```

### Chain ID Mapping

```typescript
// Get chain ID for a chain name
const switchboard = new Switchboard(config);
const ethereumId = switchboard['getChainId']('ethereum'); // Returns 1
const polygonId = switchboard['getChainId']('polygon'); // Returns 137
```

## Troubleshooting

### Common Issues

1. **Invalid RPC URLs**: Ensure all RPC URLs are valid and accessible
2. **Network connectivity**: Check internet connection and firewall settings
3. **API rate limits**: Implement proper retry logic for rate-limited requests
4. **Insufficient gas**: Ensure adequate gas for contract deployment

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
export DEBUG=switchboard:*
```

### Support

- Documentation: [docs.switchboard.org](https://docs.switchboard.org)
- GitHub Issues: [github.com/your-org/switchboard/issues](https://github.com/your-org/switchboard/issues)
- Discord: [discord.gg/switchboard](https://discord.gg/switchboard)