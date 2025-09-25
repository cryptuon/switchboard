# ChainSync API Documentation

## Base URL
```
Production: https://api.chainsync.com
Development: http://localhost:3000
```

## Authentication
All API requests require authentication via JWT tokens or API keys.

```http
Authorization: Bearer <jwt_token>
# OR
X-API-Key: <api_key>
```

## Content Type
All requests and responses use JSON format:
```http
Content-Type: application/json
```

## Rate Limiting
- **Window**: 15 minutes
- **Limit**: 100 requests per window per API key
- **Headers**: Rate limit information included in response headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Contract code is required",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "details": {
      "field": "contractCode",
      "received": null
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing authentication |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |
| `EXTERNAL_SERVICE_ERROR` | 502 | Blockchain/external service error |
| `TIMEOUT` | 504 | Request timeout |

## Endpoints

### Deployments

#### Create Deployment

Deploy a smart contract across multiple blockchain networks.

```http
POST /api/v1/deploy
```

**Request Body:**
```json
{
  "chains": ["ethereum", "polygon", "arbitrum"],
  "contractCode": "0x608060405234801561001057600080fd5b50...",
  "config": {
    "gasLimit": 5000000,
    "gasPrice": "20000000000",
    "constructorArgs": ["param1", 42, "0x123..."]
  }
}
```

**Parameters:**
- `chains` (required): Array of blockchain networks to deploy to
  - Supported: `ethereum`, `polygon`, `arbitrum`, `bsc`, `avalanche`, `solana`
- `contractCode` (required): Compiled smart contract bytecode (hex string)
- `config` (optional): Deployment configuration
  - `gasLimit` (optional): Maximum gas to use for deployment
  - `gasPrice` (optional): Gas price in wei (EVM chains only)
  - `constructorArgs` (optional): Arguments for contract constructor

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "deploymentId": "deploy_1703980800123",
    "status": "initiated",
    "chains": ["ethereum", "polygon", "arbitrum"],
    "timestamp": "2024-01-01T00:00:00.000Z",
    "estimatedCompletionTime": "2024-01-01T00:01:30.000Z",
    "metadata": {
      "totalChains": 3,
      "completedChains": 0,
      "failedChains": 0
    }
  }
}
```

#### Get Deployment Status

Retrieve the current status of a deployment.

```http
GET /api/v1/deploy/{deploymentId}/status
```

**Path Parameters:**
- `deploymentId` (required): Unique deployment identifier

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "deploymentId": "deploy_1703980800123",
    "status": "completed",
    "chains": [
      {
        "name": "ethereum",
        "status": "completed",
        "transactionHash": "0x1234567890abcdef...",
        "contractAddress": "0xabcdef1234567890...",
        "blockNumber": 18500000,
        "gasUsed": 2500000,
        "deployedAt": "2024-01-01T00:00:45.000Z"
      },
      {
        "name": "polygon",
        "status": "completed",
        "transactionHash": "0xfedcba0987654321...",
        "contractAddress": "0x0987654321fedcba...",
        "blockNumber": 50000000,
        "gasUsed": 2400000,
        "deployedAt": "2024-01-01T00:01:10.000Z"
      },
      {
        "name": "arbitrum",
        "status": "failed",
        "error": "Insufficient gas limit",
        "transactionHash": "0x555666777888999...",
        "gasUsed": 5000000
      }
    ],
    "initiatedBy": "user_abc123",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:01:10.000Z",
    "metadata": {
      "totalChains": 3,
      "completedChains": 2,
      "failedChains": 1
    }
  }
}
```

**Deployment Status Values:**
- `pending`: Deployment queued but not started
- `in_progress`: Deployment in progress on one or more chains
- `completed`: Successfully deployed to all chains
- `partial`: Deployed to some but not all chains
- `failed`: Failed to deploy to any chains

**Chain Status Values:**
- `pending`: Chain deployment not started
- `deploying`: Currently deploying to this chain
- `completed`: Successfully deployed to this chain
- `failed`: Failed to deploy to this chain

### Transactions

#### List Transactions

Retrieve a paginated list of transactions with filtering options.

```http
GET /api/v1/transactions
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (max: 100, default: 20)
- `status` (optional): Filter by status (`pending`, `confirmed`, `failed`, `dropped`)
- `chain` (optional): Filter by blockchain network
- `deploymentId` (optional): Filter by deployment
- `from` (optional): Start date (ISO 8601)
- `to` (optional): End date (ISO 8601)

**Example:**
```http
GET /api/v1/transactions?page=1&limit=20&status=confirmed&chain=ethereum
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "transactionId": "tx_1703980800456",
        "deploymentId": "deploy_1703980800123",
        "chain": "ethereum",
        "transactionHash": "0x1234567890abcdef...",
        "status": "confirmed",
        "blockNumber": 18500000,
        "blockHash": "0xabcdef1234567890...",
        "confirmations": 12,
        "requiredConfirmations": 2,
        "gasUsed": 2500000,
        "gasPrice": "20000000000",
        "fee": "50000000000000000",
        "fromAddress": "0x1111111111111111...",
        "toAddress": "0x2222222222222222...",
        "value": "0",
        "createdAt": "2024-01-01T00:00:15.000Z",
        "confirmedAt": "2024-01-01T00:00:45.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get Transaction Details

Retrieve detailed information about a specific transaction.

```http
GET /api/v1/transactions/{transactionId}
```

**Path Parameters:**
- `transactionId` (required): Unique transaction identifier

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_1703980800456",
    "deploymentId": "deploy_1703980800123",
    "chain": "ethereum",
    "transactionHash": "0x1234567890abcdef...",
    "status": "confirmed",
    "blockNumber": 18500000,
    "blockHash": "0xabcdef1234567890...",
    "confirmations": 12,
    "requiredConfirmations": 2,
    "gasUsed": 2500000,
    "gasPrice": "20000000000",
    "fee": "50000000000000000",
    "fromAddress": "0x1111111111111111...",
    "toAddress": "0x2222222222222222...",
    "value": "0",
    "metadata": {
      "chainId": 1,
      "nonce": 42,
      "rpcUrl": "https://mainnet.infura.io/v3/..."
    },
    "createdAt": "2024-01-01T00:00:15.000Z",
    "updatedAt": "2024-01-01T00:00:45.000Z",
    "confirmedAt": "2024-01-01T00:00:45.000Z"
  }
}
```

### Blockchain Networks

#### List Supported Chains

Get information about supported blockchain networks.

```http
GET /api/v1/chains
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "name": "ethereum",
      "displayName": "Ethereum Mainnet",
      "chainId": 1,
      "type": "evm",
      "rpcUrl": "https://mainnet.infura.io/v3/...",
      "blockExplorerUrl": "https://etherscan.io",
      "nativeCurrency": {
        "name": "Ether",
        "symbol": "ETH",
        "decimals": 18
      },
      "confirmations": 2,
      "averageBlockTime": 12000,
      "status": "active"
    },
    {
      "name": "polygon",
      "displayName": "Polygon Mainnet",
      "chainId": 137,
      "type": "evm",
      "rpcUrl": "https://polygon-rpc.com",
      "blockExplorerUrl": "https://polygonscan.com",
      "nativeCurrency": {
        "name": "MATIC",
        "symbol": "MATIC",
        "decimals": 18
      },
      "confirmations": 5,
      "averageBlockTime": 2000,
      "status": "active"
    },
    {
      "name": "solana",
      "displayName": "Solana Mainnet",
      "type": "solana",
      "rpcUrl": "https://api.mainnet-beta.solana.com",
      "blockExplorerUrl": "https://explorer.solana.com",
      "nativeCurrency": {
        "name": "Solana",
        "symbol": "SOL",
        "decimals": 9
      },
      "confirmations": 1,
      "averageBlockTime": 400,
      "status": "active"
    }
  ]
}
```

#### Get Chain Information

Get detailed information about a specific blockchain network.

```http
GET /api/v1/chains/{chainName}
```

**Path Parameters:**
- `chainName` (required): Blockchain network name

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "name": "ethereum",
    "displayName": "Ethereum Mainnet",
    "chainId": 1,
    "type": "evm",
    "rpcUrl": "https://mainnet.infura.io/v3/...",
    "blockExplorerUrl": "https://etherscan.io",
    "nativeCurrency": {
      "name": "Ether",
      "symbol": "ETH",
      "decimals": 18
    },
    "confirmations": 2,
    "averageBlockTime": 12000,
    "status": "active",
    "stats": {
      "totalDeployments": 1250,
      "successfulDeployments": 1200,
      "failedDeployments": 50,
      "averageConfirmationTime": 180000,
      "currentBlockNumber": 18500000
    }
  }
}
```

### Analytics & Statistics

#### Deployment Statistics

Get deployment analytics and statistics.

```http
GET /api/v1/analytics/deployments
```

**Query Parameters:**
- `period` (optional): Time period (`1h`, `24h`, `7d`, `30d`, default: `24h`)
- `chain` (optional): Filter by specific chain
- `user` (optional): Filter by user (requires admin permissions)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "total": 150,
    "successful": 140,
    "failed": 10,
    "successRate": 93.33,
    "averageCompletionTime": 45000,
    "byStatus": {
      "completed": 140,
      "failed": 8,
      "partial": 2
    },
    "byChain": {
      "ethereum": 75,
      "polygon": 45,
      "arbitrum": 30
    },
    "timeline": [
      {
        "timestamp": "2024-01-01T00:00:00.000Z",
        "deployments": 12,
        "successful": 11,
        "failed": 1
      },
      {
        "timestamp": "2024-01-01T01:00:00.000Z",
        "deployments": 8,
        "successful": 8,
        "failed": 0
      }
    ]
  }
}
```

#### Transaction Statistics

Get transaction analytics and statistics.

```http
GET /api/v1/analytics/transactions
```

**Query Parameters:**
- `period` (optional): Time period (`1h`, `24h`, `7d`, `30d`, default: `24h`)
- `chain` (optional): Filter by specific chain

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "total": 450,
    "confirmed": 430,
    "failed": 15,
    "dropped": 5,
    "successRate": 95.56,
    "averageConfirmationTime": 25000,
    "totalVolume": "1250000000000000000000",
    "totalFees": "125000000000000000",
    "byChain": {
      "ethereum": {
        "count": 200,
        "volume": "800000000000000000000",
        "fees": "80000000000000000"
      },
      "polygon": {
        "count": 150,
        "volume": "300000000000000000000",
        "fees": "30000000000000000"
      },
      "arbitrum": {
        "count": 100,
        "volume": "150000000000000000000",
        "fees": "15000000000000000"
      }
    }
  }
}
```

### System Health

#### Health Check

Get service health status.

```http
GET /health
```

**Response (200 OK - Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "chainsync-api",
  "version": "1.0.0",
  "uptime": 3600000,
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database connected and responsive",
      "duration": 15,
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    "sync-service": {
      "status": "healthy",
      "message": "Sync service is operational",
      "duration": 25,
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    "memory": {
      "status": "healthy",
      "message": "Memory usage: 65%",
      "duration": 5,
      "timestamp": "2024-01-01T00:00:00.000Z",
      "details": {
        "heapUsed": 256,
        "heapTotal": 384,
        "usagePercentage": 65
      }
    }
  }
}
```

**Response (503 Service Unavailable - Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "chainsync-api",
  "version": "1.0.0",
  "uptime": 3600000,
  "checks": {
    "database": {
      "status": "unhealthy",
      "message": "Database connection failed",
      "duration": 5000,
      "timestamp": "2024-01-01T00:00:00.000Z",
      "details": {
        "error": "Connection timeout"
      }
    }
  }
}
```

#### Service Metrics

Get Prometheus-formatted metrics.

```http
GET /metrics
```

**Response (200 OK):**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{service="chainsync-api",method="POST",endpoint="/api/v1/deploy",status="200"} 1250

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{service="chainsync-api",method="POST",endpoint="/api/v1/deploy",status="200",le="0.1"} 800
http_request_duration_seconds_bucket{service="chainsync-api",method="POST",endpoint="/api/v1/deploy",status="200",le="0.5"} 1200
http_request_duration_seconds_bucket{service="chainsync-api",method="POST",endpoint="/api/v1/deploy",status="200",le="+Inf"} 1250
http_request_duration_seconds_sum{service="chainsync-api",method="POST",endpoint="/api/v1/deploy",status="200"} 125.5
http_request_duration_seconds_count{service="chainsync-api",method="POST",endpoint="/api/v1/deploy",status="200"} 1250

# HELP chainsync_deployments_total Total number of cross-chain deployments
# TYPE chainsync_deployments_total counter
chainsync_deployments_total{service="chainsync-api",status="completed",chain_count="3"} 850
chainsync_deployments_total{service="chainsync-api",status="failed",chain_count="2"} 25
```

## Webhooks

ChainSync supports webhooks for real-time notifications about deployment and transaction events.

### Webhook Configuration

Configure webhooks through the API or dashboard:

```http
POST /api/v1/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/chainsync",
  "events": ["deployment.completed", "deployment.failed", "transaction.confirmed"],
  "secret": "webhook-secret-key"
}
```

### Webhook Events

#### Deployment Completed
```json
{
  "event": "deployment.completed",
  "timestamp": "2024-01-01T00:01:30.000Z",
  "data": {
    "deploymentId": "deploy_1703980800123",
    "status": "completed",
    "chains": [
      {
        "name": "ethereum",
        "contractAddress": "0xabcdef1234567890...",
        "transactionHash": "0x1234567890abcdef..."
      }
    ]
  }
}
```

#### Transaction Confirmed
```json
{
  "event": "transaction.confirmed",
  "timestamp": "2024-01-01T00:00:45.000Z",
  "data": {
    "transactionId": "tx_1703980800456",
    "transactionHash": "0x1234567890abcdef...",
    "chain": "ethereum",
    "confirmations": 12,
    "blockNumber": 18500000
  }
}
```

## SDKs and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @chainsync/sdk
```

```typescript
import { ChainSync } from '@chainsync/sdk';

const chainSync = new ChainSync({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.chainsync.com'
});

// Deploy contract
const deployment = await chainSync.deploy({
  chains: ['ethereum', 'polygon'],
  contractCode: '0x608060405...',
  config: {
    gasLimit: 5000000
  }
});

// Monitor deployment
const status = await chainSync.getDeploymentStatus(deployment.deploymentId);
```

### Python SDK

```bash
pip install chainsync-python
```

```python
from chainsync import ChainSync

client = ChainSync(
    api_key='your-api-key',
    base_url='https://api.chainsync.com'
)

# Deploy contract
deployment = client.deploy(
    chains=['ethereum', 'polygon'],
    contract_code='0x608060405...',
    config={'gas_limit': 5000000}
)

# Monitor deployment
status = client.get_deployment_status(deployment['deploymentId'])
```

This API documentation provides comprehensive coverage of all endpoints, request/response formats, error handling, and integration examples for the ChainSync platform.