# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Testing
```bash
# Build all packages (monorepo with Lerna)
npm run build

# Run all tests across packages
npm run test

# Run tests for specific packages
npm run test:sdk
npm run test:programs
npm run test:services

# Development mode with hot reload
npm run dev

# Lint and format code
npm run lint
npm run format

# Clean build artifacts
npm run clean
```

### Package-Specific Commands
```bash
# Oracle Service (current working directory)
npm run build    # TypeScript compilation
npm run dev      # Run with ts-node
npm run start    # Run compiled JS
npm test         # Jest tests

# Solana Programs
cd packages/programs && cargo build
cd packages/programs && cargo test

# Individual service development
cd packages/services/<service-name>
npm run dev      # Start service in development mode
npm test         # Run service-specific tests
```

### Integration Testing
```bash
# Full integration test across all services
npm run test:integration

# Cross-chain oracle testing
cd packages/services/oracle-service && npm test
```

## Architecture Overview

### High-Level System Design
ChainSync is a **cross-chain state synchronization platform** that uses Solana as a coordination layer to enable real-time state verification across multiple blockchain networks.

**Core Architecture Pattern:**
1. **Universal State Oracle** - Collects state data from 50+ blockchain networks
2. **Solana Coordination Layer** - Provides sub-second consensus and verification
3. **Off-chain Services Infrastructure** - Handles data processing, APIs, and business logic
4. **Unified SDK** - Enables 90% code reuse across supported chains

### Project Structure
```
packages/
├── programs/              # Solana programs (Rust/Anchor)
│   ├── state-oracle/      # Cross-chain state verification
│   └── coordinator/       # State synchronization coordination
├── services/              # Off-chain infrastructure (TypeScript)
│   ├── oracle-service/    # Multi-chain data collection
│   ├── sync-service/      # State synchronization logic
│   ├── api/              # REST API service
│   ├── billing-service/   # Payment and subscription management
│   └── shared/           # Common infrastructure components
├── sdk/                   # Developer-facing TypeScript SDK
└── demo/                  # Example applications and CLI tools
```

### Critical Infrastructure Components

**Storage Layer (packages/services/shared/src/storage/)**
- Flexible multi-database architecture supporting:
  - Primary storage: MongoDB OR PostgreSQL for transactional data
  - Analytics storage: ClickHouse OR DuckDB for events/time-series data
  - Cache storage: Redis for sessions and temporary data
- Unified repository pattern with automatic data routing based on entity type
- Configuration factory for different deployment scenarios

**Oracle Service (packages/services/oracle-service/) - Real-time Streaming Architecture**
- `StreamingStateOracle` class: **Real-time streaming orchestrator** with sub-400ms coordination target
- `StateOracle` class: Legacy polling-based oracle (deprecated in favor of streaming)
- `ConnectorFactory`: Creates blockchain-specific connectors with WebSocket streaming support
- `BaseConnector`: Abstract base with real-time subscription methods (`subscribeToBlocks`, `subscribeToEvents`, etc.)
- `EVMConnector`: WebSocket-enabled connector for Ethereum, Polygon, Arbitrum with real-time event streams
- `SolanaIntegration`: **Optimized coordination layer** with `coordinateImmediateState()` for sub-400ms latency
- `PerformanceMonitor`: Real-time dashboard tracking latency compliance and streaming metrics

**Real-time Streaming Connector Pattern:**
- Each blockchain connector implements WebSocket subscriptions for real-time events
- `subscribeToBlocks()`, `subscribeToTransactions()`, `subscribeToEvents()` methods
- Automatic WebSocket reconnection and error handling
- Sub-100ms event processing with immediate Solana coordination
- Factory pattern enables runtime addition of new blockchain support with streaming

### Real-time Data Flow Architecture (Sub-400ms Target)
1. **WebSocket Event Streams** from multiple chains simultaneously (50ms avg)
2. **Immediate processing** through connector-specific event handlers (10ms avg)
3. **Stream buffering** and batch optimization for coordination efficiency (20ms avg)
4. **Real-time Solana coordination** via `coordinateImmediateState()` (100-200ms avg)
5. **Sub-400ms total latency** from blockchain event to cross-chain coordination
6. **Performance monitoring** with real-time compliance tracking

### Key Configuration Patterns

**Environment-Based Setup:**
```typescript
// Flexible storage configuration
const config = StorageConfigFactory.createMongoClickHouse({
  mongodb: { host: process.env.MONGODB_HOST, ... },
  clickhouse: { host: process.env.CLICKHOUSE_HOST, ... },
  redis: { host: process.env.REDIS_HOST, ... }
});

// Streaming oracle configuration (preferred)
const streamingOracle = new StreamingStateOracle({
  solanaRpcUrl: process.env.SOLANA_RPC_URL,
  chains: {
    ethereum: process.env.ETHEREUM_RPC_URL,
    polygon: process.env.POLYGON_RPC_URL,
    // ... other chains
  },
  streamingEnabled: true,
  coordinationLatencyTarget: 400, // Sub-400ms target
  batchProcessingSize: 50
});

// Start real-time streaming
await streamingOracle.startRealTimeStreaming();
```

**Service Communication:**
- Services use shared infrastructure components (logging, metrics, health checks)
- Message bus pattern for inter-service communication
- Service registry for dynamic service discovery
- Centralized configuration management with validation

### Testing Strategy
- **Unit tests**: Individual component testing with Jest
- **Integration tests**: Cross-service functionality testing
- **Blockchain simulation**: Mock connectors for testing without live chains
- **End-to-end testing**: Full oracle -> coordination -> API flow validation

### Performance Considerations
- **Real-time streaming**: Sub-400ms coordination target with WebSocket event processing
- **Bulk operations**: Optimized for high-volume blockchain event processing with batching
- **Connection pooling**: Database connections managed through shared infrastructure
- **Caching strategy**: Multi-level caching with TTL for different data types
- **Metrics collection**: Real-time performance monitoring with latency compliance tracking
- **Solana optimization**: `coordinateImmediateState()` with `skipPreflight` for maximum speed

### Performance Monitoring
```typescript
import { PerformanceMonitor } from './performance-monitor';

const monitor = new PerformanceMonitor(streamingOracle);
monitor.startMonitoring(5000); // Monitor every 5 seconds

// Real-time dashboard shows:
// - Latency compliance vs 400ms target
// - Events per second processing
// - Solana coordination performance
// - Stream health across all chains
```

### Development Workflow
1. Work within individual service directories for focused development
2. Use shared infrastructure components from `packages/services/shared/`
3. Test integration points between oracle service and Solana coordination layer
4. Validate cross-chain functionality with multiple blockchain connectors
5. Ensure proper error handling and monitoring throughout the pipeline