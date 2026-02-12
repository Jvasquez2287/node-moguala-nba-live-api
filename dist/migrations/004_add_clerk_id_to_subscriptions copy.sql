-- Migration: Add clerk_id column to subscriptions table
-- Purpose: Link subscriptions directly to Clerk user IDs for faster queries

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'clerk_id'
)
BEGIN
    ALTER TABLE [db-xur].[subscriptions]
    ADD clerk_id VARCHAR(255) NULL;
    
    PRINT 'Added clerk_id column to subscriptions table';
END
ELSE
BEGIN
    PRINT 'clerk_id column already exists in subscriptions table';
END
GO

-- Create index on clerk_id for better query performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_subscriptions_clerk_id' AND object_id = OBJECT_ID('[db-xur].[subscriptions]'))
BEGIN
    CREATE INDEX idx_subscriptions_clerk_id ON [db-xur].[subscriptions](clerk_id);
    PRINT 'Created index idx_subscriptions_clerk_id';
END
ELSE
BEGIN
    PRINT 'Index idx_subscriptions_clerk_id already exists';
END
GO
