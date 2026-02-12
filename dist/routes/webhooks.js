"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = require("../services/stripe");
const clerk_1 = require("../services/clerk");
const database_1 = require("../config/database");
const router = express_1.default.Router();
// Apply raw body parser to this router for Stripe webhook signature verification
router.use(express_1.default.raw({ type: 'application/json' }));
// Get Stripe webhook secret lazily
function getStripeWebhookSecret() {
    const secret = process.env.NODE_ENV !== "development" ? process.env.STRIPE_WEBHOOK_SECRET : 'whsec_hSsvZEGxeBSNZanAKvzbXsvTiyT13aLP';
    if (!secret) {
        throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
    }
    return secret;
}
router.get('/stripe-delete-all-subscription', async (req, res) => {
    try {
        await (0, database_1.executeQuery)('DELETE FROM subscriptions');
        // Delete all from stripe as well (for testing purposes only - be careful with this in production!)
        const subscriptions = await stripe_1.stripeService.getAllSubscriptionsFromStripe();
        for (const sub of subscriptions) {
            await (0, stripe_1.getStripeClient)().subscriptions.cancel(sub.id);
        }
        return res.json({ success: true, message: 'All subscriptions deleted' });
    }
    catch (error) {
        console.error('Error deleting subscriptions:', error);
        return res.json({ success: false, error: 'Failed to delete subscriptions' });
    }
});
/**
 * Stripe Webhook endpoint
 * Handles: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
 */
router.post('/stripe', async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        const event = (0, stripe_1.getStripeClient)().webhooks.constructEvent(req.body, sig, getStripeWebhookSecret());
        console.log(`[Webhook] Received Stripe event: ${event.type}`);
        const data = event.data.object;
        switch (event.type) {
            case 'customer.subscription.created': {
                const productData = await stripe_1.stripeService.getProductsByID(data.items.data[0].plan.product);
                const subscriptionData = {
                    stripe_id: data.customer,
                    subscription_id: data.id,
                    subscription_start_date: new Date(data.current_period_start * 1000),
                    subscription_end_date: new Date(data.current_period_end * 1000),
                    subscription_status: data.status,
                    subscription_title: productData.name,
                    subscription_next_billing_date: new Date(data.current_period_end * 1000),
                    subscription_latest_invoice_Id: data.latest_invoice || '',
                    subscription_invoice_pdf_url: await stripe_1.stripeService.getInvoice(data.latest_invoice) || '',
                    subscription_canceled_at: null,
                    product_id: data.items.data[0].plan.product
                };
                // Check if subscription already exists
                const existing = await stripe_1.stripeService.getSubscriptionFromDB(data.customer);
                if (existing) {
                    await stripe_1.stripeService.updateSubscriptionInDB(data.customer, subscriptionData);
                }
                else {
                    await stripe_1.stripeService.createSubscriptionInDB(subscriptionData);
                }
                console.log(`[Webhook] Subscription created for customer: ${data.customer}`);
                return res.json({ received: true });
            }
            case 'customer.subscription.updated': {
                const productData = await stripe_1.stripeService.getProductsByID(data.items.data[0].plan.product);
                const subscriptionData = {
                    stripe_id: data.customer,
                    subscription_id: data.id,
                    subscription_start_date: new Date(data.current_period_start * 1000),
                    subscription_end_date: new Date(data.current_period_end * 1000),
                    subscription_status: data.status,
                    subscription_title: productData.name,
                    subscription_next_billing_date: new Date(data.current_period_end * 1000),
                    subscription_latest_invoice_Id: data.latest_invoice || '',
                    subscription_invoice_pdf_url: await stripe_1.stripeService.getInvoice(data.latest_invoice) || '',
                    subscription_canceled_at: data.canceled_at ? new Date(data.canceled_at * 1000) : null,
                    product_id: data.items.data[0].plan.product
                };
                await stripe_1.stripeService.updateSubscriptionInDB(data.customer, subscriptionData);
                console.log(`[Webhook] Subscription updated for customer: ${data.customer} - Status: ${data.status}`);
                return res.json({ received: true });
            }
            case 'customer.subscription.deleted': {
                await (0, database_1.executeQuery)('UPDATE subscriptions SET subscription_canceled_at = @now WHERE stripe_id = @stripeId', { now: new Date(), stripeId: data.customer });
                console.log(`[Webhook] Subscription deleted for customer: ${data.customer}`);
                return res.json({ received: true });
            }
            case 'invoice.paid': {
                console.log(`[Webhook] Invoice paid: ${data.id}`);
                return res.json({ received: true });
            }
            case 'invoice.payment_failed': {
                console.log(`[Webhook] Invoice payment failed: ${data.id}`);
                return res.json({ received: true });
            }
            default:
                console.log(`[Webhook] Unhandled Stripe event: ${event.type}`);
                return res.json({ received: true });
        }
    }
    catch (error) {
        console.error('[Webhook] Stripe webhook error:', error);
        return res.json({ error: 'Webhook processing failed' });
    }
});
router.get('/stripe', async (req, res) => {
    try {
        return res.json({
            success: true,
            message: 'Stripe webhook endpoint is working'
        });
    }
    catch (error) {
        console.error('Error in Stripe test endpoint:', error);
        return res.json({
            success: false,
            error: 'Failed to process request',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Clerk Webhook endpoint
 * Handles: user.created, user.updated, user.deleted
 */
router.post('/clerk', async (req, res) => {
    try {
        console.log('[Webhook] Received Clerk event');
        const event = await clerk_1.clerkService.verifyWebhook(req);
        if (!event) {
            console.warn('[Webhook] Invalid Clerk webhook signature');
            return res.json({ error: 'Invalid webhook signature' });
        }
        const { type, data } = event;
        switch (type) {
            case 'user.created': {
                await clerk_1.clerkService.handleUserCreated(data);
                return res.json({ received: true });
            }
            case 'user.updated': {
                await clerk_1.clerkService.handleUserUpdated(data);
                return res.json({ received: true });
            }
            case 'user.deleted': {
                await clerk_1.clerkService.handleUserDeleted(data.id);
                return res.json({ received: true });
            }
            case 'session.created': {
                await clerk_1.clerkService.handleSessionCreated(data);
                return res.json({ received: true });
            }
            case 'session.ended': {
                await clerk_1.clerkService.handleSessionEnded(data);
                return res.json({ received: true });
            }
            case 'session.renewed': {
                await clerk_1.clerkService.handleSessionRenewed(data);
                return res.json({ received: true });
            }
            default:
                console.log(`[Webhook] Unhandled Clerk event: ${type}`);
                return res.json({ received: true });
        }
    }
    catch (error) {
        console.error('[Webhook] Clerk webhook error:', error);
        return res.json({ error: 'Webhook processing failed', errorMessage: error instanceof Error ? error.message : 'Unknown error' });
    }
});
router.get('/clerk/users/:email', async (req, res) => {
    try {
        const email = req.params.email;
        console.log(`[Test] Fetching user info for email: ${email}`);
        const user = await clerk_1.clerkService.getUserByEmail(email);
        if (!user) {
            return res.json({
                success: false,
                error: 'User not found',
                email: email
            });
        }
        return res.json({
            success: true,
            user: {
                id: user.id,
                clerk_id: user.clerk_id,
                stripe_id: user.stripe_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                profile_image: user.profile_image,
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        return res.json({
            success: false,
            error: 'Failed to fetch user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/clerk', async (req, res) => {
    try {
        return res.json({
            success: true,
            message: 'Clerk webhook endpoint is working'
        });
    }
    catch (error) {
        console.error('Error in Clerk test endpoint:', error);
        return res.json({
            success: false,
            error: 'Failed to process request',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/clerk/cusers/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const user = await clerk_1.clerkService.getUserFromClerkAPI(email);
        return res.json({
            success: true,
            users: user
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        return res.json({
            success: false,
            error: 'Failed to fetch users',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=webhooks.js.map