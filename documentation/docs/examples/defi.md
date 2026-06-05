# DeFi Protocol Example

Build a cross-chain DeFi protocol with synchronized liquidity.

## Overview

This example demonstrates:

- Multi-chain liquidity pool deployment
- Cross-chain price synchronization
- Unified yield calculations
- Cross-chain swap routing

## Quick Start

```bash
# Create project
switchboard init my-defi --template defi --dev-mode

cd my-defi
npm install

# Configure and deploy
cp .env.example .env
switchboard deploy --dev-mode
```

## Smart Contracts

### Liquidity Pool

```solidity
// contracts/evm/LiquidityPool.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LiquidityPool is ReentrancyGuard {
    IERC20 public tokenA;
    IERC20 public tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    mapping(address => uint256) public liquidity;
    uint256 public totalLiquidity;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB);
    event Swap(address indexed user, address tokenIn, uint256 amountIn, uint256 amountOut);

    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function addLiquidity(uint256 amountA, uint256 amountB) external nonReentrant {
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);

        uint256 liquidityMinted;
        if (totalLiquidity == 0) {
            liquidityMinted = sqrt(amountA * amountB);
        } else {
            liquidityMinted = min(
                (amountA * totalLiquidity) / reserveA,
                (amountB * totalLiquidity) / reserveB
            );
        }

        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;
        reserveA += amountA;
        reserveB += amountB;

        emit LiquidityAdded(msg.sender, amountA, amountB);
    }

    function swap(address tokenIn, uint256 amountIn) external nonReentrant returns (uint256) {
        require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "Invalid token");

        bool isTokenA = tokenIn == address(tokenA);
        (uint256 reserveIn, uint256 reserveOut) = isTokenA
            ? (reserveA, reserveB)
            : (reserveB, reserveA);

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // 0.3% fee
        uint256 amountInWithFee = amountIn * 997;
        uint256 amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);

        if (isTokenA) {
            reserveA += amountIn;
            reserveB -= amountOut;
            tokenB.transfer(msg.sender, amountOut);
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
            tokenA.transfer(msg.sender, amountOut);
        }

        emit Swap(msg.sender, tokenIn, amountIn, amountOut);
        return amountOut;
    }

    function getPrice() external view returns (uint256) {
        if (reserveA == 0) return 0;
        return (reserveB * 1e18) / reserveA;
    }

    function sqrt(uint256 x) internal pure returns (uint256) {
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
```

## Deployment Script

```javascript
// scripts/deploy-defi.js
import { Switchboard } from '@switchboard/sdk';
import { readFileSync } from 'fs';

async function main() {
  const switchboard = new Switchboard({
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
    },
  });

  // Deploy tokens first
  const tokenA = JSON.parse(readFileSync('./artifacts/TokenA.json'));
  const tokenB = JSON.parse(readFileSync('./artifacts/TokenB.json'));
  const pool = JSON.parse(readFileSync('./artifacts/LiquidityPool.json'));

  console.log('Deploying Token A...');
  const tokenADeploy = await switchboard.deployContract({
    name: 'TokenA',
    bytecode: tokenA.bytecode,
    abi: tokenA.abi,
    constructorArgs: ['Token A', 'TKA', 1000000],
    chains: ['sepolia', 'mumbai'],
  });

  console.log('Deploying Token B...');
  const tokenBDeploy = await switchboard.deployContract({
    name: 'TokenB',
    bytecode: tokenB.bytecode,
    abi: tokenB.abi,
    constructorArgs: ['Token B', 'TKB', 1000000],
    chains: ['sepolia', 'mumbai'],
  });

  // Wait for token deployments
  await waitForDeployment(switchboard, tokenADeploy.id);
  await waitForDeployment(switchboard, tokenBDeploy.id);

  console.log('Deploying Liquidity Pool...');
  const poolDeploy = await switchboard.deployContract({
    name: 'LiquidityPool',
    bytecode: pool.bytecode,
    abi: pool.abi,
    constructorArgs: [
      tokenADeploy.addresses.sepolia,
      tokenBDeploy.addresses.sepolia,
    ],
    chains: ['sepolia', 'mumbai'],
  });

  const status = await waitForDeployment(switchboard, poolDeploy.id);

  console.log('\nDeployment Complete!');
  console.log('Pool Addresses:', status.addresses);
}

async function waitForDeployment(switchboard, deploymentId) {
  let status = await switchboard.trackDeployment(deploymentId);
  while (status.status !== 'completed' && status.status !== 'failed') {
    await new Promise((r) => setTimeout(r, 5000));
    status = await switchboard.trackDeployment(deploymentId);
  }
  return status;
}

main().catch(console.error);
```

## Price Synchronization

Monitor prices across chains:

```javascript
// scripts/monitor-prices.js
import { Switchboard } from '@switchboard/sdk';
import { ethers } from 'ethers';

async function main() {
  const switchboard = new Switchboard({
    solana: { rpcUrl: process.env.SOLANA_RPC_URL },
  });

  const poolAddresses = {
    sepolia: '0x...',
    mumbai: '0x...',
  };

  const abi = ['function getPrice() view returns (uint256)'];

  // Set up providers
  const providers = {
    sepolia: new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL),
    mumbai: new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL),
  };

  // Monitor prices
  setInterval(async () => {
    const prices = {};

    for (const [chain, address] of Object.entries(poolAddresses)) {
      const contract = new ethers.Contract(address, abi, providers[chain]);
      prices[chain] = ethers.formatEther(await contract.getPrice());
    }

    console.log('Prices:', prices);

    // Check for arbitrage opportunity
    const priceDiff = Math.abs(
      parseFloat(prices.sepolia) - parseFloat(prices.mumbai)
    );

    if (priceDiff > 0.01) {
      console.log('Arbitrage opportunity detected!');
    }
  }, 10000);
}

main().catch(console.error);
```

## Cross-Chain Swap

Route swaps to the best chain:

```javascript
// scripts/cross-chain-swap.js
async function findBestSwap(switchboard, tokenIn, amountIn, pools) {
  const quotes = {};

  for (const [chain, poolAddress] of Object.entries(pools)) {
    const quote = await getSwapQuote(chain, poolAddress, tokenIn, amountIn);
    quotes[chain] = quote;
  }

  // Find best quote
  let bestChain = null;
  let bestAmount = 0n;

  for (const [chain, amount] of Object.entries(quotes)) {
    if (amount > bestAmount) {
      bestAmount = amount;
      bestChain = chain;
    }
  }

  return { chain: bestChain, amountOut: bestAmount };
}
```

## Testing

```javascript
// tests/defi.test.js
import { expect } from 'chai';

describe('DeFi Protocol', () => {
  it('should have synchronized prices across chains', async () => {
    const sepoliaPrice = await getPrice('sepolia');
    const mumbaiPrice = await getPrice('mumbai');

    // Prices should be within 1%
    const diff = Math.abs(sepoliaPrice - mumbaiPrice) / sepoliaPrice;
    expect(diff).to.be.lessThan(0.01);
  });

  it('should execute cross-chain swap', async () => {
    const bestSwap = await findBestSwap(switchboard, tokenA, '100', pools);
    expect(bestSwap.chain).to.be.oneOf(['sepolia', 'mumbai']);
    expect(bestSwap.amountOut).to.be.greaterThan(0);
  });
});
```

## Next Steps

- [NFT Example](nft.md) - Multi-chain NFT collections
- [Architecture](../architecture/index.md) - Understand the platform
- [SDK Reference](../sdk/index.md) - Full API documentation
