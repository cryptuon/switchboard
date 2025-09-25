/**
 * Billing calculation service for ChainSync Billing Service
 */

export class BillingCalculator {
  // Pricing tiers
  private pricingTiers = {
    free: {
      name: 'Free',
      monthlyPrice: 0,
      usageLimit: 1000,
      pricePerRequest: 0.0001, // $0.0001 per request after limit
      features: ['Basic API access', '1,000 requests/month']
    },
    basic: {
      name: 'Basic',
      monthlyPrice: 29,
      usageLimit: 10000,
      pricePerRequest: 0.00005, // $0.00005 per request after limit
      features: ['Basic API access', '10,000 requests/month', 'Email support']
    },
    standard: {
      name: 'Standard',
      monthlyPrice: 99,
      usageLimit: 100000,
      pricePerRequest: 0.00002, // $0.00002 per request after limit
      features: ['Full API access', '100,000 requests/month', 'Priority support', 'Advanced analytics']
    },
    enterprise: {
      name: 'Enterprise',
      monthlyPrice: 499,
      usageLimit: 1000000,
      pricePerRequest: 0.00001, // $0.00001 per request after limit
      features: ['Unlimited API access', 'Custom request limits', '24/7 phone support', 'Dedicated account manager', 'Custom integrations']
    }
  };

  /**
   * Calculate billing amount for usage
   */
  calculateUsageBilling(tier: keyof typeof this.pricingTiers, requests: number): number {
    const tierConfig = this.pricingTiers[tier];
    
    if (!tierConfig) {
      throw new Error(`Unknown pricing tier: ${tier}`);
    }

    // If within usage limit, no additional charges
    if (requests <= tierConfig.usageLimit) {
      return 0;
    }

    // Calculate overage charges
    const overageRequests = requests - tierConfig.usageLimit;
    const overageCost = overageRequests * tierConfig.pricePerRequest;
    
    return parseFloat(overageCost.toFixed(2)); // Round to 2 decimal places
  }

  /**
   * Calculate total monthly bill
   */
  calculateMonthlyBill(tier: keyof typeof this.pricingTiers, usage: number): { 
    subscriptionFee: number; 
    usageFee: number; 
    total: number 
  } {
    const tierConfig = this.pricingTiers[tier];
    
    if (!tierConfig) {
      throw new Error(`Unknown pricing tier: ${tier}`);
    }

    const usageFee = this.calculateUsageBilling(tier, usage);
    const total = tierConfig.monthlyPrice + usageFee;

    return {
      subscriptionFee: tierConfig.monthlyPrice,
      usageFee,
      total: parseFloat(total.toFixed(2))
    };
  }

  /**
   * Get pricing tier details
   */
  getPricingTier(tier: keyof typeof this.pricingTiers) {
    return this.pricingTiers[tier];
  }

  /**
   * Get all pricing tiers
   */
  getAllPricingTiers() {
    return this.pricingTiers;
  }

  /**
   * Calculate fee for cross-chain transaction based on value
   * This implements the 0.04-0.1% fee structure mentioned in the business plan
   */
  calculateTransactionFee(value: number, volumeTier: 'low' | 'medium' | 'high' = 'low'): number {
    // Base fee rates based on volume tier
    const feeRates = {
      low: 0.0004,    // 0.04%
      medium: 0.0006, // 0.06%
      high: 0.0002    // 0.02%
    };

    const baseRate = feeRates[volumeTier];
    const fee = value * baseRate;
    
    return parseFloat(fee.toFixed(2)); // Round to 2 decimal places
  }

  /**
   * Apply volume discount based on transaction volume
   */
  applyVolumeDiscount(baseFee: number, volume: number): number {
    let discountRate = 0;

    // Volume discount tiers
    if (volume >= 1000000) {        // $1M+
      discountRate = 0.15;           // 15% discount
    } else if (volume >= 100000) {  // $100K+
      discountRate = 0.10;          // 10% discount
    } else if (volume >= 10000) {   // $10K+
      discountRate = 0.05;          // 5% discount
    }

    const discountedFee = baseFee * (1 - discountRate);
    return parseFloat(discountedFee.toFixed(2));
  }
}