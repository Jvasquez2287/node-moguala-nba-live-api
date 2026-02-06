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
};
export default clerkService;
//# sourceMappingURL=clerk.d.ts.map