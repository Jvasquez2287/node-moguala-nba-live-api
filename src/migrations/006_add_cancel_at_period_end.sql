-- Migration to add cancel_at_period_end column to subscriptions table
-- This column tracks whether a subscription will be canceled at the end of the current billing period

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[db-xur].[subscriptions]') AND name = 'subscription_cancel_at_period_end')
BEGIN
    ALTER TABLE [db-xur].[subscriptions]
    ADD subscription_cancel_at_period_end BIT DEFAULT 0;
    
    PRINT 'Column subscription_cancel_at_period_end added to subscriptions table';
END
ELSE
BEGIN
    PRINT 'Column subscription_cancel_at_period_end already exists in subscriptions table';
END
GO
