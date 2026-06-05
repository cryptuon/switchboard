# Switchboard Billing Service

The Billing Service handles all billing and subscription management for Switchboard's SDK and API services.

## Features

- **Usage Tracking**: Monitors API/SDK usage for billing purposes
- **Subscription Management**: Handles enterprise customer subscriptions
- **Invoice Generation**: Creates and manages billing invoices
- **Payment Processing**: Integrates with Stripe for payment handling
- **Tiered Pricing**: Implements volume-based pricing tiers

## Development

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (for persistent data storage)

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

- `STRIPE_SECRET_KEY` - Stripe API key for payment processing
- `MONGODB_URI` - MongoDB connection string
- `BILLING_PORT` - Port to run the service on

## License

MIT