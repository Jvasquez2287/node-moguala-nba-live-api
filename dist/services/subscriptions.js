"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionsService = void 0;
const database_1 = require("../config/database");
const stripe_1 = __importStar(require("./stripe"));
const clerk_1 = require("./clerk");
exports.subscriptionsService = {
    /**
     * Handle successful Stripe checkout session
     * Updates user subscription in database
     */
    async handleCheckoutSuccess(sessionId) {
        try {
            console.log(`[SubscriptionsService] Processing checkout success for session: ${sessionId}`);
            // Step 1: Retrieve the checkout session from Stripe
            const session = await (0, stripe_1.getStripeClient)().checkout.sessions.retrieve(sessionId);
            if (!session.subscription) {
                throw new Error('No subscription found in checkout session');
            }
            console.log(`[SubscriptionsService] Session retrieved: ${session.id}`);
            // Step 2: Get subscription details from Stripe
            const subscription = await (0, stripe_1.getStripeClient)().subscriptions.retrieve(session.subscription);
            console.log(`[SubscriptionsService] Subscription retrieved: ${subscription.id}, status: ${subscription.status}`);
            if (subscription.status !== 'active' && subscription.status !== 'trialing') {
                console.warn(`[SubscriptionsService] Subscription ${subscription.id} is not active or trialing. Status: ${subscription.status}`);
                return {
                    success: false,
                    message: `Subscription ${subscription.id} is not active or trialing. Status: ${subscription.status}`
                };
            }
            // Step 3: Get customer info
            const customer = await (0, stripe_1.getStripeClient)().customers.retrieve(subscription.customer);
            console.log(`[SubscriptionsService] Customer email: ${customer.email}`);
            // Step 4: Find user by email
            let userResult = await (0, database_1.executeQuery)('SELECT id, clerk_id, email, first_name, last_name, stripe_id FROM users WHERE email = @email', { email: customer.email });
            let user;
            if (!userResult.recordset || userResult.recordset.length === 0) {
                // User not found in local DB, try to fetch from Clerk and create locally
                console.log(`[SubscriptionsService] User not found in local DB for email: ${customer.email}, fetching from Clerk API...`);
                try {
                    const clerkUsersResponse = await clerk_1.clerkService.getUserFromClerkAPI(customer.email);
                    if (!clerkUsersResponse || !Array.isArray(clerkUsersResponse.data) || clerkUsersResponse.data.length === 0) {
                        throw new Error(`User not found in Clerk API for email: ${customer.email}`);
                    }
                    const clerkUser = clerkUsersResponse.data[0];
                    console.log(`[SubscriptionsService] Found user in Clerk API: ${clerkUser.id}`);
                    // Create user in local database from Clerk info
                    await clerk_1.clerkService.handleUserCreated(clerkUser);
                    console.log(`[SubscriptionsService] Created user in local DB from Clerk info: ${clerkUser.id}`);
                    // Fetch the newly created user from local DB
                    userResult = await (0, database_1.executeQuery)('SELECT id, clerk_id, email, first_name, last_name, stripe_id FROM users WHERE email = @email', { email: customer.email });
                    if (!userResult.recordset || userResult.recordset.length === 0) {
                        throw new Error(`Failed to create user in local DB for email: ${customer.email}`);
                    }
                    user = userResult.recordset[0];
                }
                catch (clerkError) {
                    console.error(`[SubscriptionsService] Error fetching/creating user from Clerk:`, clerkError);
                    throw clerkError;
                }
            }
            else {
                user = userResult.recordset[0];
            }
            console.log(`[SubscriptionsService] Found user: ${user.id}, clerk_id: ${user.clerk_id}`);
            // Step 5: Update user with stripe_id if not already set
            if (!user.stripe_id || user.stripe_id !== subscription.customer) {
                await (0, database_1.executeQuery)('UPDATE users SET stripe_id = @stripe_id, updated_at = @updated_at WHERE id = @id', {
                    stripe_id: subscription.customer,
                    updated_at: new Date().toISOString(),
                    id: user.id
                });
                console.log(`[SubscriptionsService] Updated user stripe_id: ${subscription.customer}`);
                user.stripe_id = subscription.customer;
            }
            // Step 6: Get product ID and dates from subscription items
            const productId = subscription.items?.data?.[0]?.plan?.product;
            const itemStartDate = subscription.items?.data?.[0]?.current_period_start;
            const itemEndDate = subscription.items?.data?.[0]?.current_period_end;
            // Debug logging for timestamps
            console.log(`[SubscriptionsService] Timestamps - start: ${itemStartDate}, end: ${itemEndDate}, canceled: ${subscription.canceled_at}`);
            console.log(`[SubscriptionsService] Timestamp types - start: ${typeof itemStartDate}, end: ${typeof itemEndDate}`);
            // Calculate the difference to verify they're different
            if (itemStartDate && itemEndDate) {
                const diff = itemEndDate - itemStartDate;
                console.log(`[SubscriptionsService] Period difference in seconds: ${diff}`);
            }
            // Helper function to safely convert Unix timestamp to ISO string
            const convertTimestampToISO = (timestamp) => {
                if (!timestamp || typeof timestamp !== 'number') {
                    console.warn(`[SubscriptionsService] Invalid timestamp: ${timestamp}, type: ${typeof timestamp}`);
                    return null;
                }
                try {
                    const date = new Date(timestamp * 1000);
                    if (isNaN(date.getTime())) {
                        console.warn(`[SubscriptionsService] Date is NaN for timestamp: ${timestamp}`);
                        return null;
                    }
                    const iso = date.toISOString();
                    console.log(`[SubscriptionsService] Converted timestamp ${timestamp} to ${iso}`);
                    return iso;
                }
                catch (error) {
                    console.error(`[SubscriptionsService] Error converting timestamp ${timestamp}:`, error);
                    return null;
                }
            };
            const subscriptionData = {
                stripe_id: subscription.customer,
                subscription_id: subscription.id,
                user_id: user.id,
                clerk_id: user.clerk_id,
                subscription_start_date: convertTimestampToISO(itemStartDate) || new Date().toISOString(),
                subscription_end_date: convertTimestampToISO(itemEndDate) || new Date().toISOString(),
                subscription_status: subscription.status,
                subscription_title: subscription.items?.data?.[0]?.plan?.nickname || 'Premium Subscription',
                subscription_next_billing_date: convertTimestampToISO(subscription.current_period_end) || new Date().toISOString(),
                subscription_latest_invoice_Id: subscription.latest_invoice || '',
                subscription_invoice_pdf_url: await stripe_1.default.getInvoice(subscription.latest_invoice) || '',
                subscription_canceled_at: convertTimestampToISO(subscription.canceled_at),
                product_id: productId || '',
                updated_at: new Date().toISOString(),
                subscription_cancel_at_period_end: subscription.cancel_at_period_end || false
            };
            const newSubscriptionId = subscriptionData.subscription_id;
            // Step 7: Check if subscription already exists by subscription_id (the UNIQUE KEY constraint)
            const existingSubscription = await (0, database_1.executeQuery)('SELECT subscription_id, user_id FROM subscriptions WHERE subscription_id = @subscription_id', { subscription_id: newSubscriptionId });
            const hasExistingSubscription = existingSubscription.recordset.length > 0;
            const existingRecord = hasExistingSubscription ? existingSubscription.recordset[0] : null;
            const existingSubscriptionId = existingRecord?.subscription_id;
            // Step 8: Create or update subscription in database
            if (hasExistingSubscription) {
                // Update existing subscription by subscription_id
                await (0, database_1.executeQuery)(`UPDATE subscriptions 
           SET subscription_status = @status, 
               subscription_start_date = @start_date,
               subscription_end_date = @end_date,
               subscription_next_billing_date = @next_billing,
               subscription_latest_invoice_Id = @invoice_id,
               user_id = @user_id,
               stripe_id = @stripe_id,
               clerk_id = @clerk_id,
               updated_at = @updated_at,
               subscription_cancel_at_period_end = @cancel_at_period_end
           WHERE subscription_id = @subscription_id`, {
                    status: subscriptionData.subscription_status,
                    start_date: subscriptionData.subscription_start_date,
                    end_date: subscriptionData.subscription_end_date,
                    next_billing: subscriptionData.subscription_next_billing_date,
                    invoice_id: subscriptionData.subscription_latest_invoice_Id,
                    user_id: user.id,
                    stripe_id: subscriptionData.stripe_id,
                    clerk_id: subscriptionData.clerk_id,
                    subscription_id: newSubscriptionId,
                    updated_at: new Date().toISOString(),
                    cancel_at_period_end: subscriptionData.subscription_cancel_at_period_end
                });
                console.log(`[SubscriptionsService] Updated existing subscription ${existingSubscriptionId} for user: ${user.id}`);
            }
            else {
                // Create new subscription
                await (0, database_1.executeQuery)(`INSERT INTO subscriptions (
            stripe_id, subscription_id, user_id, clerk_id, subscription_start_date, 
            subscription_end_date, subscription_status, subscription_title,
            subscription_next_billing_date, subscription_latest_invoice_Id,
            subscription_invoice_pdf_url, subscription_canceled_at, product_id, 
            created_at, updated_at, subscription_cancel_at_period_end
          ) VALUES (
            @stripe_id, @subscription_id, @user_id, @clerk_id, @start_date,
            @end_date, @status, @title,
            @next_billing, @invoice_id,
            @invoice_pdf, @canceled_at, @product_id,
            @created_at, @updated_at, @cancel_at_period_end
          )`, {
                    stripe_id: subscriptionData.stripe_id,
                    subscription_id: subscriptionData.subscription_id,
                    user_id: user.id,
                    clerk_id: subscriptionData.clerk_id,
                    start_date: subscriptionData.subscription_start_date,
                    end_date: subscriptionData.subscription_end_date,
                    status: subscriptionData.subscription_status,
                    title: subscriptionData.subscription_title,
                    next_billing: subscriptionData.subscription_next_billing_date,
                    invoice_id: subscriptionData.subscription_latest_invoice_Id,
                    invoice_pdf: subscriptionData.subscription_invoice_pdf_url,
                    canceled_at: subscriptionData.subscription_canceled_at,
                    product_id: subscriptionData.product_id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    cancel_at_period_end: subscriptionData.subscription_cancel_at_period_end
                });
                console.log(`[SubscriptionsService] Created new subscription: ${subscription.id}`);
            }
            // Step 9: Return success response
            const startISO = convertTimestampToISO(itemStartDate) || new Date().toISOString();
            const endISO = convertTimestampToISO(itemEndDate) || new Date().toISOString();
            console.log(`[SubscriptionsService] Final response dates - Start: ${startISO}, End: ${endISO}`);
            return {
                success: true,
                message: 'Subscription updated successfully',
                data: {
                    sessionId: session.id,
                    subscriptionId: subscription.id,
                    customerId: subscription.customer,
                    status: subscription.status,
                    user: {
                        id: user.id,
                        clerk_id: user.clerk_id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        stripe_id: subscription.customer
                    },
                    subscription: {
                        id: subscription.id,
                        status: subscription.status,
                        currentPeriodStart: startISO,
                        currentPeriodEnd: endISO,
                        cancelAt: convertTimestampToISO(subscription.cancel_at),
                        canceledAt: convertTimestampToISO(subscription.canceled_at),
                        subscription_invoice_pdf_url: subscriptionData.subscription_invoice_pdf_url,
                        cancelAtPeriodEnd: subscriptionData.subscription_cancel_at_period_end
                    }
                }
            };
        }
        catch (error) {
            console.error('[SubscriptionsService] Error processing checkout success:', error);
            throw error;
        }
    }
};
exports.default = exports.subscriptionsService;
//# sourceMappingURL=subscriptions.js.map