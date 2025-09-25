# ChainSync Fee Oracle Service

The Fee Oracle Service monitors on-chain fee collection and provides reporting and analytics for ChainSync's fee collection system.

## Features

- **Fee Monitoring**: Continuously monitors fee transactions on Solana
- **Reporting**: Generates comprehensive fee reports
- **Analytics**: Provides real-time fee analytics and dashboards
- **Audit Trails**: Maintains audit trails for all fee transactions
- **Alerts**: Sends notifications for unusual fee activity

## Development

### Prerequisites

- Node.js (v16 or higher)
- Solana RPC endpoint access

### Setup

```bash
# Install dependencies
npm install

# Build service
npm run build
```

### Running the Service

```bash
# Run in development mode
npm run dev

# Run in production mode
npm start
```

## Configuration

The service requires the following environment variables:

- `SOLANA_RPC_URL` - Solana RPC endpoint
- `FEE_ORACLE_PORT` - Port to run the service on
- `TREASURY_WALLET_ADDRESS` - Address of the treasury wallet to monitor

## License

MIT