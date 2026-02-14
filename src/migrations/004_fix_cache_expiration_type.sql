-- ====================================================================
-- SQL Server migration: Fix cache table expiration data type
-- Change expiration column from INT to BIGINT to handle large timestamps
-- ====================================================================

-- Drop indexes that depend on the expiration column
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cache_expiration')
BEGIN
  DROP INDEX idx_cache_expiration ON cache;
  PRINT 'Dropped index: idx_cache_expiration';
END;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cache_locks_expiration')
BEGIN
  DROP INDEX idx_cache_locks_expiration ON cache_locks;
  PRINT 'Dropped index: idx_cache_locks_expiration';
END;
GO

-- Alter cache table expiration column to BIGINT
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('db-xur.cache') AND name = 'expiration')
BEGIN
  ALTER TABLE cache ALTER COLUMN expiration BIGINT;
  PRINT 'Altered cache table: changed expiration column to BIGINT';
END;
GO

-- Alter cache_locks table expiration column to BIGINT
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('db-xur.cache_locks') AND name = 'expiration')
BEGIN
  ALTER TABLE cache_locks ALTER COLUMN expiration BIGINT;
  PRINT 'Altered cache_locks table: changed expiration column to BIGINT';
END;
GO

-- Recreate indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cache_expiration')
BEGIN
  CREATE INDEX idx_cache_expiration ON cache(expiration);
  PRINT 'Recreated index: idx_cache_expiration';
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cache_locks_expiration')
BEGIN
  CREATE INDEX idx_cache_locks_expiration ON cache_locks(expiration);
  PRINT 'Recreated index: idx_cache_locks_expiration';
END;
GO