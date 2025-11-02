import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import Stripe from 'stripe';
import handler from '@/api/webhooks/stripe';
import * as webhookHandlers from '@/lib/stripe-webhooks';

// Mock Stripe
jest.mock('stripe');
const stripeMock = Stripe as jest.MockedClass<typeof Stripe>;

// Mock micro buffer
jest.mock('micro', () => ({
  buffer: jest.fn().mockResolvedValue(Buffer.from('test-body'))
}));

// Mock webhook handlers
jest.mock('@/lib/stripe-webhooks');

describe('Stripe Webhook Handler', () => {
  let constructEventMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Stripe webhook constructEvent
    constructEventMock = jest.spyOn(
      stripeMock.prototype.webhooks,
      'constructEvent'
    );
  });

  it('should reject non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getHeaders().allow).toBe('POST');
  });

  it('should reject requests with invalid signature', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'invalid-signature',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toContain('Invalid signature');
  });

  describe('Payment Intent Events', () => {
    it('should handle payment_intent.succeeded', async () => {
      const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_test_123',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          quote_id: 'quote_123',
          email: 'test@example.com'
        }
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: mockPaymentIntent as any
        }
      };

      constructEventMock.mockReturnValue(mockEvent);

      (webhookHandlers.handlePaymentSuccess as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Payment processed',
        data: { orderId: 'order_123' }
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
      });

      await handler(req, res);

      expect(webhookHandlers.handlePaymentSuccess).toHaveBeenCalledWith(
        mockPaymentIntent,
        'evt_test_123'
      );
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        received: true,
        type: 'payment_intent.succeeded'
      });
    });

    it('should handle payment_intent.payment_failed', async () => {
      const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_test_failed',
        amount: 5000,
        currency: 'usd',
        status: 'requires_payment_method',
        last_payment_error: {
          message: 'Card declined'
        } as any
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test_failed',
        type: 'payment_intent.payment_failed',
        data: {
          object: mockPaymentIntent as any
        }
      };

      constructEventMock.mockReturnValue(mockEvent);

      (webhookHandlers.handlePaymentFailure as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Payment failure handled'
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
      });

      await handler(req, res);

      expect(webhookHandlers.handlePaymentFailure).toHaveBeenCalledWith(
        mockPaymentIntent,
        'evt_test_failed'
      );
      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('Subscription Events', () => {
    it('should handle customer.subscription.created', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        items: {
          data: [
            {
              price: {
                id: 'price_123',
                product: 'prod_123'
              },
              quantity: 1
            }
          ]
        } as any
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_sub_created',
        type: 'customer.subscription.created',
        data: {
          object: mockSubscription as any
        }
      };

      constructEventMock.mockReturnValue(mockEvent);

      (webhookHandlers.handleSubscriptionCreated as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Subscription created',
        data: { subscriptionId: 'sub_123' }
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
      });

      await handler(req, res);

      expect(webhookHandlers.handleSubscriptionCreated).toHaveBeenCalledWith(
        mockSubscription,
        'evt_sub_created'
      );
      expect(res._getStatusCode()).toBe(200);
    });

    it('should handle customer.subscription.deleted', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_deleted',
        customer: 'cus_test_123',
        status: 'canceled',
        metadata: {
          gpu_access: 'true'
        }
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_sub_deleted',
        type: 'customer.subscription.deleted',
        data: {
          object: mockSubscription as any
        }
      };

      constructEventMock.mockReturnValue(mockEvent);

      (webhookHandlers.handleSubscriptionDeleted as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Subscription cancelled'
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
      });

      await handler(req, res);

      expect(webhookHandlers.handleSubscriptionDeleted).toHaveBeenCalledWith(
        mockSubscription,
        'evt_sub_deleted'
      );
      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('Invoice Events', () => {
    it('should handle invoice.paid', async () => {
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_test_123',
        subscription: 'sub_123',
        customer: 'cus_123',
        amount_paid: 10000,
        currency: 'usd',
        invoice_pdf: 'https://invoice.pdf',
        hosted_invoice_url: 'https://invoice.url'
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_invoice_paid',
        type: 'invoice.paid',
        data: {
          object: mockInvoice as any
        }
      };

      constructEventMock.mockReturnValue(mockEvent);

      (webhookHandlers.handleInvoicePaid as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Invoice paid',
        data: { invoiceId: 'inv_123' }
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
      });

      await handler(req, res);

      expect(webhookHandlers.handleInvoicePaid).toHaveBeenCalledWith(
        mockInvoice,
        'evt_invoice_paid'
      );
      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('Refund Events', () => {
    it('should handle charge.refunded', async () => {
      const mockCharge: Partial<Stripe.Charge> = {
        id: 'ch_test_123',
        payment_intent: 'pi_123',
        amount_refunded: 5000,
        currency: 'usd',
        refunds: {
          data: [
            {
              reason: 'requested_by_customer'
            }
          ]
        } as any
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_refund',
        type: 'charge.refunded',
        data: {
          object: mockCharge as any
        }
      };

      constructEventMock.mockReturnValue(mockEvent);

      (webhookHandlers.handleRefund as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Refund processed',
        data: { refundId: 'refund_123' }
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
      });

      await handler(req, res);

      expect(webhookHandlers.handleRefund).toHaveBeenCalledWith(
        mockCharge,
        'evt_refund'
      );
      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when handler throws error', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_error',
        type: 'payment_intent.succeeded',
        data: {
          object: {} as any
        }
      };

      constructEventMock.mockReturnValue(mockEvent);

      (webhookHandlers.handlePaymentSuccess as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Database error'
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Database error');
    });

    it('should handle unhandled event types gracefully', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_unknown',
        type: 'unknown.event.type' as any,
        data: {
          object: {} as any
        }
      };

      constructEventMock.mockReturnValue(mockEvent);

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        received: true,
        type: 'unknown.event.type'
      });
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate events gracefully', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_duplicate',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_duplicate'
          } as any
        }
      };

      constructEventMock.mockReturnValue(mockEvent);

      // First call - process normally
      (webhookHandlers.handlePaymentSuccess as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'Payment processed'
      });

      // Second call - already processed
      (webhookHandlers.handlePaymentSuccess as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'Event already processed'
      });

      const { req: req1, res: res1 } = createMocks({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
      });

      const { req: req2, res: res2 } = createMocks({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
      });

      await handler(req1, res1);
      await handler(req2, res2);

      expect(webhookHandlers.handlePaymentSuccess).toHaveBeenCalledTimes(2);
      expect(res1._getStatusCode()).toBe(200);
      expect(res2._getStatusCode()).toBe(200);
    });
  });
});