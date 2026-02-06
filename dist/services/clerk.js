"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clerkService = void 0;
const svix_1 = require("svix");
const database_1 = require("../config/database");
const clerkWebhookSecret = process.env.CLERK_WEBHOOK_SECRET || 'whsec_acDK0iU7DWXki0/b6LumDLKo6yfd7fTc';
exports.clerkService = {
    /**
     * Verify and process Clerk webhook
     */
    async verifyWebhook(req) {
        try {
            const payload = req.body;
            const headers = req.headers;
            const wh = new svix_1.Webhook(clerkWebhookSecret);
            const msg = wh.verify(JSON.stringify(payload), headers);
            console.log('[Clerk] Webhook verified successfully');
            return msg;
        }
        catch (error) {
            console.error('[Clerk] Webhook verification failed:', error);
            throw error;
        }
    },
    /**
     * Handle user created event
     */
    async handleUserCreated(clerkUser) {
        try {
            const email = clerkUser.email_addresses?.[0]?.email_address;
            if (!email) {
                throw new Error('No email found for user');
            }
            const query = `
        INSERT INTO users (clerk_id, email, first_name, last_name, profile_image_url, created_at)
        VALUES (@clerkId, @email, @firstName, @lastName, @profileImageUrl, @createdAt)
      `;
            const result = await (0, database_1.executeQuery)(query, {
                clerkId: clerkUser.id,
                email: email,
                firstName: clerkUser.first_name || null,
                lastName: clerkUser.last_name || null,
                profileImageUrl: clerkUser.profile_image_url || null,
                createdAt: new Date(clerkUser.created_at)
            });
            console.log(`[Clerk] User created: ${email}`);
            return result;
        }
        catch (error) {
            console.error('[Clerk] Error handling user created:', error);
            throw error;
        }
    },
    /**
     * Handle user updated event
     */
    async handleUserUpdated(clerkUser) {
        try {
            const email = clerkUser.email_addresses?.[0]?.email_address;
            if (!email) {
                throw new Error('No email found for user');
            }
            const query = `
        UPDATE users 
        SET email = @email, first_name = @firstName, last_name = @lastName, 
            profile_image_url = @profileImageUrl, updated_at = @updatedAt
        WHERE clerk_id = @clerkId
      `;
            const result = await (0, database_1.executeQuery)(query, {
                clerkId: clerkUser.id,
                email: email,
                firstName: clerkUser.first_name || null,
                lastName: clerkUser.last_name || null,
                profileImageUrl: clerkUser.profile_image_url || null,
                updatedAt: new Date(clerkUser.updated_at)
            });
            console.log(`[Clerk] User updated: ${email}`);
            return result;
        }
        catch (error) {
            console.error('[Clerk] Error handling user updated:', error);
            throw error;
        }
    },
    /**
     * Handle user deleted event
     */
    async handleUserDeleted(clerkUserId) {
        try {
            const query = 'UPDATE users SET deleted_at = @now WHERE clerk_id = @clerkId';
            const result = await (0, database_1.executeQuery)(query, {
                clerkId: clerkUserId,
                now: new Date()
            });
            console.log(`[Clerk] User deleted: ${clerkUserId}`);
            return result;
        }
        catch (error) {
            console.error('[Clerk] Error handling user deleted:', error);
            throw error;
        }
    },
    /**
     * Get user from database by Clerk ID
     */
    async getUserByClerkId(clerkId) {
        try {
            const result = await (0, database_1.executeQuery)('SELECT * FROM users WHERE clerk_id = @clerkId', { clerkId });
            return result.recordset?.[0] || null;
        }
        catch (error) {
            console.error('[Clerk] Error getting user:', error);
            throw error;
        }
    },
    /**
     * Get user from database by email
     */
    async getUserByEmail(email) {
        try {
            const result = await (0, database_1.executeQuery)('SELECT * FROM users WHERE email = @email', { email });
            return result.recordset?.[0] || null;
        }
        catch (error) {
            console.error('[Clerk] Error getting user by email:', error);
            throw error;
        }
    }
};
exports.default = exports.clerkService;
//# sourceMappingURL=clerk.js.map