-- ====================================================================
-- SQL Server migration: Create cache tables
-- This migration creates the cache tables for session and data caching
-- ====================================================================

-- Create cache table for storing cached values
IF OBJECT_ID('db-xur.cache', 'U') IS NULL
BEGIN
  CREATE TABLE cache (
    [key] VARCHAR(255) PRIMARY KEY,
    [value] NVARCHAR(MAX),
    expiration INT
  );
  PRINT 'Created table: cache';
END
ELSE
BEGIN
  PRINT 'Table cache already exists';
END;
GO

-- Create cache_locks table for distributed locking
IF OBJECT_ID('db-xur.cache_locks', 'U') IS NULL
BEGIN
  CREATE TABLE cache_locks (
    [key] VARCHAR(255) PRIMARY KEY,
    owner VARCHAR(255),
    expiration INT
  );
  PRINT 'Created table: cache_locks';
END
ELSE
BEGIN
  PRINT 'Table cache_locks already exists';
END;
GO

-- Create indexes for better query performance
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cache_expiration')
BEGIN
  CREATE INDEX idx_cache_expiration ON cache(expiration);
  PRINT 'Created index: idx_cache_expiration';
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cache_locks_expiration')
BEGIN
  CREATE INDEX idx_cache_locks_expiration ON cache_locks(expiration);
  PRINT 'Created index: idx_cache_locks_expiration';
END;
GO

PRINT '';
PRINT '====== MIGRATION COMPLETE ======';
PRINT 'Cache tables created successfully';
GO
