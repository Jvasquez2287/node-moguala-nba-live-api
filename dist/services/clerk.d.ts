import { Request } from 'express';
interface ClerkUser {
    id: string;
    email_addresses: Array<{
        email_address: string;
    }>;
    first_name?: string;
    last_name?: string;
    created_at: number;
    updated_at: number;
    profile_image_url?: string;
}
interface WebhookEvent {
    data: ClerkUser;
    object: string;
    type: string;
}
export declare const clerkService: {
    /**
     * Verify and process Clerk webhook
     */
    verifyWebhook(req: Request): Promise<WebhookEvent | null>;
    /**
     * Handle user created event
     */
    handleUserCreated(clerkUser: ClerkUser): Promise<any>;
    /**
     * Handle user updated event
     */
    handleUserUpdated(clerkUser: ClerkUser): Promise<any>;
    /**
     * Handle user deleted event
     */
    handleUserDeleted(clerkUserId: string): Promise<any>;
    /**
     * Get user from database by Clerk ID
     */
    getUserByClerkId(clerkId: string): Promise<any>;
    /**
     * Get user from database by email
     */
    getUserByEmail(email: string): Promise<any>;
    /**
     * Handle session created event
     */
    handleSessionCreated(sessionData: any): Promise<any>;
    /**
     * Handle session ended event
     */
    handleSessionEnded(sessionData: any): Promise<any>;
    /**
     * Handle session renewed event
     */
    handleSessionRenewed(sessionData: any): Promise<any>;
    /**
     * Get user from Clerk API by email
     */
    getUserFromClerkAPI(email: string): Promise<{} | null>;
    /**
     * Get user from Clerk API by clerk ID
     */
    getUserFromClerkAPIById(clerkId: string): Promise<ClerkUser | null>;
    /**
     * Sync all users from Clerk API to database
     */
    syncAllUsersFromClerk(): Promise<{
        created: number;
        updated: number;
        failed: number;
    }>;
    /**
     * Start automatic user sync every 24 hours
     */
    startAutoSync(): void;
    /**
     * Stop automatic user sync
     */
    stopAutoSync(): void;
};
export default clerkService;
//# sourceMappingURL=clerk.d.ts.map