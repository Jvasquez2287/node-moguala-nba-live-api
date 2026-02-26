import Stripe from 'stripe';
import { executeQuery } from '../config/database';

// Initialize Stripe client lazily to ensure env vars are loaded
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeClient = new Stripe(apiKey, {
      apiVersion: '2026-01-28.clover' as any
    });
  }
  return stripeClient;
}

interface SubscriptionData {
  stripe_id: string;
  subscription_id: string;
  subscription_start_date: Date;
  subscription_end_date: Date;
  subscription_status: string;
  subscription_title: string;
  subscription_next_billing_date: Date;
  subscription_latest_invoice_Id: string;
  subscription_invoice_pdf_url: string;
  subscription_canceled_at: Date | null;
  subscription_cancel_at_period_end: boolean;
  product_id: string;
}

export const stripeService = {
  /**
   * Get Stripe client
   */
  getClient() {
    return getStripeClient();
  },

  /**
   * Get all customer subscriptions
   */
  async getUsersSubscriptionID(): Promise<string[]> {
    try {
      const customers = await getStripeClient().customers.list({ limit: 10000 });
      return customers.data.map(c => c.id);
    } catch (error) {
      console.error('[Stripe] Error getting subscription IDs:', error);
      throw error;
    }
  },

  /**
   * Get all subscriptions
   */
  async getUsersSubscription() {
    try {
      const subscriptions = await getStripeClient().subscriptions.list({ limit: 10000 });
      return subscriptions.data;
    } catch (error) {
      console.error('[Stripe] Error getting subscriptions:', error);
      throw error;
    }
  },

  /**
   * Get customer by ID
   */
  async getUserByID(customerID: string) {
    try {
      return await getStripeClient().customers.retrieve(customerID);
    } catch (error) {
      console.error('[Stripe] Error getting user by ID:', error);
      throw error;
    }
  },

  /**
   * Get customer by email
   */
  async getUserByEmail(email: string) {
    try {
      const customers = await getStripeClient().customers.list({ email, limit: 1 });
      return customers.data[0] || null;
    } catch (error) {
      console.error('[Stripe] Error getting user by email:', error);
      throw error;
    }
  },

  /**
   * Get customer ID by email
   */
  async getIdByEmail(email: string): Promise<string | null> {
    try {
      const customer = await this.getUserByEmail(email);
      return customer?.id || null;
    } catch (error) {
      console.error('[Stripe] Error getting ID by email:', error);
      throw error;
    }
  },

  /**
   * Get product by ID
   */
  async getProductsByID(productID: string) {
    try {
      return await getStripeClient().products.retrieve(productID);
    } catch (error) {
      console.error('[Stripe] Error getting product:', error);
      throw error;
    }
  },

  async getCustomerEmailBySubscriptionId(subscriptionId: string): Promise<string | null> {
    try {
      const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
      const customer = await getStripeClient().customers.retrieve(subscription.customer as string);
      // Type guard: ensure customer is not deleted and has email
      if ('email' in customer && customer.email) {
        return customer.email;
      }
      return null;
    } catch (error) {
      console.error('[Stripe] Error getting customer email by subscription ID:', error);
      throw error;
    }
  },

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceID: string): Promise<string | null> {
    try {
      const invoice = await getStripeClient().invoices.retrieve(invoiceID);
      return invoice.hosted_invoice_url || null;
    } catch (error) {
      console.error('[Stripe] Error getting invoice:', error);
      throw error;
    }
  },

  /**
   * Delete customer by email
   */
  async deleteUserByEmail(email: string) {
    try {
      const customer = await this.getUserByEmail(email);
      if (!customer) return null;
      return await getStripeClient().customers.del(customer.id);
    } catch (error) {
      console.error('[Stripe] Error deleting user:', error);
      throw error;
    }
  },

  /**
   * Create subscription in database
   */
  async createSubscriptionInDB(data: SubscriptionData) {
    try {
      const query = `
        INSERT INTO subscriptions 
        (stripe_id, subscription_id, subscription_start_date, subscription_end_date, 
         subscription_status, subscription_title, subscription_next_billing_date, 
         subscription_latest_invoice_Id, subscription_invoice_pdf_url, subscription_canceled_at, product_id)
        VALUES 
        (@stripeId, @subscriptionId, @startDate, @endDate, @status, @title, @nextBillingDate, 
         @invoiceId, @invoicePdfUrl, @canceledAt, @productId)
      `;

      return await executeQuery(query, {
        stripeId: data.stripe_id,
        subscriptionId: data.subscription_id,
        startDate: data.subscription_start_date,
        endDate: data.subscription_end_date,
        status: data.subscription_status,
        title: data.subscription_title,
        nextBillingDate: data.subscription_next_billing_date,
        invoiceId: data.subscription_latest_invoice_Id,
        invoicePdfUrl: data.subscription_invoice_pdf_url,
        canceledAt: data.subscription_canceled_at,
        productId: data.product_id
      });
    } catch (error) {
      console.error('[Stripe] Error creating subscription in DB:', error);
      throw error;
    }
  },

  /**
   * Update subscription in database
   */
  async updateSubscriptionInDB(stripeId: string, data: Partial<SubscriptionData>) {
    try {
      const fields = Object.keys(data)
        .map((key, index) => `${key} = @param${index}`)
        .join(', ');

      const query = `UPDATE subscriptions SET ${fields} WHERE stripe_id = @stripeId`;

      const params: any = { stripeId };
      Object.keys(data).forEach((key, index) => {
        params[`param${index}`] = (data as any)[key];
      });

      return await executeQuery(query, params);
    } catch (error) {
      console.error('[Stripe] Error updating subscription in DB:', error);
      throw error;
    }
  },

  /**
   * Create customer in Stripe
   */
  async createCustomer(email: string, name?: string) {
    try {
      const customer = await getStripeClient().customers.create({
        email,
        name: name || undefined,
        metadata: {
          created_at: new Date().toISOString()
        }
      });
      console.log(`[Stripe] Customer created: ${email} (ID: ${customer.id})`);
      return customer;
    } catch (error) {
      console.error('[Stripe] Error creating customer:', error);
      throw error;
    }
  },

  /**
   * Get or create customer in Stripe
   */
  async getOrCreateCustomer(email: string, name?: string) {
    try {
      let customer = await this.getUserByEmail(email);

      if (!customer) {
        console.log(`[Stripe] Customer not found for ${email}, creating new customer...`);
        customer = await this.createCustomer(email, name);
      } else {
        //  console.log(`[Stripe] Customer found for ${email} (ID: ${customer.id})`);
      }

      return customer;
    } catch (error) {
      console.error('[Stripe] Error getting or creating customer:', error);
      throw error;
    }
  },

  /**
   * Get subscriptions for a customer from Stripe
   */
  async getCustomerSubscriptions(customerId: string) {
    try {
      const subscriptions = await getStripeClient().subscriptions.list({
        customer: customerId,
        limit: 100
      });
      return subscriptions.data;
    } catch (error) {
      console.error('[Stripe] Error getting customer subscriptions:', error);
      throw error;
    }
  },

  async getSubscriptionFromDBWithClerkId(clerkId: string) {
    try {
      const result = await executeQuery(
        'SELECT * FROM subscriptions WHERE clerk_id = @clerkId',
        { clerkId }
      );
      return result.recordset[0] || null;

    } catch (error) {
      console.error('[Stripe] Error getting subscription status:', error);
      throw error;
    }
  },

  async getSubscriptionFromDBWithUserId(userId: string) {
    try {
      const result = await executeQuery(
        'SELECT * FROM subscriptions WHERE user_id = @userId',
        { userId }
      );
      return result.recordset[0] || null;
    } catch (error) {
      console.error('[Stripe] Error getting subscription status:', error);
      throw error;
    }
  },

  async getSubscriptionFromDBWithSubscriptionId(subscriptionId: string) {
    try {
      const result = await executeQuery(
        'SELECT * FROM subscriptions WHERE subscription_id = @subscriptionId',
        { subscriptionId }
      );
      return result.recordset[0] || null;
    } catch (error) {
      console.error('[Stripe] Error getting subscription from DB:', error);
      throw error;
    }
  },

  /**
   * Get subscription from database
   */
  async getSubscriptionFromDB(stripeId: string) {
    try {
      const result = await executeQuery(
        'SELECT * FROM subscriptions WHERE stripe_id = @stripeId',
        { stripeId }
      );
      return result.recordset[0] || null;
    } catch (error) {
      console.error('[Stripe] Error getting subscription from DB:', error);
      throw error;
    }
  },

  async getAllSubscriptionsFromStripe() {
    try {
      const subscriptions = await getStripeClient().subscriptions.list({ limit: 10000 });
      return subscriptions.data;
    } catch (error) {
      console.error('[Stripe] Error getting all subscriptions from Stripe:', error);
      throw error;
    }
  },


  /*
  * update the user stripe customer id in the database for future reference
   */

  async updateCustomerId(userId: string, customerId: string) {
    try {
      await executeQuery(
        'UPDATE users SET stripe_customer_id = @customerId WHERE clerk_id = @userId',
        { customerId, userId }
      );
      console.log(`[Stripe] Updated user ${userId} with Stripe customer ID: ${customerId}`);

      // Fetch the updated user to confirm the change
      const result = await executeQuery(
        'SELECT email FROM users WHERE clerk_id = @userId',
        { userId }
      );
      const email = result.recordset[0]?.email || null;
      console.log(`[Stripe] Fetched email for user ${userId}: ${email}`);
      return email;
    }
    catch (error) {
      console.error(`[Stripe] Error updating customer ID for user ${userId}:`, error);
      throw error;
    }
  },

  /*
  * Get Customer ID by clerk user ID
  */
  async getCustomerIdByClerkId(clerkId: string): Promise<string | null> {
    try {
      const result = await executeQuery(
        'SELECT stripe_id,first_name,last_name FROM users WHERE clerk_id = @clerkId',
        { clerkId }
      );
      const customerId = result.recordset[0]?.stripe_id || null;
      console.log(`[Stripe] Fetched Stripe customer ID for clerk ID ${clerkId}: ${customerId}`);
      return    customerId;
    } catch (error) {
      console.error(`[Stripe] Error fetching customer ID for clerk ID ${clerkId}:`, error);
      throw error;
    }
  },

  /**
   * Get user Email by Stripe customer ID
   */
  async getEmailByCustomerId(customerId: string): Promise<string | null> {
    try {
      const result = await executeQuery(
        'SELECT email FROM users WHERE stripe_id = @customerId',
        { customerId }
      );
      const email = result.recordset[0]?.email || null;
      console.log(`[Stripe] Fetched email for Stripe customer ID ${customerId}: ${email}`);
      return email;
    } catch (error) {
      console.error(`[Stripe] Error fetching email for Stripe customer ID ${customerId}:`, error);
      throw error;
    };
    }


};

export { getStripeClient };
export default stripeService;
