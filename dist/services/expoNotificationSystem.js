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
        this.expoClient = new Expo.Expo({
            accessToken: process.env.EXPO_ACCESS_TOKEN,
        });
        console.log('[Expo] Notification system initialized');
    }
    /**
     * Register a device token for push notifications
     */
    async registerDeviceToken(userId, token, deviceName, osType) {
        try {
            // Validate token format
            if (!Expo.Expo.isExpoPushToken(token)) {
                console.warn(`[Expo] Invalid push token format: ${token}`);
                return false;
            }
            // Check if token already exists
            const existing = await (0, database_1.executeQuery)('SELECT token FROM device_tokens WHERE user_id = @userId AND token = @token', { userId, token });
            if (existing.recordset.length > 0) {
                // Update last_used timestamp
                await (0, database_1.executeQuery)('UPDATE device_tokens SET last_used = @now, is_active = 1 WHERE user_id = @userId AND token = @token', { userId, token, now: new Date() });
                console.log(`[Expo] Device token updated for user: ${userId}`);
                return true;
            }
            // Insert new token
            await (0, database_1.executeQuery)(`INSERT INTO device_tokens (user_id, token, device_name, os_type, is_active, created_at, last_used)
         VALUES (@userId, @token, @deviceName, @osType, 1, @now, @now)`, {
                userId,
                token,
                deviceName: deviceName || 'Unknown',
                osType: osType || 'Unknown',
                now: new Date(),
            });
            console.log(`[Expo] Device token registered for user: ${userId}`);
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
            const result = await (0, database_1.executeQuery)('SELECT token FROM device_tokens WHERE user_id = @userId AND is_active = 1 ORDER BY last_used DESC', { userId });
            return result.recordset.map((row) => row.token);
        }
        catch (error) {
            console.error('[Expo] Error retrieving user tokens:', error);
            return [];
        }
    }
    /**
     * Send a notification to a single user
     */
    async sendNotificationToUser(userId, title, body, notificationType, data) {
        try {
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
                            console.error('[Expo] Ticket error:', ticket.message);
                            allSuccessful = false;
                            notificationRecord.delivery_status = 'failed';
                            notificationRecord.error_message = ticket.message;
                        }
                    }
                    // Store tickets for later delivery confirmation
                    await this.storeTickets(ticketChunk, notificationRecord);
                }
                catch (error) {
                    console.error('[Expo] Error sending batch:', error);
                    allSuccessful = false;
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
    async sendGameUpdateNotification(gameId, homeTeam, awayTeam, score, eventType) {
        try {
            let title = '';
            let body = '';
            switch (eventType) {
                case 'game_started':
                    title = 'Game Started 🏀';
                    body = `${awayTeam} @ ${homeTeam} - Tip off!`;
                    break;
                case 'score_update':
                    title = 'Score Update 🏀';
                    body = `${awayTeam} vs ${homeTeam} - ${score}`;
                    break;
                case 'game_ended':
                    title = 'Game Ended 🏀';
                    body = `Final: ${awayTeam} vs ${homeTeam} - ${score}`;
                    break;
            }
            // Get all active users
            const result = await (0, database_1.executeQuery)('SELECT DISTINCT user_id FROM device_tokens WHERE is_active = 1');
            const userIds = result.recordset.map((row) => row.user_id);
            return await this.sendNotificationsToUsers(userIds, title, body, `game_${eventType}`, { gameId, homeTeam, awayTeam, score });
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
}
// Export singleton instance
exports.default = new ExpoNotificationSystem();
//# sourceMappingURL=expoNotificationSystem.js.map