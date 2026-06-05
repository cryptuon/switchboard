/**
 * Invoice service for Switchboard Billing Service
 */

import { Invoice, UsageRecord } from '../models/user';
import { BillingCalculator } from './billing.calculator';

export class InvoiceService {
  private invoices: Map<string, Invoice> = new Map();
  private billingCalculator: BillingCalculator;

  constructor(billingCalculator: BillingCalculator) {
    this.billingCalculator = billingCalculator;
  }

  /**
   * Generate invoice for a user
   */
  async generateInvoice(userId: string, usageRecords: UsageRecord[]): Promise<Invoice> {
    // Calculate total usage
    const totalRequests = usageRecords.length;
    
    // Determine subscription tier (in a real implementation, this would come from the user's subscription)
    const subscriptionTier = 'basic'; // Default to basic tier for now
    
    // Calculate billing amounts
    const billing = this.billingCalculator.calculateMonthlyBill(subscriptionTier, totalRequests);
    
    // Create invoice
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(1); // First day of current month
    
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0); // Last day of current month
    
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
    
    const newInvoice: Invoice = {
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      userId,
      amount: billing.total,
      currency: 'USD',
      status: 'draft',
      periodStart,
      periodEnd,
      createdAt: now,
      dueAt: dueDate
    };

    this.invoices.set(newInvoice.id, newInvoice);
    return newInvoice;
  }

  /**
   * Issue invoice (change status to issued)
   */
  async issueInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new Error('Only draft invoices can be issued');
    }

    invoice.status = 'issued';
    invoice.issuedAt = new Date();
    
    // Set due date if not already set
    if (!invoice.dueAt) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
      invoice.dueAt = dueDate;
    }

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  /**
   * Mark invoice as paid
   */
  async payInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      return invoice; // Already paid
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  /**
   * Mark invoice as overdue
   */
  async markOverdue(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'issued') {
      throw new Error('Only issued invoices can be marked as overdue');
    }

    const now = new Date();
    
    // Check if past due date
    if (invoice.dueAt && now > invoice.dueAt) {
      invoice.status = 'overdue';
      this.invoices.set(invoice.id, invoice);
    }
    
    return invoice;
  }

  /**
   * Void invoice
   */
  async voidInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot void a paid invoice');
    }

    invoice.status = 'void';
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    return this.invoices.get(invoiceId) || null;
  }

  /**
   * Get all invoices for a user
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

  /**
   * Get invoices by status
   */
  async getInvoicesByStatus(status: Invoice['status']): Promise<Invoice[]> {
    const filteredInvoices: Invoice[] = [];
    
    for (const invoice of this.invoices.values()) {
      if (invoice.status === status) {
        filteredInvoices.push(invoice);
      }
    }
    
    return filteredInvoices;
  }

  /**
   * Generate invoice summary
   */
  async generateInvoiceSummary(userId: string): Promise<{
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    overdueAmount: number;
  }> {
    const userInvoices = await this.getUserInvoices(userId);
    
    let totalAmount = 0;
    let paidAmount = 0;
    let outstandingAmount = 0;
    let overdueAmount = 0;
    
    for (const invoice of userInvoices) {
      totalAmount += invoice.amount;
      
      if (invoice.status === 'paid') {
        paidAmount += invoice.amount;
      } else if (invoice.status === 'issued' || invoice.status === 'overdue') {
        outstandingAmount += invoice.amount;
        
        if (invoice.status === 'overdue') {
          overdueAmount += invoice.amount;
        }
      }
    }
    
    return {
      totalInvoices: userInvoices.length,
      totalAmount,
      paidAmount,
      outstandingAmount,
      overdueAmount
    };
  }

  /**
   * Send invoice notification
   */
  async sendInvoiceNotification(invoiceId: string): Promise<void> {
    const invoice = await this.getInvoice(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // In a real implementation, this would send an email or notification
    console.log(`Sending invoice notification for invoice ${invoice.id} to user ${invoice.userId}`);
    
    // Simulate sending notification
    // In reality, this would integrate with an email service or notification system
  }
}