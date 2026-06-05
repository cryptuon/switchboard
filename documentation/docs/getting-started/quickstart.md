# Quick Start

Get Switchboard running in under 5 minutes.

## Step 1: Install the CLI

```bash
# Install Switchboard CLI globally
npm install -g @switchboard/cli

# Verify installation
switchboard --version
```

## Step 2: Create a Project

```bash
# Initialize a new project in development mode (uses testnets)
switchboard init my-first-dapp --dev-mode

cd my-first-dapp
```

This creates a project with:

```
my-first-dapp/
├── switchboard.config.js     # Main configuration
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
# Switchboard can help you get test tokens
switchboard faucet --network sepolia --address YOUR_ADDRESS
switchboard faucet --network mumbai --address YOUR_ADDRESS
```

Or visit faucet websites:

- **Sepolia**: [sepoliafaucet.com](https://sepoliafaucet.com/)
- **Mumbai**: [faucet.polygon.technology](https://faucet.polygon.technology/)
- **Fuji**: [faucet.avax.network](https://faucet.avax.network/)

## Step 5: Deploy

```bash
# Deploy to development networks (testnets)
switchboard deploy --dev-mode

# Or deploy to specific networks
switchboard deploy --networks sepolia,mumbai,fuji
```

## Step 6: Monitor

```bash
# Check deployment status
switchboard status

# Real-time monitoring
switchboard status --watch
```

---

## What's Next?

- [Installation Guide](installation.md) - Explore all installation options
- [First Deployment](first-deployment.md) - Detailed walkthrough of your first deployment
- [Architecture Overview](../architecture/index.md) - Understand how Switchboard works

## Common Issues

### RPC Connection Errors

```bash
# Test network connectivity
switchboard test:rpc --network sepolia

# Check network status
switchboard health --network sepolia
```

### Gas Estimation Failures

```bash
# Set manual gas price
switchboard deploy --gas-price 20000000000

# Enable gas optimization
switchboard config set gasOptimization true
```

### Need Help?

- Check the [Troubleshooting Guide](../support/troubleshooting.md)
- Ask in [Discord](https://discord.gg/switchboard)
- Open an [Issue on GitHub](https://github.com/switchboard/switchboard/issues)
