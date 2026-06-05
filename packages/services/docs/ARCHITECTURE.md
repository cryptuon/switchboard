# Switchboard Architecture Documentation

## System Overview

Switchboard is a production-ready off-chain infrastructure for managing cross-chain smart contract deployments. The system is built using a microservices architecture with shared utilities, comprehensive monitoring, and robust error handling.

## Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Service   │    │   Sync Service  │    │ External Clients│
│                 │    │                 │    │                 │
│ • REST API      │◄──►│ • Blockchain    │    │ • Web Apps      │
│ • Validation    │    │   Monitoring    │    │ • CLI Tools     │
│ • Rate Limiting │    │ • Deployment    │    │ • SDKs          │
│ • Auth/Security │    │   Processing    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         └───────────────────────┘
                     │
         ┌─────────────────┐
         │ Shared Services │
         │                 │
         │ • Database      │
         │ • Logging       │
         │ • Metrics       │
         │ • Health Checks │
         │ • Communication │
         └─────────────────┘
                     │
         ┌─────────────────┐
         │   Data Layer    │
         │                 │
         │ • MongoDB       │
         │ • Collections:  │
         │   - Deployments │
         │   - Transactions│
         └─────────────────┘
```

## Component Details

### 1. API Service

**Purpose**: External-facing REST API for deployment management

**Responsibilities**:
- HTTP request handling and routing
- Input validation and sanitization
- Authentication and authorization
- Rate limiting and security controls
- Response formatting and error handling

**Key Features**:
- Joi-based request validation
- Express.js with security middleware
- Prometheus metrics collection
- Health check endpoints
- Comprehensive error responses

**Endpoints**:
```
POST   /api/v1/deploy              - Create new deployment
GET    /api/v1/deploy/:id/status   - Get deployment status
GET    /api/v1/transactions        - List transactions
GET    /api/v1/chains              - Get supported chains
GET    /health                     - Health check
GET    /metrics                    - Prometheus metrics
```

### 2. Sync Service

**Purpose**: Core coordination engine for blockchain operations

**Responsibilities**:
- Queue and process deployment requests
- Monitor blockchain transactions
- Coordinate multi-chain deployments
- Handle blockchain provider connections
- Manage deployment state transitions

**Key Components**:

#### Blockchain Monitor
- Connects to multiple blockchain networks
- Tracks transaction confirmations
- Handles websocket connections for real-time updates
- Implements circuit breakers for network resilience
- Updates transaction status in database

#### Deployment Processor
- Processes deployment queue
- Coordinates contract deployments across chains
- Manages deployment lifecycle
- Handles deployment failures and retries
- Records deployment metrics

**Supported Blockchains**:
- Ethereum (EVM-compatible)
- Polygon
- Arbitrum
- Binance Smart Chain
- Solana

### 3. Shared Services Package

**Purpose**: Common utilities and patterns used across all services

**Components**:

#### Database Layer
- **Connection Manager**: MongoDB connection pooling with automatic reconnection
- **Repository Base**: Type-safe database operations with metrics
- **Transaction Support**: Database transactions for consistency
- **Health Checks**: Database connectivity monitoring

#### Error Handling
- **ServiceError**: Structured error class with error codes
- **Error Codes**: Standardized error classification
- **Context**: Rich error context for debugging
- **Logging Integration**: Automatic error logging

#### Logging System
- **Structured Logging**: JSON-formatted logs with context
- **Log Levels**: Configurable verbosity (error, warn, info, debug)
- **HTTP Logging**: Request/response logging with timing
- **Blockchain Logging**: Specialized blockchain operation logging

#### Health & Metrics
- **Health Checker**: Configurable health checks with intervals
- **Metrics Collector**: Prometheus-compatible metrics
- **Circuit Breakers**: Service protection from failures
- **Retry Manager**: Exponential backoff for external calls

#### Service Communication
- **Message Bus**: Inter-service messaging with retries
- **Service Registry**: Service discovery and registration
- **HTTP Client**: Resilient HTTP client with circuit breakers

#### Testing Framework
- **Test Helpers**: Utilities for service testing
- **Mock Implementations**: Mock logger, metrics, database
- **Test Data Generation**: Realistic test data creation
- **Async Utilities**: Promise-based test helpers

## Data Flow

### Deployment Request Flow

```
1. Client Request
   │
   ▼
2. API Service
   │ - Validate request
   │ - Create deployment record
   │ - Queue for processing
   │
   ▼
3. Sync Service
   │ - Pick up queued deployment
   │ - Deploy to each target chain
   │ - Create transaction records
   │
   ▼
4. Blockchain Monitor
   │ - Monitor transaction confirmations
   │ - Update deployment status
   │ - Emit completion events
   │
   ▼
5. Client Response
   - Deployment complete
   - Contract addresses returned
```

### Transaction Monitoring Flow

```
1. Transaction Creation
   │ - Record created with 'pending' status
   │ - Associated with deployment
   │
   ▼
2. Blockchain Monitor
   │ - Query blockchain provider
   │ - Check confirmation count
   │ - Update confirmation status
   │
   ▼
3. Status Updates
   │ - Update transaction record
   │ - Update deployment chain status
   │ - Emit events for listeners
   │
   ▼
4. Completion
   - Mark as 'confirmed' when requirements met
   - Update deployment overall status
   - Notify external systems
```

## Database Design

### Collections Schema

#### Deployments
```typescript
{
  deploymentId: string,           // Unique deployment identifier
  contractCode: string,           // Smart contract bytecode
  chains: [{                      // Per-chain deployment status
    name: string,                 // Chain name (ethereum, polygon, etc.)
    status: enum,                 // pending, deploying, completed, failed
    transactionHash?: string,     // Deployment transaction hash
    contractAddress?: string,     // Deployed contract address
    blockNumber?: number,         // Block number of deployment
    gasUsed?: number,            // Gas consumed
    error?: string,              // Error message if failed
    deployedAt?: Date            // Completion timestamp
  }],
  status: enum,                   // Overall deployment status
  initiatedBy: string,            // User/system that initiated
  config: {                       // Deployment configuration
    gasLimit?: number,
    gasPrice?: string,
    constructorArgs?: any[]
  },
  metadata: {                     // Computed metadata
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

#### Transactions
```typescript
{
  transactionId: string,          // Unique transaction identifier
  deploymentId?: string,          // Associated deployment (optional)
  chain: string,                  // Blockchain network name
  transactionHash: string,        // Blockchain transaction hash
  status: enum,                   // pending, confirmed, failed, dropped
  blockNumber?: number,           // Block containing transaction
  blockHash?: string,             // Block hash
  confirmations: number,          // Current confirmation count
  requiredConfirmations: number,  // Confirmations needed
  gasUsed?: number,              // Actual gas used
  gasPrice?: string,             // Gas price used
  fee?: string,                  // Transaction fee paid
  fromAddress?: string,          // Sender address
  toAddress?: string,            // Recipient address
  value?: string,                // Transaction value
  error?: string,                // Error if failed
  metadata: {                    // Chain-specific metadata
    rpcUrl?: string,
    chainId?: number,
    nonce?: number
  },
  createdAt: Date,
  updatedAt: Date,
  confirmedAt?: Date
}
```

### Indexes

#### Deployments Collection
```javascript
// Primary queries
{ deploymentId: 1 }                    // Unique index
{ status: 1, createdAt: -1 }           // Status filtering with recency
{ initiatedBy: 1, createdAt: -1 }      // User deployments
{ "chains.name": 1, "chains.status": 1 } // Chain-specific queries

// Performance indexes
{ createdAt: -1 }                      // Recent deployments
{ updatedAt: 1 }                       // Stale deployment cleanup
```

#### Transactions Collection
```javascript
// Primary queries
{ transactionId: 1 }                   // Unique index
{ transactionHash: 1 }                 // Blockchain lookup
{ deploymentId: 1, status: 1 }         // Deployment transactions
{ chain: 1, status: 1 }                // Chain monitoring
{ status: 1, createdAt: 1 }            // Processing queue

// Monitoring indexes
{ confirmations: 1, requiredConfirmations: 1 } // Confirmation tracking
{ status: 1, updatedAt: 1 }            // Stale transaction cleanup
```

## Configuration Management

### Environment-Based Configuration

The system uses a hierarchical configuration system:

1. **Environment Variables**: Runtime configuration
2. **Default Values**: Sensible defaults for development
3. **Validation**: Joi schemas ensure configuration correctness
4. **Environment-Specific Checks**: Additional validation for production

### Configuration Categories

#### Service Configuration
```typescript
{
  name: string,                  // Service identifier
  version: string,               // Service version
  port?: number,                 // HTTP port (API service only)
  logLevel?: string,             // Logging verbosity
  enableMetrics?: boolean,       // Metrics collection
  enableHealthChecks?: boolean   // Health monitoring
}
```

#### Database Configuration
```typescript
{
  url: string,                   // MongoDB connection string
  maxConnections?: number,       // Connection pool size
  idleTimeoutMillis?: number,    // Idle connection timeout
  connectionTimeoutMillis?: number // Connection establishment timeout
}
```

#### Blockchain Configuration
```typescript
{
  [network]: {
    rpcUrl: string,              // RPC endpoint URL
    chainId?: number,            // Network chain ID
    confirmations: number,       // Required confirmations
    blockTime: number,           // Average block time (seconds)
    privateKey?: string          // Deployment private key
  }
}
```

#### Security Configuration
```typescript
{
  jwtSecret: string,             // JWT signing secret
  corsOrigins: string[],         // Allowed CORS origins
  rateLimitWindow: number,       // Rate limit window (ms)
  rateLimitMax: number          // Max requests per window
}
```

## Error Handling Strategy

### Error Classification

The system uses structured error handling with specific error codes:

```typescript
enum ErrorCode {
  // Client errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Configuration errors
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}
```

### Error Context

All errors include rich context:

```typescript
{
  code: ErrorCode,               // Standardized error code
  message: string,               // Human-readable message
  statusCode: number,            // HTTP status code
  timestamp: Date,               // When error occurred
  service: string,               // Originating service
  details?: any,                 // Additional error details
  stack?: string                 // Stack trace (development only)
}
```

### Error Recovery

- **Retries**: Exponential backoff for transient failures
- **Circuit Breakers**: Prevent cascading failures
- **Graceful Degradation**: Partial functionality during outages
- **Dead Letter Queues**: Handle permanently failed messages

## Monitoring & Observability

### Health Checks

Each service provides comprehensive health checks:

#### API Service Health Checks
- **HTTP Server**: Server responsiveness
- **Database**: Connection and query performance
- **Memory**: Memory usage monitoring
- **External Dependencies**: Third-party service availability

#### Sync Service Health Checks
- **Database**: Connection health
- **Blockchain Providers**: RPC endpoint availability
- **Message Queue**: Processing capability
- **Memory**: Resource usage
- **Deployment Queue**: Queue depth monitoring

### Metrics Collection

Prometheus-compatible metrics:

#### HTTP Metrics
```
http_requests_total{method, endpoint, status}
http_request_duration_seconds{method, endpoint, status}
http_requests_in_flight{service}
```

#### Database Metrics
```
db_connections_active{service, database}
db_query_duration_seconds{service, operation, table, status}
db_queries_total{service, operation, table, status}
```

#### Blockchain Metrics
```
blockchain_requests_total{service, network, operation, status}
blockchain_request_duration_seconds{service, network, operation, status}
blockchain_connections_active{service, network}
```

#### Business Metrics
```
chainsync_deployments_total{service, status, chain_count}
chainsync_deployment_duration_seconds{service, chain_count}
chainsync_active_deployments{service}
chainsync_transactions_total{service, network, status}
```

### Logging Strategy

#### Structured Logging Format
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "service": "switchboard-api",
  "message": "HTTP Request",
  "context": {
    "method": "POST",
    "path": "/api/v1/deploy",
    "statusCode": 200,
    "duration": 150,
    "requestId": "req-123",
    "userId": "user-456"
  }
}
```

#### Log Levels
- **ERROR**: System errors, failures, exceptions
- **WARN**: Degraded performance, recoverable issues
- **INFO**: Normal operations, state changes
- **DEBUG**: Detailed execution flow (development)

## Security Architecture

### Input Validation
- **Schema Validation**: Joi schemas for all inputs
- **Type Safety**: TypeScript for compile-time checks
- **Sanitization**: Input cleaning and normalization

### Network Security
- **HTTPS**: Encrypted communication
- **CORS**: Strict origin policies
- **Rate Limiting**: Request throttling
- **Security Headers**: Helmet.js security headers

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **Role-Based Access**: Permission system
- **API Keys**: Service-to-service authentication

### Data Protection
- **Database Encryption**: Encrypted connections
- **Secret Management**: Environment-based secrets
- **Audit Logging**: Security event tracking

## Performance Considerations

### Scalability Patterns

#### Horizontal Scaling
- **Stateless Services**: No server-side session state
- **Load Balancing**: Multiple service instances
- **Database Sharding**: Partition data across nodes

#### Vertical Scaling
- **Connection Pooling**: Efficient database connections
- **Caching**: In-memory and distributed caching
- **Batch Processing**: Bulk operations for efficiency

### Performance Optimizations

#### Database Performance
- **Indexes**: Optimized query performance
- **Connection Pooling**: Resource management
- **Query Optimization**: Efficient data access patterns
- **Pagination**: Large dataset handling

#### Network Performance
- **HTTP/2**: Efficient protocol usage
- **Compression**: Response size optimization
- **CDN**: Content delivery optimization
- **Caching**: Response caching strategies

#### Application Performance
- **Async Processing**: Non-blocking operations
- **Circuit Breakers**: Failure isolation
- **Resource Pooling**: Efficient resource reuse
- **Memory Management**: Garbage collection optimization

## Deployment Architecture

### Container Strategy
```dockerfile
# Multi-stage build for minimal production images
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Orchestration
- **Docker Compose**: Local development
- **Kubernetes**: Production orchestration
- **Helm Charts**: Configuration management
- **Service Mesh**: Inter-service communication

### Infrastructure
- **Load Balancers**: Traffic distribution
- **Auto Scaling**: Dynamic resource allocation
- **Health Checks**: Container health monitoring
- **Rolling Updates**: Zero-downtime deployments

This architecture provides a robust, scalable, and maintainable foundation for the Switchboard platform, with proper separation of concerns, comprehensive monitoring, and production-ready reliability patterns.