import Stripe from 'stripe';
import { executeQuery } from '../config/database';

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover' as any
});

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
  product_id: string;
}

export const stripeService = {
  /**
   * Get Stripe client
   */
  getClient() {
    return stripe;
  },

  /**
   * Get all customer subscriptions
   */
  async getUsersSubscriptionID(): Promise<string[]> {
    try {
      const customers = await stripe.customers.list({ limit: 10000 });
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
      const subscriptions = await stripe.subscriptions.list({ limit: 10000 });
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
      return await stripe.customers.retrieve(customerID);
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
      const customers = await stripe.customers.list({ email, limit: 1 });
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
      return await stripe.products.retrieve(productID);
    } catch (error) {
      console.error('[Stripe] Error getting product:', error);
      throw error;
    }
  },

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceID: string): Promise<string | null> {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceID);
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
      return await stripe.customers.del(customer.id);
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
  }
};

export default stripeService;
