# Network Configuration

Configure blockchain networks for Switchboard deployments.

## Overview

Networks are configured in two places:

1. **Environment Variables** - RPC URLs for the platform
2. **Project Configuration** - Network settings for deployments

## Environment Variables

### RPC URL Format

```bash
{NETWORK}_RPC_URL=https://provider-url/api-key
```

### Major Networks

```bash
# Ethereum
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Polygon
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

# Arbitrum
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY

# Optimism
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY

# BSC
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Avalanche
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
```

### Testnets

```bash
# Ethereum Sepolia
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Polygon Mumbai
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY

# Avalanche Fuji
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

## Project Configuration

### switchboard.config.js

```javascript
module.exports = {
  mode: 'development', // or 'production'

  networks: {
    // Ethereum Mainnet
    ethereum: {
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      chainId: 1,
      accounts: [process.env.PRIVATE_KEY],
      gasMultiplier: 1.2,
    },

    // Polygon
    polygon: {
      rpcUrl: process.env.POLYGON_RPC_URL,
      chainId: 137,
      accounts: [process.env.PRIVATE_KEY],
    },

    // Arbitrum
    arbitrum: {
      rpcUrl: process.env.ARBITRUM_RPC_URL,
      chainId: 42161,
      accounts: [process.env.PRIVATE_KEY],
    },

    // Sepolia Testnet
    sepolia: {
      rpcUrl: process.env.SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY],
    },
  },

  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
    commitment: 'confirmed',
  },
};
```

### Network Options

| Option | Type | Description |
|--------|------|-------------|
| `rpcUrl` | string | RPC endpoint URL |
| `chainId` | number | Chain identifier |
| `accounts` | string[] | Private keys for signing |
| `gasMultiplier` | number | Gas estimate multiplier |
| `gasPrice` | string | Fixed gas price (wei) |
| `timeout` | number | Transaction timeout (ms) |

## RPC Providers

### Recommended Providers

| Provider | Networks | Free Tier |
|----------|----------|-----------|
| [Alchemy](https://alchemy.com) | Ethereum, Polygon, Arbitrum, Optimism, Base | 300M CU/month |
| [Infura](https://infura.io) | Ethereum, Polygon, Arbitrum, Optimism | 100K req/day |
| [QuickNode](https://quicknode.com) | 20+ networks | 10M credits |
| [Ankr](https://ankr.com) | 40+ networks | 1M req/month |

### Public RPCs (Backup)

```bash
# Use only as backup - rate limited
ETHEREUM_RPC_URL=https://eth.llamarpc.com
POLYGON_RPC_URL=https://polygon-rpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
```

## Chain IDs

### Mainnets

| Network | Chain ID |
|---------|----------|
| Ethereum | 1 |
| Polygon | 137 |
| Arbitrum | 42161 |
| Optimism | 10 |
| BSC | 56 |
| Avalanche | 43114 |
| Base | 8453 |
| zkSync Era | 324 |

### Testnets

| Network | Chain ID |
|---------|----------|
| Sepolia | 11155111 |
| Goerli | 5 |
| Mumbai | 80001 |
| Fuji | 43113 |
| Arbitrum Goerli | 421613 |

## Gas Configuration

### Gas Multiplier

Increase gas estimates for reliability:

```javascript
networks: {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    chainId: 1,
    gasMultiplier: 1.2, // 20% buffer
  },
}
```

### Fixed Gas Price

Set a fixed gas price:

```javascript
networks: {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    chainId: 1,
    gasPrice: '50000000000', // 50 gwei in wei
  },
}
```

### Priority Fee (EIP-1559)

Configure priority fees:

```javascript
networks: {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    chainId: 1,
    maxFeePerGas: '100000000000',      // 100 gwei
    maxPriorityFeePerGas: '2000000000', // 2 gwei
  },
}
```

## Multi-Network Deployment

### Deploy to Specific Networks

```bash
switchboard deploy --networks ethereum,polygon,arbitrum
```

### Deploy by Category

```bash
# All EVM networks
switchboard deploy --category evm

# All Layer 2s
switchboard deploy --category layer2

# All testnets
switchboard deploy --dev-mode
```

### Network Groups

Define groups in configuration:

```javascript
module.exports = {
  networks: {
    // ... network configs
  },

  groups: {
    mainEvm: ['ethereum', 'polygon', 'arbitrum'],
    layer2: ['base', 'optimism', 'zksync'],
    testnets: ['sepolia', 'mumbai', 'fuji'],
  },
};
```

Use groups:

```bash
switchboard deploy --group mainEvm
```

## Validation

### Check Configuration

```bash
# Validate all networks
switchboard validate --networks

# Check specific network
switchboard health --network ethereum
```

### Test RPC Connection

```bash
# Test RPC endpoint
switchboard test:rpc --network ethereum
```

## Troubleshooting

### RPC Connection Failed

```bash
# Check URL is accessible
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $ETHEREUM_RPC_URL
```

### Rate Limiting

If you hit rate limits:

1. Upgrade your provider plan
2. Add backup RPC endpoints
3. Implement request throttling

### Wrong Chain ID

Ensure chainId matches the network:

```javascript
// Correct
ethereum: {
  chainId: 1, // Mainnet
}

// Wrong
ethereum: {
  chainId: 5, // This is Goerli, not Mainnet
}
```
