"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeService = void 0;
exports.getStripeClient = getStripeClient;
const stripe_1 = __importDefault(require("stripe"));
const database_1 = require("../config/database");
// Initialize Stripe client lazily to ensure env vars are loaded
let stripeClient = null;
function getStripeClient() {
    if (!stripeClient) {
        const apiKey = process.env.STRIPE_SECRET_KEY;
        if (!apiKey) {
            throw new Error('STRIPE_SECRET_KEY environment variable is not set');
        }
        stripeClient = new stripe_1.default(apiKey, {
            apiVersion: '2026-01-28.clover'
        });
    }
    return stripeClient;
}
exports.stripeService = {
    /**
     * Get Stripe client
     */
    getClient() {
        return getStripeClient();
    },
    /**
     * Get all customer subscriptions
     */
    async getUsersSubscriptionID() {
        try {
            const customers = await getStripeClient().customers.list({ limit: 10000 });
            return customers.data.map(c => c.id);
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('[Stripe] Error getting subscriptions:', error);
            throw error;
        }
    },
    /**
     * Get customer by ID
     */
    async getUserByID(customerID) {
        try {
            return await getStripeClient().customers.retrieve(customerID);
        }
        catch (error) {
            console.error('[Stripe] Error getting user by ID:', error);
            throw error;
        }
    },
    /**
     * Get customer by email
     */
    async getUserByEmail(email) {
        try {
            const customers = await getStripeClient().customers.list({ email, limit: 1 });
            return customers.data[0] || null;
        }
        catch (error) {
            console.error('[Stripe] Error getting user by email:', error);
            throw error;
        }
    },
    /**
     * Get customer ID by email
     */
    async getIdByEmail(email) {
        try {
            const customer = await this.getUserByEmail(email);
            return customer?.id || null;
        }
        catch (error) {
            console.error('[Stripe] Error getting ID by email:', error);
            throw error;
        }
    },
    /**
     * Get product by ID
     */
    async getProductsByID(productID) {
        try {
            return await getStripeClient().products.retrieve(productID);
        }
        catch (error) {
            console.error('[Stripe] Error getting product:', error);
            throw error;
        }
    },
    async getCustomerEmailBySubscriptionId(subscriptionId) {
        try {
            const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
            const customer = await getStripeClient().customers.retrieve(subscription.customer);
            // Type guard: ensure customer is not deleted and has email
            if ('email' in customer && customer.email) {
                return customer.email;
            }
            return null;
        }
        catch (error) {
            console.error('[Stripe] Error getting customer email by subscription ID:', error);
            throw error;
        }
    },
    /**
     * Get invoice by ID
     */
    async getInvoice(invoiceID) {
        try {
            const invoice = await getStripeClient().invoices.retrieve(invoiceID);
            return invoice.hosted_invoice_url || null;
        }
        catch (error) {
            console.error('[Stripe] Error getting invoice:', error);
            throw error;
        }
    },
    /**
     * Delete customer by email
     */
    async deleteUserByEmail(email) {
        try {
            const customer = await this.getUserByEmail(email);
            if (!customer)
                return null;
            return await getStripeClient().customers.del(customer.id);
        }
        catch (error) {
            console.error('[Stripe] Error deleting user:', error);
            throw error;
        }
    },
    /**
     * Create subscription in database
     */
    async createSubscriptionInDB(data) {
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
            return await (0, database_1.executeQuery)(query, {
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
        }
        catch (error) {
            console.error('[Stripe] Error creating subscription in DB:', error);
            throw error;
        }
    },
    /**
     * Update subscription in database
     */
    async updateSubscriptionInDB(stripeId, data) {
        try {
            const fields = Object.keys(data)
                .map((key, index) => `${key} = @param${index}`)
                .join(', ');
            const query = `UPDATE subscriptions SET ${fields} WHERE stripe_id = @stripeId`;
            const params = { stripeId };
            Object.keys(data).forEach((key, index) => {
                params[`param${index}`] = data[key];
            });
            return await (0, database_1.executeQuery)(query, params);
        }
        catch (error) {
            console.error('[Stripe] Error updating subscription in DB:', error);
            throw error;
        }
    },
    /**
     * Create customer in Stripe
     */
    async createCustomer(email, name) {
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
        }
        catch (error) {
            console.error('[Stripe] Error creating customer:', error);
            throw error;
        }
    },
    /**
     * Get or create customer in Stripe
     */
    async getOrCreateCustomer(email, name) {
        try {
            let customer = await this.getUserByEmail(email);
            if (!customer) {
                console.log(`[Stripe] Customer not found for ${email}, creating new customer...`);
                customer = await this.createCustomer(email, name);
            }
            else {
                console.log(`[Stripe] Customer found for ${email} (ID: ${customer.id})`);
            }
            return customer;
        }
        catch (error) {
            console.error('[Stripe] Error getting or creating customer:', error);
            throw error;
        }
    },
    /**
     * Get subscriptions for a customer from Stripe
     */
    async getCustomerSubscriptions(customerId) {
        try {
            const subscriptions = await getStripeClient().subscriptions.list({
                customer: customerId,
                limit: 100
            });
            return subscriptions.data;
        }
        catch (error) {
            console.error('[Stripe] Error getting customer subscriptions:', error);
            throw error;
        }
    },
    async getSubscriptionFromDBWithClerkId(clerkId) {
        try {
            const result = await (0, database_1.executeQuery)('SELECT * FROM subscriptions WHERE clerk_id = @clerkId', { clerkId });
            return result.recordset[0] || null;
        }
        catch (error) {
            console.error('[Stripe] Error getting subscription status:', error);
            throw error;
        }
    },
    async getSubscriptionFromDBWithUserId(userId) {
        try {
            const result = await (0, database_1.executeQuery)('SELECT * FROM subscriptions WHERE user_id = @userId', { userId });
            return result.recordset[0] || null;
        }
        catch (error) {
            console.error('[Stripe] Error getting subscription status:', error);
            throw error;
        }
    },
    /**
     * Get subscription from database
     */
    async getSubscriptionFromDB(stripeId) {
        try {
            const result = await (0, database_1.executeQuery)('SELECT * FROM subscriptions WHERE stripe_id = @stripeId', { stripeId });
            return result.recordset[0] || null;
        }
        catch (error) {
            console.error('[Stripe] Error getting subscription from DB:', error);
            throw error;
        }
    },
    async getAllSubscriptionsFromStripe() {
        try {
            const subscriptions = await getStripeClient().subscriptions.list({ limit: 10000 });
            return subscriptions.data;
        }
        catch (error) {
            console.error('[Stripe] Error getting all subscriptions from Stripe:', error);
            throw error;
        }
    }
};
exports.default = exports.stripeService;
//# sourceMappingURL=stripe.js.map