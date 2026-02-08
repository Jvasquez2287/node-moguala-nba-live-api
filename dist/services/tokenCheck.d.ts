import { Request } from 'express';
interface TokenCheckResult {
    valid: boolean;
    message: string;
    user?: {
        id: number;
        clerk_id: string;
        email: string;
        first_name: string;
        last_name: string;
        stripe_id: string;
    };
    subscription?: {
        id: number;
        subscription_id: string;
        subscription_status: string;
        subscription_title: string;
        subscription_start_date: Date;
        subscription_end_date: Date;
        subscription_next_billing_date: Date;
    };
}
export declare const tokenCheckService: {
    /**
     * Validate token against session table and check subscription status
     * @param req - Express request object containing headers
     * @returns TokenCheckResult with validation and subscription status
     */
    validateTokenAndCheckSubscription(req: Request): Promise<TokenCheckResult>;
    /**
     * Quick check if token is valid (without subscription check)
     */
    isTokenValid(token: string, clerkId: string): Promise<boolean>;
    /**
     * Invalidate/revoke a token by deleting the session
     */
    revokeToken(token: string, clerkId: string): Promise<boolean>;
};
export default tokenCheckService;
//# sourceMappingURL=tokenCheck.d.ts.map