# Architecture Overview

Switchboard is built on a simplified 2-service architecture designed for easy deployment, maintenance, and scalability.

## Design Principles

1. **Simplicity** - Two services instead of many microservices
2. **Performance** - Sub-400ms cross-chain coordination latency
3. **Flexibility** - Swappable database backends
4. **Scalability** - Horizontal scaling capabilities
5. **Security** - Enterprise-grade authentication and encryption

## System Overview

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                      Switchboard                          │
                    │                                                         │
┌──────────┐        │  ┌─────────────────┐    ┌──────────────────┐           │
│  Client  │───────▶│  │  Customer API   │────│   Core Engine    │           │
│  Apps    │        │  │   (Port 3000)   │    │   (Port 3001)    │           │
└──────────┘        │  │                 │    │                  │           │
                    │  │ • Authentication│    │ • Oracle Service │           │
                    │  │ • API Gateway   │    │ • Blockchain Ops │           │
                    │  │ • Rate Limiting │    │ • Billing Logic  │           │
                    │  │ • Security      │    │ • Cross-chain    │           │
                    │  │ • Request Proxy │    │   Coordination   │           │
                    │  └─────────────────┘    └────────┬─────────┘           │
                    │                                  │                      │
                    │         ┌────────────────────────┼────────────────────┐ │
                    │         │                        │                    │ │
                    │         ▼                        ▼                    ▼ │
                    │  ┌───────────┐           ┌───────────┐         ┌─────────┐
                    │  │  MongoDB  │           │   Redis   │         │ClickHouse│
                    │  │    or     │           │  (Cache)  │         │(Analytics)│
                    │  │PostgreSQL │           └───────────┘         └─────────┘
                    │  └───────────┘                                          │
                    └─────────────────────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         ▼                         │
                    │              ┌──────────────────┐                 │
                    │              │      Solana      │                 │
                    │              │   Coordination   │                 │
                    │              │      Layer       │                 │
                    │              └────────┬─────────┘                 │
                    │                       │                           │
         ┌──────────┼───────────────────────┼───────────────────────────┼──────────┐
         │          │                       │                           │          │
         ▼          ▼                       ▼                           ▼          ▼
    ┌─────────┐┌─────────┐           ┌───────────┐             ┌─────────┐┌─────────┐
    │Ethereum ││ Polygon │    ...    │ Arbitrum  │     ...     │  NEAR   ││   Sui   │
    └─────────┘└─────────┘           └───────────┘             └─────────┘└─────────┘
```

## Services

### Customer API (Port 3000)

The customer-facing gateway that handles all external requests.

**Responsibilities:**

| Function | Description |
|----------|-------------|
| Authentication | JWT tokens, user management, API keys |
| API Gateway | Request routing and load balancing |
| Rate Limiting | Per-user and global rate limits |
| Security | CORS, input validation, request sanitization |
| Request Proxy | Forwarding requests to Core Engine |

**Location:** `packages/services/customer-api/`

### Core Engine (Port 3001)

The backend service handling all business logic and blockchain operations.

**Responsibilities:**

| Function | Description |
|----------|-------------|
| Oracle Service | Multi-chain data collection and verification |
| Blockchain Ops | Contract deployment and transaction execution |
| Billing | Payment processing with Stripe integration |
| Cross-chain Coordination | State synchronization across chains |
| Metrics | Real-time streaming and analytics |

**Location:** `packages/services/core-engine/`

## Data Flow

### Request Flow

1. **Client Request** → Customer API (port 3000)
2. **Authentication** → JWT validation or API key check
3. **Rate Limiting** → Check user quota
4. **Proxy** → Forward to Core Engine (port 3001)
5. **Processing** → Execute blockchain operations
6. **Response** → Return results to client

### Cross-Chain Coordination Flow

1. **Transaction Initiated** → Core Engine receives deployment request
2. **Solana Registration** → State registered on coordination layer
3. **Multi-Chain Execution** → Parallel deployment to target chains
4. **Verification** → Cross-chain state verification (< 400ms)
5. **Confirmation** → Final state confirmed to client

## Database Architecture

Switchboard supports swappable database backends:

=== "MongoDB"

    ```bash
    DATABASE_TYPE=mongodb
    MONGODB_URL=mongodb://switchboard:password@localhost:27017/switchboard
    ```

    Best for:

    - Flexible schema requirements
    - Document-based data models
    - Rapid development

=== "PostgreSQL"

    ```bash
    DATABASE_TYPE=postgresql
    POSTGRES_URL=postgres://switchboard:password@localhost:5432/switchboard
    ```

    Best for:

    - Relational data requirements
    - Complex queries
    - ACID compliance needs

### Additional Data Stores

| Store | Purpose |
|-------|---------|
| **Redis** | Session caching, rate limiting counters |
| **ClickHouse** | Real-time analytics, event streaming |

## Next Steps

- [2-Service Architecture](two-service-architecture.md) - Deep dive into the services
- [Solana Coordination](solana-coordination.md) - How cross-chain sync works
- [Supported Chains](supported-chains.md) - Complete list of networks
