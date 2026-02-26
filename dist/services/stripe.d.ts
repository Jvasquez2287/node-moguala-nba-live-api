import Stripe from 'stripe';
declare function getStripeClient(): Stripe;
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
export declare const stripeService: {
    /**
     * Get Stripe client
     */
    getClient(): Stripe;
    /**
     * Get all customer subscriptions
     */
    getUsersSubscriptionID(): Promise<string[]>;
    /**
     * Get all subscriptions
     */
    getUsersSubscription(): Promise<Stripe.Subscription[]>;
    /**
     * Get customer by ID
     */
    getUserByID(customerID: string): Promise<Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>>;
    /**
     * Get customer by email
     */
    getUserByEmail(email: string): Promise<Stripe.Customer>;
    /**
     * Get customer ID by email
     */
    getIdByEmail(email: string): Promise<string | null>;
    /**
     * Get product by ID
     */
    getProductsByID(productID: string): Promise<Stripe.Response<Stripe.Product>>;
    getCustomerEmailBySubscriptionId(subscriptionId: string): Promise<string | null>;
    /**
     * Get invoice by ID
     */
    getInvoice(invoiceID: string): Promise<string | null>;
    /**
     * Delete customer by email
     */
    deleteUserByEmail(email: string): Promise<Stripe.Response<Stripe.DeletedCustomer> | null>;
    /**
     * Create subscription in database
     */
    createSubscriptionInDB(data: SubscriptionData): Promise<any>;
    /**
     * Update subscription in database
     */
    updateSubscriptionInDB(stripeId: string, data: Partial<SubscriptionData>): Promise<any>;
    /**
     * Create customer in Stripe
     */
    createCustomer(email: string, name?: string): Promise<Stripe.Response<Stripe.Customer>>;
    /**
     * Get or create customer in Stripe
     */
    getOrCreateCustomer(email: string, name?: string): Promise<Stripe.Customer>;
    /**
     * Get subscriptions for a customer from Stripe
     */
    getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]>;
    getSubscriptionFromDBWithClerkId(clerkId: string): Promise<any>;
    getSubscriptionFromDBWithUserId(userId: string): Promise<any>;
    getSubscriptionFromDBWithSubscriptionId(subscriptionId: string): Promise<any>;
    /**
     * Get subscription from database
     */
    getSubscriptionFromDB(stripeId: string): Promise<any>;
    getAllSubscriptionsFromStripe(): Promise<Stripe.Subscription[]>;
    updateCustomerId(userId: string, customerId: string): Promise<any>;
    getCustomerIdByClerkId(clerkId: string): Promise<string | null>;
};
export { getStripeClient };
export default stripeService;
//# sourceMappingURL=stripe.d.ts.map