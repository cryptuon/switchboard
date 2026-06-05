# 2-Service Architecture

Switchboard uses a simplified 2-service architecture, consolidating what was previously 6+ microservices into two focused services.

## Architecture Comparison

### Before (Legacy)

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ API Service │ │Oracle Service│ │ Sync Service│
└─────────────┘ └─────────────┘ └─────────────┘
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│Billing Svc  │ │ Fee Oracle  │ │ Gateway Svc │
└─────────────┘ └─────────────┘ └─────────────┘
```

### After (Current)

```
┌─────────────────┐    ┌──────────────────┐
│  Customer API   │────│   Core Engine    │
│   (Port 3000)   │    │   (Port 3001)    │
└─────────────────┘    └──────────────────┘
```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Simplified Deployment** | Only 2 services to deploy and manage |
| **Easier Development** | Less complex service interactions |
| **Database Flexibility** | MongoDB or PostgreSQL support |
| **Maintained Performance** | Same sub-400ms latency targets |
| **Single API Endpoint** | All requests through port 3000 |

## Customer API Service

### Overview

The Customer API is the public-facing gateway that handles all external requests. It's the only service exposed to the internet.

**Port:** 3000
**Location:** `packages/services/customer-api/`

### Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                      Customer API                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Auth     │  │   Gateway   │  │Rate Limiting│         │
│  │  • JWT      │  │  • Routing  │  │  • Per-user │         │
│  │  • API Keys │  │  • Proxying │  │  • Global   │         │
│  │  • Sessions │  │  • Balancing│  │  • Quotas   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │  Security   │  │   Metrics   │                          │
│  │  • CORS     │  │  • Logging  │                          │
│  │  • Validate │  │  • Tracing  │                          │
│  │  • Sanitize │  │  • Health   │                          │
│  └─────────────┘  └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

#### Authentication

```typescript
// JWT-based authentication
POST /auth/login
POST /auth/register
POST /auth/refresh

// API Key management
POST /auth/api-keys
GET  /auth/api-keys
DELETE /auth/api-keys/:id
```

#### Rate Limiting

Configurable rate limits per user and globally:

```javascript
// Default configuration
{
  windowMs: 60000,  // 1 minute window
  max: 100,         // 100 requests per window
  keyGenerator: (req) => req.user?.id || req.ip
}
```

#### Request Proxying

All API requests are validated and proxied to Core Engine:

```
Client → Customer API → Validate → Core Engine → Response
```

## Core Engine Service

### Overview

The Core Engine handles all backend processing, blockchain operations, and business logic. It's an internal service not exposed publicly.

**Port:** 3001
**Location:** `packages/services/core-engine/`

### Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                       Core Engine                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Oracle    │  │  Blockchain │  │   Billing   │         │
│  │  • Data     │  │  • Deploy   │  │  • Stripe   │         │
│  │  • Verify   │  │  • Execute  │  │  • Plans    │         │
│  │  • Sync     │  │  • Monitor  │  │  • Usage    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Cross-chain │  │  Streaming  │  │  Database   │         │
│  │  • Coordinate│ │  • Events   │  │  • MongoDB  │         │
│  │  • State    │  │  • Metrics  │  │  • Postgres │         │
│  │  • < 400ms  │  │  • Alerts   │  │  • ClickHouse│        │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

#### Oracle Service

Multi-chain data collection and verification:

```typescript
// Collect state from multiple chains
const states = await oracle.collectStates(['ethereum', 'polygon', 'arbitrum']);

// Verify cross-chain consistency
const isValid = await oracle.verifyConsistency(states);
```

#### Blockchain Operations

```typescript
// Deploy contract across chains
const deployment = await engine.deploy({
  contract: 'MyToken',
  chains: ['ethereum', 'polygon', 'arbitrum'],
  args: [1000000]
});

// Track deployment status
const status = await engine.getDeploymentStatus(deployment.id);
```

#### Billing Integration

Stripe-powered billing with usage tracking:

```typescript
// Create subscription
POST /billing/subscriptions

// Track usage
POST /billing/usage

// Get invoices
GET /billing/invoices
```

## Inter-Service Communication

### Request Flow

```
┌──────────┐    ┌─────────────────┐    ┌──────────────────┐
│  Client  │───▶│  Customer API   │───▶│   Core Engine    │
│          │    │   (Port 3000)   │    │   (Port 3001)    │
└──────────┘    └─────────────────┘    └──────────────────┘
                        │                      │
                        │     HTTP/REST        │
                        │◀────────────────────▶│
                        │                      │
```

### Internal API

Core Engine exposes internal endpoints for Customer API:

```
# Blockchain Operations
POST /internal/deploy
GET  /internal/deploy/:id/status
GET  /internal/transactions

# Billing
GET  /internal/billing/plans
POST /internal/billing/customers
POST /internal/billing/subscriptions

# Health
GET  /internal/health
GET  /internal/metrics
```

## Deployment Options

### Development

```bash
# Start both services
npm run dev

# Or individually
npm run dev:customer-api
npm run dev:core-engine
```

### Docker

```bash
# With MongoDB (default)
docker-compose up customer-api core-engine mongodb redis

# With PostgreSQL
DATABASE_TYPE=postgresql docker-compose --profile postgres up
```

### Production

```bash
# Full production stack
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Scaling Considerations

### Horizontal Scaling

Both services can be scaled horizontally:

```yaml
# docker-compose.override.yml
services:
  customer-api:
    deploy:
      replicas: 3
  core-engine:
    deploy:
      replicas: 2
```

### Load Balancing

Use a load balancer in front of Customer API replicas:

```
┌──────────┐    ┌────────────┐    ┌─────────────────┐
│  Client  │───▶│   Nginx    │───▶│  Customer API   │ x3
└──────────┘    │    LB      │    └─────────────────┘
                └────────────┘
```

## Monitoring

### Health Checks

```bash
# Customer API health
curl http://localhost:3000/health

# Core Engine health
curl http://localhost:3001/health
```

### Metrics

Both services expose Prometheus metrics:

- Customer API: `http://localhost:3000/metrics`
- Core Engine: `http://localhost:3001/metrics`

## Migration Guide

If migrating from the legacy multi-service architecture:

1. **Backup Data** - Export all data from existing services
2. **Update Configuration** - Migrate environment variables
3. **Deploy New Services** - Start Customer API and Core Engine
4. **Import Data** - Restore data to new database
5. **Update DNS** - Point traffic to new Customer API
6. **Decommission Legacy** - Shut down old services

See [Deployment Guide](../deployment/index.md) for detailed instructions.
