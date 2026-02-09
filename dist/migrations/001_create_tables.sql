-- Created by GitHub Copilot in SSMS - review carefully before executing
-- SQL Server migrations for NBA API
-- Run these scripts to set up the database schema

-- Create users table for Clerk integration
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[db-xur].[users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [db-xur].[users] (
      id INT PRIMARY KEY IDENTITY(1,1),
      clerk_id VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      profile_image VARCHAR(500),
      created_at DATETIME DEFAULT GETDATE(),
      updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Create subscriptions table for Stripe integration
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[db-xur].[subscriptions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [db-xur].[subscriptions] (
      id INT PRIMARY KEY IDENTITY(1,1),
      stripe_id VARCHAR(255) UNIQUE NOT NULL,
      subscription_id VARCHAR(255) UNIQUE,
      user_id INT,
      subscription_start_date DATETIME,
      subscription_end_date DATETIME,
      subscription_status VARCHAR(50),
      subscription_title VARCHAR(255),
      subscription_next_billing_date DATETIME,
      subscription_latest_invoice_Id VARCHAR(255),
      subscription_invoice_pdf_url VARCHAR(500),
      subscription_canceled_at DATETIME,
      product_id VARCHAR(255),
      created_at DATETIME DEFAULT GETDATE(),
      updated_at DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (user_id) REFERENCES [db-xur].[users](id) ON DELETE CASCADE
    );
END
GO

-- Create invoices table for tracking Stripe invoices
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[db-xur].[invoices]') AND type in (N'U'))
BEGIN
    CREATE TABLE [db-xur].[invoices] (
      id INT PRIMARY KEY IDENTITY(1,1),
      stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
      subscription_id INT,
      stripe_customer_id VARCHAR(255),
      amount INT,
      currency VARCHAR(10),
      status VARCHAR(50),
      due_date DATETIME,
      paid_date DATETIME,
      pdf_url VARCHAR(500),
      created_at DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (subscription_id) REFERENCES [db-xur].[subscriptions](id) ON DELETE CASCADE
    );
END
GO

-- Create contacts table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[db-xur].[contacts]') AND type in (N'U'))
BEGIN
    CREATE TABLE [db-xur].[contacts] (
      id INT PRIMARY KEY IDENTITY(1,1),
      user_id INT,
      contact_type VARCHAR(50),
      contact_value VARCHAR(255),
      is_primary BIT DEFAULT 0,
      created_at DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (user_id) REFERENCES [db-xur].[users](id) ON DELETE CASCADE
    );
END
GO

-- Create user_session_infos table for tracking user sessions
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[db-xur].[user_session_infos]') AND type in (N'U'))
BEGIN
    CREATE TABLE [db-xur].[user_session_infos] (
      id INT PRIMARY KEY IDENTITY(1,1),
      user_id INT,
      session_token VARCHAR(500),
      ip_address VARCHAR(50),
      user_agent VARCHAR(500),
      expires_at DATETIME,
      created_at DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (user_id) REFERENCES [db-xur].[users](id) ON DELETE CASCADE
    );
END
GO

-- Create indexes for better query performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_clerk_id' AND object_id = OBJECT_ID('[db-xur].[users]'))
    CREATE INDEX idx_users_clerk_id ON [db-xur].[users](clerk_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_email' AND object_id = OBJECT_ID('[db-xur].[users]'))
    CREATE INDEX idx_users_email ON [db-xur].[users](email);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_subscriptions_stripe_id' AND object_id = OBJECT_ID('[db-xur].[subscriptions]'))
    CREATE INDEX idx_subscriptions_stripe_id ON [db-xur].[subscriptions](stripe_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_subscriptions_user_id' AND object_id = OBJECT_ID('[db-xur].[subscriptions]'))
    CREATE INDEX idx_subscriptions_user_id ON [db-xur].[subscriptions](user_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_invoices_stripe_customer_id' AND object_id = OBJECT_ID('[db-xur].[invoices]'))
    CREATE INDEX idx_invoices_stripe_customer_id ON [db-xur].[invoices](stripe_customer_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_invoices_subscription_id' AND object_id = OBJECT_ID('[db-xur].[invoices]'))
    CREATE INDEX idx_invoices_subscription_id ON [db-xur].[invoices](subscription_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_contacts_user_id' AND object_id = OBJECT_ID('[db-xur].[contacts]'))
    CREATE INDEX idx_contacts_user_id ON [db-xur].[contacts](user_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sessions_user_id' AND object_id = OBJECT_ID('[db-xur].[user_session_infos]'))
    CREATE INDEX idx_sessions_user_id ON [db-xur].[user_session_infos](user_id);
GO