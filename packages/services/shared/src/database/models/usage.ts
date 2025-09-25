/**
 * Usage tracking
 */

export interface UsageRecord {
  userId: string;
  apiKey: string;
  endpoint: string;
  timestamp: Date;
  transactionValue?: number; // For fee calculations
}