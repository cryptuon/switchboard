/**
 * Main application file for Switchboard Billing Service
 */

import { BillingService } from './index';

// Configuration
const config = {
  port: parseInt(process.env.BILLING_PORT || '3000'),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  databaseUrl: process.env.DATABASE_URL || 'mongodb://localhost:27017/chainsync_billing'
};

// Create and start the billing service
const billingService = new BillingService(config);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the service
billingService.start();

console.log('Switchboard Billing Service started');