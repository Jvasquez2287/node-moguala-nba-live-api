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
const Expo = __importStar(require("expo-server-sdk"));
const database_1 = require("../config/database");
class ExpoNotificationSystem {
    constructor() {
        this.BATCH_SIZE = 100; // Max messages per batch
        this.tokenValid = false;
        const accessToken = process.env.EXPO_ACCESS_TOKEN;
        // Validate token is set
        if (!accessToken || accessToken.trim() === '') {
            console.warn('[Expo] WARNING: EXPO_ACCESS_TOKEN environment variable is not set!');
            console.warn('[Expo] Push notifications will not work. Please set EXPO_ACCESS_TOKEN in your .env file');
            console.warn('[Expo] Get your token from: https://expo.io/settings/access-tokens');
        }
        else {
            this.tokenValid = true;
            console.log(`[Expo] Notification system initialized with access token: ${accessToken.substring(0, 10)}...`);
        }
        this.expoClient = new Expo.Expo({
            accessToken: accessToken || 'missing-token',
        });
    }
    /**
     * Register a device token for push notifications
     */
    async registerDeviceToken(userId, token, deviceName, osType) {
        try {
            console.log('[Expo] registerDeviceToken called with userId:', userId, 'token:', token?.substring(0, 20) + '...');
            // Validate userId
            if (!userId || userId.trim() === '') {
                console.error('[Expo] userId is empty or undefined');
                return false;
            }
            // Validate token format
            if (!Expo.Expo.isExpoPushToken(token)) {
                console.warn(`[Expo] Invalid push token format: ${token}`);
                return false;
            }
            console.log('[Expo] Token format is valid, checking if token already exists...');
            // Check if token already exists
            const existing = await (0, database_1.executeQuery)('SELECT token FROM device_tokens WHERE user_id = @userId AND token = @token', { userId, token });
            if (existing.recordset.length > 0) {
                console.log('[Expo] Token already exists, updating last_used timestamp');
                // Update last_used timestamp
                await (0, database_1.executeQuery)('UPDATE device_tokens SET last_used = @now, is_active = 1 WHERE user_id = @userId AND token = @token', { userId, token, now: new Date() });
                console.log(`[Expo] Device token updated for user: ${userId}`);
                return true;
            }
            console.log('[Expo] Token is new, inserting into database...');
            // Insert new token
            const insertResult = await (0, database_1.executeQuery)(`INSERT INTO device_tokens (user_id, token, device_name, os_type, is_active, created_at, last_used)
         VALUES (@userId, @token, @deviceName, @osType, 1, @now, @now)`, {
                userId,
                token,
                deviceName: deviceName || 'Unknown',
                osType: osType || 'Unknown',
                now: new Date(),
            });
            console.log(`[Expo] Device token registered for user: ${userId}. Insert result:`, insertResult);
            // Verify the token was actually inserted
            const verify = await (0, database_1.executeQuery)('SELECT COUNT(*) as count FROM device_tokens WHERE user_id = @userId AND token = @token', { userId, token });
            console.log(`[Expo] Verification - tokens found for user ${userId}:`, verify.recordset[0].count);
            return true;
        }
        catch (error) {
            console.error('[Expo] Error registering device token:', error);
            return false;
        }
    }
    /**
     * Unregister a device token
     */
    async unregisterDeviceToken(userId, token) {
        try {
            await (0, database_1.executeQuery)('UPDATE device_tokens SET is_active = 0 WHERE user_id = @userId AND token = @token', { userId, token });
            console.log(`[Expo] Device token unregistered for user: ${userId}`);
            return true;
        }
        catch (error) {
            console.error('[Expo] Error unregistering device token:', error);
            return false;
        }
    }
    /**
     * Get all active device tokens for a user
     */
    async getUserTokens(userId) {
        try {
            console.log('[Expo] getUserTokens called for userId:', userId);
            const result = await (0, database_1.executeQuery)('SELECT token FROM device_tokens WHERE user_id = @userId AND is_active = 1 ORDER BY last_used DESC', { userId });
            console.log('[Expo] Found tokens for user:', userId, 'count:', result.recordset.length);
            if (result.recordset.length === 0) {
                console.warn('[Expo] No active tokens found for user:', userId);
            }
            const tokens = result.recordset.map((row) => row.token);
            console.log('[Expo] Returning tokens:', tokens.map((t) => t.substring(0, 20) + '...'));
            return tokens;
        }
        catch (error) {
            console.error('[Expo] Error retrieving user tokens:', error);
            return [];
        }
    }
    /**
     * Check if a notification was recently sent to a user (within last 5 minutes)
     * @returns true if duplicate found, false if ok to send
     */
    async hasDuplicateRecentNotification(userId, notificationType, cooldownMinutes = 5) {
        try {
            const cutoffTime = new Date();
            cutoffTime.setMinutes(cutoffTime.getMinutes() - cooldownMinutes);
            const result = await (0, database_1.executeQuery)(`SELECT COUNT(*) as count 
                 FROM notifications 
                 WHERE user_id = @userId 
                 AND notification_type = @notificationType 
                 AND sent_at > @cutoffTime
                 AND delivery_status IN ('sent', 'pending')`, { userId, notificationType, cutoffTime });
            const duplicateCount = result.recordset[0]?.count || 0;
            if (duplicateCount > 0) {
                console.log(`[Expo] Skipping duplicate notification - User: ${userId}, ` +
                    `Type: ${notificationType}, ` +
                    `Recent count: ${duplicateCount} (sent within last ${cooldownMinutes} minutes)`);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('[Expo] Error checking for duplicate notifications:', error);
            // On error, allow sending (fail open)
            return false;
        }
    }
    /**
     * Send a notification to a single user
     */
    async sendNotificationToUser(userId, title, body, notificationType, data) {
        try {
            // Check if token is configured before attempting to send
            if (!this.tokenValid) {
                console.warn('[Expo] Cannot send notification - EXPO_ACCESS_TOKEN is not configured');
                return false;
            }
            // Check for recent duplicate notifications (within 5 minutes)
            const hasDuplicate = await this.hasDuplicateRecentNotification(userId, notificationType);
            if (hasDuplicate) {
                console.log(`[Expo] Skipped duplicate notification for user ${userId} (type: ${notificationType})`);
                return false;
            }
            const tokens = await this.getUserTokens(userId);
            if (tokens.length === 0) {
                console.warn(`[Expo] No active tokens found for user: ${userId}`);
                return false;
            }
            const notificationRecord = {
                user_id: userId,
                title,
                body,
                notification_type: notificationType,
                data,
                sent_at: new Date(),
                delivery_status: 'pending',
            };
            return await this.sendNotificationsToTokens(tokens, title, body, notificationRecord);
        }
        catch (error) {
            console.error('[Expo] Error sending notification to user:', error);
            return false;
        }
    }
    /**
     * Send notifications to multiple tokens
     */
    async sendNotificationsToTokens(tokens, title, body, notificationRecord, data) {
        try {
            if (tokens.length === 0) {
                console.warn('[Expo] No tokens provided for notification');
                return false;
            }
            const messages = tokens.map((token) => ({
                to: token,
                sound: 'default',
                title,
                body,
                data: data || notificationRecord.data || {},
                badge: 1,
                mutableContent: true,
            }));
            // Send in batches
            let allSuccessful = true;
            for (let i = 0; i < messages.length; i += this.BATCH_SIZE) {
                const batch = messages.slice(i, i + this.BATCH_SIZE);
                try {
                    const ticketChunk = await this.expoClient.sendPushNotificationsAsync(batch);
                    // Log receipt tickets
                    for (const ticket of ticketChunk) {
                        if (ticket.status === 'error') {
                            const errorMsg = ticket.message || 'Unknown error';
                            console.error('[Expo] Ticket error:', errorMsg);
                            // Detect FCM-specific errors
                            if (errorMsg.includes('FCM server key') || errorMsg.includes('FCM') || errorMsg.includes('Firebase')) {
                                console.error('[Expo] ========== FCM CONFIGURATION ERROR ==========');
                                console.error('[Expo] This error typically means:');
                                console.error('[Expo] 1. Firebase Cloud Messaging (FCM) credentials are not configured in Expo');
                                console.error('[Expo] 2. FCM credentials are invalid or expired');
                                console.error('[Expo] 3. Android app is not properly registered with Firebase');
                                console.error('[Expo]');
                                console.error('[Expo] To fix this:');
                                console.error('[Expo] 1. Create a Firebase project: https://console.firebase.google.com/');
                                console.error('[Expo] 2. Register your Android app with Firebase');
                                console.error('[Expo] 3. Generate FCM Server Key from Firebase Console');
                                console.error('[Expo] 4. Upload FCM credentials to Expo: https://expo.dev/');
                                console.error('[Expo] 5. Rebuild your Android app with: eas build --platform android');
                                console.error('[Expo] 6. Full guide: See docs/FCM_SETUP_GUIDE.md');
                                console.error('[Expo] =============================================');
                            }
                            allSuccessful = false;
                            notificationRecord.delivery_status = 'failed';
                            notificationRecord.error_message = errorMsg;
                        }
                    }
                    // Store tickets for later delivery confirmation
                    await this.storeTickets(ticketChunk, notificationRecord);
                }
                catch (error) {
                    console.error('[Expo] Error sending batch:', error);
                    const errorMsg = error.message || 'Unknown error';
                    // Check for authentication error
                    if (error.code === 'AUTHENTICATION_ERROR' || error.statusCode === 401) {
                        console.error('[Expo] ========== AUTHENTICATION ERROR ==========');
                        console.error('[Expo] Invalid or missing EXPO_ACCESS_TOKEN');
                        console.error('[Expo] Please verify your access token is set in environment variables');
                        console.error('[Expo] Get a valid token from: https://expo.io/settings/access-tokens');
                        console.error('[Expo] ===========================================');
                    }
                    // Check for FCM-related errors in batch catch block
                    if (errorMsg.includes('FCM server key') || errorMsg.includes('FCM') || errorMsg.includes('Firebase')) {
                        console.error('[Expo] ========== FCM CONFIGURATION ERROR ==========');
                        console.error('[Expo] This error typically means:');
                        console.error('[Expo] 1. Firebase Cloud Messaging (FCM) credentials are not configured in Expo');
                        console.error('[Expo] 2. FCM credentials are invalid or expired');
                        console.error('[Expo] 3. Android app is not properly registered with Firebase');
                        console.error('[Expo]');
                        console.error('[Expo] To fix this:');
                        console.error('[Expo] 1. Create a Firebase project: https://console.firebase.google.com/');
                        console.error('[Expo] 2. Register your Android app with Firebase');
                        console.error('[Expo] 3. Generate FCM Server Key from Firebase Console');
                        console.error('[Expo] 4. Upload FCM credentials to Expo: https://expo.dev/');
                        console.error('[Expo] 5. Rebuild your Android app with: eas build --platform android');
                        console.error('[Expo] 6. Full guide: See docs/FCM_SETUP_GUIDE.md');
                        console.error('[Expo] =============================================');
                    }
                    allSuccessful = false;
                    notificationRecord.delivery_status = 'failed';
                    notificationRecord.error_message = errorMsg;
                }
            }
            if (allSuccessful) {
                notificationRecord.delivery_status = 'sent';
            }
            // Record notification in database
            await this.recordNotification(notificationRecord);
            return allSuccessful;
        }
        catch (error) {
            console.error('[Expo] Error sending notifications to tokens:', error);
            return false;
        }
    }
    /**
     * Send notification to multiple users
     */
    async sendNotificationsToUsers(userIds, title, body, notificationType, data) {
        let successCount = 0;
        for (const userId of userIds) {
            const success = await this.sendNotificationToUser(userId, title, body, notificationType, data);
            if (success)
                successCount++;
        }
        console.log(`[Expo] Sent notifications to ${successCount}/${userIds.length} users`);
        return successCount;
    }
    /**
     * Send game update notification
     */
    async sendGameUpdateNotification(gameId, homeTeam, awayTeam, score, eventType, percentage = "") {
        try {
            let title = '';
            let body = '';
            if (process.env.USE_MOCK_DATA === 'true') {
                return 0;
            }
            return 0;
            switch (eventType) {
                case 'game_started':
                    title = 'Game Started 🏀';
                    body = `${awayTeam} vs ${homeTeam} - Tip off!`;
                    break;
                case 'score_update':
                    title = 'Score Update 🏀';
                    body = `${awayTeam} vs ${homeTeam} - ${score}`;
                    break;
                case 'game_ended':
                    title = 'Game Ended 🏀';
                    body = `Final: ${awayTeam} vs ${homeTeam} - ${score}`;
                    break;
                case 'new_prediction':
                    title = '✨New Prediction ';
                    body = `${awayTeam} vs ${homeTeam} - New prediction available! 🔮`;
                    break;
                case 'game_five_minutes_mark':
                    title = '✨Prediction Incoming ';
                    body = `${awayTeam} vs ${homeTeam} - Five minutes mark prediction will be available in 2 minutes! 🔮`;
                    break;
            }
            // Get all active users
            const result = await (0, database_1.executeQuery)('SELECT DISTINCT user_id FROM device_tokens WHERE is_active = 1');
            const userIds = result.recordset.map((row) => row.user_id);
            return await this.sendNotificationsToUsers(userIds, title, body, `game_${eventType}`, { gameId, homeTeam, awayTeam, score, percentage });
        }
        catch (error) {
            console.error('[Expo] Error sending game update notification:', error);
            return 0;
        }
    }
    /**
     * Send subscription notification
     */
    async sendSubscriptionNotification(userId, eventType, planName) {
        const titles = {
            subscription_created: 'Subscription Confirmed ✅',
            subscription_renewed: 'Subscription Renewed ✅',
            subscription_canceled: 'Subscription Canceled ❌',
            subscription_expired: 'Subscription Expired ⏰',
        };
        const bodies = {
            subscription_created: `Your ${planName || 'subscription'} is now active!`,
            subscription_renewed: `Your ${planName || 'subscription'} has been renewed.`,
            subscription_canceled: `Your ${planName || 'subscription'} has been canceled.`,
            subscription_expired: `Your ${planName || 'subscription'} has expired. Renew to continue.`,
        };
        return await this.sendNotificationToUser(userId, titles[eventType], bodies[eventType], eventType, { planName: planName || 'Premium' });
    }
    /**
     * Send bet update notification
     */
    async sendBetNotification(userId, betId, status, amount, winnings) {
        const titles = {
            placed: 'Bet Placed 🎲',
            won: 'Bet Won! 💰',
            lost: 'Bet Lost 😢',
            push: 'Bet Push 🔄',
        };
        const bodies = {
            placed: `Your bet for $${amount} has been placed.`,
            won: `Congratulations! You won $${winnings}!`,
            lost: `Your bet has lost. Try again!`,
            push: `Your bet pushed. Amount refunded.`,
        };
        return await this.sendNotificationToUser(userId, titles[status], bodies[status], `bet_${status}`, { betId, amount: amount || '', winnings: winnings || '' });
    }
    /**
     * Send promotional notification (to multiple users)
     */
    async sendPromoNotification(title, body, imageUrl, largeIconUrl) {
        try {
            const result = await (0, database_1.executeQuery)('SELECT DISTINCT user_id FROM device_tokens WHERE is_active = 1');
            const userIds = result.recordset.map((row) => row.user_id);
            return await this.sendNotificationsToUsers(userIds, title, body, 'promotional', { imageUrl: imageUrl || '', largeIconUrl: largeIconUrl || '' });
        }
        catch (error) {
            console.error('[Expo] Error sending promotional notification:', error);
            return 0;
        }
    }
    /**
     * Record notification in database
     */
    async recordNotification(notification) {
        try {
            const dataJson = notification.data ? JSON.stringify(notification.data) : null;
            await (0, database_1.executeQuery)(`INSERT INTO notifications (user_id, title, body, notification_type, data, sent_at, delivery_status, error_message)
         VALUES (@userId, @title, @body, @type, @data, @sentAt, @status, @errorMessage)`, {
                userId: notification.user_id,
                title: notification.title,
                body: notification.body,
                type: notification.notification_type,
                data: dataJson,
                sentAt: notification.sent_at,
                status: notification.delivery_status,
                errorMessage: notification.error_message || null,
            });
        }
        catch (error) {
            console.error('[Expo] Error recording notification:', error);
        }
    }
    /**
     * Store Expo ticket receipts for delivery confirmation
     */
    async storeTickets(tickets, notification) {
        try {
            for (const ticket of tickets) {
                const ticketData = ticket;
                if (ticketData.id) {
                    // Store ticket for later verification
                    await (0, database_1.executeQuery)(`INSERT INTO notification_tickets (notification_id, ticket_id, ticket_data, created_at)
             VALUES (@notificationId, @ticketId, @ticketData, @createdAt)`, {
                        notificationId: notification.id,
                        ticketId: ticketData.id,
                        ticketData: JSON.stringify(ticket),
                        createdAt: new Date(),
                    });
                }
            }
        }
        catch (error) {
            console.error('[Expo] Error storing tickets:', error);
        }
    }
    /**
     * Check delivery status from ticket receipts
     */
    async checkDeliveryStatus(ticketId) {
        try {
            const receipt = await this.expoClient.getPushNotificationReceiptsAsync([ticketId]);
            const result = receipt[ticketId];
            if (result && result.status) {
                return result.status;
            }
            return 'unknown';
        }
        catch (error) {
            console.error('[Expo] Error checking delivery status:', error);
            return 'error';
        }
    }
    /**
     * Get user's notification history
     */
    async getNotificationHistory(userId, limit = 50) {
        try {
            const result = await (0, database_1.executeQuery)(`SELECT TOP (@limit) id, user_id, title, body, notification_type, data, sent_at, delivery_status
         FROM notifications
         WHERE user_id = @userId
         ORDER BY sent_at DESC`, { userId, limit });
            return result.recordset.map((row) => ({
                id: row.id,
                user_id: row.user_id,
                title: row.title,
                body: row.body,
                notification_type: row.notification_type,
                data: row.data ? JSON.parse(row.data) : undefined,
                sent_at: row.sent_at,
                delivery_status: row.delivery_status,
            }));
        }
        catch (error) {
            console.error('[Expo] Error getting notification history:', error);
            return [];
        }
    }
    /**
     * Clean up inactive device tokens (older than 30 days)
     */
    async cleanupInactiveTokens(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            const result = await (0, database_1.executeQuery)(`DELETE FROM device_tokens WHERE last_used < @cutoffDate AND is_active = 0`, { cutoffDate });
            const deleted = result.rowsAffected?.[0] || 0;
            console.log(`[Expo] Cleaned up ${deleted} inactive device tokens`);
            return deleted;
        }
        catch (error) {
            console.error('[Expo] Error cleaning up tokens:', error);
            return 0;
        }
    }
    /**
     * Get notification statistics
     */
    async getNotificationStats() {
        try {
            const deviceResult = await (0, database_1.executeQuery)('SELECT COUNT(*) as total FROM device_tokens');
            const activeResult = await (0, database_1.executeQuery)('SELECT COUNT(*) as active FROM device_tokens WHERE is_active = 1');
            const sentResult = await (0, database_1.executeQuery)("SELECT COUNT(*) as sent FROM notifications WHERE delivery_status = 'sent'");
            const failedResult = await (0, database_1.executeQuery)("SELECT COUNT(*) as failed FROM notifications WHERE delivery_status = 'failed'");
            return {
                totalDevices: deviceResult.recordset[0]?.total || 0,
                activeDevices: activeResult.recordset[0]?.active || 0,
                totalNotificationsSent: sentResult.recordset[0]?.sent || 0,
                failedNotifications: failedResult.recordset[0]?.failed || 0,
            };
        }
        catch (error) {
            console.error('[Expo] Error getting notification stats:', error);
            return {
                totalDevices: 0,
                activeDevices: 0,
                totalNotificationsSent: 0,
                failedNotifications: 0,
            };
        }
    }
    /**
     *
     * @returns Get user's tokens by Clerk Id
     */
    async getUserExpoTokens(clerkId) {
        try {
            const result = await (0, database_1.executeQuery)('SELECT token FROM device_tokens WHERE user_id = @clerkId AND is_active = 1 ORDER BY last_used DESC', { clerkId });
            const tokens = result.recordset.map((row) => row.token);
            return tokens;
        }
        catch (error) {
            console.error('[Expo] Error retrieving user tokens by Clerk ID:', error);
            return [];
        }
    }
    async sendTestNotificationToAllUsers() {
        try {
            const result = await (0, database_1.executeQuery)('SELECT DISTINCT user_id FROM device_tokens WHERE is_active = 1');
            const userIds = result.recordset.map((row) => row.user_id);
            await this.sendNotificationsToUsers(userIds, 'Test Notification', 'This is a test notification from the NBA API.', 'test_notification', { test: 'This is only a test' });
            return true;
        }
        catch (error) {
            console.error('[Expo] Error sending test notification:', error);
            return false;
        }
    }
}
// Export singleton instance
exports.default = new ExpoNotificationSystem();
//# sourceMappingURL=expoNotificationSystem.js.map