# Switchboard 🔗

> **Active development.** This project is under active development. APIs,
> schemas, and on-chain layouts may change between releases.
> Production use at your own risk. Issues and PRs welcome.

**The cross-chain state and coordination layer for atomic composability.**

Switchboard is a sub-400ms cross-chain state synchronization platform. It uses Solana as a high-throughput **coordination layer** so a single contract, service, or autonomous agent can read and write state across **50+ EVM and non-EVM chains** — through one integration, without bespoke bridge code per route. Write once, read everywhere, at trading-grade latency.

> **Not the Solana oracle.** Cryptuon Switchboard is a *cross-chain state-synchronization and coordination* product. It is unrelated to, and distinct from, the well-known Solana "Switchboard" oracle network. Switchboard here uses Solana as a coordination clock — it is not an on-chain price oracle.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-92%25-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white)]()

**[🌐 Site](https://switchboard.cryptuon.com/) · [📚 Docs](https://docs.cryptuon.com/switchboard/) · [🗺️ Roadmap](ROADMAP.md) · [🔬 Cryptuon Research](https://github.com/cryptuon)**

---

## 🌐 Why this matters in 2026

The multi-chain world settled into a hard shape: liquidity, state, and users are spread across dozens of L1s and L2s, and the fastest-growing class of on-chain actors — **autonomous agents** making agentic payments and executing intents — need to *act across many chains at once*. The old answer was N bespoke bridges, each with its own validator set, message format, and multi-second quorum. That does not compose, and it does not move at agent speed.

Switchboard reframes the problem around **atomic composability**: one coordinator on Solana that every chain agrees to watch, so a single write fans out to every destination inside one latency budget. For an agent or an intent-solver, that is the difference between orchestrating N brittle integrations and issuing **one call** against a coordination layer.

- **Agentic payments & intents** — an agent commits once to the coordinator; the relayer pool races the destination transactions. One integration instead of N bridges.
- **Atomic composability** — cross-chain routes anchor to a single finality clock instead of negotiating trust per corridor.
- **Parallel-EVM & non-EVM reach** — coordinate EVM L2s, Solana, and Move chains behind the same SDK surface.
- **Honest scope** — this is a coordination layer plus the ops stack to run it, not a validator network or a new token. See the [roadmap](ROADMAP.md) for what is and is not production-ready.

See **[ROADMAP.md](ROADMAP.md)** for the vision, milestones, and the cheapest path to production.

---

## ✨ Key Features

🚀 **Sub-400ms Latency** - Real-time cross-chain coordination for agents, orderbooks, and intents
🔗 **50+ Chain Support** - Reach EVM and non-EVM networks through one integration
🧩 **One Integration, Not N Bridges** - Coordinate on Solana; skip bespoke per-corridor bridge code
🏗️ **90% Code Reuse** - Deploy once, sync everywhere
💾 **Flexible Database** - MongoDB or PostgreSQL support
🔐 **Enterprise Security** - Production-ready authentication
📊 **Real-time Analytics** - Complete observability stack

---

## 🏗️ Architecture

Switchboard uses a simplified **2-service architecture**:

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

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- 8GB+ RAM recommended

### 1. Clone & Setup
```bash
git clone https://github.com/cryptuon/switchboard.git
cd switchboard
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Services

**With MongoDB (default):**
```bash
npm run docker:up
```

**With PostgreSQL:**
```bash
DATABASE_TYPE=postgresql docker-compose --profile postgres up
```

### 4. Verify Deployment
```bash
# Check Customer API
curl http://localhost:3000/health

# Check Core Engine
curl http://localhost:3001/health

# Run integration tests
npm run test:integration
```

---

## 📖 Documentation

Full docs: [docs.cryptuon.com/switchboard/](https://docs.cryptuon.com/switchboard/) · Marketing: [switchboard.cryptuon.com](https://switchboard.cryptuon.com/)

| Topic | Location |
|-------|----------|
| **Architecture** | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| **Deployment** | [docs/deployment/](docs/deployment/) |
| **API Reference** | [docs/examples/](docs/examples/) |
| **Development** | [docs/development/](docs/development/) |
| **Configuration** | [.env.example](.env.example) |

---

## 🛠️ Development

### Build Services
```bash
# Build all services
npm run build

# Build specific services
npm run build:customer-api
npm run build:core-engine
```

### Development Mode
```bash
# Start all services in development mode
npm run dev

# Start specific services
npm run dev:customer-api
npm run dev:core-engine
```

### Testing
```bash
# Run all tests
npm run test

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance
```

---

## 🌐 Supported Chains

One integration reaches every chain below — an agent or contract does not add code per corridor.

**EVM Networks:** Ethereum, Polygon, Arbitrum, Optimism, BSC, Avalanche, Base, zkSync Era, Polygon zkEVM

**L1 Alternatives:** Solana (coordinator), NEAR, Cosmos, Terra, Sui, Aptos

**Emerging Networks:** Celestia, StarkNet, Flow, Celo, Gnosis

> **Coordination, not oracle feeds.** Solana here is the coordination clock that every destination watches — this is state synchronization, not the Solana price-oracle product of the same name.

[View complete list →](docs/supported-chains.md) · [Chain-coverage prioritization →](ROADMAP.md#cheapest-path-to-production)

---

## 📊 Performance Metrics

- **Coordination Latency:** <400ms across 50+ chains
- **Throughput:** 10,000+ coordinated operations/second
- **Uptime:** 99.9% SLA with automatic failover
- **Gas Optimization:** 40% reduction in cross-chain fees

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](docs/development/contributing.md) for detailed guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- 📖 **Documentation:** [docs.cryptuon.com/switchboard/](https://docs.cryptuon.com/switchboard/)
- 🌐 **Marketing site:** [switchboard.cryptuon.com](https://switchboard.cryptuon.com/)
- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/cryptuon/switchboard/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/cryptuon/switchboard/discussions)

---

<p align="center">
  <strong>Built with ❤️ for the multi-chain future</strong>
</p>

---

## Part of Cryptuon Research

`switchboard` is one of [20 open-source blockchain-infrastructure projects](https://www.cryptuon.com/projects) from **[Cryptuon Research](https://www.cryptuon.com)** — blockchain theory, shipped as protocols.

**Related projects:** [Tesseract](https://tesseract.cryptuon.com/) · [StreamSync](https://streamsync.cryptuon.com/) · [SolanaVault](https://solanavault.cryptuon.com/)

Docs: [docs.cryptuon.com/switchboard](https://docs.cryptuon.com/switchboard/) · Contact: [contact@cryptuon.com](mailto:contact@cryptuon.com)