/**
 * ChainSync Services Shared Utilities
 *
 * Common functions and types used by all ChainSync services
 */

// Export all shared modules
export * from './config/config-manager';
export * from './errors/service-errors';
export * from './logging/logger';
export * from './retry/retry-manager';
export * from './health/health-checker';
export * from './metrics/metrics-collector';
export * from './base/base-service';
export * from './database';
export * from './communication';
export * from './auth';
export * from './testing';

// Common types
export interface ChainInfo {
  name: string;
  rpcUrl: string;
  chainId: number;
}

export interface TransactionData {
  id: string;
  chain: string;
  status: string;
  timestamp: number;
}

// Utility functions
export function validateChainName(chainName: string): boolean {
  const supportedChains = ['ethereum', 'polygon', 'solana', 'arbitrum', 'bsc', 'avalanche'];
  return supportedChains.includes(chainName.toLowerCase());
}

export function formatTransactionId(id: string): string {
  // Ensure transaction ID is in a consistent format
  return id.toLowerCase().trim();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export all utilities
export default {
  validateChainName,
  formatTransactionId,
  sleep
};