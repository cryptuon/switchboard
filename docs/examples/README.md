# ChainSync Examples

This directory contains practical examples showing how to use ChainSync for various cross-chain use cases.

## Getting Started

Each example includes:
- Complete source code
- Step-by-step tutorial
- Network-specific configurations
- Testing instructions

## Available Examples

### 1. Simple Cross-Chain Token Deployment
**Directory:** `simple-token/`
**Networks:** Ethereum, Polygon, Arbitrum

Deploy a simple ERC20 token across multiple EVM networks.

```bash
# Navigate to example
cd examples/simple-token

# Follow the tutorial
cat README.md
```

### 2. DeFi Protocol Multi-Chain Launch
**Directory:** `defi-protocol/`
**Networks:** Ethereum, Polygon, Arbitrum, Avalanche, BSC

Launch a complete DeFi protocol with lending, borrowing, and yield farming across major DeFi networks.

### 3. NFT Collection Cross-Chain
**Directory:** `nft-collection/`
**Networks:** Ethereum, Polygon, Flow, NEAR

Deploy and manage NFT collections across different blockchain ecosystems.

### 4. Cross-Chain Bridge Implementation
**Directory:** `cross-chain-bridge/`
**Networks:** Ethereum, Polygon, Arbitrum, Optimism

Build a secure cross-chain bridge for asset transfers.

### 5. Multi-Ecosystem GameFi Platform
**Directory:** `gamefi-platform/`
**Networks:** Ethereum, Polygon, NEAR, Sui, Solana

Create a gaming platform that works across different blockchain ecosystems.

## Quick Start Commands

### Initialize Example Projects

```bash
# Simple token deployment
chainsync init my-token --template simple-token
cd my-token
chainsync deploy --networks ethereum,polygon,arbitrum

# DeFi protocol
chainsync init my-defi --template defi-protocol
cd my-defi
chainsync deploy --category evm --exclude mainnet

# NFT collection
chainsync init my-nft --template nft-collection
cd my-nft
chainsync deploy --networks ethereum,polygon,flow,near
```

### Run Example Tutorials

Each example directory contains an interactive tutorial:

```bash
# Run the token tutorial
cd examples/simple-token
npm run tutorial

# Run the DeFi tutorial
cd examples/defi-protocol
npm run tutorial:interactive

# Run the NFT tutorial
cd examples/nft-collection
npm run tutorial:guided
```

## Example Categories

### By Use Case
- **DeFi**: Lending, DEXs, Yield Farming, Staking
- **NFTs**: Collections, Marketplaces, Gaming Assets
- **Gaming**: GameFi, Play-to-Earn, Virtual Worlds
- **Infrastructure**: Bridges, Oracles, Identity
- **Enterprise**: Supply Chain, Digital Assets, Compliance

### By Network Type
- **EVM-Only**: Pure Ethereum ecosystem examples
- **Multi-EVM**: Multiple EVM-compatible networks
- **Cross-Ecosystem**: EVM + NEAR + Sui + Cosmos
- **Solana-Integrated**: Using Solana as coordination layer

### By Complexity
- **Beginner**: Simple token deployments
- **Intermediate**: Multi-contract systems
- **Advanced**: Complex cross-chain protocols

## Learning Path

### 1. Start with Simple Examples
```bash
# Begin here
cd examples/simple-token
npm run tutorial

# Then try
cd examples/basic-bridge
npm run tutorial
```

### 2. Explore Multi-Network Examples
```bash
# Multi-EVM deployment
cd examples/defi-protocol
npm run tutorial

# Cross-ecosystem
cd examples/gamefi-platform
npm run tutorial
```

### 3. Advanced Use Cases
```bash
# Complex protocols
cd examples/advanced-bridge
npm run tutorial

# Custom integrations
cd examples/custom-connector
npm run tutorial
```

## Testing Examples

Each example includes comprehensive tests:

```bash
# Run all tests for an example
cd examples/simple-token
npm test

# Run network-specific tests
npm run test:ethereum
npm run test:polygon

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

## Example Structure

Each example follows this structure:

```
example-name/
├── README.md           # Detailed tutorial
├── package.json        # Dependencies and scripts
├── chainsync.config.js # Network configuration
├── contracts/          # Smart contracts
│   ├── evm/           # EVM contracts
│   ├── near/          # NEAR contracts
│   └── sui/           # Sui contracts
├── scripts/           # Deployment and utility scripts
├── tests/             # Comprehensive test suites
└── docs/              # Additional documentation
```

## Contributing Examples

Want to contribute an example? See our [Contributing Guide](../development/contributing.md).

### Example Contribution Guidelines

1. **Complete Tutorial**: Include step-by-step instructions
2. **Multiple Networks**: Support at least 3 different networks
3. **Test Coverage**: Include comprehensive tests
4. **Documentation**: Clear README with explanations
5. **Real Use Case**: Address a practical blockchain problem

### Submitting Examples

```bash
# Create new example
mkdir examples/my-example
cd examples/my-example

# Initialize structure
chainsync init . --template example-base

# Develop your example
# Add contracts, scripts, tests, documentation

# Submit pull request
git add .
git commit -m "Add example: my-example"
git push origin feature/my-example
```

## Example Resources

### Templates
- `simple-token`: Basic ERC20 deployment
- `defi-protocol`: Complete DeFi platform
- `nft-collection`: NFT marketplace
- `gamefi-platform`: Gaming ecosystem
- `bridge`: Cross-chain bridge
- `dao`: Governance system

### Network Configurations
Each example includes pre-configured network settings for:
- **Mainnet**: Production deployments
- **Testnet**: Development and testing
- **Local**: Local development networks

### Utility Scripts
- `deploy.js`: Multi-network deployment
- `verify.js`: Contract verification
- `test.js`: Comprehensive testing
- `monitor.js`: Health monitoring
- `migrate.js`: Database migrations

## Community Examples

Explore examples contributed by the community:

- [ChainSync Awesome Examples](https://github.com/chainsync/awesome-examples)
- [Community Showcase](https://showcase.chainsync.network)
- [Developer Gallery](https://developers.chainsync.network/gallery)

## Support

Need help with examples?

- [GitHub Discussions](https://github.com/chainsync/chainsync/discussions)
- [Discord Community](https://discord.gg/chainsync)
- [Developer Forum](https://forum.chainsync.network)