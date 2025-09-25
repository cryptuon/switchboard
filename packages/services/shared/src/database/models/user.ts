/**
 * User billing information
 */

export interface User {
  id: string;
  apiKey: string;
  email: string;
  subscriptionTier: 'free' | 'basic' | 'standard' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}