# Switchboard Developer Getting Started Guide

Welcome to Switchboard! This comprehensive guide will get you up and running with cross-chain development in minutes.

## 🚀 Quick Start (5 minutes)

### 1. Install Switchboard

```bash
# Install the CLI globally
npm install -g @switchboard/cli

# Verify installation
switchboard --version
```

### 2. Create Your First Cross-Chain Project

```bash
# Initialize a new project in development mode (testnets)
switchboard init my-first-dapp --dev-mode

cd my-first-dapp
```

### 3. Deploy to Multiple Testnets

```bash
# Deploy to development networks (all testnets)
switchboard deploy --dev-mode

# Or deploy to specific testnet chains
switchboard deploy --networks sepolia,mumbai,fuji
```

### 4. Monitor Your Deployment

```bash
# Check deployment status
switchboard status

# Real-time monitoring
switchboard status --watch
```

🎉 **Congratulations!** You've just deployed across multiple blockchains!

---

## 🧪 Development Mode vs Production Mode

Switchboard provides two distinct modes for different stages of development:

### Development Mode (Testnets)
- **Purpose**: Safe testing and development
- **Networks**: All testnet networks (free test tokens)
- **Cost**: Free (test tokens from faucets)
- **Use Case**: Development, testing, prototyping

### Production Mode (Mainnets)
- **Purpose**: Live deployment to production
- **Networks**: All mainnet networks (real tokens)
- **Cost**: Real transaction fees
- **Use Case**: Production deployments

### Mode Commands

```bash
# Development mode commands
switchboard init my-app --dev-mode
switchboard deploy --dev-mode
switchboard networks --dev-mode

# Production mode commands
switchboard init my-app --prod-mode
switchboard deploy --prod-mode
switchboard networks --prod-mode

# Default mode (you choose networks)
switchboard init my-app
switchboard deploy --networks ethereum,polygon,arbitrum
```

---

## 📋 Prerequisites

### System Requirements
- Node.js 16+ and npm
- Git
- 4GB+ RAM
- 10GB+ free disk space

### Optional (for advanced features)
- Docker (for local blockchain testing)
- Rust (for Solana program development)

### Get Test Tokens

For development mode, you'll need test tokens from faucets:

```bash
# Switchboard can help you get test tokens
switchboard faucet --network sepolia --address YOUR_ADDRESS
switchboard faucet --network mumbai --address YOUR_ADDRESS
switchboard faucet --network fuji --address YOUR_ADDRESS

# Or visit faucet websites manually
# Sepolia: https://sepoliafaucet.com/
# Mumbai: https://faucet.polygon.technology/
# Fuji: https://faucet.avax.network/
```

---

## 🛠 Detailed Setup Guide

### 1. Installation Options

#### Option A: CLI Only (Recommended for beginners)
```bash
npm install -g @switchboard/cli
```

#### Option B: SDK for programmatic use
```bash
npm install @switchboard/sdk
```

#### Option C: Full development setup
```bash
# Clone the repository for contributing
git clone https://github.com/switchboard/switchboard
cd switchboard
npm install
npm run build
```

### 2. Project Initialization

#### Interactive Initialization (Recommended)
```bash
switchboard init
# Follow the interactive prompts to configure your project
```

#### Quick Initialization with Templates
```bash
# Simple token deployment
switchboard init my-token --template token --dev-mode

# DeFi protocol
switchboard init my-defi --template defi --dev-mode

# NFT collection
switchboard init my-nft --template nft --dev-mode

# Cross-chain bridge
switchboard init my-bridge --template bridge --dev-mode

# GameFi platform
switchboard init my-game --template gamefi --dev-mode
```

#### Custom Network Configuration
```bash
# Initialize with specific networks
switchboard init my-app --networks sepolia,mumbai,fuji,arbitrum-goerli

# Initialize with network categories
switchboard init my-app --category evm --dev-mode

# Initialize for specific ecosystem
switchboard init my-app --ecosystem ethereum --dev-mode
```

### 3. Project Structure

After initialization, your project will have this structure:

```
my-project/
├── switchboard.config.js     # Main configuration
├── contracts/              # Smart contracts
│   ├── evm/               # EVM-compatible contracts
│   ├── near/              # NEAR contracts
│   ├── sui/               # Sui Move contracts
│   └── cosmos/            # CosmWasm contracts
├── scripts/               # Deployment and utility scripts
│   ├── deploy.js          # Multi-chain deployment
│   ├── verify.js          # Contract verification
│   └── test.js            # Testing scripts
├── tests/                 # Test suites
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
├── docs/                  # Project documentation
└── .env.example           # Environment variables template
```

### 4. Configuration

#### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit your configuration
nano .env
```

#### Required Environment Variables
```bash
# Solana (coordination layer)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_solana_private_key

# EVM Networks (development)
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your-key
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
ARBITRUM_RPC_URL=https://goerli-rollup.arbitrum.io/rpc

# Alternative Layer 1s (development)
NEAR_RPC_URL=https://rpc.testnet.near.org
SUI_RPC_URL=https://fullnode.testnet.sui.io
APTOS_RPC_URL=https://fullnode.testnet.aptoslabs.com

# Private Keys (use test keys only!)
PRIVATE_KEY=your_test_private_key
```

#### Switchboard Configuration
Edit `switchboard.config.js`:

```javascript
module.exports = {
  // Development mode configuration
  mode: 'development', // or 'production'

  // Network configurations
  networks: {
    // Ethereum testnets
    sepolia: {
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY]
    },

    // Polygon testnet
    mumbai: {
      rpcUrl: process.env.POLYGON_RPC_URL,
      chainId: 80001,
      accounts: [process.env.PRIVATE_KEY]
    },

    // Avalanche testnet
    fuji: {
      rpcUrl: process.env.AVALANCHE_RPC_URL,
      chainId: 43113,
      accounts: [process.env.PRIVATE_KEY]
    },

    // NEAR testnet
    'near-testnet': {
      rpcUrl: process.env.NEAR_RPC_URL,
      networkId: 'testnet',
      accounts: [process.env.NEAR_PRIVATE_KEY]
    }
  },

  // Solana coordination layer
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
    commitment: 'confirmed'
  },

  // Deployment settings
  deployment: {
    gasOptimization: true,
    verification: true,
    confirmations: 2,
    timeout: 300000 // 5 minutes
  },

  // Testing configuration
  testing: {
    parallel: true,
    timeout: 60000,
    retries: 3
  }
};
```

---

## 🧪 Testing and Development Workflow

### 1. Development Workflow

```bash
# 1. Start development
cd my-project

# 2. Write your contracts (contracts/evm/MyContract.sol)

# 3. Test locally
npm run test

# 4. Deploy to testnets
switchboard deploy --dev-mode

# 5. Test cross-chain functionality
npm run test:integration

# 6. Monitor deployment
switchboard status --watch

# 7. When ready, deploy to production
switchboard deploy --prod-mode
```

### 2. Testing Commands

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Test specific networks
npm run test:ethereum
npm run test:polygon

# Test all networks in parallel
npm run test:all

# Cross-chain state verification tests
npm run test:cross-chain
```

### 3. Local Development Environment

```bash
# Start local blockchain network
switchboard local:start

# Deploy to local networks
switchboard deploy --local

# Run local tests
npm run test:local

# Stop local networks
switchboard local:stop
```

### 4. Debugging and Monitoring

```bash
# Enable debug mode
export DEBUG=switchboard:*

# Monitor deployments
switchboard monitor --deployment-id abc123

# View deployment logs
switchboard logs --deployment-id abc123

# Check network health
switchboard health

# Validate configurations
switchboard validate
```

---

## 🎯 Common Use Cases

### 1. Simple Token Deployment

```bash
# Initialize token project
switchboard init my-token --template token --dev-mode

cd my-token

# Deploy to multiple testnets
switchboard deploy --networks sepolia,mumbai,fuji

# Verify deployment
switchboard status
```

### 2. DeFi Protocol Development

```bash
# Initialize DeFi project
switchboard init my-defi --template defi --dev-mode

cd my-defi

# Deploy core contracts
switchboard deploy --category evm --dev-mode

# Test liquidity pools
npm run test:pools

# Monitor protocol health
switchboard monitor --protocol defi
```

### 3. NFT Collection Launch

```bash
# Initialize NFT project
switchboard init my-nft --template nft --dev-mode

cd my-nft

# Deploy to NFT-friendly networks
switchboard deploy --networks sepolia,mumbai,near-testnet

# Mint test NFTs
npm run mint:test

# Test marketplace integration
npm run test:marketplace
```

### 4. Cross-Chain Bridge

```bash
# Initialize bridge project
switchboard init my-bridge --template bridge --dev-mode

cd my-bridge

# Deploy bridge contracts
switchboard deploy --networks sepolia,mumbai,arbitrum-goerli

# Test cross-chain transfers
npm run test:bridge

# Monitor bridge activity
switchboard monitor --bridge
```

---

## 📚 Learning Resources

### Documentation
- [SDK Documentation](../packages/sdk/README.md)
- [CLI Documentation](./cli/README.md)
- [Architecture Guide](./architecture/core-system-architecture.md)
- [Supported Networks](./supported-chains.md)

### Examples
- [Simple Token](../examples/simple-token/)
- [DeFi Protocol](../examples/defi-protocol/)
- [NFT Collection](../examples/nft-collection/)
- [Cross-Chain Bridge](../examples/cross-chain-bridge/)
- [GameFi Platform](../examples/gamefi-platform/)

### Tutorials
```bash
# Interactive tutorials
cd examples/simple-token && npm run tutorial
cd examples/defi-protocol && npm run tutorial
cd examples/nft-collection && npm run tutorial
```

### Video Guides
- [Switchboard in 5 Minutes](https://youtube.com/watch?v=switchboard-5min)
- [Cross-Chain Development Masterclass](https://youtube.com/watch?v=switchboard-masterclass)
- [Production Deployment Guide](https://youtube.com/watch?v=switchboard-production)

---

## 🚨 Production Checklist

Before deploying to production mode:

### Security Checklist
- [ ] Use hardware wallet or secure key management
- [ ] Audit smart contracts
- [ ] Test on testnets thoroughly
- [ ] Verify all contract addresses
- [ ] Set up monitoring and alerts

### Configuration Checklist
- [ ] Switch to mainnet RPC URLs
- [ ] Update gas price strategies
- [ ] Configure proper confirmations
- [ ] Set up backup RPC providers
- [ ] Enable verification on all networks

### Testing Checklist
- [ ] Complete end-to-end testing
- [ ] Load testing for high traffic
- [ ] Cross-chain state verification
- [ ] Failover testing
- [ ] Recovery procedures tested

### Deployment Commands
```bash
# Final production deployment
switchboard init my-app --prod-mode
switchboard validate --all
switchboard deploy --prod-mode --verify
switchboard monitor --production
```

---

## 🆘 Troubleshooting

### Common Issues

#### 1. RPC Connection Errors
```bash
# Test network connectivity
switchboard test:rpc --network sepolia

# Use alternative RPC
switchboard config set sepolia.rpcUrl https://alternative-rpc.com

# Check network status
switchboard health --network sepolia
```

#### 2. Gas Estimation Failures
```bash
# Set manual gas price
switchboard deploy --gas-price 20000000000

# Enable gas optimization
switchboard config set gasOptimization true

# Use gas price oracle
switchboard config set gasStrategy dynamic
```

#### 3. Contract Verification Issues
```bash
# Skip verification temporarily
switchboard deploy --no-verify

# Verify manually later
switchboard verify --contract MyContract --network sepolia

# Check verification status
switchboard verify:status --deployment-id abc123
```

#### 4. Cross-Chain Sync Issues
```bash
# Check Solana coordination layer
switchboard status:solana

# Retry failed synchronization
switchboard sync:retry --deployment-id abc123

# Force state update
switchboard sync:force --deployment-id abc123
```

### Debug Mode
```bash
# Enable verbose logging
export DEBUG=switchboard:*

# Run with debug output
switchboard deploy --debug --verbose

# Save debug logs
switchboard deploy --debug --log-file debug.log
```

### Getting Help
- [GitHub Issues](https://github.com/switchboard/switchboard/issues)
- [Discord Community](https://discord.gg/switchboard)
- [Developer Forum](https://forum.switchboard.network)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/switchboard)

---

## ⚡ Performance Tips

### Optimization Strategies
1. **Use RPC multiplexing** for faster responses
2. **Enable gas optimization** for cost reduction
3. **Use parallel deployments** when possible
4. **Cache contract ABIs** for faster compilation
5. **Use local networks** for rapid testing

### Recommended RPC Providers
- **Ethereum**: Infura, Alchemy, QuickNode
- **Polygon**: Polygon RPC, Infura
- **Arbitrum**: Arbitrum RPC, Alchemy
- **Avalanche**: Avalanche RPC, Moralis
- **NEAR**: NEAR RPC, All That Node

---

## 🎉 Next Steps

Now that you're set up with Switchboard:

1. **Build your first dApp** using our templates
2. **Join our community** for support and updates
3. **Contribute** to the Switchboard ecosystem
4. **Share your projects** with the community
5. **Stay updated** with new network integrations

### Community Links
- [Discord](https://discord.gg/switchboard)
- [Twitter](https://twitter.com/switchboard)
- [GitHub](https://github.com/switchboard/switchboard)
- [Blog](https://blog.switchboard.network)

### Contributing
See our [Contributing Guide](./development/contributing.md) to help improve Switchboard.

---

Welcome to the future of cross-chain development! 🚀