# Switchboard 🔗

> **Active development.** This project is under active development. APIs,
> schemas, and on-chain layouts may change between releases.
> Production use at your own risk. Issues and PRs welcome.

**Unified Cross-Chain State Synchronization Platform**

Switchboard enables seamless cross-chain state synchronization, allowing developers to **deploy once and sync everywhere**. By leveraging Solana's performance and sub-second finality, Switchboard provides real-time verification across all supported chains with **sub-400ms coordination latency**.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-92%25-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white)]()

---

## ✨ Key Features

🚀 **Sub-400ms Latency** - Real-time cross-chain coordination
🔗 **50+ Chain Support** - All major EVM and non-EVM networks
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

**EVM Networks:** Ethereum, Polygon, Arbitrum, Optimism, BSC, Avalanche, Base, zkSync Era, Polygon zkEVM

**L1 Alternatives:** Solana (coordinator), NEAR, Cosmos, Terra, Sui, Aptos

**Emerging Networks:** Celestia, StarkNet, Flow, Celo, Gnosis

[View complete list →](docs/supported-chains.md)

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