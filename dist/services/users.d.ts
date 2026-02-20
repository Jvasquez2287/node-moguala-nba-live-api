export declare const userService: {
    /**
     * Get user by Clerk ID with subscription details
     */
    getUserByClerkIdWithSubscription(clerkId: string): Promise<{
        id: any;
        clerk_id: any;
        email: any;
        first_name: any;
        last_name: any;
        profile_image: any;
        stripe_id: any;
        created_at: any;
        updated_at: any;
        subscriptions: {
            id: any;
            stripe_id: any;
            subscription_id: any;
            subscription_start_date: string | null;
            subscription_end_date: string | null;
            subscription_status: any;
            subscription_title: any;
            subscription_next_billing_date: string | null;
            subscription_latest_invoice_Id: any;
            subscription_invoice_pdf_url: any;
            subscription_canceled_at: string | null;
            subscription_cancel_at_period_end: string | null;
            product_id: any;
            created_at: any;
            updated_at: any;
        }[];
        days_active: number;
        today_predictions: number;
        predictions_accuracy: string;
    } | null>;
    /**
     * Get user by Stripe ID with subscription details
     */
    getUserByStripeIdWithSubscription(stripeId: string): Promise<{
        id: any;
        clerk_id: any;
        email: any;
        first_name: any;
        last_name: any;
        profile_image: any;
        stripe_id: any;
        created_at: any;
        updated_at: any;
        subscriptions: {
            id: any;
            stripe_id: any;
            subscription_id: any;
            subscription_start_date: string | null;
            subscription_end_date: string | null;
            subscription_status: any;
            subscription_title: any;
            subscription_next_billing_date: string | null;
            subscription_latest_invoice_Id: any;
            subscription_invoice_pdf_url: any;
            subscription_canceled_at: string | null;
            subscription_cancel_at_period_end: string | null;
            product_id: any;
            created_at: any;
            updated_at: any;
        }[];
        days_active: number;
        today_predictions: number;
        predictions_accuracy: string;
    } | null>;
    /**
     * Get user by email with subscription details
     */
    getUserByEmailWithSubscription(email: string): Promise<{
        id: any;
        clerk_id: any;
        email: any;
        first_name: any;
        last_name: any;
        profile_image: any;
        stripe_id: any;
        created_at: any;
        updated_at: any;
        subscriptions: {
            id: any;
            stripe_id: any;
            subscription_id: any;
            subscription_start_date: string | null;
            subscription_end_date: string | null;
            subscription_status: any;
            subscription_title: any;
            subscription_next_billing_date: string | null;
            subscription_latest_invoice_Id: any;
            subscription_invoice_pdf_url: any;
            subscription_canceled_at: string | null;
            subscription_cancel_at_period_end: string | null;
            product_id: any;
            created_at: any;
            updated_at: any;
        }[];
        days_active: number;
        today_predictions: number;
        predictions_accuracy: string;
    } | null>;
    /**
     * Transform flat database result into nested user object with subscription
     */
    transformUserWithSubscription(records: any[]): Promise<{
        id: any;
        clerk_id: any;
        email: any;
        first_name: any;
        last_name: any;
        profile_image: any;
        stripe_id: any;
        created_at: any;
        updated_at: any;
        subscriptions: {
            id: any;
            stripe_id: any;
            subscription_id: any;
            subscription_start_date: string | null;
            subscription_end_date: string | null;
            subscription_status: any;
            subscription_title: any;
            subscription_next_billing_date: string | null;
            subscription_latest_invoice_Id: any;
            subscription_invoice_pdf_url: any;
            subscription_canceled_at: string | null;
            subscription_cancel_at_period_end: string | null;
            product_id: any;
            created_at: any;
            updated_at: any;
        }[];
        days_active: number;
        today_predictions: number;
        predictions_accuracy: string;
    } | null>;
    /**
     * Get user by ID with subscription details
     */
    getUserByIdWithSubscription(userId: number): Promise<{
        id: any;
        clerk_id: any;
        email: any;
        first_name: any;
        last_name: any;
        profile_image: any;
        stripe_id: any;
        created_at: any;
        updated_at: any;
        subscriptions: {
            id: any;
            stripe_id: any;
            subscription_id: any;
            subscription_start_date: string | null;
            subscription_end_date: string | null;
            subscription_status: any;
            subscription_title: any;
            subscription_next_billing_date: string | null;
            subscription_latest_invoice_Id: any;
            subscription_invoice_pdf_url: any;
            subscription_canceled_at: string | null;
            subscription_cancel_at_period_end: string | null;
            product_id: any;
            created_at: any;
            updated_at: any;
        }[];
        days_active: number;
        today_predictions: number;
        predictions_accuracy: string;
    } | null>;
    /**
     * Get all users with their subscription details
     */
    getAllUsersWithSubscriptions(): Promise<any[]>;
};
export default userService;
//# sourceMappingURL=users.d.ts.map