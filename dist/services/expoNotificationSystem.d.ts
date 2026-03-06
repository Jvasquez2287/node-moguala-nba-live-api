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
declare class ExpoNotificationSystem {
    private expoClient;
    private readonly BATCH_SIZE;
    private readonly NOTIFICATION_INTERVAL;
    private notificationQueue;
    private tokenValid;
    private recentNotifications;
    private readonly DUPLICATE_COOLDOWN_MS;
    private sentQueueNotifications;
    private readonly QUEUE_SENT_TTL;
    constructor();
    /**
     * Register a device token for push notifications
     */
    registerDeviceToken(userId: string, token: string, deviceName?: string, osType?: string): Promise<boolean>;
    /**
     * Unregister a device token
     */
    unregisterDeviceToken(userId: string, token: string): Promise<boolean>;
    /**
     * Get all active device tokens for a user
     */
    getUserTokens(userId: string): Promise<string[]>;
    /**
     * Check if a notification was recently sent to a user (within last 5 minutes)
     * @returns true if duplicate found, false if ok to send
     */
    private hasDuplicateRecentNotification;
    /**
     * Check if a queue notification was recently sent (for a specific game+eventType)
     * Prevents resending the same game notification within 24 hours
     */
    private hasQueueNotificationBeenSent;
    /**
     * Record that a queue notification has been sent
     */
    private recordQueueNotificationSent;
    /**
     * Send a notification to a single user
     */
    sendNotificationToUser(userId: string, title: string, body: string, notificationType: string, data?: Record<string, string>): Promise<boolean>;
    /**
     * Send notifications to multiple tokens
     */
    sendNotificationsToTokens(tokens: string[], title: string, body: string, notificationRecord: NotificationRecord, data?: Record<string, string>): Promise<boolean>;
    /**
     * Send notification to multiple users
     */
    sendNotificationsToUsers(userIds: string[], title: string, body: string, notificationType: string, data?: Record<string, string>): Promise<number>;
    /**
     * Send game update notification
     */
    sendGameUpdateNotification(gameId: string, homeTeam: string | undefined, awayTeam: string | undefined, score: string | undefined, eventType: 'game_started' | 'score_update' | 'game_ended' | 'new_prediction' | 'game_five_minutes_mark', percentage?: string): Promise<number>;
    /**
     * Send subscription notification
     */
    sendSubscriptionNotification(userId: string, eventType: 'subscription_created' | 'subscription_renewed' | 'subscription_canceled' | 'subscription_expired', planName?: string): Promise<boolean>;
    /**
     * Send bet update notification
     */
    sendBetNotification(userId: string, betId: string, status: 'placed' | 'won' | 'lost' | 'push', amount?: string, winnings?: string): Promise<boolean>;
    /**
     * Send promotional notification (to multiple users)
     */
    sendPromoNotification(title: string, body: string, imageUrl?: string, largeIconUrl?: string): Promise<number>;
    /**
     * Record notification in database
     */
    private recordNotification;
    /**
     * Store Expo ticket receipts for delivery confirmation
     */
    private storeTickets;
    /**
     * Check delivery status from ticket receipts
     */
    checkDeliveryStatus(ticketId: string): Promise<string>;
    /**
     * Get user's notification history
     */
    getNotificationHistory(userId: string, limit?: number): Promise<NotificationRecord[]>;
    /**
     * Clean up inactive device tokens (older than 30 days)
     */
    cleanupInactiveTokens(daysOld?: number): Promise<number>;
    /**
     * Get notification statistics
     */
    getNotificationStats(): Promise<{
        totalDevices: number;
        activeDevices: number;
        totalNotificationsSent: number;
        failedNotifications: number;
    }>;
    /**
     *
     * @returns Get user's tokens by Clerk Id
     */
    getUserExpoTokens(clerkId: string): Promise<string[]>;
    sendTestNotificationToAllUsers(): Promise<boolean>;
    private startNotifications;
    /**
     * Add a notification to the queue for processing
     * Queue key: [eventType, gameId]
     * Only adds if the notification hasn't been sent recently (within 24 hours)
     */
    addToNotificationQueue(gameId: string, game: any, eventType: string): void;
    /**
     * Start processing the notification queue
     * Should be called once on application startup
     */
    startQueueCheck(): Promise<void>;
    stopQueueCheck(): Promise<void>;
}
declare const _default: ExpoNotificationSystem;
export default _default;
//# sourceMappingURL=expoNotificationSystem.d.ts.map