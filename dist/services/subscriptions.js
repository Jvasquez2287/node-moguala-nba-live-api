"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionsService = void 0;
const database_1 = require("../config/database");
const stripe_1 = __importDefault(require("./stripe"));
const stripe_2 = __importDefault(require("stripe"));
const stripe = new stripe_2.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-01-28.clover'
});
exports.subscriptionsService = {
    /**
     * Handle successful Stripe checkout session
     * Updates user subscription in database
     */
    async handleCheckoutSuccess(sessionId) {
        try {
            console.log(`[SubscriptionsService] Processing checkout success for session: ${sessionId}`);
            // Step 1: Retrieve the checkout session from Stripe
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (!session.subscription) {
                throw new Error('No subscription found in checkout session');
            }
            console.log(`[SubscriptionsService] Session retrieved: ${session.id}`);
            // Step 2: Get subscription details from Stripe
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            // Step 3: Get customer info
            const customer = await stripe.customers.retrieve(subscription.customer);
            console.log(`[SubscriptionsService] Customer email: ${customer.email}`);
            // Step 4: Find user by email
            let userResult = await (0, database_1.executeQuery)('SELECT id, clerk_id, email, first_name, last_name, stripe_id FROM users WHERE email = @email', { email: customer.email });
            if (!userResult.recordset || userResult.recordset.length === 0) {
                throw new Error(`User not found for email: ${customer.email}`);
            }
            const user = userResult.recordset[0];
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
                updated_at: new Date().toISOString()
            };
            console.log(`[SubscriptionsService] Prepared subscription data:`, subscriptionData);
            const newSubscriptionId = subscriptionData.subscription_id;
            // Step 7: Check if user already has a subscription
            const existingSubscription = await (0, database_1.executeQuery)('SELECT subscription_id, user_id FROM subscriptions WHERE subscription_id = @subscription_id OR user_id = @user_id', { subscription_id: newSubscriptionId, user_id: user.id });
            const hasExistingSubscription = existingSubscription.recordset.length > 0;
            const existingRecord = hasExistingSubscription ? existingSubscription.recordset[0] : null;
            const existingSubscriptionId = existingRecord?.subscription_id;
            // Step 8: Create or update subscription in database
            if (hasExistingSubscription) {
                // Update existing subscription using the subscription_id that was found
                await (0, database_1.executeQuery)(`UPDATE subscriptions 
           SET subscription_id = @subscription_id,
               subscription_status = @status, 
               subscription_start_date = @start_date,
               subscription_end_date = @end_date,
               subscription_next_billing_date = @next_billing,
               subscription_latest_invoice_Id = @invoice_id,
               user_id = @user_id,
               stripe_id = @stripe_id,
               clerk_id = @clerk_id,
               updated_at = @updated_at
           WHERE subscription_id = @existing_subscription_id`, {
                    subscription_id: subscription.id,
                    status: subscriptionData.subscription_status,
                    start_date: subscriptionData.subscription_start_date,
                    end_date: subscriptionData.subscription_end_date,
                    next_billing: subscriptionData.subscription_next_billing_date,
                    invoice_id: subscriptionData.subscription_latest_invoice_Id,
                    user_id: user.id,
                    stripe_id: subscriptionData.stripe_id,
                    clerk_id: subscriptionData.clerk_id,
                    existing_subscription_id: existingSubscriptionId,
                    updated_at: new Date().toISOString()
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
            created_at, updated_at
          ) VALUES (
            @stripe_id, @subscription_id, @user_id, @clerk_id, @start_date,
            @end_date, @status, @title,
            @next_billing, @invoice_id,
            @invoice_pdf, @canceled_at, @product_id,
            @created_at, @updated_at
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
                    updated_at: new Date().toISOString()
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
                        canceledAt: convertTimestampToISO(subscription.canceled_at)
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