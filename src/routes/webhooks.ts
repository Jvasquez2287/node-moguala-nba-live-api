import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripeService } from '../services/stripe';
import { clerkService } from '../services/clerk';
import { executeQuery } from '../config/database';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_key', {
  apiVersion: '2026-01-28.clover' as any
});

const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_hSsvZEGxeBSNZanAKvzbXsvTiyT13aLP';

/**
 * Stripe Webhook endpoint
 * Handles: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      stripeWebhookSecret
    );

    console.log(`[Webhook] Received Stripe event: ${event.type}`);

    const data = event.data.object as any;

    switch (event.type) {
      case 'customer.subscription.created': {
        const productData = await stripeService.getProductsByID(data.items.data[0].plan.product);
        const subscriptionData = {
          stripe_id: data.customer,
          subscription_id: data.id,
          subscription_start_date: new Date(data.current_period_start * 1000),
          subscription_end_date: new Date(data.current_period_end * 1000),
          subscription_status: data.status,
          subscription_title: (productData as any).name,
          subscription_next_billing_date: new Date(data.current_period_end * 1000),
          subscription_latest_invoice_Id: data.latest_invoice || '',
          subscription_invoice_pdf_url: await stripeService.getInvoice(data.latest_invoice as string) || '',
          subscription_canceled_at: null,
          product_id: data.items.data[0].plan.product
        };

        // Check if subscription already exists
        const existing = await stripeService.getSubscriptionFromDB(data.customer);
        if (existing) {
          await stripeService.updateSubscriptionInDB(data.customer, subscriptionData);
        } else {
          await stripeService.createSubscriptionInDB(subscriptionData);
        }

        console.log(`[Webhook] Subscription created for customer: ${data.customer}`);
        res.json({ received: true });
        break;
      }

      case 'customer.subscription.updated': {
        const productData = await stripeService.getProductsByID(data.items.data[0].plan.product);
        const subscriptionData = {
          stripe_id: data.customer,
          subscription_id: data.id,
          subscription_start_date: new Date(data.current_period_start * 1000),
          subscription_end_date: new Date(data.current_period_end * 1000),
          subscription_status: data.status,
          subscription_title: (productData as any).name,
          subscription_next_billing_date: new Date(data.current_period_end * 1000),
          subscription_latest_invoice_Id: data.latest_invoice || '',
          subscription_invoice_pdf_url: await stripeService.getInvoice(data.latest_invoice as string) || '',
          subscription_canceled_at: data.canceled_at ? new Date(data.canceled_at * 1000) : null,
          product_id: data.items.data[0].plan.product
        };

        await stripeService.updateSubscriptionInDB(data.customer, subscriptionData);
        console.log(`[Webhook] Subscription updated for customer: ${data.customer}`);
        res.json({ received: true });
        break;
      }

      case 'customer.subscription.deleted': {
        await executeQuery(
          'UPDATE subscriptions SET subscription_status = @status, subscription_canceled_at = @now WHERE stripe_id = @stripeId',
          { status: 'canceled', now: new Date(), stripeId: data.customer }
        );
        console.log(`[Webhook] Subscription deleted for customer: ${data.customer}`);
        res.json({ received: true });
        break;
      }

      case 'invoice.paid': {
        console.log(`[Webhook] Invoice paid: ${data.id}`);
        res.json({ received: true });
        break;
      }

      case 'invoice.payment_failed': {
        console.log(`[Webhook] Invoice payment failed: ${data.id}`);
        res.json({ received: true });
        break;
      }

      default:
        console.log(`[Webhook] Unhandled Stripe event: ${event.type}`);
        res.json({ received: true });
    }
  } catch (error) {
    console.error('[Webhook] Stripe webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Clerk Webhook endpoint
 * Handles: user.created, user.updated, user.deleted
 */
router.post('/clerk', express.json(), async (req: Request, res: Response) => {
  try {
    console.log('[Webhook] Received Clerk event');

    const event = await clerkService.verifyWebhook(req);
    if (!event) {
      throw new Error('Failed to verify webhook');
    }

    const { type, data } = event;

    switch (type) {
      case 'user.created': {
        await clerkService.handleUserCreated(data as any);
        res.json({ received: true });
        break;
      }

      case 'user.updated': {
        await clerkService.handleUserUpdated(data as any);
        res.json({ received: true });
        break;
      }

      case 'user.deleted': {
        await clerkService.handleUserDeleted((data as any).id);
        res.json({ received: true });
        break;
      }

      default:
        console.log(`[Webhook] Unhandled Clerk event: ${type}`);
        res.json({ received: true });
    }
  } catch (error) {
    console.error('[Webhook] Clerk webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

export default router;
