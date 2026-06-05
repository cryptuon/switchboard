# Environment Variables

Complete reference for all Switchboard environment variables.

## Service Configuration

### Core Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `METRICS_ENABLED` | Enable Prometheus metrics | `true` | No |

```bash
NODE_ENV=production
LOG_LEVEL=info
METRICS_ENABLED=true
```

### Service URLs

| Variable | Description | Default |
|----------|-------------|---------|
| `CUSTOMER_API_URL` | Customer API URL | `http://localhost:3000` |
| `CORE_ENGINE_URL` | Core Engine URL | `http://localhost:3001` |

```bash
CUSTOMER_API_URL=http://localhost:3000
CORE_ENGINE_URL=http://localhost:3001
```

## Database Configuration

### Database Type

| Variable | Description | Options |
|----------|-------------|---------|
| `DATABASE_TYPE` | Database backend | `mongodb`, `postgresql` |

### MongoDB

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URL` | MongoDB connection URL | Yes (if MongoDB) |
| `MONGODB_PASSWORD` | MongoDB password | For Docker |

```bash
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb://switchboard:password@localhost:27017/switchboard
```

### PostgreSQL

| Variable | Description | Required |
|----------|-------------|----------|
| `POSTGRES_URL` | PostgreSQL connection URL | Yes (if PostgreSQL) |
| `POSTGRES_PASSWORD` | PostgreSQL password | For Docker |

```bash
DATABASE_TYPE=postgresql
POSTGRES_URL=postgres://switchboard:password@localhost:5432/switchboard
```

### Analytics (ClickHouse)

| Variable | Description | Required |
|----------|-------------|----------|
| `CLICKHOUSE_URL` | ClickHouse connection URL | No |
| `CLICKHOUSE_PASSWORD` | ClickHouse password | For Docker |

```bash
CLICKHOUSE_URL=http://switchboard:password@localhost:8123/chainsync_analytics
```

### Cache (Redis)

| Variable | Description | Required |
|----------|-------------|----------|
| `REDIS_URL` | Redis connection URL | No |

```bash
REDIS_URL=redis://localhost:6379
```

## Solana Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SOLANA_NETWORK` | Solana network | `devnet` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | - |
| `SOLANA_KEYPAIR_PATH` | Path to keypair JSON | - |
| `STATE_ORACLE_PROGRAM_ID` | State Oracle program | - |
| `COORDINATOR_PROGRAM_ID` | Coordinator program | - |

```bash
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_KEYPAIR_PATH=/path/to/keypair.json
STATE_ORACLE_PROGRAM_ID=<program_address>
COORDINATOR_PROGRAM_ID=<program_address>
```

## EVM Chain RPC URLs

### Major Networks

| Variable | Network |
|----------|---------|
| `ETHEREUM_RPC_URL` | Ethereum |
| `POLYGON_RPC_URL` | Polygon |
| `ARBITRUM_RPC_URL` | Arbitrum |
| `OPTIMISM_RPC_URL` | Optimism |
| `BSC_RPC_URL` | BNB Smart Chain |
| `AVALANCHE_RPC_URL` | Avalanche |
| `FANTOM_RPC_URL` | Fantom |

### Layer 2 Solutions

| Variable | Network |
|----------|---------|
| `BASE_RPC_URL` | Base |
| `ZKSYNC_RPC_URL` | zkSync Era |
| `POLYGONZKEVM_RPC_URL` | Polygon zkEVM |
| `LINEA_RPC_URL` | Linea |
| `MANTLE_RPC_URL` | Mantle |
| `SCROLL_RPC_URL` | Scroll |

### Alternative Layer 1s

| Variable | Network |
|----------|---------|
| `NEAR_RPC_URL` | NEAR Protocol |
| `COSMOS_RPC_URL` | Cosmos Hub |
| `TERRA_RPC_URL` | Terra |
| `SUI_RPC_URL` | Sui |
| `APTOS_RPC_URL` | Aptos |

### Example Configuration

```bash
# EVM Networks
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-goerli.g.alchemy.com/v2/YOUR_KEY

# Layer 2
BASE_RPC_URL=https://base-goerli.g.alchemy.com/v2/YOUR_KEY
ZKSYNC_RPC_URL=https://testnet.era.zksync.dev

# Alternative L1s
NEAR_RPC_URL=https://rpc.testnet.near.org
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
```

## Security

### Authentication

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | JWT signing secret | Yes |
| `API_RATE_LIMIT` | Requests per minute | No |

```bash
JWT_SECRET=your-secure-random-secret-at-least-32-chars
API_RATE_LIMIT=100
```

### API Keys

| Variable | Description |
|----------|-------------|
| `ALCHEMY_API_KEY` | Alchemy API key |
| `CHAINSYNC_API_KEY` | Switchboard API key |

```bash
ALCHEMY_API_KEY=your-alchemy-key
CHAINSYNC_API_KEY=your-api-key
```

## Billing (Stripe)

| Variable | Description | Required |
|----------|-------------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret key | For billing |
| `STRIPE_PUBLIC_KEY` | Stripe public key | For billing |
| `STRIPE_WEBHOOK_SECRET` | Webhook secret | For billing |

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Streaming Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `STREAMING_ENABLED` | Enable real-time streaming | `true` |
| `COORDINATION_LATENCY_TARGET` | Target latency (ms) | `400` |
| `BATCH_PROCESSING_SIZE` | Batch size | `50` |
| `MAX_CONCURRENT_CHAINS` | Max parallel chains | `100` |

```bash
STREAMING_ENABLED=true
COORDINATION_LATENCY_TARGET=400
BATCH_PROCESSING_SIZE=50
MAX_CONCURRENT_CHAINS=100
```

## Monitoring

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Sentry error tracking |
| `PROMETHEUS_PORT` | Prometheus metrics port |

```bash
SENTRY_DSN=https://...@sentry.io/...
PROMETHEUS_PORT=9090
```

## Complete Example

```bash
# Service Configuration
NODE_ENV=production
LOG_LEVEL=info
METRICS_ENABLED=true

# Database
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb://switchboard:password@mongodb:27017/switchboard

# Redis Cache
REDIS_URL=redis://redis:6379

# ClickHouse Analytics
CLICKHOUSE_URL=http://switchboard:password@clickhouse:8123/chainsync_analytics

# Solana
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_KEYPAIR_PATH=/secrets/keypair.json

# EVM Networks
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/KEY

# Security
JWT_SECRET=super-secure-random-secret-minimum-32-characters
API_RATE_LIMIT=100

# Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Streaming
STREAMING_ENABLED=true
COORDINATION_LATENCY_TARGET=400

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
```
