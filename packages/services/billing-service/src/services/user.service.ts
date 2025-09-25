/**
 * User service for ChainSync Billing Service
 */

import { User, UsageRecord, Subscription, Invoice } from '../models/user';

export class UserService {
  private users: Map<string, User> = new Map();
  private usageRecords: Map<string, UsageRecord> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private invoices: Map<string, Invoice> = new Map();

  /**
   * Create a new user
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const newUser: User = {
      id: 'user-' + Date.now(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(newUser.id, newUser);
    return newUser;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  /**
   * Get user by API key
   */
  async getUserByApiKey(apiKey: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.apiKey === apiKey) {
        return user;
      }
    }
    return null;
  }

  /**
   * Record API/SDK usage
   */
  async recordUsage(usageData: Omit<UsageRecord, 'id' | 'timestamp'>): Promise<UsageRecord> {
    const newUsage: UsageRecord = {
      id: 'usage-' + Date.now(),
      ...usageData,
      timestamp: new Date()
    };

    this.usageRecords.set(newUsage.id, newUsage);
    return newUsage;
  }

  /**
   * Get usage records for a user
   */
  async getUserUsage(userId: string, limit: number = 100): Promise<UsageRecord[]> {
    const userUsage: UsageRecord[] = [];
    
    for (const usage of this.usageRecords.values()) {
      if (usage.userId === userId) {
        userUsage.push(usage);
      }
    }
    
    // Sort by timestamp descending and limit results
    return userUsage
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Create subscription for user
   */
  async createSubscription(subscriptionData: Omit<Subscription, 'id' | 'startDate' | 'endDate' | 'renewalDate'>): Promise<Subscription> {
    const startDate = new Date();
    const endDate = new Date(startDate);
    const renewalDate = new Date(startDate);
    
    // Set end date based on billing interval
    if (subscriptionData.billingInterval === 'annual') {
      endDate.setFullYear(startDate.getFullYear() + 1);
      renewalDate.setFullYear(startDate.getFullYear() + 1);
    } else {
      endDate.setMonth(startDate.getMonth() + 1);
      renewalDate.setMonth(startDate.getMonth() + 1);
    }

    const newSubscription: Subscription = {
      id: 'sub-' + Date.now(),
      ...subscriptionData,
      startDate,
      endDate,
      renewalDate,
      status: 'active'
    };

    this.subscriptions.set(newSubscription.id, newSubscription);
    return newSubscription;
  }

  /**
   * Get subscription by user ID
   */
  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.userId === userId) {
        return subscription;
      }
    }
    return null;
  }

  /**
   * Create invoice for user
   */
  async createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'status'>): Promise<Invoice> {
    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      ...invoiceData,
      status: 'draft',
      createdAt: new Date()
    };

    this.invoices.set(newInvoice.id, newInvoice);
    return newInvoice;
  }

  /**
   * Get invoices for user
   */
  async getUserInvoices(userId: string): Promise<Invoice[]> {
    const userInvoices: Invoice[] = [];
    
    for (const invoice of this.invoices.values()) {
      if (invoice.userId === userId) {
        userInvoices.push(invoice);
      }
    }
    
    return userInvoices;
  }
}