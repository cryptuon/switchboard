# Fee Oracle Documentation

## Overview

The Fee Oracle is a monitoring service that tracks on-chain fee collection, generates reports, and provides analytics for ChainSync's fee collection system. It ensures transparency and provides insights into the financial performance of the platform.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Solana        │    │   Fee Oracle     │    │   Reporting     │
│   Blockchain    │    │                  │    │                 │
│                 │    │  Fee Monitoring  │───►│  Real-time      │
│  Treasury       │◄──►│                  │    │  Dashboard      │
│  Wallet         │    │  Data            │    │                 │
│                 │    │  Collection      │    │                 │
│                 │    │                  │    │                 │
│                 │    │  Report          │───►│  Periodic       │
│                 │    │  Generation      │    │  Reports        │
│                 │    │                  │    │                 │
│                 │    │  Analytics       │───►│  Analytics      │
│                 │    │  Processing      │    │  API            │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Features

### Fee Monitoring

Continuous monitoring of fee transactions:

- **Real-time Tracking**: Monitors treasury wallet for incoming fees
- **Transaction Parsing**: Extracts fee information from transactions
- **Anomaly Detection**: Identifies unusual fee patterns

### Report Generation

Creates comprehensive fee reports:

- **Daily Reports**: Summary of daily fee collection
- **Weekly Reports**: Weekly trends and analysis
- **Monthly Reports**: Detailed monthly financial statements
- **Custom Reports**: Ad-hoc reporting for specific periods

### Analytics Processing

Provides analytical insights:

- **Revenue Trends**: Track fee collection over time
- **User Analysis**: Fee contribution by user segments
- **Chain Analysis**: Fee distribution across supported chains
- **Performance Metrics**: Efficiency of fee collection

### Alerting System

Notifies stakeholders of important events:

- **Threshold Alerts**: Notifications when fees exceed/fall below thresholds
- **Anomaly Alerts**: Warnings for unusual fee patterns
- **System Alerts**: Notifications for monitoring system issues

## Technical Implementation

### Solana Integration

The oracle connects to Solana to monitor fee transactions:

```typescript
// Monitor treasury wallet
const treasuryWallet = new PublicKey(process.env.TREASURY_WALLET_ADDRESS);
const subscriptionId = connection.onAccountChange(
  treasuryWallet,
  (accountInfo) => {
    // Process fee transaction
    processFeeTransaction(accountInfo);
  }
);
```

### Data Processing

Fee data is processed and stored:

- **Transaction Parsing**: Extract fee amounts and metadata
- **Data Aggregation**: Group fees by time periods, users, chains
- **Statistical Analysis**: Calculate trends and patterns

### Reporting Engine

Generates various types of reports:

- **Template-based**: Uses templates for consistent report formatting
- **Scheduled**: Automatically generates reports on schedule
- **On-demand**: Generates reports when requested

## API Endpoints

### Real-time Data
- `GET /fees/latest` - Get latest fee transactions
- `GET /fees/summary` - Get fee summary for current period
- `GET /fees/trends` - Get fee trends over time

### Analytics
- `GET /analytics/revenue` - Revenue analytics
- `GET /analytics/users` - User contribution analysis
- `GET /analytics/chains` - Chain distribution analysis

### Reports
- `GET /reports/daily` - Daily reports
- `GET /reports/weekly` - Weekly reports
- `GET /reports/monthly` - Monthly reports
- `POST /reports/custom` - Custom report generation

### Alerts
- `GET /alerts` - Get recent alerts
- `POST /alerts` - Create new alert rule
- `DELETE /alerts/:id` - Delete alert rule

## Database Schema

### FeeTransactions Collection
```typescript
interface FeeTransaction {
  id: string;
  transactionId: string;
  amount: number;
  timestamp: Date;
  userId?: string;
  chain?: string;
  processedAt: Date;
}
```

### Reports Collection
```typescript
interface FeeReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  periodStart: Date;
  periodEnd: Date;
  totalFees: number;
  transactionCount: number;
  createdAt: Date;
  data: any; // Detailed report data
}
```

### Analytics Collection
```typescript
interface FeeAnalytics {
  id: string;
  type: string; // 'revenue', 'users', 'chains', etc.
  period: string; // 'daily', 'weekly', 'monthly'
  data: any; // Analytics data
  generatedAt: Date;
}
```

## Configuration

The service requires the following environment variables:

- `SOLANA_RPC_URL` - Solana RPC endpoint
- `TREASURY_WALLET_ADDRESS` - Address of the treasury wallet to monitor
- `MONGODB_URI` - MongoDB connection string
- `FEE_ORACLE_PORT` - Port to run the service on
- `REPORT_SCHEDULE` - Configuration for report generation schedule

## Security

### Authentication

API endpoints require authentication:

- **API Key Authentication**: For automated systems
- **JWT Authentication**: For user interfaces

### Data Protection

- **Encryption**: Sensitive data is encrypted at rest
- **Access Control**: Role-based access to fee data
- **Audit Logs**: All access to fee data is logged

## Monitoring and Performance

### Metrics

The service exposes metrics for monitoring:

- **Collection Metrics**: Fee collection rates, success rates
- **Processing Metrics**: Data processing times, error rates
- **System Health**: Response times, resource usage

### Performance Optimization

- **Caching**: Frequently accessed data is cached
- **Batch Processing**: Fee data is processed in batches
- **Indexing**: Database indexes for efficient querying

## Integration Points

### ChainSync Services

Integration with other ChainSync services:

- **Billing Service**: Provides fee data for billing
- **API Service**: Exposes fee analytics to users
- **Dashboard**: Powers real-time fee visualization

### External Systems

- **Analytics Platforms**: Integration with business intelligence tools
- **Alerting Systems**: Integration with notification services
- **Financial Systems**: Integration with accounting systems

## Scaling Considerations

### Horizontal Scaling

The service is designed to scale horizontally:

- **Stateless Design**: No session data stored locally
- **Database Sharding**: Fee data can be sharded by time periods
- **Load Balancing**: Multiple instances can run behind a load balancer

### Performance Optimization

- **Streaming**: Uses Solana's streaming APIs for real-time data
- **Aggregation**: Pre-aggregates data for common queries
- **Compression**: Compresses historical data to save space