export declare const subscriptionsService: {
    /**
     * Handle successful Stripe checkout session
     * Updates user subscription in database
     */
    handleCheckoutSuccess(sessionId: string): Promise<{
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
                currentPeriodStart: Date;
                currentPeriodEnd: Date;
                cancelAt: Date | null;
                canceledAt: Date | null;
            };
        };
    }>;
};
export default subscriptionsService;
//# sourceMappingURL=subscriptions.d.ts.map