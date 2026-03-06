import * as Expo from 'expo-server-sdk';
import { executeQuery } from '../config/database';
import { LiveGame } from '../types';
import { env } from 'process';
import { logServer } from './LogServer';
// Debug Server
import { sendDebugLog } from "../routes/LogServerWs";
import { date } from 'joi';

/**
 * Expo Push Notification Service
 * Manages push notifications for mobile clients
 */

interface NotificationMessage {
    to?: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
    sound?: 'default' | null;
    badge?: number;
    mutableContent?: boolean;
    categoryId?: string;
}

interface DeviceToken {
    user_id: string;
    token: string;
    device_name?: string;
    os_type?: string;
    is_active: boolean;
    created_at: Date;
    last_used: Date;
}

interface NotificationRecord {
    id?: number;
    user_id: string;
    title: string;
    body: string;
    notification_type: string;
    data?: Record<string, string>;
    sent_at: Date;
    delivery_status: 'pending' | 'sent' | 'failed';
    error_message?: string;
}

interface Team {
    teamId: number;
    teamName: string;
    teamTricode: string;
    score?: number;
    periods?: { period: number; score: number }[];
}

interface NotificationQueueGame {
    gameId: string;
    gameDate?: string;
    gameStatus: number;
    gameStatusText: string;
    period: number;
    gameClock?: string;
    gameTimeUTC: string;
    homeTeam: Team;
    awayTeam: Team;
}

class ExpoNotificationSystem {
    private expoClient: Expo.Expo;
    private readonly BATCH_SIZE = 100; // Max messages per batch
    private readonly NOTIFICATION_INTERVAL = 10000; // Check queue every 10 seconds
    private notificationQueue: Map<[string, string], any> = new Map();
    private tokenValid: boolean = false;
    private recentNotifications: Map<string, number> = new Map(); // Track sent notifications in memory
    private readonly DUPLICATE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown
    private sentQueueNotifications: Map<string, number> = new Map(); // Track sent queue notifications: key = "eventType:gameId"
    private readonly QUEUE_SENT_TTL = 24 * 60 * 60 * 1000; // 24 hours - don't resend same notification for 24 hours

    constructor() {
        const accessToken = process.env.EXPO_ACCESS_TOKEN;

        // Validate token is set
        if (!accessToken || accessToken.trim() === '') {
            console.warn('[Expo] WARNING: EXPO_ACCESS_TOKEN environment variable is not set!');
            console.warn('[Expo] Push notifications will not work. Please set EXPO_ACCESS_TOKEN in your .env file');
            console.warn('[Expo] Get your token from: https://expo.io/settings/access-tokens');
        } else {
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
    async registerDeviceToken(
        userId: string,
        token: string,
        deviceName?: string,
        osType?: string
    ): Promise<boolean> {
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
            const existing = await executeQuery(
                'SELECT token FROM device_tokens WHERE user_id = @userId AND token = @token',
                { userId, token }
            );

            if (existing.recordset.length > 0) {
                console.log('[Expo] Token already exists, updating last_used timestamp');
                // Update last_used timestamp
                await executeQuery(
                    'UPDATE device_tokens SET last_used = @now, is_active = 1 WHERE user_id = @userId AND token = @token',
                    { userId, token, now: new Date() }
                );
                console.log(`[Expo] Device token updated for user: ${userId}`);
                return true;
            }

            console.log('[Expo] Token is new, inserting into database...');

            // Insert new token
            const insertResult = await executeQuery(
                `INSERT INTO device_tokens (user_id, token, device_name, os_type, is_active, created_at, last_used)
         VALUES (@userId, @token, @deviceName, @osType, 1, @now, @now)`,
                {
                    userId,
                    token,
                    deviceName: deviceName || 'Unknown',
                    osType: osType || 'Unknown',
                    now: new Date(),
                }
            );

            console.log(`[Expo] Device token registered for user: ${userId}. Insert result:`, insertResult);

            // Verify the token was actually inserted
            const verify = await executeQuery(
                'SELECT COUNT(*) as count FROM device_tokens WHERE user_id = @userId AND token = @token',
                { userId, token }
            );
            console.log(`[Expo] Verification - tokens found for user ${userId}:`, verify.recordset[0].count);

            return true;
        } catch (error) {
            console.error('[Expo] Error registering device token:', error);
            return false;
        }
    }

    /**
     * Unregister a device token
     */
    async unregisterDeviceToken(userId: string, token: string): Promise<boolean> {
        try {
            await executeQuery(
                'UPDATE device_tokens SET is_active = 0 WHERE user_id = @userId AND token = @token',
                { userId, token }
            );
            console.log(`[Expo] Device token unregistered for user: ${userId}`);
            return true;
        } catch (error) {
            console.error('[Expo] Error unregistering device token:', error);
            return false;
        }
    }

    /**
     * Get all active device tokens for a user
     */
    async getUserTokens(userId: string): Promise<string[]> {
        try {
            console.log('[Expo] getUserTokens called for userId:', userId);

            const result = await executeQuery(
                'SELECT token FROM device_tokens WHERE user_id = @userId AND is_active = 1 ORDER BY last_used DESC',
                { userId }
            );

            console.log('[Expo] Found tokens for user:', userId, 'count:', result.recordset.length);

            if (result.recordset.length === 0) {
                console.warn('[Expo] No active tokens found for user:', userId);
            }

            const tokens = result.recordset.map((row: any) => row.token);
            console.log('[Expo] Returning tokens:', tokens.map((t: string) => t.substring(0, 20) + '...'));

            return tokens;
        } catch (error) {
            console.error('[Expo] Error retrieving user tokens:', error);
            return [];
        }
    }

    /**
     * Check if a notification was recently sent to a user (within last 5 minutes)
     * @returns true if duplicate found, false if ok to send
     */
    private async hasDuplicateRecentNotification(
        userId: string,
        notificationType: string,
        cooldownMinutes: number = 1
    ): Promise<boolean> {
        try {
            const cutoffTime = new Date();
            cutoffTime.setMinutes(cutoffTime.getMinutes() - cooldownMinutes);

            const result = await executeQuery(
                `SELECT COUNT(*) as count 
                 FROM notifications 
                 WHERE user_id = @userId 
                 AND notification_type = @notificationType 
                 AND sent_at > @cutoffTime
                 AND delivery_status IN ('sent', 'pending')`,
                { userId, notificationType, cutoffTime }
            );

            const duplicateCount = result.recordset[0]?.count || 0;
            if (duplicateCount > 0) {
                return true;
            }

            return false;
        } catch (error) {
            console.error('[Expo] Error checking for duplicate notifications:', error);
            // On error, allow sending (fail open)
            return false;
        }
    }

    /**
     * Check if a queue notification was recently sent (for a specific game+eventType)
     * Prevents resending the same game notification within 24 hours
     */
    private hasQueueNotificationBeenSent(gameId: string, eventType: string): boolean {
        const cacheKey = `${eventType}:${gameId}`;
        const lastSentTime = this.sentQueueNotifications.get(cacheKey);

        if (!lastSentTime) {
            return false;
        }

        const timeSinceLastSend = Date.now() - lastSentTime;
        if (timeSinceLastSend < this.QUEUE_SENT_TTL) {
            console.log(`[Expo] Queue notification for ${eventType}:${gameId} was already sent ${Math.round(timeSinceLastSend / 1000)}s ago, skipping`);
            return true;
        }

        // TTL expired, allow resending
        this.sentQueueNotifications.delete(cacheKey);
        return false;
    }

    /**
     * Record that a queue notification has been sent
     */
    private recordQueueNotificationSent(gameId: string, eventType: string): void {
        const cacheKey = `${eventType}:${gameId}`;
        this.sentQueueNotifications.set(cacheKey, Date.now());
        console.log(`[Expo] Recorded queue notification sent for ${cacheKey}`);
    }

    /**
     * Send a notification to a single user
     */
    async sendNotificationToUser(
        userId: string,
        title: string,
        body: string,
        notificationType: string,
        data?: Record<string, string>
    ): Promise<boolean> {
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

            const notificationRecord: NotificationRecord = {
                user_id: userId,
                title,
                body,
                notification_type: notificationType,
                data,
                sent_at: new Date(),
                delivery_status: 'pending',
            };

            return await this.sendNotificationsToTokens(
                tokens,
                title,
                body,
                notificationRecord
            );
        } catch (error) {
            console.error('[Expo] Error sending notification to user:', error);
            return false;
        }
    }

    /**
     * Send notifications to multiple tokens
     */
    async sendNotificationsToTokens(
        tokens: string[],
        title: string,
        body: string,
        notificationRecord: NotificationRecord,
        data?: Record<string, string>
    ): Promise<boolean> {
        try {
            if (tokens.length === 0) {
                console.warn('[Expo] No tokens provided for notification');
                return false;
            }

            const messages: Expo.ExpoPushMessage[] = tokens.map((token) => ({
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
                            const errorMsg = (ticket as any).message || 'Unknown error';
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
                    await this.storeTickets(ticketChunk as any, notificationRecord);
                } catch (error: any) {
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
        } catch (error) {
            console.error('[Expo] Error sending notifications to tokens:', error);
            return false;
        }
    }

    /**
     * Send notification to multiple users
     */
    async sendNotificationsToUsers(
        userIds: string[],
        title: string,
        body: string,
        notificationType: string,
        data?: Record<string, string>
    ): Promise<number> {
        let successCount = 0;

        for (const userId of userIds) {
            const success = await this.sendNotificationToUser(
                userId,
                title,
                body,
                notificationType,
                data
            );
            if (success) successCount++;
        }

        console.log(`[Expo] Sent notifications to ${successCount}/${userIds.length} users`);
        return successCount;
    }

    /**
     * Send game update notification
     */
    async sendGameUpdateNotification(
        gameId: string  ,
        homeTeam: string = '',
        awayTeam: string = '',
        score: string = '',
        eventType: 'game_started' | 'score_update' | 'game_ended' | 'new_prediction' | 'game_five_minutes_mark',
        percentage: string = "",
    ): Promise<number> {
        try {
            let title = '';
            let body = '';


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
                    const todayDateNoTime = new Date().toLocaleDateString( undefined, { month: 'short', day: 'numeric', year: 'numeric' }); 
                    title = '✨New Prediction ';
                    body = `Predictions available 🔮 - ${todayDateNoTime}` ;
                    break;
                case 'game_five_minutes_mark':
                    title = '✨Prediction Incoming ';
                    body = `${awayTeam} vs ${homeTeam} - Five minutes mark prediction will be available in 2 minutes! 🔮`;
                    break;
            }

            // Get all active users
            const query = 'SELECT DISTINCT user_id FROM device_tokens WHERE is_active = 1';
            const testQuery = 'SELECT DISTINCT user_id FROM device_tokens WHERE is_active = 1 AND user_id = \'user_2uh0Lz5DUchfzLnz4GyvWBtbd7l\'';
            const result = await executeQuery(env.USE_MOCK_DATA === 'true' ? testQuery : query);

            const userIds = result.recordset.map((row: any) => row.user_id);

            return await this.sendNotificationsToUsers(
                userIds,
                title,
                body,
                `game_${eventType}`,
                { gameId, homeTeam, awayTeam, score, percentage }
            );
        } catch (error) {
            console.error('[Expo] Error sending game update notification:', error);
            return 0;
        }
    }

    /**
     * Send subscription notification
     */
    async sendSubscriptionNotification(
        userId: string,
        eventType: 'subscription_created' | 'subscription_renewed' | 'subscription_canceled' | 'subscription_expired',
        planName?: string
    ): Promise<boolean> {
        const titles: Record<string, string> = {
            subscription_created: 'Subscription Confirmed ✅',
            subscription_renewed: 'Subscription Renewed ✅',
            subscription_canceled: 'Subscription Canceled ❌',
            subscription_expired: 'Subscription Expired ⏰',
        };

        const bodies: Record<string, string> = {
            subscription_created: `Your ${planName || 'subscription'} is now active!`,
            subscription_renewed: `Your ${planName || 'subscription'} has been renewed.`,
            subscription_canceled: `Your ${planName || 'subscription'} has been canceled.`,
            subscription_expired: `Your ${planName || 'subscription'} has expired. Renew to continue.`,
        };

        return await this.sendNotificationToUser(
            userId,
            titles[eventType],
            bodies[eventType],
            eventType,
            { planName: planName || 'Premium' }
        );
    }

    /**
     * Send bet update notification
     */
    async sendBetNotification(
        userId: string,
        betId: string,
        status: 'placed' | 'won' | 'lost' | 'push',
        amount?: string,
        winnings?: string
    ): Promise<boolean> {
        const titles: Record<string, string> = {
            placed: 'Bet Placed 🎲',
            won: 'Bet Won! 💰',
            lost: 'Bet Lost 😢',
            push: 'Bet Push 🔄',
        };

        const bodies: Record<string, string> = {
            placed: `Your bet for $${amount} has been placed.`,
            won: `Congratulations! You won $${winnings}!`,
            lost: `Your bet has lost. Try again!`,
            push: `Your bet pushed. Amount refunded.`,
        };

        return await this.sendNotificationToUser(
            userId,
            titles[status],
            bodies[status],
            `bet_${status}`,
            { betId, amount: amount || '', winnings: winnings || '' }
        );
    }

    /**
     * Send promotional notification (to multiple users)
     */
    async sendPromoNotification(
        title: string,
        body: string,
        imageUrl?: string,
        largeIconUrl?: string
    ): Promise<number> {
        try {
            const result = await executeQuery(
                'SELECT DISTINCT user_id FROM device_tokens WHERE is_active = 1'
            );

            const userIds = result.recordset.map((row: any) => row.user_id);

            return await this.sendNotificationsToUsers(
                userIds,
                title,
                body,
                'promotional',
                { imageUrl: imageUrl || '', largeIconUrl: largeIconUrl || '' }
            );
        } catch (error) {
            console.error('[Expo] Error sending promotional notification:', error);
            return 0;
        }
    }

    /**
     * Record notification in database
     */
    private async recordNotification(
        notification: NotificationRecord
    ): Promise<void> {
        try {
            const dataJson = notification.data ? JSON.stringify(notification.data) : null;

            await executeQuery(
                `INSERT INTO notifications (user_id, title, body, notification_type, data, sent_at, delivery_status, error_message)
         VALUES (@userId, @title, @body, @type, @data, @sentAt, @status, @errorMessage)`,
                {
                    userId: notification.user_id,
                    title: notification.title,
                    body: notification.body,
                    type: notification.notification_type,
                    data: dataJson,
                    sentAt: notification.sent_at,
                    status: notification.delivery_status,
                    errorMessage: notification.error_message || null,
                }
            );
        } catch (error) {
            console.error('[Expo] Error recording notification:', error);
        }
    }

    /**
     * Store Expo ticket receipts for delivery confirmation
     */
    private async storeTickets(
        tickets: Expo.ExpoPushTicket[],
        notification: NotificationRecord
    ): Promise<void> {
        try {
            for (const ticket of tickets) {
                const ticketData = ticket as any;
                if (ticketData.id) {
                    // Store ticket for later verification
                    await executeQuery(
                        `INSERT INTO notification_tickets (notification_id, ticket_id, ticket_data, created_at)
             VALUES (@notificationId, @ticketId, @ticketData, @createdAt)`,
                        {
                            notificationId: notification.id,
                            ticketId: ticketData.id,
                            ticketData: JSON.stringify(ticket),
                            createdAt: new Date(),
                        }
                    );
                }
            }
        } catch (error) {
            console.error('[Expo] Error storing tickets:', error);
        }
    }

    /**
     * Check delivery status from ticket receipts
     */
    async checkDeliveryStatus(ticketId: string): Promise<string> {
        try {
            const receipt = await this.expoClient.getPushNotificationReceiptsAsync([ticketId]);
            const result = receipt[ticketId];

            if (result && result.status) {
                return result.status;
            }

            return 'unknown';
        } catch (error) {
            console.error('[Expo] Error checking delivery status:', error);
            return 'error';
        }
    }

    /**
     * Get user's notification history
     */
    async getNotificationHistory(
        userId: string,
        limit: number = 50
    ): Promise<NotificationRecord[]> {
        try {
            const result = await executeQuery(
                `SELECT TOP (@limit) id, user_id, title, body, notification_type, data, sent_at, delivery_status
         FROM notifications
         WHERE user_id = @userId
         ORDER BY sent_at DESC`,
                { userId, limit }
            );

            return result.recordset.map((row: any) => ({
                id: row.id,
                user_id: row.user_id,
                title: row.title,
                body: row.body,
                notification_type: row.notification_type,
                data: row.data ? JSON.parse(row.data) : undefined,
                sent_at: row.sent_at,
                delivery_status: row.delivery_status,
            }));
        } catch (error) {
            console.error('[Expo] Error getting notification history:', error);
            return [];
        }
    }

    /**
     * Clean up inactive device tokens (older than 30 days)
     */
    async cleanupInactiveTokens(daysOld: number = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const result = await executeQuery(
                `DELETE FROM device_tokens WHERE last_used < @cutoffDate AND is_active = 0`,
                { cutoffDate }
            );

            const deleted = result.rowsAffected?.[0] || 0;
            console.log(`[Expo] Cleaned up ${deleted} inactive device tokens`);
            return deleted;
        } catch (error) {
            console.error('[Expo] Error cleaning up tokens:', error);
            return 0;
        }
    }

    /**
     * Get notification statistics
     */
    async getNotificationStats(): Promise<{
        totalDevices: number;
        activeDevices: number;
        totalNotificationsSent: number;
        failedNotifications: number;
    }> {
        try {
            const deviceResult = await executeQuery(
                'SELECT COUNT(*) as total FROM device_tokens'
            );
            const activeResult = await executeQuery(
                'SELECT COUNT(*) as active FROM device_tokens WHERE is_active = 1'
            );
            const sentResult = await executeQuery(
                "SELECT COUNT(*) as sent FROM notifications WHERE delivery_status = 'sent'"
            );
            const failedResult = await executeQuery(
                "SELECT COUNT(*) as failed FROM notifications WHERE delivery_status = 'failed'"
            );

            return {
                totalDevices: deviceResult.recordset[0]?.total || 0,
                activeDevices: activeResult.recordset[0]?.active || 0,
                totalNotificationsSent: sentResult.recordset[0]?.sent || 0,
                failedNotifications: failedResult.recordset[0]?.failed || 0,
            };
        } catch (error) {
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
    async getUserExpoTokens(clerkId: string): Promise<string[]> {
        try {
            const result = await executeQuery(
                'SELECT token FROM device_tokens WHERE user_id = @clerkId AND is_active = 1 ORDER BY last_used DESC',
                { clerkId }
            );
            const tokens = result.recordset.map((row: any) => row.token);
            return tokens;
        } catch (error) {
            console.error('[Expo] Error retrieving user tokens by Clerk ID:', error);
            return [];
        }
    }

    async sendTestNotificationToAllUsers(): Promise<boolean> {
        try {
            const result = await executeQuery(
                'SELECT DISTINCT user_id FROM device_tokens WHERE is_active = 1'
            );

            const userIds = result.recordset.map((row: any) => row.user_id);
            await this.sendNotificationsToUsers(
                userIds,
                'Test Notification',
                'This is a test notification from the NBA API.',
                'test_notification',
                { test: 'This is only a test' }
            );
            return true;
        } catch (error) {
            console.error('[Expo] Error sending test notification:', error);
            return false;
        }
    }

    // Start Notifications for game status changes (game started, game ended)
    private startNotifications(): void {
        /**
         * Check notification queue and process pending notifications
         * Processes notifications asynchronously and removes them after successful send
         */
        const checkNotificationQueue = async () => {
            // Skip if queue is empty
            if (this.notificationQueue.size === 0) {
                return;
            }

            const normalNotificationTime = 5000; // 5 seconds between notifications to avoid rate limits
            const predictionNotificationTime = 5 * 60 * 1000; // 5 minutes between prediction notifications

            try {
                // Process all items in the notification queue
                const entries = Array.from(this.notificationQueue.entries());
                for (const [key, notificationData] of entries) {
                    try {
                        // Destructure the tuple key: [eventType, gameId]
                        const [type, gameId] = key;

                        // Validate notification data
                        if (!notificationData || !notificationData.game) {
                            console.warn(`[Expo] Invalid notification data for game ${gameId}`);
                            this.notificationQueue.delete(key);
                            continue;
                        }

                        // Send the notification
                        const game = notificationData.game;
                        const eventType = notificationData.eventType || 'score_update';
                        const homeTeam = game.homeTeam?.teamName || 'Home Team';
                        const awayTeam = game.awayTeam?.teamName || 'Away Team';
                        const score = `${game.awayTeam?.score || 0}-${game.homeTeam?.score || 0}`;

                        await this.sendGameUpdateNotification(gameId, homeTeam, awayTeam, score, eventType);

                        // Record this notification as sent to prevent resending
                        this.recordQueueNotificationSent(gameId, eventType);

                        // Remove from queue only if successfully sent

                        this.notificationQueue.delete(key);
                        console.log(`[Expo] Notification sent and removed from queue for game ${gameId}`);
                        console.log(`\n\n\n[Expo] Queue size after processing: ${this.notificationQueue.size}\n\n\n`);
                        sendDebugLog('Expo', `[Expo] Notification sent for game ${gameId}, event type: ${eventType}, queue size: ${this.notificationQueue.size}`);

                    } catch (itemError) {
                        const itemErrorMsg = itemError instanceof Error ? itemError.message : String(itemError);
                        console.error(`[Expo] Error processing queue item:`, itemErrorMsg);
                        // Continue processing other items even if one fails
                    }

                    // Add delay between sending each notification based on event type
                    await new Promise(resolve => setTimeout(resolve, notificationData.eventType === 'new_prediction' ? predictionNotificationTime : normalNotificationTime));
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`[Expo] Error checking notification queue:`, errorMsg);
            }
        };

        // Start the periodic queue check
        setInterval(checkNotificationQueue, this.NOTIFICATION_INTERVAL);
        console.log(`[Expo] Notification queue processor started (checking every ${this.NOTIFICATION_INTERVAL}ms)`);
    }

    /**
     * Add a notification to the queue for processing
     * Queue key: [eventType, gameId]
     * Only adds if the notification hasn't been sent recently (within 24 hours)
     */
    public addToNotificationQueue(gameId: string , game: any, eventType: string): void {
        try {

            if(eventType === 'new_prediction')
            {
                console.log(`[Expo] Skipping adding new_prediction event to queue for game ${gameId} since it's triggered immediately when detected`);
                return; // Skip adding to queue for new_prediction events since they are triggered immediately when detected and not based on game status changes
            }

            // Check if this notification was recently sent (within 24 hours)
            if (this.hasQueueNotificationBeenSent(gameId, eventType)) {
                console.log(`[Expo] Skipping notification for game ${gameId}, event type ${eventType} - already sent recently`);
                return;
            }

            // Validate inputs
            if (!gameId || !game) {
                console.warn('[Expo] Invalid parameters for addToNotificationQueue');
                return;
            }

            const gameFormatted: NotificationQueueGame = {
                gameId: game.gameId,
                gameDate: game.gameDate,
                gameStatus: game.gameStatus,
                gameStatusText: game.gameStatusText,
                period: game.period,
                gameClock: game.gameClock,
                gameTimeUTC: game.gameTimeUTC,
                homeTeam: {
                    teamId: game.homeTeam?.teamId,
                    teamName: game.homeTeam?.teamName,
                    score: game.homeTeam?.score,
                    teamTricode: game.homeTeam?.teamTricode
                },
                awayTeam: {
                    teamId: game.awayTeam?.teamId,
                    teamName: game.awayTeam?.teamName,
                    score: game.awayTeam?.score,
                    teamTricode: game.awayTeam?.teamTricode
                }
            };

            const key: [string, string] = [eventType, gameId]; // Use eventType + gameId as unique  
            if (this.notificationQueue.has(key)) {
                return;
            }

            this.notificationQueue.set(key, {
                game: gameFormatted,
                eventType,
                addedAt: new Date()
            });

            console.log(`[Expo] Added notification to queue for game ${gameId}, event type: ${eventType}`);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('[Expo] Error adding notification to queue:', errorMsg);
        }
    }

    /**
     * Start processing the notification queue
     * Should be called once on application startup
     */
    async startQueueCheck(): Promise<void> {
        this.startNotifications();
    }

    async stopQueueCheck(): Promise<void> {
        this.notificationQueue.clear();
        console.log('[Expo] stopQueueCheck called - notification queue cleared and processing stopped');
    }

}

// Export singleton instance
export default new ExpoNotificationSystem();
