"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenCheckService = void 0;
const database_1 = require("../config/database");
const stripe_1 = __importDefault(require("./stripe"));
exports.tokenCheckService = {
    /**
     * Validate token against session table and check subscription status
     * @param req - Express request object containing headers
     * @returns TokenCheckResult with validation and subscription status
     */
    async validateTokenAndCheckSubscription(req) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            const clerkId = req.headers['x-clerk-id'];
            // Step 1: Get user by clerk_id
            console.log(`[TokenCheck] Validating token for clerk_id: ${clerkId}`);
            // Validate required parameters
            if (!token) {
                console.warn(`[TokenCheck] Missing authorization token`);
                return {
                    valid: false,
                    message: 'Missing authorization token'
                };
            }
            if (!clerkId) {
                console.warn(`[TokenCheck] Missing clerk ID`);
                return {
                    valid: false,
                    message: 'Missing clerk ID'
                };
            }
            const userResult = await (0, database_1.executeQuery)('SELECT id, clerk_id, email, first_name, last_name, stripe_id FROM users WHERE clerk_id = @clerkId', { clerkId });
            if (!userResult.recordset || userResult.recordset.length === 0) {
                console.warn(`[TokenCheck] User not found for clerk_id: ${clerkId}`);
                return {
                    valid: false,
                    message: 'User not found'
                };
            }
            const user = userResult.recordset[0];
            // Step 2: Validate session token
            console.log(`[TokenCheck] Validating session token: ${token}`);
            const sessionResult = await (0, database_1.executeQuery)(`
        SELECT 
          s.id, s.user_id, s.session_token, s.expires_at, s.created_at
        FROM user_session_infos s
        WHERE s.session_token = @sessionToken AND s.user_id = @userId
        `, { sessionToken: token, userId: user.id });
            if (!sessionResult.recordset || sessionResult.recordset.length === 0) {
                console.warn(`[TokenCheck] Session token not found or invalid`);
                return {
                    valid: false,
                    message: 'Invalid session token'
                };
            }
            const session = sessionResult.recordset[0];
            // Step 3: Check if session is expired
            const expiresAt = new Date(session.expires_at);
            const now = new Date();
            if (expiresAt < now) {
                console.warn(`[TokenCheck] Session token expired`);
                return {
                    valid: false,
                    message: 'Session token expired'
                };
            }
            // Step 4: Get subscription from database
            console.log(`[TokenCheck] Checking subscription for user: ${user.id}`);
            const subscriptionResult = await (0, database_1.executeQuery)(`
        SELECT 
          id, subscription_id, subscription_status, subscription_title,
          subscription_start_date, subscription_end_date, subscription_next_billing_date,
          stripe_id, subscription_canceled_at, created_at, updated_at
        FROM subscriptions
        WHERE stripe_id = @stripeId
        `, { stripeId: user.stripe_id });
            if (!subscriptionResult.recordset || subscriptionResult.recordset.length === 0) {
                console.warn(`[TokenCheck] No subscription found for user`);
                return {
                    valid: true,
                    message: 'Valid token but no active subscription',
                    user: {
                        id: user.id,
                        clerk_id: user.clerk_id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        stripe_id: user.stripe_id
                    }
                };
            }
            const subscription = subscriptionResult.recordset[0];
            // Step 5: Check subscription status
            console.log(`[TokenCheck] Subscription status: ${subscription.subscription_status}`);
            if (subscription.subscription_status === 'active') {
                // Subscription is active
                console.log(`[TokenCheck] Subscription is active`);
                return {
                    valid: true,
                    message: 'Valid token and active subscription',
                    user: {
                        id: user.id,
                        clerk_id: user.clerk_id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        stripe_id: user.stripe_id
                    },
                    subscription: {
                        id: subscription.id,
                        subscription_id: subscription.subscription_id,
                        subscription_status: subscription.subscription_status,
                        subscription_title: subscription.subscription_title,
                        subscription_start_date: subscription.subscription_start_date,
                        subscription_end_date: subscription.subscription_end_date,
                        subscription_next_billing_date: subscription.subscription_next_billing_date
                    }
                };
            }
            // Step 6: Subscription is not active - verify with Stripe
            console.log(`[TokenCheck] Subscription status is not active, verifying with Stripe...`);
            if (!user.stripe_id) {
                console.warn(`[TokenCheck] User has no stripe_id`);
                return {
                    valid: true,
                    message: 'Valid token but subscription is inactive',
                    user: {
                        id: user.id,
                        clerk_id: user.clerk_id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        stripe_id: user.stripe_id
                    },
                    subscription: {
                        id: subscription.id,
                        subscription_id: subscription.subscription_id,
                        subscription_status: subscription.subscription_status,
                        subscription_title: subscription.subscription_title,
                        subscription_start_date: subscription.subscription_start_date,
                        subscription_end_date: subscription.subscription_end_date,
                        subscription_next_billing_date: subscription.subscription_next_billing_date
                    }
                };
            }
            try {
                // Fetch current subscription from Stripe
                const stripeSubscriptions = await stripe_1.default.getCustomerSubscriptions(user.stripe_id);
                if (stripeSubscriptions.length === 0) {
                    console.warn(`[TokenCheck] No subscription found in Stripe`);
                    return {
                        valid: true,
                        message: 'Valid token but no subscription in Stripe',
                        user: {
                            id: user.id,
                            clerk_id: user.clerk_id,
                            email: user.email,
                            first_name: user.first_name,
                            last_name: user.last_name,
                            stripe_id: user.stripe_id
                        },
                        subscription: {
                            id: subscription.id,
                            subscription_id: subscription.subscription_id,
                            subscription_status: subscription.subscription_status,
                            subscription_title: subscription.subscription_title,
                            subscription_start_date: subscription.subscription_start_date,
                            subscription_end_date: subscription.subscription_end_date,
                            subscription_next_billing_date: subscription.subscription_next_billing_date
                        }
                    };
                }
                // Get most recent subscription
                const latestStripeSubscription = stripeSubscriptions[0];
                const stripeStatus = latestStripeSubscription.status;
                console.log(`[TokenCheck] Stripe subscription status: ${stripeStatus}`);
                // Update database with latest status from Stripe
                if (stripeStatus !== subscription.subscription_status) {
                    console.log(`[TokenCheck] Updating subscription status in database: ${stripeStatus}`);
                    await (0, database_1.executeQuery)(`
            UPDATE subscriptions 
            SET subscription_status = @status, updated_at = @updatedAt
            WHERE stripe_id = @stripeId
            `, {
                        status: stripeStatus,
                        stripeId: user.stripe_id,
                        updatedAt: new Date()
                    });
                    subscription.subscription_status = stripeStatus;
                }
                // Return status based on Stripe verification
                return {
                    valid: true,
                    message: `Valid token, subscription status: ${stripeStatus} (verified with Stripe)`,
                    user: {
                        id: user.id,
                        clerk_id: user.clerk_id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        stripe_id: user.stripe_id
                    },
                    subscription: {
                        id: subscription.id,
                        subscription_id: subscription.subscription_id,
                        subscription_status: subscription.subscription_status,
                        subscription_title: subscription.subscription_title,
                        subscription_start_date: subscription.subscription_start_date,
                        subscription_end_date: subscription.subscription_end_date,
                        subscription_next_billing_date: subscription.subscription_next_billing_date
                    }
                };
            }
            catch (stripeError) {
                console.error(`[TokenCheck] Error checking Stripe subscription:`, stripeError);
                // Return database status if Stripe check fails
                return {
                    valid: true,
                    message: 'Valid token, could not verify subscription with Stripe',
                    user: {
                        id: user.id,
                        clerk_id: user.clerk_id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        stripe_id: user.stripe_id
                    },
                    subscription: {
                        id: subscription.id,
                        subscription_id: subscription.subscription_id,
                        subscription_status: subscription.subscription_status,
                        subscription_title: subscription.subscription_title,
                        subscription_start_date: subscription.subscription_start_date,
                        subscription_end_date: subscription.subscription_end_date,
                        subscription_next_billing_date: subscription.subscription_next_billing_date
                    }
                };
            }
        }
        catch (error) {
            console.error('[TokenCheck] Error validating token:', error);
            return {
                valid: false,
                message: 'Error validating token'
            };
        }
    },
    /**
     * Quick check if token is valid (without subscription check)
     */
    async isTokenValid(token, clerkId) {
        try {
            const userResult = await (0, database_1.executeQuery)('SELECT id FROM users WHERE clerk_id = @clerkId', { clerkId });
            if (!userResult.recordset || userResult.recordset.length === 0) {
                return false;
            }
            const userId = userResult.recordset[0].id;
            const sessionResult = await (0, database_1.executeQuery)(`
        SELECT id FROM user_session_infos
        WHERE session_token = @sessionToken AND user_id = @userId AND expires_at > @now
        `, { sessionToken: token, userId, now: new Date() });
            return !!sessionResult.recordset && sessionResult.recordset.length > 0;
        }
        catch (error) {
            console.error('[TokenCheck] Error checking token validity:', error);
            return false;
        }
    },
    /**
     * Invalidate/revoke a token by deleting the session
     */
    async revokeToken(token, clerkId) {
        try {
            const userResult = await (0, database_1.executeQuery)('SELECT id FROM users WHERE clerk_id = @clerkId', { clerkId });
            if (!userResult.recordset || userResult.recordset.length === 0) {
                return false;
            }
            const userId = userResult.recordset[0].id;
            const result = await (0, database_1.executeQuery)(`
        DELETE FROM user_session_infos
        WHERE session_token = @sessionToken AND user_id = @userId
        `, { sessionToken: token, userId });
            console.log(`[TokenCheck] Token revoked for clerk_id: ${clerkId}`);
            return result.rowsAffected && result.rowsAffected[0] > 0;
        }
        catch (error) {
            console.error('[TokenCheck] Error revoking token:', error);
            return false;
        }
    }
};
exports.default = exports.tokenCheckService;
//# sourceMappingURL=tokenCheck.js.map