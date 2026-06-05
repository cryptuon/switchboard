/**
 * Integration Tests for Billing Service
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { BillingService } from '../../packages/services/billing/src/billing-service';

describe('Billing Service Integration Tests', () => {
  let billingService: BillingService;
  let billingClient: AxiosInstance;

  const testConfig = {
    name: 'test-billing-service',
    port: 3334,
    version: '1.0.0-test',
    stripe: {
      secretKey: process.env.STRIPE_TEST_SECRET_KEY || 'sk_test_fake_key_for_testing',
      publicKey: process.env.STRIPE_TEST_PUBLIC_KEY || 'pk_test_fake_key_for_testing',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_webhook_secret'
    },
    database: {
      url: process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/switchboard-billing-test',
      options: {}
    },
    pricing: {
      plans: {
        basic: {
          priceId: 'price_test_basic',
          name: 'Basic Plan',
          price: 2999, // $29.99
          currency: 'usd',
          interval: 'month' as const,
          features: ['10 deployments/month', 'Basic support', '3 chains']
        },
        pro: {
          priceId: 'price_test_pro',
          name: 'Pro Plan',
          price: 9999, // $99.99
          currency: 'usd',
          interval: 'month' as const,
          features: ['Unlimited deployments', 'Priority support', '6 chains', 'Advanced analytics']
        }
      }
    }
  };

  beforeAll(async () => {
    // Skip Stripe tests if no real API key is provided
    if (testConfig.stripe.secretKey.includes('fake')) {
      console.log('⚠️ Using fake Stripe key - some tests will be skipped');
    }

    // Start billing service
    billingService = new BillingService(testConfig);
    await billingService.start();

    // Create billing API client
    billingClient = axios.create({
      baseURL: `http://localhost:${testConfig.port}`,
      timeout: 10000
    });
  }, 30000);

  afterAll(async () => {
    if (billingService) {
      await billingService.stop();
    }
  }, 10000);

  describe('Health and Info Endpoints', () => {
    test('GET /health should return service health', async () => {
      const response = await billingClient.get('/health');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
      expect(['healthy', 'unhealthy']).toContain(response.data.status);
    });

    test('GET /info should return service information', async () => {
      const response = await billingClient.get('/info');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('name', testConfig.name);
      expect(response.data).toHaveProperty('version', testConfig.version);
      expect(response.data).toHaveProperty('uptime');
    });
  });

  describe('Plans Endpoint', () => {
    test('GET /api/v1/billing/plans should return available plans', async () => {
      const response = await billingClient.get('/api/v1/billing/plans');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);

      const plans = response.data.data;
      expect(plans.length).toBe(2);

      const basicPlan = plans.find((p: any) => p.id === 'basic');
      expect(basicPlan).toBeDefined();
      expect(basicPlan.name).toBe('Basic Plan');
      expect(basicPlan.price).toBe(2999);
      expect(basicPlan.currency).toBe('usd');
      expect(basicPlan.interval).toBe('month');
      expect(Array.isArray(basicPlan.features)).toBe(true);
    });
  });

  describe('Customer Management', () => {
    const testCustomer = {
      userId: `user_${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      name: 'Test Customer'
    };

    let customerId: string;

    test('POST /api/v1/billing/customers should create a customer', async () => {
      if (testConfig.stripe.secretKey.includes('fake')) {
        console.log('⚠️ Skipping Stripe customer creation - fake API key');
        return;
      }

      const response = await billingClient.post('/api/v1/billing/customers', testCustomer);

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data).toHaveProperty('stripeCustomerId');
      expect(response.data.data.email).toBe(testCustomer.email);
      expect(response.data.data.name).toBe(testCustomer.name);

      customerId = response.data.data.id;
    });

    test('POST /api/v1/billing/customers should validate required fields', async () => {
      const invalidCustomer = {
        userId: 'user_123'
        // Missing required email field
      };

      try {
        await billingClient.post('/api/v1/billing/customers', invalidCustomer);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Payment Intents', () => {
    const testPayment = {
      customerId: 'test_customer_id',
      amount: 2999, // $29.99
      currency: 'usd',
      description: 'Test payment for Switchboard services'
    };

    test('POST /api/v1/billing/payment-intents should validate request', async () => {
      const invalidPayment = {
        customerId: 'test_customer_id',
        amount: 10 // Below minimum amount (50 cents)
      };

      try {
        await billingClient.post('/api/v1/billing/payment-intents', invalidPayment);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Subscriptions', () => {
    const testSubscription = {
      customerId: 'test_customer_id',
      planId: 'basic'
    };

    test('POST /api/v1/billing/subscriptions should validate request', async () => {
      const invalidSubscription = {
        customerId: 'test_customer_id',
        planId: 'non_existent_plan'
      };

      try {
        await billingClient.post('/api/v1/billing/subscriptions', invalidSubscription);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.code).toBe('VALIDATION_ERROR');
      }
    });

    test('GET /api/v1/billing/customers/:customerId/subscriptions should return empty array for non-existent customer', async () => {
      const response = await billingClient.get('/api/v1/billing/customers/non_existent_customer/subscriptions');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBe(0);
    });
  });

  describe('Webhook Handling', () => {
    test('POST /api/v1/billing/webhooks/stripe should require valid signature', async () => {
      const webhookPayload = {
        id: 'evt_test',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test',
            amount: 2999,
            currency: 'usd',
            status: 'succeeded'
          }
        }
      };

      try {
        await billingClient.post('/api/v1/billing/webhooks/stripe', webhookPayload, {
          headers: {
            'stripe-signature': 'invalid_signature'
          }
        });
        fail('Should have rejected invalid signature');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('Error Handling', () => {
    test('Should return 404 for non-existent routes', async () => {
      try {
        await billingClient.get('/api/v1/billing/non-existent-route');
        fail('Should have thrown 404 error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.code).toBe('NOT_FOUND');
      }
    });

    test('Should handle Stripe errors gracefully', async () => {
      if (testConfig.stripe.secretKey.includes('fake')) {
        // With fake keys, Stripe operations will fail
        try {
          await billingClient.post('/api/v1/billing/customers', {
            userId: 'user_test',
            email: 'test@example.com'
          });
          fail('Should have failed with fake Stripe key');
        } catch (error: any) {
          expect(error.response.status).toBe(400);
          expect(error.response.data.success).toBe(false);
          expect(error.response.data.error.code).toBe('STRIPE_ERROR');
        }
      }
    });
  });
});