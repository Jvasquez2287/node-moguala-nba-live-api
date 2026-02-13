"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const expoNotificationSystem_1 = __importDefault(require("../services/expoNotificationSystem"));
const tokenCheck_1 = require("../services/tokenCheck");
const database_1 = require("../config/database");
const router = express_1.default.Router();
/**
 * Register a device token for push notifications
 * POST /api/v1/notifications/register-device
 */
router.post('/register-device', async (req, res) => {
    try {
        const validationResult = await tokenCheck_1.tokenCheckService.validateTokenAndCheckSubscription(req);
        if (!validationResult.valid) {
            console.warn('[Notification Route] Invalid token validation');
            return res.json({ success: false, error: 'Unauthorized' });
        }
        const clerkId = validationResult.user?.clerk_id;
        console.log('[Notification Route] Validation result:', { valid: validationResult.valid, userClerkId: clerkId, user: validationResult.user });
        if (!clerkId) {
            console.error('[Notification Route] No clerk_id found in validation result');
            return res.json({ success: false, error: 'User ID not found' });
        }
        const { token, deviceName, osType } = req.body;
        if (!token) {
            console.warn('[Notification Route] No token provided in request body');
            return res.json({ success: false, error: 'Device token is required' });
        }
        console.log(`[Notification Route] Registering device token for user ${clerkId}:`, { token, deviceName, osType });
        const success = await expoNotificationSystem_1.default.registerDeviceToken(clerkId, token, deviceName, osType);
        if (!success) {
            console.error(`[Notification Route] Failed to register device token for user ${clerkId}:`, { token, deviceName, osType });
            return res.json({ success: false, error: 'Failed to register device token' });
        }
        console.log(`[Notification Route] Successfully registered device token for user ${clerkId}`);
        return res.json({
            success: true,
            message: 'Device token registered successfully',
            userId: clerkId
        });
    }
    catch (error) {
        console.error('[Notification Route] Error registering device:', error);
        return res.json({
            success: false,
            error: 'Failed to register device token',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Unregister a device token
 * POST /api/v1/notifications/unregister-device
 */
router.post('/unregister-device', async (req, res) => {
    try {
        const validationResult = await tokenCheck_1.tokenCheckService.validateTokenAndCheckSubscription(req);
        if (!validationResult.valid) {
            return res.json({ success: false, error: 'Unauthorized' });
        }
        const { token } = req.body;
        if (!token) {
            return res.json({ success: false, error: 'Device token is required' });
        }
        const success = await expoNotificationSystem_1.default.unregisterDeviceToken(validationResult.user?.clerk_id || '', token);
        if (!success) {
            return res.json({ success: false, error: 'Failed to unregister device token' });
        }
        return res.json({
            success: true,
            message: 'Device token unregistered successfully'
        });
    }
    catch (error) {
        console.error('[Notification Route] Error unregistering device:', error);
        return res.json({
            success: false,
            error: 'Failed to unregister device token',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Get notification history for current user
 * GET /api/v1/notifications/history?limit=50
 */
router.get('/history', async (req, res) => {
    try {
        const validationResult = await tokenCheck_1.tokenCheckService.validateTokenAndCheckSubscription(req);
        if (!validationResult.valid) {
            return res.json({ success: false, error: 'Unauthorized' });
        }
        const userId = validationResult.user?.clerk_id || '';
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const history = await expoNotificationSystem_1.default.getNotificationHistory(userId, limit);
        return res.json({
            success: true,
            data: history,
            count: history.length
        });
    }
    catch (error) {
        console.error('[Notification Route] Error getting history:', error);
        return res.json({
            success: false,
            error: 'Failed to retrieve notification history',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Get notification preferences for current user
 * GET /api/v1/notifications/preferences
 */
router.get('/preferences', async (req, res) => {
    try {
        const validationResult = await tokenCheck_1.tokenCheckService.validateTokenAndCheckSubscription(req);
        if (!validationResult.valid) {
            return res.json({ success: false, error: 'Unauthorized' });
        }
        const userId = validationResult.user?.clerk_id || '';
        const result = await (0, database_1.executeQuery)('SELECT * FROM user_notification_preferences WHERE user_id = @userId', { userId });
        const preferences = result.recordset[0] || {
            game_updates: true,
            score_updates: true,
            game_ended: true,
            bet_notifications: true,
            subscription_notifications: true,
            promotional_notifications: false,
        };
        return res.json({
            success: true,
            data: preferences
        });
    }
    catch (error) {
        console.error('[Notification Route] Error getting preferences:', error);
        return res.json({
            success: false,
            error: 'Failed to retrieve notification preferences',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Update notification preferences for current user
 * PUT /api/v1/notifications/preferences
 */
router.put('/preferences', async (req, res) => {
    try {
        const validationResult = await tokenCheck_1.tokenCheckService.validateTokenAndCheckSubscription(req);
        if (!validationResult.valid) {
            return res.json({ success: false, error: 'Unauthorized' });
        }
        const userId = validationResult.user?.clerk_id || '';
        const { gameUpdates, scoreUpdates, gameEnded, betNotifications, subscriptionNotifications, promotionalNotifications, } = req.body;
        // Check if preferences exist
        const existing = await (0, database_1.executeQuery)('SELECT id FROM user_notification_preferences WHERE user_id = @userId', { userId });
        if (existing.recordset.length > 0) {
            // Update existing
            await (0, database_1.executeQuery)(`UPDATE user_notification_preferences 
         SET game_updates = @gameUpdates,
             score_updates = @scoreUpdates,
             game_ended = @gameEnded,
             bet_notifications = @betNotifications,
             subscription_notifications = @subscriptionNotifications,
             promotional_notifications = @promotionalNotifications,
             updated_at = @now
         WHERE user_id = @userId`, {
                userId,
                gameUpdates: gameUpdates !== undefined ? gameUpdates : 1,
                scoreUpdates: scoreUpdates !== undefined ? scoreUpdates : 1,
                gameEnded: gameEnded !== undefined ? gameEnded : 1,
                betNotifications: betNotifications !== undefined ? betNotifications : 1,
                subscriptionNotifications: subscriptionNotifications !== undefined ? subscriptionNotifications : 1,
                promotionalNotifications: promotionalNotifications !== undefined ? promotionalNotifications : 0,
                now: new Date(),
            });
        }
        else {
            // Insert new
            await (0, database_1.executeQuery)(`INSERT INTO user_notification_preferences 
         (user_id, game_updates, score_updates, game_ended, bet_notifications, subscription_notifications, promotional_notifications)
         VALUES (@userId, @gameUpdates, @scoreUpdates, @gameEnded, @betNotifications, @subscriptionNotifications, @promotionalNotifications)`, {
                userId,
                gameUpdates: gameUpdates !== undefined ? gameUpdates : 1,
                scoreUpdates: scoreUpdates !== undefined ? scoreUpdates : 1,
                gameEnded: gameEnded !== undefined ? gameEnded : 1,
                betNotifications: betNotifications !== undefined ? betNotifications : 1,
                subscriptionNotifications: subscriptionNotifications !== undefined ? subscriptionNotifications : 1,
                promotionalNotifications: promotionalNotifications !== undefined ? promotionalNotifications : 0,
            });
        }
        return res.json({
            success: true,
            message: 'Notification preferences updated successfully'
        });
    }
    catch (error) {
        console.error('[Notification Route] Error updating preferences:', error);
        return res.json({
            success: false,
            error: 'Failed to update notification preferences',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Get notification statistics (admin only)
 * GET /api/v1/notifications/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const validationResult = await tokenCheck_1.tokenCheckService.validateTokenAndCheckSubscription(req);
        if (!validationResult.valid) {
            return res.json({ success: false, error: 'Unauthorized' });
        }
        // TODO: Check if user is admin
        // For now, allow any authenticated user
        const stats = await expoNotificationSystem_1.default.getNotificationStats();
        return res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('[Notification Route] Error getting stats:', error);
        return res.json({
            success: false,
            error: 'Failed to retrieve notification statistics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Get user's registered devices
 * GET /api/v1/notifications/devices
 */
router.get('/devices', async (req, res) => {
    try {
        const validationResult = await tokenCheck_1.tokenCheckService.validateTokenAndCheckSubscription(req);
        if (!validationResult.valid) {
            return res.json({ success: false, error: 'Unauthorized' });
        }
        const userId = validationResult.user?.clerk_id || '';
        const result = await (0, database_1.executeQuery)(`SELECT token, device_name, os_type, is_active, created_at, last_used 
       FROM device_tokens 
       WHERE user_id = @userId 
       ORDER BY last_used DESC`, { userId });
        return res.json({
            success: true,
            data: result.recordset,
            count: result.recordset.length
        });
    }
    catch (error) {
        console.error('[Notification Route] Error getting devices:', error);
        return res.json({
            success: false,
            error: 'Failed to retrieve registered devices',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Debug endpoint - check registration status
 * GET /api/v1/notifications/debug/check-tokens
 */
router.get('/debug/check-tokens', async (req, res) => {
    try {
        const validationResult = await tokenCheck_1.tokenCheckService.validateTokenAndCheckSubscription(req);
        if (!validationResult.valid) {
            return res.json({ success: false, error: 'Unauthorized' });
        }
        const userId = validationResult.user?.clerk_id || '';
        console.log('[Debug] Checking tokens for user:', userId);
        const result = await (0, database_1.executeQuery)(`SELECT id, token, device_name, os_type, is_active, created_at, last_used 
       FROM device_tokens 
       WHERE user_id = @userId`, { userId });
        console.log('[Debug] Query result for user tokens:', result.recordset);
        return res.json({
            success: true,
            userId,
            tokenCount: result.recordset.length,
            tokens: result.recordset.map((t) => ({
                token: t.token.substring(0, 30) + '...',
                device_name: t.device_name,
                os_type: t.os_type,
                is_active: t.is_active,
                created_at: t.created_at,
                last_used: t.last_used
            }))
        });
    }
    catch (error) {
        console.error('[Debug] Error checking tokens:', error);
        return res.json({
            success: false,
            error: 'Failed to check tokens',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Debug endpoint - check user exists in database
 * GET /api/v1/notifications/debug/check-user
 */
router.get('/debug/check-user', async (req, res) => {
    try {
        const validationResult = await tokenCheck_1.tokenCheckService.validateTokenAndCheckSubscription(req);
        if (!validationResult.valid) {
            return res.json({ success: false, error: 'Unauthorized' });
        }
        const userId = validationResult.user?.clerk_id || '';
        console.log('[Debug] Checking user info for:', userId);
        const result = await (0, database_1.executeQuery)(`SELECT id, clerk_id, email, first_name, last_name FROM users WHERE clerk_id = @userId`, { userId });
        if (result.recordset.length === 0) {
            return res.json({
                success: false,
                message: 'User not found in database',
                userId
            });
        }
        return res.json({
            success: true,
            user: result.recordset[0],
            validationResult: {
                valid: validationResult.valid,
                user: validationResult.user
            }
        });
    }
    catch (error) {
        console.error('[Debug] Error checking user:', error);
        return res.json({
            success: false,
            error: 'Failed to check user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map