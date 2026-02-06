-- Created by GitHub Copilot in SSMS - review carefully before executing
-- Add Stripe ID column to users table for Stripe integration
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='db-xur' AND TABLE_NAME='users' AND COLUMN_NAME='stripe_id')
BEGIN
    ALTER TABLE [db-xur].[users]
    ADD stripe_id VARCHAR(255) UNIQUE NULL;
    
    CREATE INDEX idx_users_stripe_id ON [db-xur].[users](stripe_id);
    
    PRINT 'Added stripe_id column to users table';
END
ELSE
BEGIN
    PRINT 'stripe_id column already exists in users table';
END
GO