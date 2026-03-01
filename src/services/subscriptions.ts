import { executeQuery } from '../config/database';
import stripeService, { getStripeClient } from './stripe';
import { clerkService } from './clerk';

interface StripeSubscription {
  id: string;
  customer: string;
  items: {
    data: Array<{
      plan: {
        product: string;
        nickname?: string;
      };
      current_period_start: number;
      current_period_end: number;
    }>;
  };
  current_period_start: number;
  current_period_end: number;
  status: string;
  canceled_at?: number | null;
  cancel_at?: number | null;
  latest_invoice?: string;
  cancel_at_period_end?: boolean;
}

export const subscriptionsService = {
  /**
   * Handle successful Stripe checkout session
   * Updates user subscription in database
   */
  async handleCheckoutSuccess(sessionId: string) {
    try {
      console.log(`[SubscriptionsService] Processing checkout success for session: ${sessionId}`);

      // Step 1: Retrieve the checkout session from Stripe
      const session = await getStripeClient().checkout.sessions.retrieve(sessionId);

      if (!session.subscription) {
        throw new Error('No subscription found in checkout session');
      }
       
      console.log(`[SubscriptionsService] Session retrieved: ${session.id}`);
      // Step 2: Get subscription details from Stripe
      const subscription = await getStripeClient().subscriptions.retrieve(session.subscription as string) as any as StripeSubscription;
 
      console.log(`[SubscriptionsService] Subscription retrieved: ${subscription.id}, status: ${subscription.status}` );

      if(subscription.status !== 'active' && subscription.status !== 'trialing') {
        console.warn(`[SubscriptionsService] Subscription ${subscription.id} is not active or trialing. Status: ${subscription.status}`);
        return {
          success: false,
          message: `Subscription ${subscription.id} is not active or trialing. Status: ${subscription.status}`
        };
      }

      // Step 3: Get customer info
      const customer = await getStripeClient().customers.retrieve(subscription.customer as string);

      console.log(`[SubscriptionsService] Customer email: ${(customer as any).email}`);

      // Step 4: Find user by email
      let userResult = await executeQuery(
        'SELECT id, clerk_id, email, first_name, last_name, stripe_id FROM users WHERE email = @email',
        { email: (customer as any).email }
      );

      let user: any;

      if (!userResult.recordset || userResult.recordset.length === 0) {
        // User not found in local DB, try to fetch from Clerk and create locally
        console.log(`[SubscriptionsService] User not found in local DB for email: ${(customer as any).email}, fetching from Clerk API...`);
        
        try {
          const clerkUsersResponse = await clerkService.getUserFromClerkAPI((customer as any).email) as any;
          
          if (!clerkUsersResponse || !Array.isArray(clerkUsersResponse.data) || clerkUsersResponse.data.length === 0) {
            throw new Error(`User not found in Clerk API for email: ${(customer as any).email}`);
          }

          const clerkUser = clerkUsersResponse.data[0] as any;
          console.log(`[SubscriptionsService] Found user in Clerk API: ${clerkUser.id}`);
          
          // Create user in local database from Clerk info
          await clerkService.handleUserCreated(clerkUser);
          console.log(`[SubscriptionsService] Created user in local DB from Clerk info: ${clerkUser.id}`);
          
          // Fetch the newly created user from local DB
          userResult = await executeQuery(
            'SELECT id, clerk_id, email, first_name, last_name, stripe_id FROM users WHERE email = @email',
            { email: (customer as any).email }
          );
          
          if (!userResult.recordset || userResult.recordset.length === 0) {
            throw new Error(`Failed to create user in local DB for email: ${(customer as any).email}`);
          }
          
          user = userResult.recordset[0];
        } catch (clerkError) {
          console.error(`[SubscriptionsService] Error fetching/creating user from Clerk:`, clerkError);
          throw clerkError;
        }
      } else {
        user = userResult.recordset[0];
      }

      console.log(`[SubscriptionsService] Found user: ${user.id}, clerk_id: ${user.clerk_id}`);

      // Step 5: Update user with stripe_id if not already set
      if (!user.stripe_id || user.stripe_id !== subscription.customer) {
        await executeQuery(
          'UPDATE users SET stripe_id = @stripe_id, updated_at = @updated_at WHERE id = @id',
          {
            stripe_id: subscription.customer,
            updated_at: new Date().toISOString(),
            id: user.id
          }
        );
        console.log(`[SubscriptionsService] Updated user stripe_id: ${subscription.customer}`);
        user.stripe_id = subscription.customer;
      }

      // Step 6: Get product ID and dates from subscription items
      const productId = subscription.items?.data?.[0]?.plan?.product;
      const itemStartDate = subscription.items?.data?.[0]?.current_period_start;
      const itemEndDate = subscription.items?.data?.[0]?.current_period_end;

      // Debug logging for timestamps
      console.log(`[SubscriptionsService] Timestamps - start: ${itemStartDate}, end: ${itemEndDate}, canceled: ${subscription.canceled_at}`);
      console.log(`[SubscriptionsService] Timestamp types - start: ${typeof itemStartDate}, end: ${typeof itemEndDate}`);

      // Calculate the difference to verify they're different
      if (itemStartDate && itemEndDate) {
        const diff = itemEndDate - itemStartDate;
        console.log(`[SubscriptionsService] Period difference in seconds: ${diff}`);
      }

      // Helper function to safely convert Unix timestamp to ISO string
      const convertTimestampToISO = (timestamp: number | null | undefined): string | null => {
        if (!timestamp || typeof timestamp !== 'number') {
          console.warn(`[SubscriptionsService] Invalid timestamp: ${timestamp}, type: ${typeof timestamp}`);
          return null;
        }
        try {
          const date = new Date(timestamp * 1000);
          if (isNaN(date.getTime())) {
            console.warn(`[SubscriptionsService] Date is NaN for timestamp: ${timestamp}`);
            return null;
          }
          const iso = date.toISOString();
          console.log(`[SubscriptionsService] Converted timestamp ${timestamp} to ${iso}`);
          return iso;
        } catch (error) {
          console.error(`[SubscriptionsService] Error converting timestamp ${timestamp}:`, error);
          return null;
        }
      };


      const subscriptionData = {
        stripe_id: subscription.customer,
        subscription_id: subscription.id,
        user_id: user.id,
        clerk_id: user.clerk_id,
        subscription_start_date: convertTimestampToISO(itemStartDate) || new Date().toISOString(),
        subscription_end_date: convertTimestampToISO(itemEndDate) || new Date().toISOString(),
        subscription_status: subscription.status,
        subscription_title: (subscription as any).items?.data?.[0]?.plan?.nickname || 'Premium Subscription',
        subscription_next_billing_date: convertTimestampToISO(subscription.current_period_end) || new Date().toISOString(),
        subscription_latest_invoice_Id: subscription.latest_invoice as string || '',
        subscription_invoice_pdf_url: await stripeService.getInvoice(subscription.latest_invoice as string) || '',
        subscription_canceled_at: convertTimestampToISO(subscription.canceled_at),
        product_id: productId || '',
        updated_at: new Date().toISOString(),
        subscription_cancel_at_period_end: subscription.cancel_at_period_end || false
      };
 
      const newSubscriptionId = subscriptionData.subscription_id;

      // Step 7: Check if subscription already exists by subscription_id (the UNIQUE KEY constraint)
      const existingSubscription = await executeQuery(
        'SELECT subscription_id, user_id FROM subscriptions WHERE subscription_id = @subscription_id',
        { subscription_id: newSubscriptionId }
      );

      const hasExistingSubscription = existingSubscription.recordset.length > 0;
      const existingRecord = hasExistingSubscription ? existingSubscription.recordset[0] : null;
      const existingSubscriptionId = existingRecord?.subscription_id;

      
      // Step 8: Create or update subscription in database
      if (hasExistingSubscription) {
        
        // Update existing subscription by subscription_id
         await executeQuery(
          `UPDATE subscriptions 
           SET subscription_status = @status, 
               subscription_start_date = @start_date,
               subscription_end_date = @end_date,
               subscription_next_billing_date = @next_billing,
               subscription_latest_invoice_Id = @invoice_id,
               user_id = @user_id,
               stripe_id = @stripe_id,
               clerk_id = @clerk_id,
               updated_at = @updated_at,
               subscription_cancel_at_period_end = @cancel_at_period_end
           WHERE subscription_id = @subscription_id`,
          {
            status: subscriptionData.subscription_status,
            start_date: subscriptionData.subscription_start_date,
            end_date: subscriptionData.subscription_end_date,
            next_billing: subscriptionData.subscription_next_billing_date,
            invoice_id: subscriptionData.subscription_latest_invoice_Id,
            user_id: user.id,
            stripe_id: subscriptionData.stripe_id,
            clerk_id: subscriptionData.clerk_id,
            subscription_id: newSubscriptionId,
            updated_at: new Date().toISOString(),
            cancel_at_period_end: subscriptionData.subscription_cancel_at_period_end
          }
        );
        console.log(`[SubscriptionsService] Updated existing subscription ${existingSubscriptionId} for user: ${user.id}` );
      } else {
        // Create new subscription
        await executeQuery(
          `INSERT INTO subscriptions (
            stripe_id, subscription_id, user_id, clerk_id, subscription_start_date, 
            subscription_end_date, subscription_status, subscription_title,
            subscription_next_billing_date, subscription_latest_invoice_Id,
            subscription_invoice_pdf_url, subscription_canceled_at, product_id, 
            created_at, updated_at, subscription_cancel_at_period_end
          ) VALUES (
            @stripe_id, @subscription_id, @user_id, @clerk_id, @start_date,
            @end_date, @status, @title,
            @next_billing, @invoice_id,
            @invoice_pdf, @canceled_at, @product_id,
            @created_at, @updated_at, @cancel_at_period_end
          )`,
          {
            stripe_id: subscriptionData.stripe_id,
            subscription_id: subscriptionData.subscription_id,
            user_id: user.id,
            clerk_id: subscriptionData.clerk_id,
            start_date: subscriptionData.subscription_start_date,
            end_date: subscriptionData.subscription_end_date,
            status: subscriptionData.subscription_status,
            title: subscriptionData.subscription_title,
            next_billing: subscriptionData.subscription_next_billing_date,
            invoice_id: subscriptionData.subscription_latest_invoice_Id,
            invoice_pdf: subscriptionData.subscription_invoice_pdf_url,
            canceled_at: subscriptionData.subscription_canceled_at,
            product_id: subscriptionData.product_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            cancel_at_period_end: subscriptionData.subscription_cancel_at_period_end
          }
        );
        console.log(`[SubscriptionsService] Created new subscription: ${subscription.id}`);
      }

      // Step 9: Return success response
      const startISO = convertTimestampToISO(itemStartDate) || new Date().toISOString();
      const endISO = convertTimestampToISO(itemEndDate) || new Date().toISOString();

      console.log(`[SubscriptionsService] Final response dates - Start: ${startISO}, End: ${endISO}`);

      return {
        success: true,
        message: 'Subscription updated successfully',
        data: {
          sessionId: session.id,
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          user: {
            id: user.id,
            clerk_id: user.clerk_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            stripe_id: subscription.customer
          },
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: startISO,
            currentPeriodEnd: endISO,
            cancelAt: convertTimestampToISO(subscription.cancel_at),
            canceledAt: convertTimestampToISO(subscription.canceled_at),
            subscription_invoice_pdf_url: subscriptionData.subscription_invoice_pdf_url,
            cancelAtPeriodEnd: subscriptionData.subscription_cancel_at_period_end
          }
        }
      };
    } catch (error) {
      console.error('[SubscriptionsService] Error processing checkout success:', error);
      throw error;
    }
  },
  /**
   * Get billing history for a user by their Clerk ID
   * Fetches invoices from both local database and Stripe
   * @param clerkId - The Clerk user ID
   * @returns Billing history with invoices and subscription details
   */
  async getBillingHistory(clerkId: string) {
    try {
      console.log(`[SubscriptionsService] Fetching billing history for clerkId: ${clerkId}`);

      // Step 1: Find user by clerkId to get stripe_id
      const userResult = await executeQuery(
        'SELECT id, clerk_id, email, stripe_id FROM users WHERE clerk_id = @clerk_id',
        { clerk_id: clerkId }
      );

      if (!userResult.recordset || userResult.recordset.length === 0) {
        console.warn(`[SubscriptionsService] User not found for clerkId: ${clerkId}`);
        return {
          success: false,
          error: 'User not found',
          clerkId,
          invoices: [],
          subscriptions: []
        };
      }

      const user = userResult.recordset[0];

      if (!user.stripe_id) {
        console.warn(`[SubscriptionsService] No Stripe ID found for user clerkId: ${clerkId}`);
        return {
          success: false,
          error: 'No Stripe account linked to this user',
          clerkId,
          invoices: [],
          subscriptions: []
        };
      }

      console.log(`[SubscriptionsService] Found user stripe_id: ${user.stripe_id}`);

      // Step 2: Get invoices from local database
      const dbInvoicesResult = await executeQuery(
        `SELECT 
          id,
          stripe_invoice_id,
          subscription_id,
          stripe_customer_id,
          amount,
          currency,
          status,
          due_date,
          paid_date,
          pdf_url,
          created_at
        FROM invoices
        WHERE stripe_customer_id = @stripe_customer_id
        ORDER BY created_at DESC`,
        { stripe_customer_id: user.stripe_id }
      );

      const dbInvoices = dbInvoicesResult.recordset || [];
      console.log(`[SubscriptionsService] Found ${dbInvoices.length} invoices in local database`);

      // Step 3: Get user subscriptions from local database
      const subscriptionsResult = await executeQuery(
        `SELECT 
          id,
          subscription_id,
          subscription_title,
          subscription_status,
          subscription_start_date,
          subscription_end_date,
          subscription_next_billing_date,
          subscription_latest_invoice_Id,
          subscription_invoice_pdf_url,
          subscription_canceled_at,
          subscription_cancel_at_period_end,
          product_id,
          created_at,
          updated_at
        FROM subscriptions
        WHERE stripe_id = @stripe_id
        ORDER BY created_at DESC`,
        { stripe_id: user.stripe_id }
      );

      const dbSubscriptions = subscriptionsResult.recordset || [];
      console.log(`[SubscriptionsService] Found ${dbSubscriptions.length} subscriptions in local database`);

      // Step 4: Get invoices from Stripe API
      let stripeInvoices: any[] = [];
      try {
        const invoicesResponse = await getStripeClient().invoices.list({
          customer: user.stripe_id,
          limit: 100
        });

        stripeInvoices = invoicesResponse.data.map((invoice: any) => ({
          id: invoice.id,
          number: invoice.number,
          status: invoice.status,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          receipt_number: invoice.receipt_number,
          period_start: new Date(invoice.period_start * 1000).toISOString(),
          period_end: new Date(invoice.period_end * 1000).toISOString(),
          due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
          paid_at: invoice.paid_at ? new Date(invoice.paid_at * 1000).toISOString() : null,
          created_at: new Date(invoice.created * 1000).toISOString(),
          hosting_invoice: invoice.hosted_invoice_url,
          pdf_url: invoice.invoice_pdf,
          total: invoice.total,
          total_excluding_tax: invoice.total_excluding_tax,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          lines: invoice.lines.data.map((line: any) => ({
            id: line.id,
            description: line.description,
            amount: line.amount,
            currency: line.currency,
            quantity: line.quantity,
            unit_amount: line.unit_amount,
            period: {
              start: new Date(line.period.start * 1000).toISOString(),
              end: new Date(line.period.end * 1000).toISOString()
            }
          }))
        }));

        console.log(`[SubscriptionsService] Retrieved ${stripeInvoices.length} invoices from Stripe API`);
      } catch (stripeError) {
        console.error(`[SubscriptionsService] Error fetching invoices from Stripe:`, stripeError);
      }

      // Step 5: Get current subscription details from Stripe
      let currentStripeSubscription = null;
      try {
        const subscriptionsResponse = await getStripeClient().subscriptions.list({
          customer: user.stripe_id,
          status: 'all',
          limit: 10
        });

        if (subscriptionsResponse.data.length > 0) {
          const subscription = subscriptionsResponse.data[0] as any;
          currentStripeSubscription = {
            id: subscription.id,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            default_payment_method: subscription.default_payment_method,
            items: subscription.items.data.map((item: any) => ({
              id: item.id,
              product_id: item.price.product,
              price_id: item.price.id,
              quantity: item.quantity,
              billing_cycle_anchor: item.billing_cycle_anchor ? new Date(item.billing_cycle_anchor * 1000).toISOString() : null
            }))
          };
        }
      } catch (stripeError) {
        console.error(`[SubscriptionsService] Error fetching current subscription from Stripe:`, stripeError);
      }

      return {
        success: true,
        user: {
          id: user.id,
          clerk_id: user.clerk_id,
          email: user.email,
          stripe_id: user.stripe_id
        },
        billing: {
          dbInvoices: dbInvoices.map((inv: any) => ({
            id: inv.id,
            stripe_invoice_id: inv.stripe_invoice_id,
            amount: inv.amount,
            currency: inv.currency,
            status: inv.status,
            due_date: inv.due_date,
            paid_date: inv.paid_date,
            pdf_url: inv.pdf_url,
            created_at: inv.created_at
          })),
          stripeInvoices: stripeInvoices,
          currentSubscription: currentStripeSubscription,
          subscriptions: dbSubscriptions.map((sub: any) => ({
            id: sub.id,
            subscription_id: sub.subscription_id,
            title: sub.subscription_title,
            status: sub.subscription_status,
            start_date: sub.subscription_start_date,
            end_date: sub.subscription_end_date,
            next_billing_date: sub.subscription_next_billing_date,
            canceled_at: sub.subscription_canceled_at,
            cancel_at_period_end: sub.subscription_cancel_at_period_end,
            pdf_url: sub.subscription_invoice_pdf_url,
            created_at: sub.created_at,
            updated_at: sub.updated_at
          }))
        },
        summary: {
          total_invoices: stripeInvoices.length,
          total_subscriptions: dbSubscriptions.length,
          stripe_customer_id: user.stripe_id
        }
      };
    } catch (error) {
      console.error('[SubscriptionsService] Error fetching billing history:', error);
      return {
        success: false,
        error: 'Failed to fetch billing history',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

export default subscriptionsService;
