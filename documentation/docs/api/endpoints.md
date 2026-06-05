# API Endpoints

Detailed documentation for all Switchboard API endpoints.

## Deployments

### Create Deployment

Deploy contracts across multiple chains.

```
POST /api/v1/deploy
```

**Request:**

```json
{
  "name": "MyToken",
  "bytecode": "0x608060405234801561001057600080fd5b50...",
  "abi": [...],
  "constructorArgs": ["My Token", "MTK", 1000000],
  "chains": ["ethereum", "polygon", "arbitrum"],
  "options": {
    "verify": true,
    "gasMultiplier": 1.2
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "name": "MyToken",
    "status": "pending",
    "chains": ["ethereum", "polygon", "arbitrum"],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Deployment

Get deployment details.

```
GET /api/v1/deploy/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "name": "MyToken",
    "status": "completed",
    "chains": ["ethereum", "polygon", "arbitrum"],
    "addresses": {
      "ethereum": "0x1234...",
      "polygon": "0x5678...",
      "arbitrum": "0x9abc..."
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:32:00Z"
  }
}
```

### Get Deployment Status

Get detailed deployment status per chain.

```
GET /api/v1/deploy/:id/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "status": "deploying",
    "progress": {
      "ethereum": {
        "status": "completed",
        "address": "0x1234...",
        "txHash": "0xabc...",
        "blockNumber": 12345678
      },
      "polygon": {
        "status": "deploying",
        "txHash": "0xdef..."
      },
      "arbitrum": {
        "status": "pending"
      }
    }
  }
}
```

### List Deployments

List all deployments.

```
GET /api/v1/deploy?page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "dep_abc123",
      "name": "MyToken",
      "status": "completed",
      "chains": ["ethereum", "polygon"],
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

## Chains

### List Chains

Get all supported chains.

```
GET /api/v1/chains
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "ethereum",
      "name": "Ethereum",
      "chainId": 1,
      "type": "evm",
      "status": "active"
    },
    {
      "id": "polygon",
      "name": "Polygon",
      "chainId": 137,
      "type": "evm",
      "status": "active"
    }
  ]
}
```

### Get Chain

Get details for a specific chain.

```
GET /api/v1/chains/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "ethereum",
    "name": "Ethereum",
    "chainId": 1,
    "type": "evm",
    "nativeCurrency": {
      "name": "Ether",
      "symbol": "ETH",
      "decimals": 18
    },
    "blockTime": 12,
    "explorerUrl": "https://etherscan.io",
    "status": "active",
    "gasPrice": {
      "standard": 30,
      "fast": 45,
      "instant": 60
    }
  }
}
```

### Get Chain Status

Get health status for a chain.

```
GET /api/v1/chains/:id/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "ethereum",
    "status": "healthy",
    "latency": 45,
    "blockHeight": 18500000,
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

## Transactions

### List Transactions

Get transaction history.

```
GET /api/v1/transactions?chain=ethereum&limit=50
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "hash": "0xabc...",
      "chain": "ethereum",
      "type": "deploy",
      "status": "confirmed",
      "blockNumber": 18500000,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get Transaction

Get transaction details.

```
GET /api/v1/transactions/:hash?chain=ethereum
```

**Response:**

```json
{
  "success": true,
  "data": {
    "hash": "0xabc...",
    "chain": "ethereum",
    "type": "deploy",
    "status": "confirmed",
    "from": "0x123...",
    "to": "0x456...",
    "value": "0",
    "gasUsed": 150000,
    "gasPrice": "30000000000",
    "blockNumber": 18500000,
    "blockHash": "0xdef...",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Track Transaction

Track a transaction on a chain.

```
POST /api/v1/transactions/track
```

**Request:**

```json
{
  "hash": "0xabc...",
  "chain": "ethereum"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "hash": "0xabc...",
    "chain": "ethereum",
    "status": "pending",
    "confirmations": 2,
    "requiredConfirmations": 12
  }
}
```

## Billing

### Get Plans

List available subscription plans.

```
GET /api/v1/billing/plans
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "features": {
        "deploymentsPerMonth": 10,
        "chains": 5,
        "support": "community"
      }
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": 49,
      "features": {
        "deploymentsPerMonth": 100,
        "chains": "unlimited",
        "support": "priority"
      }
    }
  ]
}
```

### Get Usage

Get current usage statistics.

```
GET /api/v1/billing/usage
```

**Response:**

```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "usage": {
      "deployments": 45,
      "transactions": 1234,
      "apiCalls": 5678
    },
    "limits": {
      "deployments": 100,
      "transactions": "unlimited",
      "apiCalls": 10000
    }
  }
}
```

## Health & Metrics

### Health Check

Check service health.

```
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "solana": "healthy"
  }
}
```

### Streaming Metrics

Get real-time metrics via Server-Sent Events.

```
GET /api/v1/metrics/streaming
```

**Response (SSE):**

```
event: metrics
data: {"latency":45,"deployments":100,"chains":50}

event: metrics
data: {"latency":42,"deployments":101,"chains":50}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `CHAIN_UNAVAILABLE` | 503 | Chain temporarily unavailable |
