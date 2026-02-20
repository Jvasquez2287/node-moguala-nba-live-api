import express, { Request, Response } from 'express';
import { stripeService, getStripeClient } from '../services/stripe';
import clerkService from '../services/clerk';
import subscriptionsService from '../services/subscriptions';
import { emailService } from '../services/emailService';

const router = express.Router();


const PRODUCT_ID = process.env.STRIPE_PRODUCT_ID || 'prod_QDRXMY3ecBW5bP';
const PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_1PN0eXC9Z59e8GjO06cltizs';



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


/**
 * GET /api/v1/subscriptions
 * List all subscriptions for a customer
 * Query params: customerId (required)
 */
router.get('/', async (req: Request, res: Response) => {
  try {

    console.log('[Subscriptions] Fetching subscriptions with query:', req.query);
    const { customerId } = req.query;

    console.log(`[Subscriptions] Fetching subscriptions for customerId: ${customerId}`);

    if (!customerId) {
      return res.json({ error: 'customerId is required' });
    }

    const subscription = await stripeService.getSubscriptionFromDB(customerId as string);

    console.log(`[Subscriptions] Subscription fetched from DB:`, subscription);

    if (!subscription) {
      return res.json({ error: 'Subscription not found' });
    }

    console.log(`[Subscriptions] Returning subscription for customerId ${customerId}:`, subscription);

    return res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('[Subscriptions] Error fetching subscriptions:', error);
    res.json({ error: 'Failed to fetch subscriptions' });
  }
});

///subscriptions/current
router.get('/current', async (req: Request, res: Response) => {
  try {

    const token = req.headers.authorization?.split(' ')[1];
    const clerkId = req.headers['x-clerk-id'] as string | undefined;
    console.log(`[Subscriptions] Fetching current subscription for clerkId: ${clerkId} with token: ${token}`);

    console.log(`[Subscriptions] Fetching subscriptions for client id: ${clerkId}`);

    if (!clerkId) {
      return res.json({ error: 'clerkId is required' });
    }

    const subscription = await stripeService.getSubscriptionFromDBWithClerkId(clerkId as string);

    console.log(`[Subscriptions] Subscription fetched from DB`);

    if (!subscription) {
      return res.json({ error: 'Subscription not found' });
    }

    console.log(`[Subscriptions] Returning subscription for clientId ${clerkId}`);

    return res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('[Subscriptions] Error fetching subscriptions:', error);
    res.json({ error: 'Failed to fetch subscriptions' });
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
      return res.json({ error: 'subscriptionId is required' });
    }

    const subscription = await stripeService.getSubscriptionFromDB(subscriptionId);

    if (!subscription) {
      return res.json({ error: 'Subscription not found' });
    }

    return res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('[Subscriptions] Error fetching subscription:', error);
    res.json({ error: 'Failed to fetch subscription' });
  }
});

  
/**
 * DELETE /api/v1/subscriptions/cancel
 * Cancel a subscription (POST with body containing subscriptionId)
 */
router.delete('/cancel', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.body;

    console.log(`[Subscriptions] Canceling subscription with ID:`, subscriptionId);

    if (!subscriptionId) {
      return res.json({ error: 'subscriptionId is required in body' });
    }

    // Handle subscriptionId as array [dbId, stripeId] or string
    let dbId: number | string;
    let stripeSubscriptionId: string;

    if (Array.isArray(subscriptionId)) {
      dbId = subscriptionId[0]; // Database ID
      stripeSubscriptionId = subscriptionId[1]; // Stripe subscription ID
    } else {
      stripeSubscriptionId = subscriptionId;
      dbId = subscriptionId;
    }
  
    // Cancel subscription in Stripe 
    const sub = await getStripeClient().subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true }) as any; 

    const customerEmail = await stripeService.getCustomerEmailBySubscriptionId(sub.id);
    const productData = await stripeService.getProductsByID(sub.plan?.product);
    const canceledDate = new Date(sub?.canceled_at * 1000).toLocaleDateString();
    const periodEnd = new Date(sub?.items?.data[0]?.current_period_end * 1000).toLocaleDateString();

    // Update subscription status in database
    const { executeQuery } = await import('../config/database');
    await executeQuery(
      'UPDATE subscriptions SET subscription_status = @status, subscription_canceled_at = @now, subscription_cancel_at_period_end = @cancelAtPeriodEnd WHERE id = @id OR subscription_id = @subId',
      {
        status: 'active',
        now: new Date().toISOString(),
        cancelAtPeriodEnd: sub?.canceled_at,
        id: typeof dbId === 'number' ? dbId : parseInt(dbId as string),
        subId: sub.id
      }
    );


    // Send cancellation notice but subscription is still active until period end
    const cancelDate = new Date(sub.canceled_at * 1000).toLocaleDateString();
    if (customerEmail) {
      await emailService.sendCanceledEmail({
        userEmail: customerEmail,
        subscriptionTitle: (productData as any).name,
        periodEnd,
        cancelDate,
      });
    }

    console.log(`[Subscriptions] Subscription canceled successfully for Stripe ID: ${stripeSubscriptionId}, DB ID: ${dbId}`);
    return res.json({
      success: true,
      message: 'Subscription canceled successfully',
      data: {
        dbId,
        stripeSubscriptionId
      }
    });
  } catch (error) {
    console.error('[Subscriptions] Error canceling subscription:', error);
    res.json({ error: 'Failed to cancel subscription' });
  }
});
 

router.post('/reactivate', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.body;

    // Handle subscriptionId as array [dbId, stripeId] or string
    let dbId: number | string;
    let stripeSubscriptionId: string;

    if (Array.isArray(subscriptionId)) {
      dbId = subscriptionId[0]; // Database ID
      stripeSubscriptionId = subscriptionId[1]; // Stripe subscription ID
    } else {
      stripeSubscriptionId = subscriptionId;
      dbId = subscriptionId;
    }

    console.log(`[Subscriptions] Reactivating Stripe subscription with ID: ${stripeSubscriptionId}`);
    if (!subscriptionId || !stripeSubscriptionId) {
      return res.json({ error: 'subscriptionId is required in body' });
    }

    // Reactivate subscription in Stripe
    const sub = await getStripeClient().subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: false }) as any;

    // Update subscription status in database
    const { executeQuery } = await import('../config/database');

    await executeQuery(
      'UPDATE subscriptions SET subscription_status = @status, subscription_canceled_at = NULL, updated_at = @now WHERE id = @id OR subscription_id = @subId',
      {
        status: 'active',
        now: new Date().toISOString(),
        id: typeof dbId === 'number' ? dbId : parseInt(dbId as string),
        subId: sub.id
      }
    );

    const customerEmail = await stripeService.getCustomerEmailBySubscriptionId(sub.id);
    const productData = await stripeService.getProductsByID(sub.plan?.product);
    const periodStart = new Date(sub?.items?.data[0]?.current_period_start * 1000).toLocaleDateString();
    const periodEnd = new Date(sub?.items?.data[0]?.current_period_end * 1000).toLocaleDateString();

    if (customerEmail) {
      try {
        await emailService.sendResumeEmail({
          userEmail: customerEmail,
          subscriptionTitle: (productData as any).name,
          periodStart: periodStart || "N/A",
          periodEnd: periodEnd || "N/A",
        });
      } catch (emailError) {
        console.error('[Subscriptions] Error sending reactivation email:', emailError);
      }
    }

    return res.json({
      success: true,
      message: 'Subscription reactivated successfully',
      data: {
        dbId,
        stripeSubscriptionId: sub.id
      }
    });
  } catch (error) {
    console.error('[Subscriptions] Error reactivating Stripe subscription:', error);
    return res.json({ error: 'Failed to reactivate Stripe subscription', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});


/**
 * GET /api/v1/subscriptions/product/:productId
 * Get all subscriptions for a specific product
 */
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.json({ error: 'productId is required' });
    }

    console.log(`[Subscriptions] Fetching subscriptions for product: ${productId}`);

    const { executeQuery } = await import('../config/database');

    const result = await executeQuery(
      `
      SELECT 
        s.id,
        s.stripe_id,
        s.subscription_id,
        s.user_id,
        s.subscription_start_date,
        s.subscription_end_date,
        s.subscription_status,
        s.subscription_title,
        s.subscription_next_billing_date,
        s.subscription_latest_invoice_Id,
        s.subscription_invoice_pdf_url,
        s.subscription_canceled_at,
        s.product_id,
        s.created_at,
        s.updated_at,
        u.clerk_id,
        u.email,
        u.first_name,
        u.last_name,
        u.stripe_id AS user_stripe_id
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.product_id = @productId
      ORDER BY s.created_at DESC
      `,
      { productId }
    );

    if (!result.recordset || result.recordset.length === 0) {
      return res.json({
        success: false,
        error: 'No subscriptions found for this product',
        productId
      });
    }

    const subscriptions = result.recordset.map((row: any) => ({
      id: row.id,
      stripe_id: row.stripe_id,
      subscription_id: row.subscription_id,
      subscription_status: row.subscription_status,
      subscription_title: row.subscription_title,
      subscription_start_date: row.subscription_start_date,
      subscription_end_date: row.subscription_end_date,
      subscription_next_billing_date: row.subscription_next_billing_date,
      subscription_latest_invoice_Id: row.subscription_latest_invoice_Id,
      subscription_invoice_pdf_url: row.subscription_invoice_pdf_url,
      subscription_canceled_at: row.subscription_canceled_at,
      product_id: row.product_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: row.user_id ? {
        id: row.user_id,
        clerk_id: row.clerk_id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        stripe_id: row.user_stripe_id
      } : null
    }));

    return res.json({
      success: true,
      productId,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    console.error('[Subscriptions] Error fetching product subscriptions:', error);
    res.json({ error: 'Failed to fetch product subscriptions' });
  }
});

/**
 * GET /api/v1/subscriptions/stripe/product/:productId
 * Get product information from Stripe with pricing
 */
router.get('/stripe/product', async (req: Request, res: Response) => {
  try {
    const productIdParam = PRODUCT_ID ? PRODUCT_ID : (req.query.productId as string);

    if (!productIdParam) {
      return res.json({ error: 'productId is required' });
    }

    console.log(`[Subscriptions] Fetching product info from Stripe: ${productIdParam}`);

    const product = await stripeService.getProductsByID(productIdParam);

    if (!product) {
      return res.json({
        success: false,
        error: 'Product not found in Stripe',
        productId: productIdParam
      });
    }

    // Get Stripe client and fetch prices for this product
    const stripe = stripeService.getClient();
    const pricesResponse = await getStripeClient().prices.list({
      product: productIdParam,
      limit: 100
    });

    const prices = pricesResponse.data.map((price: any) => ({
      id: price.id,
      product: price.product,
      type: price.type,
      unit_amount: price.unit_amount,
      currency: price.currency,
      recurring: price.recurring,
      billing_scheme: price.billing_scheme,
      custom_unit_amount: price.custom_unit_amount,
      lookup_key: price.lookup_key,
      metadata: price.metadata,
      nickname: price.nickname,
      tax_behavior: price.tax_behavior,
      active: price.active,
      created: price.created,
      livemode: price.livemode
    }));

    return res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        type: product.type,
        description: product.description,
        active: product.active,
        created: product.created,
        updated: product.updated,
        metadata: product.metadata,
        url: product.url,
        images: product.images,
        livemode: product.livemode,
        shippable: (product as any).shippable,
        statement_descriptor: (product as any).statement_descriptor,
        tax_code: (product as any).tax_code
      },
      prices: prices,
      priceCount: prices.length
    });
  } catch (error) {
    console.error('[Subscriptions] Error fetching product from Stripe:', error);
    res.json({
      error: 'Failed to fetch product from Stripe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/subscriptions/stripe/all
 * Get all subscriptions from Stripe
 */
router.get('/stripe/all', async (req: Request, res: Response) => {
  try {
    const { limit = 100, status } = req.query;

    console.log(`[Subscriptions] Fetching all subscriptions from Stripe (limit: ${limit}, status: ${status || 'all'})`);

    // Get Stripe client and fetch subscriptions
    const stripe = stripeService.getClient();
    const params: any = {
      limit: Math.min(parseInt(limit as string) || 100, 100)
    };

    if (status && ['active', 'canceled', 'past_due', 'trialing', 'all'].includes(status as string)) {
      if (status !== 'all') {
        params.status = status;
      }
    }

    const subscriptionsResponse = await getStripeClient().subscriptions.list(params);

    const subscriptions = subscriptionsResponse.data.map((sub: any) => ({
      id: sub.id,
      customer: sub.customer,
      status: sub.status,
      currency: sub.currency,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      customer_email: sub.customer ? (sub as any).customer?.email : null,
      items: sub.items?.data?.map((item: any) => ({
        id: item.id,
        price: {
          id: item.price?.id,
          product: item.price?.product,
          unit_amount: item.price?.unit_amount,
          currency: item.price?.currency,
          recurring: item.price?.recurring,
          type: item.price?.type
        },
        quantity: item.quantity
      })),
      latest_invoice: sub.latest_invoice,
      next_pending_invoice_item_invoice: sub.next_pending_invoice_item_invoice,
      pause_collection: sub.pause_collection,
      payment_settings: sub.payment_settings,
      pending_invoice_item_interval: sub.pending_invoice_item_interval,
      pending_setup_intent: sub.pending_setup_intent,
      pending_update: sub.pending_update,
      schedule: sub.schedule,
      start_date: sub.start_date,
      test_clock: sub.test_clock,
      transfer_data: sub.transfer_data,
      trial_end: sub.trial_end,
      trial_settings: sub.trial_settings,
      trial_start: sub.trial_start,
      created: sub.created,
      metadata: sub.metadata,
      livemode: sub.livemode
    }));

    return res.json({
      success: true,
      count: subscriptions.length,
      hasMore: subscriptionsResponse.has_more,
      subscriptions: subscriptions
    });
  } catch (error) {
    console.error('[Subscriptions] Error fetching all subscriptions from Stripe:', error);
    res.json({
      error: 'Failed to fetch subscriptions from Stripe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/subscriptions/checkout
// Create a Stripe checkout session for subscription
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    console.log('[Subscriptions] Creating checkout session with data:', req.body);
    const { stripePriceId, userId, email } = req.body;

    // Validate inputs
    if (!stripePriceId) {
      return res.json({
        error: 'stripePriceId is required',
      });
    }

    if (!userId) {
      return res.json({
        error: 'clerkId or email is required',
      });
    }

    console.log(`[Subscriptions] Creating checkout session for price: ${stripePriceId}`);

    // Determine base URL for redirects - respect incoming request protocol
    let baseUrl = process.env.APP_URL;
    if (!baseUrl) {
      const protocol = req.protocol || (req.secure ? 'https' : 'http');
      const host = req.get('host') || '10.0.0.200:8000';
      baseUrl = `${protocol}://${host}`;
    }
    console.log(`[Subscriptions] Using base URL for redirects: ${baseUrl}`);

    // Create Stripe checkout session
    const session = await getStripeClient().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      // Success URL - redirect after successful payment
      success_url: `${baseUrl}/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,
      // Cancel URL - redirect if user cancels
      cancel_url: `${baseUrl}/subscriptions/cancel`,
      // Store customer reference
      customer_email: email,
      metadata: {
        userId: userId,
      },
    });

    console.log(`[Subscriptions] ✅ Checkout session created: ${session.id}`);

    return res.json({
      success: true,
      data: {
        sessionUrl: session.url,
        sessionId: session.id,
      },
    });
  } catch (error) {
    console.error('[Subscriptions] 💳 Checkout error:', error);
    res.json({
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


// Subscription success redirect handler (from Stripe checkout)
router.get('/success', async (req: express.Request, res: express.Response) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.json({ error: 'session_id is required' });
    }

    const result = await subscriptionsService.handleCheckoutSuccess(session_id as string);

    return res.json(result);
  } catch (error) {
    console.error('[SubscriptionsRouter] Error processing checkout success:', error);
    res.json({
      error: 'Failed to process checkout session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});



export default router;
