/**
 * Subscription management service for Switchboard Billing Service
 */

import { Subscription } from '../models/user';

export class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();

  /**
   * Create a new subscription for a user
   */
  async createSubscription(userId: string, tier: 'free' | 'basic' | 'standard' | 'enterprise'): Promise<Subscription> {
    // Check if user already has an active subscription
    const existingSubscription = await this.getActiveSubscription(userId);
    if (existingSubscription) {
      throw new Error('User already has an active subscription');
    }

    const now = new Date();
    const startDate = now;
    const renewalDate = new Date(now);
    
    // Set renewal date based on billing interval
    switch (tier) {
      case 'enterprise':
        // Enterprise customers might have annual billing by default
        renewalDate.setFullYear(now.getFullYear() + 1);
        break;
      default:
        renewalDate.setMonth(now.getMonth() + 1);
    }

    const endDate = new Date(renewalDate);
    endDate.setDate(endDate.getDate() - 1); // End date is one day before renewal

    const newSubscription: Subscription = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      userId,
      tier,
      startDate,
      endDate,
      renewalDate,
      status: 'active',
      billingInterval: tier === 'enterprise' ? 'annual' : 'monthly'
    };

    this.subscriptions.set(newSubscription.id, newSubscription);
    return newSubscription;
  }

  /**
   * Get active subscription for a user
   */
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.userId === userId && subscription.status === 'active') {
        // Check if subscription is still valid
        const now = new Date();
        if (subscription.endDate >= now) {
          return subscription;
        }
      }
    }
    return null;
  }

  /**
   * Upgrade/downgrade subscription tier
   */
  async updateSubscriptionTier(userId: string, newTier: 'free' | 'basic' | 'standard' | 'enterprise'): Promise<Subscription> {
    const existingSubscription = await this.getActiveSubscription(userId);
    
    if (!existingSubscription) {
      // Create new subscription if none exists
      return await this.createSubscription(userId, newTier);
    }

    // Update the existing subscription
    existingSubscription.tier = newTier;
    
    // Adjust billing interval for enterprise tier
    if (newTier === 'enterprise') {
      existingSubscription.billingInterval = 'annual';
    } else {
      existingSubscription.billingInterval = 'monthly';
    }

    // Update renewal date
    const now = new Date();
    const renewalDate = new Date(existingSubscription.renewalDate);
    
    if (newTier === 'enterprise' && existingSubscription.billingInterval !== 'annual') {
      // Switch to annual billing for enterprise
      renewalDate.setFullYear(now.getFullYear() + 1);
    } else if (newTier !== 'enterprise' && existingSubscription.billingInterval === 'annual') {
      // Switch to monthly billing for non-enterprise
      renewalDate.setMonth(now.getMonth() + 1);
    }

    existingSubscription.renewalDate = renewalDate;
    const endDate = new Date(renewalDate);
    endDate.setDate(endDate.getDate() - 1);
    existingSubscription.endDate = endDate;

    // Save updated subscription
    this.subscriptions.set(existingSubscription.id, existingSubscription);
    
    return existingSubscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<boolean> {
    const existingSubscription = await this.getActiveSubscription(userId);
    
    if (!existingSubscription) {
      return false;
    }

    existingSubscription.status = 'cancelled';
    this.subscriptions.set(existingSubscription.id, existingSubscription);
    return true;
  }

  /**
   * Renew subscription
   */
  async renewSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'active') {
      throw new Error('Only active subscriptions can be renewed');
    }

    // Update dates for renewal
    const now = new Date();
    subscription.startDate = now;
    
    // Set new renewal date
    if (subscription.billingInterval === 'annual') {
      subscription.renewalDate.setFullYear(now.getFullYear() + 1);
    } else {
      subscription.renewalDate.setMonth(now.getMonth() + 1);
    }

    const endDate = new Date(subscription.renewalDate);
    endDate.setDate(endDate.getDate() - 1);
    subscription.endDate = endDate;

    // Save updated subscription
    this.subscriptions.set(subscription.id, subscription);
    
    return subscription;
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const userSubscriptions: Subscription[] = [];
    
    for (const subscription of this.subscriptions.values()) {
      if (subscription.userId === userId) {
        userSubscriptions.push(subscription);
      }
    }
    
    return userSubscriptions;
  }

  /**
   * Check if enterprise features should be enabled
   */
  async shouldEnableEnterpriseFeatures(userId: string): Promise<boolean> {
    const subscription = await this.getActiveSubscription(userId);
    
    if (!subscription) {
      return false;
    }

    // Enable enterprise features for enterprise tier
    return subscription.tier === 'enterprise';
  }

  /**
   * Get subscription usage limits
   */
  async getUsageLimits(userId: string): Promise<number> {
    const subscription = await this.getActiveSubscription(userId);
    
    if (!subscription) {
      // Free tier limits
      return 1000;
    }

    // Return limits based on tier
    switch (subscription.tier) {
      case 'free':
        return 1000;
      case 'basic':
        return 10000;
      case 'standard':
        return 100000;
      case 'enterprise':
        return 1000000; // Effectively unlimited for enterprise
      default:
        return 1000;
    }
  }

  /**
   * Get subscription features
   */
  async getSubscriptionFeatures(userId: string): Promise<string[]> {
    const subscription = await this.getActiveSubscription(userId);
    
    if (!subscription) {
      // Free tier features
      return [
        'Basic API access',
        '1,000 requests/month'
      ];
    }

    // Return features based on tier
    switch (subscription.tier) {
      case 'free':
        return [
          'Basic API access',
          '1,000 requests/month'
        ];
      case 'basic':
        return [
          'Basic API access',
          '10,000 requests/month',
          'Email support'
        ];
      case 'standard':
        return [
          'Full API access',
          '100,000 requests/month',
          'Priority support',
          'Advanced analytics'
        ];
      case 'enterprise':
        return [
          'Unlimited API access',
          'Custom request limits',
          '24/7 phone support',
          'Dedicated account manager',
          'Custom integrations',
          'SLA guarantee'
        ];
      default:
        return [
          'Basic API access',
          '1,000 requests/month'
        ];
    }
  }
}