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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = require("../services/stripe");
const router = express_1.default.Router();
/**
 * GET /api/v1/subscriptions
 * List all subscriptions for a customer
 * Query params: customerId (required)
 */
router.get('/', async (req, res) => {
    try {
        const { customerId } = req.query;
        if (!customerId) {
            return res.status(400).json({ error: 'customerId is required' });
        }
        const subscription = await stripe_1.stripeService.getSubscriptionFromDB(customerId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        res.json({
            success: true,
            data: subscription
        });
    }
    catch (error) {
        console.error('[Subscriptions] Error fetching subscriptions:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
});
/**
 * GET /api/v1/subscriptions/:subscriptionId
 * Get a specific subscription by ID
 */
router.get('/:subscriptionId', async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        if (!subscriptionId) {
            return res.status(400).json({ error: 'subscriptionId is required' });
        }
        const subscription = await stripe_1.stripeService.getSubscriptionFromDB(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        res.json({
            success: true,
            data: subscription
        });
    }
    catch (error) {
        console.error('[Subscriptions] Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});
/**
 * POST /api/v1/subscriptions
 * Create a new subscription
 * Body: { customerId, priceId/productId, name }
 */
router.post('/', async (req, res) => {
    try {
        const { customerId, priceId, productId, name } = req.body;
        if (!customerId || (!priceId && !productId)) {
            return res.status(400).json({ error: 'customerId and (priceId or productId) are required' });
        }
        const subscriptions = await stripe_1.stripeService.getUsersSubscription();
        const subscription = subscriptions.find((sub) => sub.customer === customerId);
        const subscriptionData = {
            stripe_id: customerId,
            subscription_id: subscription?.id || '',
            subscription_start_date: new Date(),
            subscription_end_date: new Date(),
            subscription_status: subscription?.status || 'active',
            subscription_title: name || 'Premium Subscription',
            subscription_next_billing_date: new Date(),
            subscription_latest_invoice_Id: '',
            subscription_invoice_pdf_url: '',
            subscription_canceled_at: null,
            product_id: productId || ''
        };
        await stripe_1.stripeService.createSubscriptionInDB(subscriptionData);
        res.status(201).json({
            success: true,
            data: subscriptionData
        });
    }
    catch (error) {
        console.error('[Subscriptions] Error creating subscription:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});
/**
 * DELETE /api/v1/subscriptions/:subscriptionId
 * Cancel a subscription
 */
router.delete('/:subscriptionId', async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        if (!subscriptionId) {
            return res.status(400).json({ error: 'subscriptionId is required' });
        }
        // Update subscription status to canceled
        const subscription = await stripe_1.stripeService.getSubscriptionFromDB(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        const { executeQuery } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        await executeQuery('UPDATE subscriptions SET subscription_status = @status, subscription_canceled_at = @now WHERE subscription_id = @subId', { status: 'canceled', now: new Date(), subId: subscriptionId });
        res.json({
            success: true,
            message: 'Subscription canceled'
        });
    }
    catch (error) {
        console.error('[Subscriptions] Error deleting subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});
exports.default = router;
//# sourceMappingURL=subscriptions.js.map