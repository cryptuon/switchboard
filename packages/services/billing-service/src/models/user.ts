/**
 * User model for ChainSync Billing Service
 */

export interface User {
  id: string;
  apiKey: string;
  email: string;
  subscriptionTier: 'free' | 'basic' | 'standard' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
  billingCustomerId?: string; // Stripe customer ID
}

export interface UsageRecord {
  id: string;
  userId: string;
  apiKey: string;
  endpoint: string;
  timestamp: Date;
  value?: number; // Optional value for fee calculations
  billedAmount?: number; // Amount billed for this usage
}

export interface Subscription {
  id: string;
  userId: string;
  tier: 'free' | 'basic' | 'standard' | 'enterprise';
  startDate: Date;
  endDate: Date;
  renewalDate: Date;
  status: 'active' | 'cancelled' | 'paused';
  billingInterval: 'monthly' | 'annual';
  billingCustomerId?: string; // Stripe customer ID
}

export interface Invoice {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'void';
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  issuedAt?: Date;
  dueAt?: Date;
  paidAt?: Date;
  stripeInvoiceId?: string; // Stripe invoice ID
}