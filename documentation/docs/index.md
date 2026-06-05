# Switchboard

!!! warning "Under active development"

    Switchboard is under active development. APIs, schemas, and on-chain
    layouts may change. Production use at your own risk.
    Issues + PRs welcome — see the [GitHub repo](https://github.com/cryptuon/switchboard).

**Unified Cross-Chain State Synchronization Platform**

Switchboard enables seamless cross-chain state synchronization, allowing developers to **deploy once and sync everywhere**. By leveraging Solana's performance and sub-second finality, Switchboard provides real-time verification across all supported chains with **sub-400ms coordination latency**.

---

## Key Features

<div class="grid cards" markdown>

-   :rocket:{ .lg .middle } **Sub-400ms Latency**

    ---

    Real-time cross-chain coordination using Solana as the high-performance coordination layer

-   :chains:{ .lg .middle } **50+ Chain Support**

    ---

    All major EVM and non-EVM networks including Ethereum, Polygon, Arbitrum, Solana, NEAR, Cosmos, Sui, and more

-   :building_construction:{ .lg .middle } **90% Code Reuse**

    ---

    Write once, deploy everywhere with unified contract patterns across chains

-   :floppy_disk:{ .lg .middle } **Flexible Database**

    ---

    Choose between MongoDB or PostgreSQL based on your infrastructure needs

</div>

---

## Quick Start

Get started with Switchboard in under 5 minutes:

=== "CLI Installation"

    ```bash
    # Install the CLI globally
    npm install -g @switchboard/cli

    # Verify installation
    switchboard --version
    ```

=== "SDK Installation"

    ```bash
    # Install the SDK for programmatic use
    npm install @switchboard/sdk
    ```

### Create Your First Project

```bash
# Initialize a new project (development mode uses testnets)
switchboard init my-first-dapp --dev-mode

cd my-first-dapp

# Deploy to multiple testnets
switchboard deploy --dev-mode

# Monitor deployment status
switchboard status --watch
```

[Get Started :material-arrow-right:](getting-started/quickstart.md){ .md-button .md-button--primary }
[View Architecture :material-arrow-right:](architecture/index.md){ .md-button }

---

## Architecture Overview

Switchboard uses a simplified **2-service architecture** for easier deployment and maintenance:

```
┌─────────────────┐    ┌──────────────────┐
│  Customer API   │────│   Core Engine    │
│   (Port 3000)   │    │   (Port 3001)    │
│                 │    │                  │
│ • Authentication│    │ • Oracle Service │
│ • API Gateway   │    │ • Blockchain Ops │
│ • Rate Limiting │    │ • Billing Logic  │
│ • Security      │    │ • Cross-chain    │
│ • Request Proxy │    │   Coordination   │
└─────────────────┘    └──────────────────┘
```

| Service | Port | Purpose |
|---------|------|---------|
| **Customer API** | 3000 | Customer-facing API gateway with authentication, rate limiting, and request routing |
| **Core Engine** | 3001 | Backend processing including blockchain operations, billing, and cross-chain coordination |

---

## Supported Networks

Switchboard supports **50+ blockchain networks** across multiple ecosystems:

### EVM Networks
Ethereum, Polygon, Arbitrum, Optimism, BSC, Avalanche, Base, zkSync Era, Polygon zkEVM, Linea, Mantle, Scroll

### Layer 1 Alternatives
Solana (coordinator), NEAR, Cosmos, Terra, Sui, Aptos

### Emerging Networks
Celestia, StarkNet, Flow, Celo, Gnosis, Moonbeam

[View All Supported Chains :material-arrow-right:](architecture/supported-chains.md){ .md-button }

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| **Coordination Latency** | < 400ms across 50+ chains |
| **Throughput** | 10,000+ coordinated operations/second |
| **Uptime** | 99.9% SLA with automatic failover |
| **Gas Optimization** | 40% reduction in cross-chain fees |

---

## Use Cases

<div class="grid cards" markdown>

-   :coin:{ .lg .middle } **Token Deployment**

    ---

    Deploy tokens across multiple chains with synchronized supply and consistent addresses

    [:octicons-arrow-right-24: Token Example](examples/token.md)

-   :bank:{ .lg .middle } **DeFi Protocols**

    ---

    Build cross-chain DeFi with unified liquidity pools and coordinated price feeds

    [:octicons-arrow-right-24: DeFi Example](examples/defi.md)

-   :art:{ .lg .middle } **NFT Collections**

    ---

    Launch NFT collections across chains with synchronized metadata and ownership

    [:octicons-arrow-right-24: NFT Example](examples/nft.md)

-   :bridge_at_night:{ .lg .middle } **Cross-Chain Bridges**

    ---

    Build secure bridges with real-time state verification and automatic reconciliation

    [:octicons-arrow-right-24: Bridge Guide](examples/index.md)

</div>

---

## Getting Help

- **Documentation**: You're reading it!
- **GitHub Issues**: [Report bugs and request features](https://github.com/switchboard/switchboard/issues)
- **Discord**: [Join our community](https://discord.gg/switchboard)
- **Twitter**: [Follow for updates](https://twitter.com/switchboard)
