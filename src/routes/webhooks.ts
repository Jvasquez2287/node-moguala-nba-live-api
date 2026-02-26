import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripeService, getStripeClient } from '../services/stripe';
import { clerkService } from '../services/clerk';
import { emailService } from '../services/emailService';
import { executeQuery } from '../config/database';
import expoNotificationSystem from '../services/expoNotificationSystem';

const router = express.Router();

// NOTE: Raw body parser is applied specifically to the /stripe POST endpoint
// This ensures the raw request body is available for Stripe signature verification

// Get Stripe webhook secret lazily
function getStripeWebhookSecret(): string {
  let secret: string | undefined;
  console.log('Determining Stripe webhook secret...', `NODE_ENV: ${process.env.NODE_ENV}`);
  if (process.env.NODE_ENV && process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    secret = 'whsec_yKLLjagRnMG4sSG5oDjtsT7g4kkx6q3h';
  } else {
    secret = process.env.STRIPE_WEBHOOK_SECRET;
  }
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }
  return secret;
}


/**
 * Hadler for notification of subscription renewal/resume (when a subscription becomes active again after being inactive)
 * This can happen when a subscription is renewed after a failed payment, or when a user reactivates a canceled subscription
 * We want to send a notification  in this case to welcome the user back and confirm their subscription is active again
 */

async function handleSubscriptionStatusNotification(customerEmail: string, subscriptionTitle: string, eventType: 'subscription_created' | 'subscription_renewed' | 'subscription_canceled' | 'subscription_expired') {
  // Send notification to user
  try {
    if (customerEmail) {
      const clerkId = await clerkService.getClerkIdByEmail(customerEmail);
      if (clerkId) {
        await expoNotificationSystem.sendSubscriptionNotification(
          clerkId,
          eventType,
          subscriptionTitle
        );
      }
    }
  } catch (notificationError) {
    console.error(`[Webhook] Error sending ${eventType} notification:`, notificationError);
  }
}

/**
 * Convert Stripe Unix timestamp (in seconds) to JavaScript Date object
 * SQL Server datetime fields can accept Date objects which are properly serialized
 * Stripe provides timestamps in seconds since epoch, JS Date expects milliseconds
 * @param unixTimestamp - Stripe timestamp in seconds
 * @returns JavaScript Date object for SQL Server
 * @throws Error if timestamp is invalid or missing for required fields
 */
function convertStripeTimestamp(unixTimestamp: number | null | undefined): Date {
  if (!unixTimestamp || typeof unixTimestamp !== 'number') {
    throw new Error(`Invalid Stripe timestamp: ${unixTimestamp}. Stripe timestamps must be valid Unix seconds.`);
  }

  try {
    // Stripe timestamps are in seconds, convert to milliseconds for JavaScript
    const date = new Date(unixTimestamp * 1000);

    // Validate the date
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date after conversion: ${unixTimestamp}`);
    }

    console.log(`[Webhook] Converted timestamp ${unixTimestamp} to date: ${date.toISOString()}`);

    // Return Date object for SQL Server (will be properly serialized)
    return date;
  } catch (error) {
    console.error(`[Webhook] Error converting Stripe timestamp ${unixTimestamp}:`, error);
    throw error;
  }
}

/**
 * Convert Stripe Unix timestamp for optional fields that can be null
 * @param unixTimestamp - Stripe timestamp in seconds or null/undefined
 * @returns JavaScript Date object or null
 */
function convertStripeTimestampNullable(unixTimestamp: number | null | undefined): Date | null {
  if (!unixTimestamp || typeof unixTimestamp !== 'number') {
    return null;
  }

  try {
    return convertStripeTimestamp(unixTimestamp);
  } catch (error) {
    console.warn(`[Webhook] Failed to convert optional timestamp:`, error);
    return null;
  }
}

router.get('/stripe-delete-all-subscription', async (req: Request, res: Response) => {
  try {
    await executeQuery('DELETE FROM subscriptions');
    // Delete all from stripe as well (for testing purposes only - be careful with this in production!)
    const subscriptions = await stripeService.getAllSubscriptionsFromStripe();
    for (const sub of subscriptions) {
      await getStripeClient().subscriptions.cancel(sub.id);
    }
    return res.json({ success: true, message: 'All subscriptions deleted' });
  } catch (error) {
    console.error('Error deleting subscriptions:', error);
    return res.json({ success: false, error: 'Failed to delete subscriptions' });
  }
});

/**
 * Stripe Webhook endpoint
 * Handles: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
 * Must use raw body parser to preserve the exact request body for signature verification
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      console.error('[Webhook] No Stripe signature header found');
      return res.status(400).json({ error: 'No Stripe signature header' });
    }

    // Ensure req.body is a Buffer or string for signature verification
    let body = req.body;
    if (!(body instanceof Buffer) && typeof body !== 'string') {
      // If body is an object, convert it back to string
      console.warn('[Webhook] req.body is not a Buffer or string, converting from object...');
      body = JSON.stringify(body);
    }

    console.log(`[Webhook] Processing Stripe webhook...`);

    const event = getStripeClient().webhooks.constructEvent(
      body,
      sig,
      getStripeWebhookSecret()
    );

    console.log(`[Webhook] ✓ Signature verified successfully. Event type: ${event.type}`);

    const data = event.data.object as any;


    switch (event.type) {
      case 'customer.subscription.created': {
        const productData = await stripeService.getProductsByID(data.items.data[0].plan.product);
        const subscriptionData = {
          stripe_id: data.customer,
          subscription_id: data.id,
          subscription_start_date: convertStripeTimestamp(data.current_period_start),
          subscription_end_date: convertStripeTimestamp(data.current_period_end),
          subscription_status: data.status,
          subscription_title: (productData as any).name,
          subscription_next_billing_date: convertStripeTimestamp(data.current_period_end),
          subscription_latest_invoice_Id: data.latest_invoice || '',
          subscription_invoice_pdf_url: await stripeService.getInvoice(data.latest_invoice as string) || '',
          subscription_canceled_at: null,
          subscription_cancel_at_period_end: data.cancel_at_period_end || false,
          product_id: data.items.data[0].plan.product
        };

        console.log(`[Webhook] Handling subscription creation for customer: ${data.customer}, subscription ID: ${data.id}, status: ${data.status}`, data);

        // Check if subscription already exists
        const existing = await stripeService.getSubscriptionFromDB(data.customer);
        if (existing) {
          await stripeService.updateSubscriptionInDB(data.customer, subscriptionData);
        } else {
          await stripeService.createSubscriptionInDB(subscriptionData);
        }

        const customerEmail = await stripeService.getEmailByCustomerId(data.customer) || subscriptionData.stripe_id;

        // Send success email
        try {
          if (customerEmail) {
            const periodStart = new Date(data.current_period_start * 1000).toLocaleDateString();
            const periodEnd = new Date(data.current_period_end * 1000).toLocaleDateString();

            await emailService.sendSubscribedEmail({
              userEmail: customerEmail,
              subscriptionTitle: (productData as any).name,
              periodStart,
              periodEnd,
            });
          }


          if (customerEmail) {
            await handleSubscriptionStatusNotification(customerEmail, subscriptionData.subscription_title, 'subscription_created');
          }

        } catch (emailError) {
          console.error('[Webhook] Error sending subscribed email:', emailError);
        }


        console.log(`[Webhook] Subscription created for customer: ${data.customer}`);
        return res.json({ received: true });
      }

      case 'customer.subscription.updated': {
        const productData = await stripeService.getProductsByID(data.items.data[0].plan.product);
        const subscriptionData = {
          stripe_id: data.customer,
          subscription_id: data.id,
          subscription_start_date: convertStripeTimestamp(data.current_period_start),
          subscription_end_date: convertStripeTimestamp(data.current_period_end),
          subscription_status: data.status,
          subscription_title: (productData as any).name,
          subscription_next_billing_date: convertStripeTimestamp(data.current_period_end),
          subscription_latest_invoice_Id: data.latest_invoice || '',
          subscription_invoice_pdf_url: await stripeService.getInvoice(data.latest_invoice as string) || '',
          subscription_canceled_at: convertStripeTimestampNullable(data.canceled_at),
          subscription_cancel_at_period_end: data.cancel_at_period_end || false,
          product_id: data.items.data[0].plan.product
        };

        const customerEmail = await stripeService.getCustomerEmailBySubscriptionId(subscriptionData.subscription_id) || subscriptionData.stripe_id;

        // Get previous status to detect status changes
        const previousSub = await stripeService.getSubscriptionFromDBWithSubscriptionId(subscriptionData.subscription_id);
        const previousStatus = previousSub?.subscription_status;


        // Send email based on status change
        try {

          if (customerEmail) {
            console.log(`[Webhook] Subscription updated for customer: ${data.customer}, email: ${customerEmail}, previous status: ${previousSub?.subscription_cancel_at_period_end}, new status: ${subscriptionData.subscription_cancel_at_period_end}`);

            const periodStart = new Date(data.current_period_start * 1000).toLocaleDateString();
            const periodEnd = new Date(data.current_period_end * 1000).toLocaleDateString();

            // Check if subscription was resumed (status active after being inactive)
            if (data.status === 'active' && previousStatus !== 'active') {
              console.log(`\n\n[Webhook] Detected subscription renewal/resume for customer: ${data.customer}\n\n`);
              await emailService.sendReactivateEmail({
                userEmail: customerEmail,
                subscriptionTitle: (productData as any).name,
                periodStart,
                periodEnd,
              });
            }

          }
          await stripeService.updateSubscriptionInDB(data.customer, subscriptionData);

          if (customerEmail) {
            await handleSubscriptionStatusNotification(customerEmail, subscriptionData.subscription_title, 'subscription_renewed');
          }

        } catch (emailError) {
          console.error('[Webhook] Error sending update email:', emailError);
        }

        console.log(`[Webhook] Subscription updated for customer: ${data.customer} - Status: ${data.status}`);
        return res.json({ received: true });
      }

      case 'customer.subscription.deleted': {
        // Send cancellation email
        try {
          const customerEmail = await stripeService.getCustomerEmailBySubscriptionId(data.id);
          if (customerEmail) {
            const periodEnd = new Date(data.current_period_end * 1000).toLocaleDateString();
            const cancelDate = new Date().toLocaleDateString();
            // Get subscription title if possible
            let subscriptionTitle = 'MO\'GUALA Subscription';
            try {
              const product = await stripeService.getProductsByID(data.items.data[0].plan.product);
              subscriptionTitle = (product as any).name || subscriptionTitle;
            } catch (e) {
              console.warn('[Webhook] Could not fetch product info for deleted subscription');
            }
            await emailService.sendCanceledEmail({
              userEmail: customerEmail,
              subscriptionTitle,
              periodEnd,
              cancelDate,
            });
          }

          if (customerEmail) {
            await handleSubscriptionStatusNotification(customerEmail, data.items.data[0].plan.nickname || 'a subscription', 'subscription_canceled');
          }

        } catch (emailError) {
          console.error('[Webhook] Error sending cancellation email:', emailError);
        }

        await executeQuery(
          'UPDATE subscriptions SET subscription_status = @status, subscription_canceled_at = @now WHERE stripe_id = @stripeId',
          { status: 'canceled', now: new Date(), stripeId: data.customer }
        );
        console.log(`[Webhook] Subscription deleted for customer: ${data.id}`);
        return res.json({ received: true });
      }

      case 'invoice.paid': {
        console.log(`[Webhook] Invoice paid: ${data.id}`);
        return res.json({ received: true });
      }

      case 'invoice.payment_failed': {
        console.log(`[Webhook] Invoice payment failed: ${data.id}`);

        // Send payment failed email
        try {
          const customerEmail = await stripeService.getCustomerEmailBySubscriptionId(data.id);
          if (customerEmail) {
            await emailService.sendErrorEmail({
              userEmail: customerEmail,
              errorMessage: 'Your subscription payment failed. Please update your payment method to avoid service interruption.',
            });
          }
        } catch (emailError) {
          console.error('[Webhook] Error sending payment failed email:', emailError);
        }

        return res.json({ received: true });
      }

      default:
        console.log(`[Webhook] Unhandled Stripe event: ${event.type}`);
        return res.json({ received: true });
    }
  } catch (error: any) {
    // Detailed error logging for debugging
    const errorType = error?.type;
    const errorMessage = error?.message || String(error);

    if (errorType === 'StripeSignatureVerificationError') {
      console.error(`[Webhook] ✗ Stripe signature verification FAILED`);
      console.error(`[Webhook] Error: ${errorMessage}`);
      console.error(`[Webhook] Possible causes:`);
      console.error(`  1. Wrong webhook secret (check STRIPE_WEBHOOK_SECRET in .env)`);
      console.error(`  2. Request body was modified in transit`);
      console.error(`  3. Raw body parser not applied correctly`);
      return res.status(401).json({ error: 'Webhook signature verification failed' });
    }

    console.error('[Webhook] Stripe webhook error:', error);
    return res.json({ error: 'Webhook processing failed', message: errorMessage });
  }
});


router.get('/stripe', async (req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      message: 'Stripe webhook endpoint is working'
    });
  }
  catch (error) {
    console.error('Error in Stripe test endpoint:', error);
    return res.json({
      success: false,
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clerk Webhook endpoint
 * Handles: user.created, user.updated, user.deleted
 * Must use raw body parser to preserve the exact request body for signature verification
 */
router.post('/clerk', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    console.log('[Webhook] Received Clerk event');

    const event = await clerkService.verifyWebhook(req);
    if (!event) {
      console.warn('[Webhook] Invalid Clerk webhook signature');
      return res.json({ error: 'Invalid webhook signature' });
    }

    const { type, data } = event;

    switch (type) {
      case 'user.created': {
        await clerkService.handleUserCreated(data as any);
        return res.json({ received: true });
      }

      case 'user.updated': {
        await clerkService.handleUserUpdated(data as any);
        return res.json({ received: true });
      }

      case 'user.deleted': {
        await clerkService.handleUserDeleted((data as any).id);
        return res.json({ received: true });
      }

      case 'session.created': {
        await clerkService.handleSessionCreated(data as any);
        return res.json({ received: true });
      }

      case 'session.ended': {
        await clerkService.handleSessionEnded(data as any);
        return res.json({ received: true });
      }

      case 'session.renewed': {
        await clerkService.handleSessionRenewed(data as any);
        return res.json({ received: true });
      }


      default:
        console.log(`[Webhook] Unhandled Clerk event: ${type}`);
        return res.json({ received: true });
    }
  } catch (error) {
    console.error('[Webhook] Clerk webhook error:', error);
    return res.json({ error: 'Webhook processing failed', errorMessage: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/clerk/users/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email;
    console.log(`[Test] Fetching user info for email: ${email}`);
    const user = await clerkService.getUserByEmail(email);

    if (!user) {
      return res.json({
        success: false,
        error: 'User not found',
        email: email
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        clerk_id: user.clerk_id,
        stripe_id: user.stripe_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image: user.profile_image,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.json({
      success: false,
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/clerk', async (req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      message: 'Clerk webhook endpoint is working'
    });
  } catch (error) {
    console.error('Error in Clerk test endpoint:', error);
    return res.json({
      success: false,
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/clerk/cusers/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email;
    const user = await clerkService.getUserFromClerkAPI(email);
    return res.json({
      success: true,
      users: user
    })

  } catch (error) {
    console.error('Error fetching users:', error);
    return res.json({
      success: false,
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
