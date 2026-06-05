/**
 * Integration test for Switchboard Billing Service
 */

import { BillingCalculator } from './src/services/billing.calculator';
import { SubscriptionManager } from './src/services/subscription.manager';
import { InvoiceService } from './src/services/invoice.service';

async function main() {
  console.log('Testing Switchboard Billing Service Integration...');
  
  // Create service instances
  const billingCalculator = new BillingCalculator();
  const subscriptionManager = new SubscriptionManager();
  const invoiceService = new InvoiceService(billingCalculator);
  
  // Test 1: Create a user subscription
  console.log('\n=== Creating User Subscription ===');
  const userId = 'user_' + Date.now();
  
  try {
    const subscription = await subscriptionManager.createSubscription(userId, 'standard');
    console.log(`Created subscription for user ${userId}:`);
    console.log(`  ID: ${subscription.id}`);
    console.log(`  Tier: ${subscription.tier}`);
    console.log(`  Start Date: ${subscription.startDate}`);
    console.log(`  End Date: ${subscription.endDate}`);
    console.log(`  Renewal Date: ${subscription.renewalDate}`);
    console.log(`  Status: ${subscription.status}`);
    
    // Test 2: Check if subscription is active
    const activeSubscription = await subscriptionManager.getActiveSubscription(userId);
    console.log(`\nActive subscription for user ${userId}: ${activeSubscription ? 'Yes' : 'No'}`);
    
    // Test 3: Get subscription features
    const features = await subscriptionManager.getSubscriptionFeatures(userId);
    console.log(`\nSubscription features:`);
    features.forEach(feature => console.log(`  - ${feature}`));
    
    // Test 4: Get usage limits
    const usageLimits = await subscriptionManager.getUsageLimits(userId);
    console.log(`\nUsage limits: ${usageLimits.toLocaleString()} requests/month`);
    
    // Test 5: Upgrade subscription
    console.log(`\n=== Upgrading Subscription ===`);
    const upgradedSubscription = await subscriptionManager.updateSubscriptionTier(userId, 'enterprise');
    console.log(`Upgraded subscription to ${upgradedSubscription.tier} tier`);
    
    // Test 6: Check enterprise features
    const hasEnterpriseFeatures = await subscriptionManager.shouldEnableEnterpriseFeatures(userId);
    console.log(`Enterprise features enabled: ${hasEnterpriseFeatures}`);
    
    // Test 7: Generate invoice
    console.log(`\n=== Generating Invoice ===`);
    // Mock usage records
    const usageRecords = [
      { 
        id: 'usage_1', 
        userId, 
        apiKey: 'test_api_key_1', 
        endpoint: '/api/v1/state', 
        timestamp: new Date() 
      },
      { 
        id: 'usage_2', 
        userId, 
        apiKey: 'test_api_key_1', 
        endpoint: '/api/v1/sync', 
        timestamp: new Date() 
      },
      { 
        id: 'usage_3', 
        userId, 
        apiKey: 'test_api_key_1', 
        endpoint: '/api/v1/track', 
        timestamp: new Date() 
      }
    ];
    
    const invoice = await invoiceService.generateInvoice(userId, usageRecords);
    console.log(`Generated invoice ${invoice.id}:`);
    console.log(`  Amount: $${invoice.amount}`);
    console.log(`  Status: ${invoice.status}`);
    console.log(`  Period: ${invoice.periodStart.toISOString()} to ${invoice.periodEnd.toISOString()}`);
    
    // Test 8: Issue invoice
    const issuedInvoice = await invoiceService.issueInvoice(invoice.id);
    console.log(`\nIssued invoice with status: ${issuedInvoice.status}`);
    
    // Test 9: Pay invoice
    const paidInvoice = await invoiceService.payInvoice(invoice.id);
    console.log(`Paid invoice with status: ${paidInvoice.status}`);
    
    console.log('\n=== Integration Test Completed Successfully ===');
  } catch (error) {
    console.error('Error during integration test:', error);
  }
}

// Run the integration test
main().catch(console.error);