import express, { Request, Response } from 'express';
import { stripeService } from '../services/stripe';

const router = express.Router();

/**
 * GET /api/v1/subscriptions
 * List all subscriptions for a customer
 * Query params: customerId (required)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    const subscription = await stripeService.getSubscriptionFromDB(customerId as string);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('[Subscriptions] Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * GET /api/v1/subscriptions/:subscriptionId
 * Get a specific subscription by ID
 */
router.get('/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId is required' });
    }

    const subscription = await stripeService.getSubscriptionFromDB(subscriptionId);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('[Subscriptions] Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * POST /api/v1/subscriptions
 * Create a new subscription
 * Body: { customerId, priceId/productId, name }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerId, priceId, productId, name } = req.body;

    if (!customerId || (!priceId && !productId)) {
      return res.status(400).json({ error: 'customerId and (priceId or productId) are required' });
    }

    const subscriptions = await stripeService.getUsersSubscription();
    const subscription = subscriptions.find((sub: any) => sub.customer === customerId);

    const subscriptionData = {
      stripe_id: customerId,
      subscription_id: subscription?.id || '',
      subscription_start_date: new Date(),
      subscription_end_date: new Date(),
      subscription_status: subscription?.status || 'active',
      subscription_title: name || 'Premium Subscription',
      subscription_next_billing_date: new Date(),
      subscription_latest_invoice_Id: '',
      subscription_invoice_pdf_url: '',
      subscription_canceled_at: null,
      product_id: productId || ''
    };

    await stripeService.createSubscriptionInDB(subscriptionData);

    res.status(201).json({
      success: true,
      data: subscriptionData
    });
  } catch (error) {
    console.error('[Subscriptions] Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

/**
 * DELETE /api/v1/subscriptions/:subscriptionId
 * Cancel a subscription
 */
router.delete('/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId is required' });
    }

    // Update subscription status to canceled
    const subscription = await stripeService.getSubscriptionFromDB(subscriptionId);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const { executeQuery } = await import('../config/database');
    await executeQuery(
      'UPDATE subscriptions SET subscription_status = @status, subscription_canceled_at = @now WHERE subscription_id = @subId',
      { status: 'canceled', now: new Date(), subId: subscriptionId }
    );

    res.json({
      success: true,
      message: 'Subscription canceled'
    });
  } catch (error) {
    console.error('[Subscriptions] Error deleting subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;
