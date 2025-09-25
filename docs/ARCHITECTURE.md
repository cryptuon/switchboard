# ChainSync 2-Service Architecture

ChainSync has been restructured from multiple microservices into a simplified 2-service architecture for easier deployment and maintenance.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐
│  Customer API   │────│   Core Engine    │
│   (Port 3000)   │    │   (Port 3001)    │
│                 │    │                  │
│ • Authentication│    │ • Oracle Service │
│ • API Gateway   │    │ • Blockchain Ops │
│ • Rate Limiting │    │ • Billing Logic  │
│ • CORS & Security│   │ • Cross-chain    │
│ • Request Proxy │    │   Coordination   │
└─────────────────┘    └──────────────────┘
```

## Services

### Customer API Service (Port 3000)
- **Purpose**: Customer-facing API gateway
- **Location**: `packages/services/customer-api/`
- **Responsibilities**:
  - Authentication (JWT, user management, API keys)
  - API gateway and request routing
  - Rate limiting and security
  - Proxying requests to Core Engine

### Core Engine Service (Port 3001)
- **Purpose**: Backend processing and business logic
- **Location**: `packages/services/core-engine/`
- **Responsibilities**:
  - Blockchain oracle and state coordination
  - Cross-chain deployment execution
  - Payment processing with Stripe
  - Real-time streaming and metrics
  - Database operations

## Database Support

ChainSync now supports **swappable databases**:

- **MongoDB** (default): Document-based storage
- **PostgreSQL**: Relational database with Sequelize ORM

Configure via `DATABASE_TYPE` environment variable:
```bash
# Use MongoDB
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb://chainsync:password@localhost:27017/chainsync

# OR use PostgreSQL
DATABASE_TYPE=postgresql
POSTGRES_URL=postgres://chainsync:password@localhost:5432/chainsync
```

## Deployment

### Development
```bash
# Start with MongoDB
docker-compose up customer-api core-engine mongodb redis clickhouse

# Start with PostgreSQL
DATABASE_TYPE=postgresql docker-compose --profile postgres up
```

### Production
```bash
# Deploy both services
docker-compose -f docker-compose.yml up -d
```

## Migration from Old Architecture

The previous microservices have been consolidated:
- `api-service` → `customer-api` (customer-facing)
- `oracle-service` + `sync-service` + `billing-service` → `core-engine` (backend)

## API Endpoints

All customer requests go through Customer API (port 3000):

```
# Authentication
POST /auth/login
POST /auth/register

# Blockchain Operations (proxied to Core Engine)
GET  /api/v1/chains
POST /api/v1/deploy
GET  /api/v1/deploy/{id}/status
GET  /api/v1/transactions

# Billing (proxied to Core Engine)
GET  /api/v1/billing/plans
POST /api/v1/billing/customers
POST /api/v1/billing/subscriptions

# Health & Metrics
GET  /health
GET  /api/v1/metrics/streaming
```

## Benefits

1. **Simplified Deployment**: Only 2 services instead of 6+
2. **Easier Development**: Less complex service interactions
3. **Database Flexibility**: MongoDB or PostgreSQL support
4. **Maintained Performance**: Same sub-400ms latency targets
5. **Single API Endpoint**: All requests through port 3000