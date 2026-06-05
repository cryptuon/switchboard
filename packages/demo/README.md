# Switchboard Demo Dashboard

A comprehensive web dashboard showcasing Switchboard's cross-chain coordination capabilities.

## Features

- **Real-time Dashboard** - Live monitoring of system performance and metrics
- **Cross-Chain Deployments** - Deploy smart contracts across multiple blockchains simultaneously
- **Chain Monitoring** - Real-time status of all connected blockchain networks
- **Transaction Tracking** - Monitor cross-chain transactions and coordination events
- **Billing Management** - Stripe-powered subscription and payment management
- **System Health** - Comprehensive health checks and performance metrics

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Headless UI
- **Charts**: Recharts
- **API**: Axios for Switchboard API integration

## Getting Started

### Prerequisites

- Node.js 18+
- Switchboard API service running on port 3000
- Switchboard Billing service running on port 3001

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The demo dashboard will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file:

```bash
API_BASE_URL=http://localhost:3000
BILLING_BASE_URL=http://localhost:3001
```

## Dashboard Pages

### 1. Dashboard (/)
- Real-time system overview
- Key performance metrics
- Latency monitoring charts
- System health indicators

### 2. Deployments (/deployments)
- Create new cross-chain deployments
- Monitor deployment status
- Track coordination latency
- View deployment history

### 3. Chains (/chains)
- Real-time blockchain network status
- Connection health monitoring
- Streaming metrics per chain
- Performance analytics

### 4. Transactions (/transactions)
- Cross-chain transaction history
- Real-time event streaming
- Transaction status tracking
- Chain-specific filtering

### 5. Billing (/billing)
- Subscription management
- Payment history
- Plan upgrades
- Usage analytics

## API Integration

The dashboard integrates with Switchboard's microservices:

- **API Service** - Core blockchain operations
- **Billing Service** - Payment and subscription management
- **Oracle Service** - Real-time state coordination

## Real-time Updates

The dashboard polls the Switchboard API every 5 seconds for live updates:

- System metrics
- Chain status
- Streaming performance
- Transaction data

## Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Production build
npm run build
npm start
```

## Demo Features

This dashboard demonstrates Switchboard's core capabilities:

1. **Sub-400ms Cross-Chain Coordination** - Real-time latency monitoring
2. **Multi-Chain Deployments** - Deploy to 6+ blockchain networks
3. **Solana-Powered State Management** - Advanced coordination layer
4. **Enterprise Authentication** - JWT + API key security
5. **Stripe Payment Integration** - Production-ready billing
6. **Comprehensive Monitoring** - Health checks and metrics