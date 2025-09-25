# ChainSync Testnet Configuration Guide

This guide provides complete testnet configurations for development mode deployment across all supported networks.

## 🧪 Development Mode (All Testnets)

ChainSync's development mode uses testnets across all supported blockchain ecosystems, providing a risk-free environment for testing and development.

### Quick Setup

```bash
# Initialize project in development mode
chainsync init my-project --dev-mode

# Deploy to all testnets
chainsync deploy --dev-mode

# Monitor testnet deployments
chainsync status --dev-mode
```

## 🌐 Testnet Network Configurations

### EVM Testnets

#### Ethereum Testnets
```javascript
// Sepolia (Primary Ethereum Testnet)
sepolia: {
  rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
  chainId: 11155111,
  blockExplorer: 'https://sepolia.etherscan.io',
  faucet: 'https://sepoliafaucet.com',
  accounts: [process.env.PRIVATE_KEY]
}

// Goerli (Deprecated but still supported)
goerli: {
  rpcUrl: 'https://goerli.infura.io/v3/YOUR_KEY',
  chainId: 5,
  blockExplorer: 'https://goerli.etherscan.io',
  faucet: 'https://goerlifaucet.com',
  accounts: [process.env.PRIVATE_KEY]
}
```

#### Layer 2 Testnets
```javascript
// Polygon Mumbai
mumbai: {
  rpcUrl: 'https://rpc-mumbai.maticvigil.com',
  chainId: 80001,
  blockExplorer: 'https://mumbai.polygonscan.com',
  faucet: 'https://faucet.polygon.technology',
  accounts: [process.env.PRIVATE_KEY]
}

// Arbitrum Goerli
'arbitrum-goerli': {
  rpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
  chainId: 421613,
  blockExplorer: 'https://goerli.arbiscan.io',
  faucet: 'https://bridge.arbitrum.io',
  accounts: [process.env.PRIVATE_KEY]
}

// Optimism Goerli
'optimism-goerli': {
  rpcUrl: 'https://goerli.optimism.io',
  chainId: 420,
  blockExplorer: 'https://goerli-optimism.etherscan.io',
  faucet: 'https://app.optimism.io/faucet',
  accounts: [process.env.PRIVATE_KEY]
}

// Base Goerli
'base-goerli': {
  rpcUrl: 'https://goerli.base.org',
  chainId: 84531,
  blockExplorer: 'https://goerli.basescan.org',
  faucet: 'https://bridge.base.org',
  accounts: [process.env.PRIVATE_KEY]
}
```

#### Other EVM Testnets
```javascript
// Avalanche Fuji
fuji: {
  rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
  chainId: 43113,
  blockExplorer: 'https://testnet.snowtrace.io',
  faucet: 'https://faucet.avax.network',
  accounts: [process.env.PRIVATE_KEY]
}

// BSC Testnet
'bsc-testnet': {
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  chainId: 97,
  blockExplorer: 'https://testnet.bscscan.com',
  faucet: 'https://testnet.binance.org/faucet-smart',
  accounts: [process.env.PRIVATE_KEY]
}

// Fantom Testnet
'fantom-testnet': {
  rpcUrl: 'https://rpc.testnet.fantom.network',
  chainId: 4002,
  blockExplorer: 'https://testnet.ftmscan.com',
  faucet: 'https://faucet.fantom.network',
  accounts: [process.env.PRIVATE_KEY]
}

// Celo Alfajores
'celo-alfajores': {
  rpcUrl: 'https://alfajores-forno.celo-testnet.org',
  chainId: 44787,
  blockExplorer: 'https://alfajores-blockscout.celo-testnet.org',
  faucet: 'https://faucet.celo.org',
  accounts: [process.env.PRIVATE_KEY]
}
```

### Alternative Layer 1 Testnets

#### NEAR Protocol
```javascript
'near-testnet': {
  rpcUrl: 'https://rpc.testnet.near.org',
  networkId: 'testnet',
  blockExplorer: 'https://explorer.testnet.near.org',
  faucet: 'https://wallet.testnet.near.org',
  accounts: [process.env.NEAR_PRIVATE_KEY]
}
```

#### Sui Network
```javascript
'sui-testnet': {
  rpcUrl: 'https://fullnode.testnet.sui.io:443',
  networkId: 'testnet',
  blockExplorer: 'https://explorer.sui.io/?network=testnet',
  faucet: 'https://discord.gg/sui',
  accounts: [process.env.SUI_PRIVATE_KEY]
}
```

#### Aptos
```javascript
'aptos-testnet': {
  rpcUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
  networkId: 'testnet',
  blockExplorer: 'https://explorer.aptoslabs.com/?network=testnet',
  faucet: 'https://aptoslabs.com/testnet-faucet',
  accounts: [process.env.APTOS_PRIVATE_KEY]
}
```

#### Cosmos Ecosystem
```javascript
'cosmos-testnet': {
  rpcUrl: 'https://rpc.sentry-02.theta-testnet.polypore.xyz',
  chainId: 'theta-testnet-001',
  blockExplorer: 'https://explorer.theta-testnet.polypore.xyz',
  faucet: 'https://discord.gg/cosmosnetwork',
  accounts: [process.env.COSMOS_MNEMONIC]
}
```

#### Solana (Coordination Layer)
```javascript
'solana-devnet': {
  rpcUrl: 'https://api.devnet.solana.com',
  commitment: 'confirmed',
  blockExplorer: 'https://explorer.solana.com/?cluster=devnet',
  faucet: 'Built-in airdrop functionality',
  accounts: [process.env.SOLANA_PRIVATE_KEY]
}
```

## 🔧 Complete Development Configuration

### Environment Variables Template
Create a `.env.development` file:

```bash
# Development Mode Flag
CHAINSYNC_MODE=development

# Solana Coordination Layer (Devnet)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_solana_devnet_private_key

# Ethereum Ecosystem Testnets
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
ARBITRUM_RPC_URL=https://goerli-rollup.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://goerli.optimism.io
BASE_RPC_URL=https://goerli.base.org

# Other EVM Testnets
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
FANTOM_RPC_URL=https://rpc.testnet.fantom.network
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org

# Alternative Layer 1 Testnets
NEAR_RPC_URL=https://rpc.testnet.near.org
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
APTOS_RPC_URL=https://fullnode.testnet.aptoslabs.com/v1
COSMOS_RPC_URL=https://rpc.sentry-02.theta-testnet.polypore.xyz

# Private Keys (TESTNET ONLY - Use dedicated test keys!)
PRIVATE_KEY=your_ethereum_testnet_private_key
NEAR_PRIVATE_KEY=your_near_testnet_private_key
SUI_PRIVATE_KEY=your_sui_testnet_private_key
APTOS_PRIVATE_KEY=your_aptos_testnet_private_key
COSMOS_MNEMONIC="your cosmos testnet mnemonic phrase"

# Gas Configuration for Development
DEFAULT_GAS_PRICE=20000000000
DEFAULT_GAS_LIMIT=2000000
```

### Complete ChainSync Development Config
```javascript
// chainsync.config.js
module.exports = {
  mode: 'development',

  networks: {
    // Ethereum Testnets
    sepolia: {
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 20000000000,
      confirmations: 2
    },

    mumbai: {
      rpcUrl: process.env.POLYGON_RPC_URL,
      chainId: 80001,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 30000000000,
      confirmations: 2
    },

    'arbitrum-goerli': {
      rpcUrl: process.env.ARBITRUM_RPC_URL,
      chainId: 421613,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 1000000000,
      confirmations: 1
    },

    'optimism-goerli': {
      rpcUrl: process.env.OPTIMISM_RPC_URL,
      chainId: 420,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 1000000000,
      confirmations: 1
    },

    'base-goerli': {
      rpcUrl: process.env.BASE_RPC_URL,
      chainId: 84531,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 1000000000,
      confirmations: 1
    },

    fuji: {
      rpcUrl: process.env.AVALANCHE_RPC_URL,
      chainId: 43113,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 25000000000,
      confirmations: 2
    },

    'bsc-testnet': {
      rpcUrl: process.env.BSC_RPC_URL,
      chainId: 97,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 10000000000,
      confirmations: 3
    },

    'fantom-testnet': {
      rpcUrl: process.env.FANTOM_RPC_URL,
      chainId: 4002,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 2000000000,
      confirmations: 2
    },

    'celo-alfajores': {
      rpcUrl: process.env.CELO_RPC_URL,
      chainId: 44787,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 1000000000,
      confirmations: 2
    },

    // Alternative Layer 1 Testnets
    'near-testnet': {
      rpcUrl: process.env.NEAR_RPC_URL,
      networkId: 'testnet',
      accounts: [process.env.NEAR_PRIVATE_KEY]
    },

    'sui-testnet': {
      rpcUrl: process.env.SUI_RPC_URL,
      networkId: 'testnet',
      accounts: [process.env.SUI_PRIVATE_KEY]
    },

    'aptos-testnet': {
      rpcUrl: process.env.APTOS_RPC_URL,
      networkId: 'testnet',
      accounts: [process.env.APTOS_PRIVATE_KEY]
    },

    'cosmos-testnet': {
      rpcUrl: process.env.COSMOS_RPC_URL,
      chainId: 'theta-testnet-001',
      accounts: [process.env.COSMOS_MNEMONIC]
    }
  },

  // Solana coordination layer (devnet)
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    commitment: 'confirmed'
  },

  // Development-specific settings
  deployment: {
    gasOptimization: true,
    verification: true,
    confirmations: 2,
    timeout: 300000,
    retries: 3
  },

  testing: {
    parallel: true,
    timeout: 120000,
    retries: 2,
    verbose: true
  }
};
```

## 🏃‍♂️ Quick Development Workflows

### 1. Multi-Testnet Token Deployment
```bash
# Initialize token project
chainsync init my-token --template token --dev-mode

cd my-token

# Deploy to all EVM testnets
chainsync deploy --category evm --dev-mode

# Deploy to specific testnets
chainsync deploy --networks sepolia,mumbai,fuji

# Check deployment status
chainsync status --dev-mode
```

### 2. Cross-Ecosystem Testing
```bash
# Deploy across different blockchain ecosystems
chainsync deploy --networks sepolia,mumbai,near-testnet,sui-testnet

# Test cross-chain functionality
npm run test:cross-chain

# Monitor cross-chain synchronization
chainsync monitor --cross-chain
```

### 3. Rapid Prototyping
```bash
# Quick DeFi protocol setup
chainsync init my-defi --template defi --dev-mode

# Deploy to fast testnets only
chainsync deploy --networks mumbai,fuji,arbitrum-goerli

# Run integration tests
npm run test:integration
```

## 🔗 Testnet Faucets

### Getting Test Tokens

#### Automated Faucet Access
```bash
# ChainSync can request test tokens for you
chainsync faucet --network sepolia --address YOUR_ADDRESS
chainsync faucet --network mumbai --address YOUR_ADDRESS
chainsync faucet --network fuji --address YOUR_ADDRESS

# Request tokens for all configured networks
chainsync faucet --all --address YOUR_ADDRESS
```

#### Manual Faucet Links

**Ethereum Ecosystem:**
- Sepolia: https://sepoliafaucet.com
- Goerli: https://goerlifaucet.com

**Layer 2 Solutions:**
- Polygon Mumbai: https://faucet.polygon.technology
- Arbitrum Goerli: https://bridge.arbitrum.io
- Optimism Goerli: https://app.optimism.io/faucet
- Base Goerli: https://bridge.base.org

**Other EVM Networks:**
- Avalanche Fuji: https://faucet.avax.network
- BSC Testnet: https://testnet.binance.org/faucet-smart
- Fantom Testnet: https://faucet.fantom.network
- Celo Alfajores: https://faucet.celo.org

**Alternative Layer 1s:**
- NEAR Testnet: https://wallet.testnet.near.org
- Sui Testnet: Discord #devnet-faucet channel
- Aptos Testnet: https://aptoslabs.com/testnet-faucet
- Cosmos Testnet: Discord #testnet-faucet channel

## 📊 Testnet Monitoring

### Network Health Monitoring
```bash
# Check all testnet health
chainsync health --dev-mode

# Monitor specific testnets
chainsync health --networks sepolia,mumbai,fuji

# Real-time health monitoring
chainsync health --watch --dev-mode
```

### Deployment Monitoring
```bash
# Monitor all testnet deployments
chainsync monitor --dev-mode

# Monitor specific deployment
chainsync monitor --deployment-id abc123

# Monitor with custom interval
chainsync monitor --interval 30 --dev-mode
```

### Analytics and Metrics
```bash
# View deployment analytics
chainsync analytics --dev-mode

# Cross-chain transaction metrics
chainsync metrics --cross-chain

# Generate development report
chainsync report --dev-mode --output report.json
```

## 🧪 Testing Strategies

### 1. Incremental Testing
```bash
# Test on single network first
chainsync deploy --networks sepolia
npm run test:sepolia

# Then expand to multiple networks
chainsync deploy --networks sepolia,mumbai
npm run test:multi-chain

# Finally test full ecosystem
chainsync deploy --dev-mode
npm run test:full-ecosystem
```

### 2. Network-Specific Testing
```bash
# EVM-only testing
chainsync deploy --category evm --dev-mode
npm run test:evm

# Layer 2 specific testing
chainsync deploy --networks mumbai,arbitrum-goerli,optimism-goerli
npm run test:layer2

# Alternative L1 testing
chainsync deploy --networks near-testnet,sui-testnet,aptos-testnet
npm run test:alt-l1
```

### 3. Performance Testing
```bash
# High-frequency testing
chainsync deploy --networks mumbai,fuji  # Fast networks
npm run test:performance

# Gas optimization testing
chainsync deploy --gas-optimization
npm run test:gas

# Parallel deployment testing
chainsync deploy --parallel --dev-mode
npm run test:parallel
```

## 🔄 Development to Production Migration

### 1. Configuration Migration
```bash
# Copy development config as template
cp chainsync.config.js chainsync.config.prod.js

# Update to production networks
chainsync migrate-config --from development --to production
```

### 2. Testing Migration Path
```bash
# Final testnet validation
chainsync validate --dev-mode --comprehensive

# Production readiness check
chainsync validate --prod-mode --pre-flight

# Deploy to production
chainsync deploy --prod-mode --verify
```

### 3. Environment Switching
```bash
# Set development mode
export CHAINSYNC_MODE=development

# Set production mode
export CHAINSYNC_MODE=production

# Use mode-specific configs
chainsync deploy --config chainsync.config.${CHAINSYNC_MODE}.js
```

## 📋 Development Checklist

### Before Starting Development
- [ ] Install ChainSync CLI
- [ ] Set up testnet accounts and private keys
- [ ] Configure environment variables
- [ ] Get test tokens from faucets
- [ ] Verify network connectivity

### During Development
- [ ] Test on single network first
- [ ] Expand to multiple testnets gradually
- [ ] Monitor deployment health
- [ ] Test cross-chain functionality
- [ ] Validate state synchronization

### Before Production
- [ ] Complete comprehensive testnet testing
- [ ] Verify all network deployments
- [ ] Test failover scenarios
- [ ] Validate gas optimization
- [ ] Security audit contracts

## 🆘 Testnet Troubleshooting

### Common Issues

#### Network Connectivity
```bash
# Test RPC connectivity
chainsync test-rpc --network sepolia

# Check network status
chainsync network-status --all-testnets

# Switch to backup RPC
chainsync config set sepolia.rpcUrl https://backup-rpc.com
```

#### Insufficient Test Tokens
```bash
# Check balances
chainsync balance --address YOUR_ADDRESS --all-testnets

# Request more tokens
chainsync faucet --network sepolia --amount 1

# Use multi-faucet strategy
chainsync faucet --all --retry 3
```

#### Gas Issues
```bash
# Use conservative gas settings
chainsync deploy --gas-price 20000000000 --gas-limit 2000000

# Enable gas optimization
chainsync config set gasOptimization true

# Use dynamic gas pricing
chainsync config set gasStrategy dynamic
```

### Debug Mode
```bash
# Enable comprehensive debugging
export DEBUG=chainsync:*

# Run with verbose output
chainsync deploy --debug --verbose --dev-mode

# Save detailed logs
chainsync deploy --log-file testnet-debug.log --dev-mode
```

---

This testnet configuration guide provides everything needed for robust development mode testing across ChainSync's 50+ supported networks. Use these configurations to build, test, and validate your cross-chain applications before production deployment.