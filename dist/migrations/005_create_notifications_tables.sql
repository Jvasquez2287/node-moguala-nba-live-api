-- Create device_tokens table for storing mobile device push notification tokens
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'device_tokens')
BEGIN
    CREATE TABLE device_tokens (
        id INT PRIMARY KEY IDENTITY(1,1),
        user_id VARCHAR(255) NOT NULL,
        token VARCHAR(500) NOT NULL UNIQUE,
        device_name VARCHAR(255),
        os_type VARCHAR(50),
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        last_used DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES users(clerk_id) ON DELETE CASCADE,
        INDEX idx_user_active (user_id, is_active),
        INDEX idx_last_used (last_used)
    );
    PRINT 'Created device_tokens table';
END;

-- Create notifications table for storing notification history
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'notifications')
BEGIN
    CREATE TABLE notifications (
        id INT PRIMARY KEY IDENTITY(1,1),
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body VARCHAR(MAX) NOT NULL,
        notification_type VARCHAR(100) NOT NULL,
        data NVARCHAR(MAX),
        sent_at DATETIME DEFAULT GETDATE(),
        delivery_status VARCHAR(50) DEFAULT 'pending',
        error_message VARCHAR(MAX),
        FOREIGN KEY (user_id) REFERENCES users(clerk_id) ON DELETE CASCADE,
        INDEX idx_user_sent (user_id, sent_at),
        INDEX idx_type_status (notification_type, delivery_status)
    );
    PRINT 'Created notifications table';
END;

-- Create notification_tickets table for storing Expo push ticket receipts
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'notification_tickets')
BEGIN
    CREATE TABLE notification_tickets (
        id INT PRIMARY KEY IDENTITY(1,1),
        notification_id INT,
        ticket_id VARCHAR(255) NOT NULL UNIQUE,
        ticket_data NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE(),
        checked_at DATETIME,
        INDEX idx_ticket (ticket_id),
        INDEX idx_created (created_at)
    );
    PRINT 'Created notification_tickets table';
END;

-- Create user_notification_preferences table for user notification settings
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'user_notification_preferences')
BEGIN
    CREATE TABLE user_notification_preferences (
        id INT PRIMARY KEY IDENTITY(1,1),
        user_id VARCHAR(255) NOT NULL UNIQUE,
        game_updates BIT DEFAULT 1,
        score_updates BIT DEFAULT 1,
        game_ended BIT DEFAULT 1,
        bet_notifications BIT DEFAULT 1,
        subscription_notifications BIT DEFAULT 1,
        promotional_notifications BIT DEFAULT 0,
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES users(clerk_id) ON DELETE CASCADE
    );
    PRINT 'Created user_notification_preferences table';
END;
