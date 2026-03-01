export declare const subscriptionsService: {
    /**
     * Handle successful Stripe checkout session
     * Updates user subscription in database
     */
    handleCheckoutSuccess(sessionId: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            sessionId: string;
            subscriptionId: string;
            customerId: string;
            status: string;
            user: {
                id: any;
                clerk_id: any;
                email: any;
                first_name: any;
                last_name: any;
                stripe_id: string;
            };
            subscription: {
                id: string;
                status: string;
                currentPeriodStart: string;
                currentPeriodEnd: string;
                cancelAt: string | null;
                canceledAt: string | null;
                subscription_invoice_pdf_url: string;
                cancelAtPeriodEnd: boolean;
            };
        };
    }>;
    /**
     * Get billing history for a user by their Clerk ID
     * Fetches invoices from both local database and Stripe
     * @param clerkId - The Clerk user ID
     * @returns Billing history with invoices and subscription details
     */
    getBillingHistory(clerkId: string): Promise<{
        success: boolean;
        error: string;
        clerkId: string;
        invoices: never[];
        subscriptions: never[];
        user?: undefined;
        billing?: undefined;
        summary?: undefined;
        message?: undefined;
    } | {
        success: boolean;
        user: {
            id: any;
            clerk_id: any;
            email: any;
            stripe_id: any;
        };
        billing: {
            dbInvoices: any;
            stripeInvoices: any[];
            currentSubscription: {
                id: any;
                status: any;
                current_period_start: string;
                current_period_end: string;
                cancel_at_period_end: any;
                canceled_at: string | null;
                default_payment_method: any;
                items: any;
            } | null;
            subscriptions: any;
        };
        summary: {
            total_invoices: number;
            total_subscriptions: any;
            stripe_customer_id: any;
        };
        error?: undefined;
        clerkId?: undefined;
        invoices?: undefined;
        subscriptions?: undefined;
        message?: undefined;
    } | {
        success: boolean;
        error: string;
        message: string;
        clerkId?: undefined;
        invoices?: undefined;
        subscriptions?: undefined;
        user?: undefined;
        billing?: undefined;
        summary?: undefined;
    }>;
};
export default subscriptionsService;
//# sourceMappingURL=subscriptions.d.ts.map