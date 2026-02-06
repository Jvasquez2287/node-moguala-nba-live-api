import Stripe from 'stripe';
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
     * Get subscription from database
     */
    getSubscriptionFromDB(stripeId: string): Promise<any>;
};
export default stripeService;
//# sourceMappingURL=stripe.d.ts.map