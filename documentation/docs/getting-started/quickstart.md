# Quick Start

Get ChainSync running in under 5 minutes.

## Step 1: Install the CLI

```bash
# Install ChainSync CLI globally
npm install -g @chainsync/cli

# Verify installation
chainsync --version
```

## Step 2: Create a Project

```bash
# Initialize a new project in development mode (uses testnets)
chainsync init my-first-dapp --dev-mode

cd my-first-dapp
```

This creates a project with:

```
my-first-dapp/
├── chainsync.config.js     # Main configuration
├── contracts/              # Smart contracts
│   ├── evm/               # EVM-compatible contracts
│   ├── near/              # NEAR contracts
│   ├── sui/               # Sui Move contracts
│   └── cosmos/            # CosmWasm contracts
├── scripts/               # Deployment scripts
├── tests/                 # Test suites
└── .env.example           # Environment template
```

## Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env
```

Minimum required configuration:

```bash
# Solana (coordination layer)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_solana_private_key

# EVM Networks (testnets)
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your-key
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com

# Private Key (use test key only!)
PRIVATE_KEY=your_test_private_key
```

## Step 4: Get Test Tokens

```bash
# ChainSync can help you get test tokens
chainsync faucet --network sepolia --address YOUR_ADDRESS
chainsync faucet --network mumbai --address YOUR_ADDRESS
```

Or visit faucet websites:

- **Sepolia**: [sepoliafaucet.com](https://sepoliafaucet.com/)
- **Mumbai**: [faucet.polygon.technology](https://faucet.polygon.technology/)
- **Fuji**: [faucet.avax.network](https://faucet.avax.network/)

## Step 5: Deploy

```bash
# Deploy to development networks (testnets)
chainsync deploy --dev-mode

# Or deploy to specific networks
chainsync deploy --networks sepolia,mumbai,fuji
```

## Step 6: Monitor

```bash
# Check deployment status
chainsync status

# Real-time monitoring
chainsync status --watch
```

---

## What's Next?

- [Installation Guide](installation.md) - Explore all installation options
- [First Deployment](first-deployment.md) - Detailed walkthrough of your first deployment
- [Architecture Overview](../architecture/index.md) - Understand how ChainSync works

## Common Issues

### RPC Connection Errors

```bash
# Test network connectivity
chainsync test:rpc --network sepolia

# Check network status
chainsync health --network sepolia
```

### Gas Estimation Failures

```bash
# Set manual gas price
chainsync deploy --gas-price 20000000000

# Enable gas optimization
chainsync config set gasOptimization true
```

### Need Help?

- Check the [Troubleshooting Guide](../support/troubleshooting.md)
- Ask in [Discord](https://discord.gg/chainsync)
- Open an [Issue on GitHub](https://github.com/chainsync/chainsync/issues)
