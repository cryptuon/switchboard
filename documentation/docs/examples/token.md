# Token Deployment Example

Deploy an ERC20 token across multiple blockchains.

## Overview

This example demonstrates how to:

- Create a simple ERC20 token
- Deploy to multiple chains simultaneously
- Verify state synchronization
- Monitor cross-chain balances

## Quick Start

```bash
# Create project from template
chainsync init my-token --template token --dev-mode

cd my-token
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Deploy to testnets
chainsync deploy --dev-mode
```

## The Contract

```solidity
// contracts/evm/MyToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
```

## Configuration

### chainsync.config.js

```javascript
module.exports = {
  mode: 'development',

  networks: {
    sepolia: {
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY],
    },
    mumbai: {
      rpcUrl: process.env.POLYGON_RPC_URL,
      chainId: 80001,
      accounts: [process.env.PRIVATE_KEY],
    },
    fuji: {
      rpcUrl: process.env.AVALANCHE_RPC_URL,
      chainId: 43113,
      accounts: [process.env.PRIVATE_KEY],
    },
  },

  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
    commitment: 'confirmed',
  },

  deployment: {
    gasOptimization: true,
    verification: true,
    confirmations: 2,
  },
};
```

### Environment Variables

```bash
# .env
SOLANA_RPC_URL=https://api.devnet.solana.com
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
PRIVATE_KEY=0x...
```

## Deployment Script

```javascript
// scripts/deploy.js
import { ChainSync } from '@chainsync/sdk';
import { readFileSync } from 'fs';

async function main() {
  // Load compiled contract
  const artifact = JSON.parse(
    readFileSync('./artifacts/MyToken.json', 'utf-8')
  );

  // Initialize ChainSync
  const chainSync = new ChainSync({
    solana: { rpcUrl: process.env.SOLANA_RPC_URL },
    networks: {
      sepolia: {
        rpcUrl: process.env.ETHEREUM_RPC_URL,
        privateKey: process.env.PRIVATE_KEY,
      },
      mumbai: {
        rpcUrl: process.env.POLYGON_RPC_URL,
        privateKey: process.env.PRIVATE_KEY,
      },
      fuji: {
        rpcUrl: process.env.AVALANCHE_RPC_URL,
        privateKey: process.env.PRIVATE_KEY,
      },
    },
  });

  console.log('Starting deployment...\n');

  // Deploy across chains
  const deployment = await chainSync.deployContract({
    name: 'MyToken',
    bytecode: artifact.bytecode,
    abi: artifact.abi,
    constructorArgs: ['My Token', 'MTK', 1000000],
    chains: ['sepolia', 'mumbai', 'fuji'],
    options: {
      verify: true,
    },
  });

  console.log(`Deployment ID: ${deployment.id}\n`);

  // Wait and monitor
  let status = await chainSync.trackDeployment(deployment.id);

  while (status.status !== 'completed' && status.status !== 'failed') {
    console.log(`Status: ${status.status}`);
    console.log(`Completed: ${status.completedChains.join(', ') || 'none'}`);
    console.log(`Pending: ${status.pendingChains.join(', ') || 'none'}\n`);

    await new Promise((r) => setTimeout(r, 5000));
    status = await chainSync.trackDeployment(deployment.id);
  }

  if (status.status === 'completed') {
    console.log('Deployment successful!\n');
    console.log('Contract Addresses:');
    for (const [chain, address] of Object.entries(status.addresses)) {
      console.log(`  ${chain}: ${address}`);
    }
  } else {
    console.error('Deployment failed:', status.errors);
  }
}

main().catch(console.error);
```

## Verification

After deployment, verify on block explorers:

```bash
# Verify on Etherscan (Sepolia)
chainsync verify --contract MyToken --network sepolia

# Verify on Polygonscan (Mumbai)
chainsync verify --contract MyToken --network mumbai

# Verify on Snowtrace (Fuji)
chainsync verify --contract MyToken --network fuji
```

## Testing

```javascript
// tests/token.test.js
import { ChainSync } from '@chainsync/sdk';
import { expect } from 'chai';

describe('MyToken', () => {
  let chainSync;
  let addresses;

  before(async () => {
    chainSync = new ChainSync({
      solana: { rpcUrl: process.env.SOLANA_RPC_URL },
    });

    addresses = {
      sepolia: '0x...',
      mumbai: '0x...',
      fuji: '0x...',
    };
  });

  it('should have consistent state across chains', async () => {
    const state = await chainSync.getState({
      contractAddress: addresses.sepolia,
      chains: ['sepolia', 'mumbai', 'fuji'],
    });

    expect(state.isConsistent).to.be.true;
  });

  it('should have the same total supply on all chains', async () => {
    // Query each chain for total supply
    // Compare values
  });
});
```

## Interacting with Deployed Tokens

### Read Balance

```javascript
import { ethers } from 'ethers';

async function getBalance(rpcUrl, contractAddress, walletAddress) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const abi = ['function balanceOf(address) view returns (uint256)'];
  const contract = new ethers.Contract(contractAddress, abi, provider);

  const balance = await contract.balanceOf(walletAddress);
  return ethers.formatEther(balance);
}

// Check balance on all chains
const balances = await Promise.all([
  getBalance(process.env.ETHEREUM_RPC_URL, addresses.sepolia, wallet),
  getBalance(process.env.POLYGON_RPC_URL, addresses.mumbai, wallet),
  getBalance(process.env.AVALANCHE_RPC_URL, addresses.fuji, wallet),
]);

console.log('Balances:', balances);
```

### Transfer Tokens

```javascript
async function transfer(rpcUrl, contractAddress, privateKey, to, amount) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const abi = ['function transfer(address, uint256) returns (bool)'];
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const tx = await contract.transfer(to, ethers.parseEther(amount));
  await tx.wait();

  return tx.hash;
}
```

## Production Deployment

When ready for production:

1. **Audit the contract**
2. **Update configuration for mainnets**
3. **Secure private keys**
4. **Deploy with verification**

```bash
# Deploy to mainnets
chainsync deploy --prod-mode --networks ethereum,polygon,avalanche
```

## Next Steps

- [DeFi Example](defi.md) - Build cross-chain DeFi
- [SDK Documentation](../sdk/index.md) - Full SDK reference
- [API Reference](../api/index.md) - REST API documentation
