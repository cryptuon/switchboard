# ChainSync Off-Chain Infrastructure

Production-ready off-chain infrastructure for ChainSync cross-chain deployment platform.

## Architecture Overview

The ChainSync infrastructure consists of multiple microservices working together to provide reliable cross-chain deployment capabilities:

### Core Services

1. **API Service** (`packages/services/api/`)
   - RESTful API for external clients
   - Request validation and error handling
   - Rate limiting and security middleware
   - Health checks and metrics endpoints

2. **Sync Service** (`packages/services/sync-service/`)
   - Coordinates cross-chain deployments
   - Monitors blockchain transactions
   - Processes deployment queues
   - Manages state synchronization

3. **Shared Utilities** (`packages/services/shared/`)
   - Common functionality across all services
   - Database connection management
   - Logging, metrics, and health checks
   - Service communication patterns
   - Testing utilities

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 5.0+
- Docker (optional)
- RPC endpoints for target blockchains

### Installation

```bash
# Install dependencies
npm install

# Build shared utilities
cd packages/services/shared && npm run build

# Build and start API service
cd packages/services/api && npm run build && npm start

# Build and start Sync service
cd packages/services/sync-service && npm run build && npm start
```

### Environment Configuration

Create `.env` files in each service directory:

```env
# Common configuration
NODE_ENV=development
LOG_LEVEL=info
PORT=3000

# Database
DATABASE_URL=mongodb://localhost:27017/chainsync
DB_MAX_CONNECTIONS=20

# Security
JWT_SECRET=your-jwt-secret-here
CORS_ORIGINS=http://localhost:3000

# Blockchain RPC URLs
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-key
POLYGON_RPC_URL=https://polygon-rpc.com
SOLANA_RPC_URL=https://api.devnet.solana.com

# Private keys for deployments (optional)
ETHEREUM_PRIVATE_KEY=0x...
SOLANA_PRIVATE_KEY=...

# Monitoring
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
SENTRY_DSN=https://...
```

## API Documentation

### Deployment Endpoints

#### Create Deployment

```http
POST /api/v1/deploy
Content-Type: application/json

{
  "chains": ["ethereum", "polygon"],
  "contractCode": "0x608060405234801561001057600080fd5b50...",
  "config": {
    "gasLimit": 5000000,
    "gasPrice": "20000000000",
    "constructorArgs": []
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "deploymentId": "deploy_1234567890",
    "status": "initiated",
    "chains": ["ethereum", "polygon"],
    "timestamp": "2024-01-01T00:00:00.000Z",
    "estimatedCompletionTime": "2024-01-01T00:00:30.000Z"
  }
}
```

#### Get Deployment Status

```http
GET /api/v1/deploy/{deploymentId}/status
```

Response:
```json
{
  "success": true,
  "data": {
    "deploymentId": "deploy_1234567890",
    "status": "completed",
    "chains": [
      {
        "name": "ethereum",
        "status": "completed",
        "txHash": "0x123...",
        "contractAddress": "0x456...",
        "blockNumber": 18500000
      },
      {
        "name": "polygon",
        "status": "completed",
        "txHash": "0x789...",
        "contractAddress": "0xabc...",
        "blockNumber": 50000000
      }
    ],
    "completedAt": "2024-01-01T00:00:25.000Z"
  }
}
```

### Transaction Monitoring

#### Get Transactions

```http
GET /api/v1/transactions?page=1&limit=20&status=completed&chain=ethereum
```

Response:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "transactionId": "tx_1234567890",
        "chain": "ethereum",
        "transactionHash": "0x123...",
        "status": "confirmed",
        "confirmations": 12,
        "blockNumber": 18500000,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "confirmedAt": "2024-01-01T00:00:15.000Z"
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

### Health & Monitoring

#### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "chainsync-api",
  "version": "0.1.0",
  "uptime": 3600000,
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database connected and responsive",
      "duration": 25
    },
    "memory": {
      "status": "healthy",
      "message": "Memory usage: 45%",
      "details": {
        "heapUsed": 120,
        "heapTotal": 256,
        "usagePercentage": 45
      }
    }
  }
}
```

#### Metrics

```http
GET /metrics
```

Returns Prometheus-formatted metrics for monitoring.

## Service Architecture

### Shared Infrastructure

The shared utilities package provides:

#### Error Handling
- Structured error classes with error codes
- Consistent error responses across services
- Error context and tracing

#### Logging
- Winston-based structured logging
- HTTP request logging
- Blockchain operation logging
- Log levels and formatting

#### Database Layer
- MongoDB connection pooling
- Transaction management
- Repository pattern with type safety
- Query optimization and caching

#### Health Checks
- Service health monitoring
- Database connectivity checks
- Memory and disk usage monitoring
- Custom health check implementations

#### Metrics Collection
- Prometheus-compatible metrics
- HTTP request metrics
- Database operation metrics
- Blockchain transaction metrics
- Business metrics (deployments, fees)

#### Service Communication
- Message bus for inter-service communication
- Service discovery and registration
- HTTP client with retry and circuit breakers
- Structured messaging patterns

### API Service Features

- **Security**: Helmet, CORS, rate limiting
- **Validation**: Joi schemas for all endpoints
- **Middleware**: Request logging, error handling, metrics collection
- **Documentation**: OpenAPI/Swagger integration
- **Testing**: Comprehensive test coverage

### Sync Service Features

- **Blockchain Monitoring**: Real-time transaction tracking across multiple chains
- **Deployment Processing**: Queue-based deployment coordination
- **State Management**: Database persistence with proper modeling
- **Error Recovery**: Retry mechanisms and failure handling
- **Scalability**: Concurrent processing with configurable limits

## Database Schema

### Deployments Collection

```typescript
{
  deploymentId: string,
  contractCode: string,
  chains: [{
    name: string,
    status: 'pending' | 'deploying' | 'completed' | 'failed',
    transactionHash?: string,
    contractAddress?: string,
    blockNumber?: number,
    gasUsed?: number,
    error?: string,
    deployedAt?: Date
  }],
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial',
  initiatedBy: string,
  config: {
    gasLimit?: number,
    gasPrice?: string,
    constructorArgs?: any[]
  },
  metadata: {
    totalChains: number,
    completedChains: number,
    failedChains: number,
    estimatedCompletionTime?: Date
  },
  createdAt: Date,
  updatedAt: Date,
  completedAt?: Date
}
```

### Transactions Collection

```typescript
{
  transactionId: string,
  deploymentId?: string,
  chain: string,
  transactionHash: string,
  status: 'pending' | 'confirmed' | 'failed' | 'dropped',
  blockNumber?: number,
  blockHash?: string,
  confirmations: number,
  requiredConfirmations: number,
  gasUsed?: number,
  gasPrice?: string,
  fee?: string,
  fromAddress?: string,
  toAddress?: string,
  value?: string,
  error?: string,
  metadata: {
    rpcUrl?: string,
    chainId?: number,
    nonce?: number
  },
  createdAt: Date,
  updatedAt: Date,
  confirmedAt?: Date
}
```

## Development

### Testing

Each service includes comprehensive testing:

```bash
# Run tests for shared utilities
cd packages/services/shared && npm test

# Run tests for API service
cd packages/services/api && npm test

# Run tests for Sync service
cd packages/services/sync-service && npm test
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run typecheck

# Formatting
npm run format
```

### Building

```bash
# Build all services
npm run build

# Build specific service
cd packages/services/api && npm run build
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Environment Variables

Required environment variables for production:

- `NODE_ENV=production`
- `DATABASE_URL` - MongoDB connection string
- `JWT_SECRET` - Strong JWT secret (min 32 characters)
- `CORS_ORIGINS` - Allowed CORS origins
- Blockchain RPC URLs for target chains
- Private keys for deployment (if automated)
- `SENTRY_DSN` - Error tracking (recommended)

### Monitoring

The services provide comprehensive monitoring through:

- **Health Checks**: `/health` endpoints for load balancer checks
- **Metrics**: Prometheus metrics at `/metrics` endpoints
- **Logging**: Structured JSON logs for centralized logging
- **Tracing**: Request correlation IDs for distributed tracing

### Scaling

For production scaling:

1. **Horizontal Scaling**: Run multiple instances behind a load balancer
2. **Database Scaling**: Use MongoDB replica sets and sharding
3. **Queue Management**: Configure deployment processing limits
4. **Caching**: Implement Redis for session storage and caching
5. **CDN**: Use CDN for static assets and API responses

## Security

Security measures implemented:

- **Input Validation**: Joi schemas for all inputs
- **Rate Limiting**: Configurable rate limits per endpoint
- **CORS**: Strict CORS configuration
- **Headers**: Security headers via Helmet
- **Secrets**: Environment variable based secrets
- **Database**: Connection encryption and authentication
- **Monitoring**: Security event logging and alerting

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Use conventional commits for commit messages
5. Ensure all CI checks pass

## License

MIT License - see LICENSE file for details.