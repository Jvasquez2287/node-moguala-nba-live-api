-- ====================================================================
-- WARNING: This is a SETUP ONLY migration
-- It requires SQL Server Administrator/sa privileges
-- Run this MANUALLY using SQL Server Management Studio or sqlcmd
-- This file should NOT be auto-executed by the application
-- ====================================================================
-- 
-- DO NOT USE: This migration is meant for initial database setup only
-- 
-- Instructions:
-- 1. Open SQL Server Management Studio
-- 2. Connect to 74.50.90.58 with sa account
-- 3. Open this file and Execute (F5)
-- 4. Or run: sqlcmd -S 74.50.90.58 -U sa -P "password" -i "000_database_setup.sql"
--
-- ====================================================================

-- Create database
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = 'xur_')
BEGIN
    CREATE DATABASE xur_;
    PRINT 'Database xur_ created successfully';
END
ELSE
BEGIN
    PRINT 'Database xur_ already exists';
END;
GO

-- Create login (as sa only)
USE master;
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'db-xur')
BEGIN
    CREATE LOGIN [db-xur] WITH PASSWORD = 'Ava+112511@';
    PRINT 'Login db-xur created';
END
ELSE
BEGIN
    PRINT 'Login db-xur already exists';
END;
GO

-- Switch to application database and create user
USE xur_;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db-xur')
BEGIN
    CREATE USER [db-xur] FOR LOGIN [db-xur];
    PRINT 'User db-xur created in xur_';
END
ELSE
BEGIN
    PRINT 'User db-xur already exists in xur_';
END;
GO

-- Grant permissions
ALTER ROLE db_owner ADD MEMBER [db-xur];
PRINT 'db-xur granted db_owner role';
GO

-- Verify setup
PRINT '';
PRINT '====== SETUP COMPLETE ======';
PRINT 'Database: xur_';
PRINT 'User: db-xur';
PRINT 'Role: db_owner';
PRINT 'Status: Ready for application use';
GO
