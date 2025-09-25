/**
 * Test script for ChainSync Billing Service
 */

import { BillingCalculator } from './src/services/billing.calculator';

async function main() {
  console.log('Testing ChainSync Billing Service...');
  
  // Create billing calculator
  const calculator = new BillingCalculator();
  
  // Test 1: Display pricing tiers
  console.log('\n=== Pricing Tiers ===');
  const tiers = calculator.getAllPricingTiers();
  
  for (const [tierName, tierDetails] of Object.entries(tiers)) {
    console.log(`\n${tierName.toUpperCase()} Tier (${tierDetails.name}):`);
    console.log(`  Monthly Price: $${tierDetails.monthlyPrice}`);
    console.log(`  Usage Limit: ${tierDetails.usageLimit.toLocaleString()} requests`);
    console.log(`  Overage Rate: $${tierDetails.pricePerRequest} per request`);
    console.log(`  Features: ${tierDetails.features.join(', ')}`);
  }
  
  // Test 2: Calculate usage billing
  console.log('\n=== Usage Billing Calculations ===');
  const testRequests = [500, 5000, 15000, 150000, 1500000];
  
  for (const tier of ['free', 'basic', 'standard', 'enterprise'] as const) {
    console.log(`\n${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier:`);
    
    for (const requests of testRequests) {
      try {
        const billing = calculator.calculateUsageBilling(tier, requests);
        const monthlyBill = calculator.calculateMonthlyBill(tier, requests);
        
        console.log(`  ${requests.toLocaleString()} requests: $${billing} overage + $${monthlyBill.subscriptionFee} subscription = $${monthlyBill.total} total`);
      } catch (error) {
        console.log(`  ${requests.toLocaleString()} requests: Error - ${(error as Error).message}`);
      }
    }
  }
  
  // Test 3: Transaction fee calculations
  console.log('\n=== Transaction Fee Calculations ===');
  const testValues = [100, 1000, 10000, 100000, 1000000]; // USD values
  
  for (const value of testValues) {
    const lowVolumeFee = calculator.calculateTransactionFee(value, 'low');
    const mediumVolumeFee = calculator.calculateTransactionFee(value, 'medium');
    const highVolumeFee = calculator.calculateTransactionFee(value, 'high');
    
    const lowPercentage = ((lowVolumeFee / value) * 100).toFixed(4);
    const mediumPercentage = ((mediumVolumeFee / value) * 100).toFixed(4);
    const highPercentage = ((highVolumeFee / value) * 100).toFixed(4);
    
    console.log(`\nTransaction value: $${value.toLocaleString()}:`);
    console.log(`  Low volume fee: $${lowVolumeFee} (${lowPercentage}%)`);
    console.log(`  Medium volume fee: $${mediumVolumeFee} (${mediumPercentage}%)`);
    console.log(`  High volume fee: $${highVolumeFee} (${highPercentage}%)`);
  }
  
  // Test 4: Volume discounts
  console.log('\n=== Volume Discounts ===');
  const baseFee = 1000; // $1000 base fee
  const volumes = [1000, 10000, 100000, 1000000]; // Transaction volumes
  
  for (const volume of volumes) {
    const discountedFee = calculator.applyVolumeDiscount(baseFee, volume);
    const discountAmount = baseFee - discountedFee;
    const discountPercentage = ((discountAmount / baseFee) * 100).toFixed(2);
    
    console.log(`\nBase fee: $${baseFee} at volume $${volume.toLocaleString()}:`);
    console.log(`  Discounted fee: $${discountedFee} (${discountPercentage}% discount)`);
  }
  
  console.log('\n=== Test Completed ===');
}

// Run the test
main().catch(console.error);
