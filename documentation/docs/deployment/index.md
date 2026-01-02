# Deployment Guide

This section covers deploying ChainSync services in various environments.

## Deployment Options

| Option | Best For | Complexity |
|--------|----------|------------|
| [Docker](docker.md) | Development, small teams | Low |
| [Production](production.md) | Production workloads | Medium |
| [Cloud Providers](cloud.md) | Scalable production | High |

## Quick Start

### Development Deployment

```bash
# Clone repository
git clone https://github.com/chainsync/chainsync
cd chainsync

# Copy environment config
cp .env.example .env

# Start with Docker
docker-compose up -d
```

### Verify Deployment

```bash
# Check Customer API
curl http://localhost:3000/health

# Check Core Engine
curl http://localhost:3001/health
```

## Architecture Recap

ChainSync uses a 2-service architecture:

```
┌─────────────────┐    ┌──────────────────┐
│  Customer API   │────│   Core Engine    │
│   (Port 3000)   │    │   (Port 3001)    │
└─────────────────┘    └──────────────────┘
        │                      │
        └──────────┬───────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌───────┐    ┌─────────┐    ┌───────────┐
│MongoDB│    │  Redis  │    │ClickHouse │
│  or   │    │         │    │           │
│Postgres│   └─────────┘    └───────────┘
└───────┘
```

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 20 GB | 100+ GB SSD |
| OS | Linux, macOS | Ubuntu 22.04 |

### Software Requirements

- Docker 20+
- Docker Compose 2+
- Node.js 18+ (for development)

## Environment Configuration

Key environment variables:

```bash
# Service Configuration
NODE_ENV=production

# Database (choose one)
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb://localhost:27017/chainsync

# Or PostgreSQL
DATABASE_TYPE=postgresql
POSTGRES_URL=postgres://localhost:5432/chainsync

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Security
JWT_SECRET=your-secure-secret
```

See [Configuration Guide](../configuration/index.md) for complete options.

## Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| Customer API | 3000 | Public API gateway |
| Core Engine | 3001 | Internal backend |
| MongoDB | 27017 | Database |
| PostgreSQL | 5432 | Database (alternative) |
| Redis | 6379 | Cache |
| ClickHouse | 8123 | Analytics |

## Next Steps

- [Docker Deployment](docker.md) - Local and development deployment
- [Production Deployment](production.md) - Production-ready setup
- [Cloud Providers](cloud.md) - AWS, GCP, Azure deployment
