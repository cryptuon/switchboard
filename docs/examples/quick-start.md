# Switchboard Quick Start Guide

Get up and running with Switchboard in under 5 minutes! This guide will walk you through deploying your first cross-chain contract.

## Prerequisites

- Node.js 18+ installed
- Basic knowledge of TypeScript/JavaScript
- Access to testnet RPC URLs (we'll use free public endpoints)

## Step 1: Installation

```bash
# Create a new project
mkdir my-switchboard-app
cd my-switchboard-app

# Initialize npm project
npm init -y

# Install Switchboard SDK
npm install @switchboard/sdk

# Install TypeScript (optional but recommended)
npm install -D typescript @types/node
npx tsc --init
```

## Step 2: Basic Setup

Create an `index.ts` file:

```typescript
import { Switchboard } from '@switchboard/sdk';

// Simple ERC20 token bytecode (pre-compiled)
const TOKEN_BYTECODE = '0x608060405234801561001057600080fd5b50620186a06000819055506000806000546000803373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055503373ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef600054604051620000b89190620001a4565b60405180910390a3620001c1565b6000819050919050565b620000dd81620000c8565b82525050565b6000602082019050620000fa6000830184620000d2565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806200014857607f821691505b6020821081036200015e576200015d62000100565b5b50919050565b60008190508160005260206000209050919050565b600081519050919050565b600082825260208201905092915050565b60006200019e8262000179565b620001aa818562000184565b9350620001bc81856020860162000164565b80840191505092915050565b600060208201905081810360008301526200020081620001a4565b905092915050565b610c1c80620002186000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c8063313ce56711610066578063313ce5671461013457806370a082311461015257806395d89b4114610182578063a9059cbb146101a0578063dd62ed3e146101d057610093565b806306fdde0314610098578063095ea7b3146100b657806318160ddd146100e657806323b872dd14610104575b600080fd5b6100a0610200565b6040516100ad9190610a0b565b60405180910390f35b6100d060048036038101906100cb9190610ac6565b610239565b6040516100dd9190610b21565b60405180910390f35b6100ee61032b565b6040516100fb9190610b4b565b60405180910390f35b61011e60048036038101906101199190610b66565b610331565b60405161012b9190610b21565b60405180910390f35b61013c610483565b6040516101499190610bd5565b60405180910390f35b61016c60048036038101906101679190610bf0565b610488565b6040516101799190610b4b565b60405180910390f35b61018a6104d0565b6040516101979190610a0b565b60405180910390f35b6101ba60048036038101906101b59190610ac6565b610509565b6040516101c79190610b21565b60405180910390f35b6101ea60048036038101906101e59190610c1d565b610603565b6040516101f79190610b4b565b60405180910390f35b60606040518060400160405280601281526020017f4368616953796e632054657374546f6b656e0000000000000000000000000000815250905090565b600081600560003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516103199190610b4b565b60405180910390a36001905092915050565b60005481565b6000600560008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205482111561038c57600080fd5b81600560008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461041a9190610c8c565b925050819055506104008484846106fa565b610474600560008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020548361096e565b6001905092915050565b601281565b6000600460008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b60606040518060400160405280600381526020017f4353540000000000000000000000000000000000000000000000000000000000815250905090565b6000600460003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205482111561055757600080fd5b81600460003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461058e9190610c8c565b925050819055508160046000856000015173ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461058e9190610cc0565b925050819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516105f19190610b4b565b60405180910390a36001905092915050565b6000600560008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905092915050565b6000600460008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205482111561074857600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036107af576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107a690610d66565b60405180910390fd5b81600460008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546107e69190610c8c565b925050819055508160046000856000015173ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546108419190610cc0565b925050819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516108a59190610b4b565b60405180910390a3505050565b600081519050919050565b600082825260208201905092915050565b60005b838110156108ec5780820151818401526020810190506108d1565b60008484015250505050565b6000601f19601f8301169050919050565b6000610914826108b2565b61091e81856108bd565b935061092e8185602086016108ce565b610937816108f8565b840191505092915050565b6000602082019050818103600083015261095c8184610909565b905092915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061099482610969565b9050919050565b6109a481610989565b81146109af57600080fd5b50565b6000813590506109c18161099b565b92915050565b6000819050919050565b6109da816109c7565b81146109e557600080fd5b50565b6000813590506109f7816109d1565b92915050565b60008115159050919050565b610a12816109fd565b82525050565b6000602082019050610a2d6000830184610a09565b92915050565b610a3c816109c7565b82525050565b6000602082019050610a576000830184610a33565b92915050565b610a6681610989565b82525050565b6000602082019050610a816000830184610a5d565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610ac2826109c7565b9150610acd836109c7565b9250828203905081811115610ae557610ae4610a87565b5b92915050565b6000610af6826109c7565b9150610b01836109c7565b9250828201905080821115610b1957610b18610a87565b5b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b7f45524332303a207472616e7366657220746f20746865207a65726f206164647260008201527f6573730000000000000000000000000000000000000000000000000000000000602082015250565b6000610b50602382610ab6565b9150610b5b82610af4565b604082019050919050565b60006020820190508181036000830152610b7f81610b43565b9050919050565b610b8f816109fd565b8114610b9a57600080fd5b50565b600081359050610bac81610b86565b92915050565b600060ff82169050919050565b610bc881610bb2565b82525050565b6000602082019050610be36000830184610bbf565b92915050565b600060208284031215610bff57610bfe610964565b5b6000610c0d848285016109b2565b91505092915050565b60008060408385031215610c2d57610c2c610964565b5b6000610c3b858286016109b2565b9250506020610c4c858286016109b2565b9150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610c91826109c7565b9150610c9c836109c7565b9250828203905081811115610cb457610cb3610c56565b5b92915050565b6000610cc5826109c7565b9150610cd0836109c7565b9250828201905080821115610ce857610ce7610c56565b5b92915050565b7f45524332303a207472616e7366657220746f20746865207a65726f206164647260008201527f6573730000000000000000000000000000000000000000000000000000000000602082015250565b6000610d4a602382610ab6565b9150610d5581610cee565b604082019050919050565b60006020820190508181036000830152610d7981610d3d565b9050919050565fea2646970667358221220abcd123456789abcdef1234567890abcdef1234567890abcdef1234567890abcdef64736f6c63430008130033';

async function quickStart() {
  console.log('🚀 Switchboard Quick Start Demo');
  console.log('================================\n');

  // Step 1: Initialize Switchboard
  console.log('📡 Initializing Switchboard...');
  const switchboard = new Switchboard({
    solanaRpcUrl: 'https://api.devnet.solana.com',
    // Using free public RPCs for demo (replace with your own for production)
    ethereumRpcUrl: 'https://rpc.ankr.com/eth_goerli',
    polygonRpcUrl: 'https://rpc.ankr.com/polygon_mumbai'
  });
  console.log('✅ Switchboard initialized\n');

  // Step 2: Deploy contract across chains
  console.log('🚀 Deploying contract across Ethereum and Polygon testnets...');
  try {
    const deployment = await switchboard.deployContract({
      bytecode: TOKEN_BYTECODE,
      chains: ['ethereum', 'polygon'],
      value: 1000000 // 1M wei for fee calculation
    });

    console.log('✅ Deployment initiated!');
    console.log(`📋 Deployment ID: ${deployment.id}`);
    console.log(`💰 Estimated fee: ${deployment.estimatedFee} wei`);
    console.log(`📊 Status: ${deployment.status}\n`);

    // Step 3: Show deployment details
    console.log('📄 Deployment Details:');
    deployment.deployments.forEach((deploy, index) => {
      console.log(`${index + 1}. ${deploy.chainName.toUpperCase()}`);
      console.log(`   Chain ID: ${deploy.chainId}`);
      console.log(`   Contract Address: ${deploy.contractAddress}`);
      console.log(`   Transaction Hash: ${deploy.transactionHash}`);
      console.log(`   Status: ${deploy.status}`);
      console.log(`   Deployed At: ${deploy.deployedAt}\n`);
    });

    // Step 4: Track deployment status
    console.log('👀 Tracking deployment status...');
    const status = await switchboard.trackTransaction(deployment.id);

    console.log('📊 Current Status:');
    console.log(`Overall Status: ${status.status}`);
    console.log(`Confirmations: ${status.confirmations}`);
    console.log(`Last Updated: ${status.lastUpdated}\n`);

    console.log('🔗 Chain States:');
    status.chainStates.forEach((chain, index) => {
      console.log(`${index + 1}. ${chain.chainName}: ${chain.status} (Block ${chain.blockNumber})`);
    });

    console.log('\n🎉 Quick start complete!');
    console.log('💡 Next steps:');
    console.log('   - Check out more examples in the docs/examples/ directory');
    console.log('   - Explore the full SDK documentation');
    console.log('   - Join our Discord community for support');

  } catch (error) {
    console.error('❌ Error during deployment:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   - Make sure you have a stable internet connection');
    console.log('   - Verify your RPC URLs are working');
    console.log('   - Check that you have sufficient testnet funds');
  }
}

// Run the quick start demo
quickStart().catch(console.error);
```

## Step 3: Run the Demo

```bash
# Compile TypeScript (if using)
npx tsc index.ts

# Run the demo
node index.js
```

Expected output:
```
🚀 Switchboard Quick Start Demo
================================

📡 Initializing Switchboard...
✅ Switchboard initialized

🚀 Deploying contract across Ethereum and Polygon testnets...
✅ Deployment initiated!
📋 Deployment ID: deploy_1706123456789_abc123def
💰 Estimated fee: 8000 wei
📊 Status: pending

📄 Deployment Details:
1. ETHEREUM
   Chain ID: 1
   Contract Address: 0x1234567890abcdef1234567890abcdef12345678
   Transaction Hash: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab
   Status: pending
   Deployed At: 2024-01-25T10:30:45.123Z

2. POLYGON
   Chain ID: 137
   Contract Address: 0x9876543210fedcba9876543210fedcba98765432
   Transaction Hash: 0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321
   Status: pending
   Deployed At: 2024-01-25T10:30:45.456Z

👀 Tracking deployment status...
📊 Current Status:
Overall Status: confirmed
Confirmations: 12
Last Updated: 2024-01-25T10:35:45.789Z

🔗 Chain States:
1. ethereum: confirmed (Block 18500001)
2. polygon: confirmed (Block 48000001)

🎉 Quick start complete!
💡 Next steps:
   - Check out more examples in the docs/examples/ directory
   - Explore the full SDK documentation
   - Join our Discord community for support
```

## What Just Happened?

1. **Initialized Switchboard**: Connected to Solana coordination layer and chain RPCs
2. **Deployed Contract**: Sent the same ERC20 token contract to both Ethereum and Polygon
3. **Generated Universal ID**: Created a single ID to track deployment across all chains
4. **Calculated Fees**: Computed 0.04% fee based on transaction value
5. **Tracked Status**: Monitored deployment progress in real-time
6. **Verified Completion**: Confirmed deployment on both chains with block numbers

## Key Features Demonstrated

- ✅ **Single SDK Call** - Deploy to multiple chains with one function
- ✅ **Universal Tracking** - Track transactions across chains with one ID
- ✅ **Transparent Fees** - See exact fee calculation upfront
- ✅ **Real-time Status** - Get live updates on deployment progress
- ✅ **Error Handling** - Graceful handling of network issues

## Next Steps

### 1. Explore More Examples
```bash
# Clone the full examples repository
git clone https://github.com/your-org/switchboard-examples.git
cd switchboard-examples

# Try the DeFi protocol example
npm run example:defi

# Or the NFT marketplace example
npm run example:nft
```

### 2. Build Your Own Application
```typescript
// Your custom contract deployment
const myContract = await switchboard.deployContract({
  bytecode: 'YOUR_CONTRACT_BYTECODE',
  chains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
  value: 5000000 // Larger transaction value
});

// Implement custom tracking logic
async function trackWithNotifications(deploymentId: string) {
  const status = await switchboard.trackTransaction(deploymentId);

  // Send notifications, update UI, etc.
  if (status.status === 'confirmed') {
    sendSlackNotification('Deployment completed successfully!');
  }
}
```

### 3. Production Configuration
```typescript
// Production setup with your own RPC endpoints
const switchboard = new Switchboard({
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
  ethereumRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
  polygonRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY',
  arbitrumRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
  apiKey: 'YOUR_CHAINSYNC_API_KEY' // For enhanced features
});
```

## Common Issues & Solutions

### Problem: "Invalid RPC URL" Error
```bash
# Solution: Use your own RPC endpoints
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### Problem: "Insufficient Balance" Error
```bash
# Solution: Get testnet tokens
# Ethereum Goerli: https://goerlifaucet.com/
# Polygon Mumbai: https://faucet.polygon.technology/
```

### Problem: Slow Transaction Confirmation
```typescript
// Solution: Implement polling with timeout
async function trackWithTimeout(id: string, timeoutMs = 300000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await switchboard.trackTransaction(id);
    if (status.status !== 'pending') return status;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Transaction timeout');
}
```

## Understanding the Output

| Field | Description | Example |
|-------|-------------|---------|
| `Deployment ID` | Unique identifier for tracking | `deploy_1706123456_abc123` |
| `Estimated Fee` | Cost in wei for cross-chain deployment | `8000 wei` |
| `Contract Address` | Deployed contract address per chain | `0x1234...5678` |
| `Transaction Hash` | Blockchain transaction hash | `0xabcd...ef12` |
| `Chain Status` | Current status per chain | `pending/confirmed/failed` |
| `Block Number` | Block where transaction was included | `18500001` |

## Resources

- **Full Documentation**: [docs.switchboard.org](https://docs.switchboard.org)
- **SDK Reference**: [SDK Documentation](../sdk/README.md)
- **More Examples**: [Examples Directory](./README.md)
- **Community**: [Discord](https://discord.gg/switchboard)

## Support

Need help? We're here for you:

- 💬 **Discord**: [discord.gg/switchboard](https://discord.gg/switchboard)
- 🐛 **GitHub Issues**: [Report bugs](https://github.com/your-org/switchboard/issues)
- 📧 **Email**: support@switchboard.org
- 📚 **Docs**: [docs.switchboard.org](https://docs.switchboard.org)

---

**🎉 Congratulations!** You've successfully deployed your first cross-chain contract with Switchboard. Welcome to the future of unified blockchain development!