"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const database_1 = require("../config/database");
exports.userService = {
    /**
     * Get user by Clerk ID with subscription details
     */
    async getUserByClerkIdWithSubscription(clerkId) {
        try {
            const result = await (0, database_1.executeQuery)(`
        SELECT 
          u.id,
          u.clerk_id,
          u.email,
          u.first_name,
          u.last_name,
          u.profile_image,
          u.stripe_id,
          u.created_at,
          u.updated_at,
          s.id AS subscription_id,
          s.stripe_id AS subscription_stripe_id,
          s.subscription_id,
          s.subscription_start_date,
          s.subscription_end_date,
          s.subscription_status,
          s.subscription_title,
          s.subscription_next_billing_date,
          s.subscription_latest_invoice_Id,
          s.subscription_invoice_pdf_url,
          s.subscription_canceled_at,
          s.product_id,
          s.created_at AS subscription_created_at,
          s.updated_at AS subscription_updated_at
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE u.clerk_id = @clerkId
        `, { clerkId });
            if (!result.recordset || result.recordset.length === 0) {
                return null;
            }
            // Transform flat result into nested structure
            return this.transformUserWithSubscription(result.recordset);
        }
        catch (error) {
            console.error('[UserService] Error getting user by clerk_id:', error);
            throw error;
        }
    },
    /**
     * Get user by Stripe ID with subscription details
     */
    async getUserByStripeIdWithSubscription(stripeId) {
        try {
            const result = await (0, database_1.executeQuery)(`
        SELECT 
          u.id,
          u.clerk_id,
          u.email,
          u.first_name,
          u.last_name,
          u.profile_image,
          u.stripe_id,
          u.created_at,
          u.updated_at,
          s.id AS subscription_id,
          s.stripe_id AS subscription_stripe_id,
          s.subscription_id,
          s.subscription_start_date,
          s.subscription_end_date,
          s.subscription_status,
          s.subscription_title,
          s.subscription_next_billing_date,
          s.subscription_latest_invoice_Id,
          s.subscription_invoice_pdf_url,
          s.subscription_canceled_at,
          s.product_id,
          s.created_at AS subscription_created_at,
          s.updated_at AS subscription_updated_at
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE u.stripe_id = @stripeId
        `, { stripeId });
            if (!result.recordset || result.recordset.length === 0) {
                return null;
            }
            // Transform flat result into nested structure
            return this.transformUserWithSubscription(result.recordset);
        }
        catch (error) {
            console.error('[UserService] Error getting user by stripe_id:', error);
            throw error;
        }
    },
    /**
     * Get user by email with subscription details
     */
    async getUserByEmailWithSubscription(email) {
        try {
            const result = await (0, database_1.executeQuery)(`
        SELECT 
          u.id,
          u.clerk_id,
          u.email,
          u.first_name,
          u.last_name,
          u.profile_image,
          u.stripe_id,
          u.created_at,
          u.updated_at,
          s.id AS subscription_id,
          s.stripe_id AS subscription_stripe_id,
          s.subscription_id,
          s.subscription_start_date,
          s.subscription_end_date,
          s.subscription_status,
          s.subscription_title,
          s.subscription_next_billing_date,
          s.subscription_latest_invoice_Id,
          s.subscription_invoice_pdf_url,
          s.subscription_canceled_at,
          s.product_id,
          s.created_at AS subscription_created_at,
          s.updated_at AS subscription_updated_at
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE u.email = @email
        `, { email });
            if (!result.recordset || result.recordset.length === 0) {
                return null;
            }
            // Transform flat result into nested structure
            return this.transformUserWithSubscription(result.recordset);
        }
        catch (error) {
            console.error('[UserService] Error getting user by email:', error);
            throw error;
        }
    },
    /**
     * Transform flat database result into nested user object with subscription
     */
    transformUserWithSubscription(records) {
        if (!records || records.length === 0) {
            return null;
        }
        const firstRecord = records[0];
        const user = {
            id: firstRecord.id,
            clerk_id: firstRecord.clerk_id,
            email: firstRecord.email,
            first_name: firstRecord.first_name,
            last_name: firstRecord.last_name,
            profile_image: firstRecord.profile_image,
            stripe_id: firstRecord.stripe_id,
            created_at: firstRecord.created_at,
            updated_at: firstRecord.updated_at,
            subscriptions: records
                .filter((r) => r.subscription_id !== null)
                .map((r) => ({
                id: r.subscription_id,
                stripe_id: r.subscription_stripe_id,
                subscription_id: r.subscription_id,
                subscription_start_date: r.subscription_start_date,
                subscription_end_date: r.subscription_end_date,
                subscription_status: r.subscription_status,
                subscription_title: r.subscription_title,
                subscription_next_billing_date: r.subscription_next_billing_date,
                subscription_latest_invoice_Id: r.subscription_latest_invoice_Id,
                subscription_invoice_pdf_url: r.subscription_invoice_pdf_url,
                subscription_canceled_at: r.subscription_canceled_at,
                product_id: r.product_id,
                created_at: r.subscription_created_at,
                updated_at: r.subscription_updated_at
            }))
        };
        return user;
    },
    /**
     * Get user by ID with subscription details
     */
    async getUserByIdWithSubscription(userId) {
        try {
            const result = await (0, database_1.executeQuery)(`
        SELECT 
          u.id,
          u.clerk_id,
          u.email,
          u.first_name,
          u.last_name,
          u.profile_image,
          u.stripe_id,
          u.created_at,
          u.updated_at,
          s.id AS subscription_id,
          s.stripe_id AS subscription_stripe_id,
          s.subscription_id,
          s.subscription_start_date,
          s.subscription_end_date,
          s.subscription_status,
          s.subscription_title,
          s.subscription_next_billing_date,
          s.subscription_latest_invoice_Id,
          s.subscription_invoice_pdf_url,
          s.subscription_canceled_at,
          s.product_id,
          s.created_at AS subscription_created_at,
          s.updated_at AS subscription_updated_at
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE u.id = @userId
        `, { userId });
            if (!result.recordset || result.recordset.length === 0) {
                return null;
            }
            // Transform flat result into nested structure
            return this.transformUserWithSubscription(result.recordset);
        }
        catch (error) {
            console.error('[UserService] Error getting user by id:', error);
            throw error;
        }
    },
    /**
     * Get all users with their subscription details
     */
    async getAllUsersWithSubscriptions() {
        try {
            const result = await (0, database_1.executeQuery)(`
        SELECT 
          u.id,
          u.clerk_id,
          u.email,
          u.first_name,
          u.last_name,
          u.profile_image,
          u.stripe_id,
          u.created_at,
          u.updated_at,
          s.id AS subscription_id,
          s.stripe_id AS subscription_stripe_id,
          s.subscription_id,
          s.subscription_start_date,
          s.subscription_end_date,
          s.subscription_status,
          s.subscription_title,
          s.subscription_next_billing_date,
          s.subscription_latest_invoice_Id,
          s.subscription_invoice_pdf_url,
          s.subscription_canceled_at,
          s.product_id,
          s.created_at AS subscription_created_at,
          s.updated_at AS subscription_updated_at
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        ORDER BY u.created_at DESC
        `);
            if (!result.recordset || result.recordset.length === 0) {
                return [];
            }
            // Group results by user id
            const usersMap = new Map();
            result.recordset.forEach((row) => {
                const userId = row.id;
                if (!usersMap.has(userId)) {
                    usersMap.set(userId, {
                        id: row.id,
                        clerk_id: row.clerk_id,
                        email: row.email,
                        first_name: row.first_name,
                        last_name: row.last_name,
                        profile_image: row.profile_image,
                        stripe_id: row.stripe_id,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                        subscriptions: []
                    });
                }
                if (row.subscription_id !== null) {
                    usersMap.get(userId).subscriptions.push({
                        id: row.subscription_id,
                        stripe_id: row.subscription_stripe_id,
                        subscription_id: row.subscription_id,
                        subscription_start_date: row.subscription_start_date,
                        subscription_end_date: row.subscription_end_date,
                        subscription_status: row.subscription_status,
                        subscription_title: row.subscription_title,
                        subscription_next_billing_date: row.subscription_next_billing_date,
                        subscription_latest_invoice_Id: row.subscription_latest_invoice_Id,
                        subscription_invoice_pdf_url: row.subscription_invoice_pdf_url,
                        subscription_canceled_at: row.subscription_canceled_at,
                        product_id: row.product_id,
                        created_at: row.subscription_created_at,
                        updated_at: row.subscription_updated_at
                    });
                }
            });
            return Array.from(usersMap.values());
        }
        catch (error) {
            console.error('[UserService] Error getting all users:', error);
            throw error;
        }
    }
};
exports.default = exports.userService;
//# sourceMappingURL=users.js.map