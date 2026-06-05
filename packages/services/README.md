# Switchboard Services

This directory contains the off-chain services that support the Switchboard infrastructure.

## Services

1. **Oracle Service** - Collects and verifies state data from multiple chains
2. **Sync Service** - Coordinates state synchronization with Solana programs
3. **API Service** - Provides RESTful API for external access
4. **Shared Utilities** - Common functions and types used by all services

## Architecture

The services are designed to work together to provide real-time cross-chain state synchronization:

1. The Oracle Service connects to multiple blockchain networks and collects state data
2. Collected data is processed and cryptographic proofs are generated
3. The Sync Service sends processed data to the Solana Coordination Layer
4. The API Service provides external access to synchronized states

## Development

### Prerequisites

- Node.js (v16 or higher)
- Docker (for containerized deployment)

### Setup

```bash
# Install dependencies
npm install

# Build services
npm run build
```

### Running Services

```bash
# Run all services
npm start

# Run a specific service
npm start -- --scope=@switchboard/oracle-service
```

## Configuration

Each service can be configured through environment variables or configuration files. See individual service directories for specific configuration options.

## License

MIT