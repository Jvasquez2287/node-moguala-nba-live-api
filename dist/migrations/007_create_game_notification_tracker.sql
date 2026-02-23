-- Create game_notification_tracker table for storing game notification history
-- This table tracks when game notifications are sent to prevent duplicate notifications
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'game_notification_tracker')
BEGIN
    CREATE TABLE game_notification_tracker (
        id INT PRIMARY KEY IDENTITY(1,1),
        game_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        last_sent_at DATETIME DEFAULT GETDATE(),
        UNIQUE (game_id, event_type),
        INDEX idx_game_event (game_id, event_type),
        INDEX idx_last_sent (last_sent_at)
    );
    PRINT 'Created game_notification_tracker table';
END;
