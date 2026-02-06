"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrationService = void 0;
const database_1 = require("../config/database");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
exports.migrationService = {
    /**
     * Get all migration files from migrations directory
     */
    async getMigrationFiles() {
        const migrationsDir = path_1.default.join(__dirname, '..', 'migrations');
        const files = fs_1.default.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();
        return files.map(filename => ({
            filename,
            content: fs_1.default.readFileSync(path_1.default.join(migrationsDir, filename), 'utf-8')
        }));
    },
    /**
     * Create migrations tracking table
     */
    async createMigrationsTable() {
        try {
            // Use SQL Server's TRY/CATCH to suppress the "already exists" error
            const createQuery = `
        BEGIN TRY
          IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'migrations' AND TABLE_SCHEMA = 'dbo'
          )
          CREATE TABLE migrations (
            id INT PRIMARY KEY IDENTITY(1,1),
            migration VARCHAR(255) UNIQUE NOT NULL,
            batch INT,
            executed_at DATETIME DEFAULT GETDATE()
          );
        END TRY
        BEGIN CATCH
          -- Suppress "already exists" error (error number 2714)
          IF ERROR_NUMBER() != 2714
            THROW;
        END CATCH;
      `;
            await (0, database_1.executeQuery)(createQuery, {});
            console.log('[Migrations] ✅ Migrations table ready');
        }
        catch (error) {
            // Ignore the "already exists" error gracefully - expected on subsequent runs
            const errStr = String(error);
            if (errStr.includes('already') || errStr.includes('2714')) {
                console.log('[Migrations] Migrations table already exists (skipping)');
                return;
            }
            console.error('[Migrations] Error creating migrations table:', error);
            throw error;
        }
    },
    /**
     * Get executed migrations
     */
    async getExecutedMigrations() {
        try {
            const result = await (0, database_1.executeQuery)('SELECT migration FROM migrations ORDER BY batch, executed_at', {});
            return result.recordset || [];
        }
        catch (error) {
            console.error('[Migrations] Error getting executed migrations:', error);
            return [];
        }
    },
    /**
     * Run pending migrations
     */
    async runPendingMigrations() {
        try {
            console.log('[Migrations] Starting migration check...');
            // Create migrations table
            await this.createMigrationsTable();
            // Get all migration files and executed migrations
            const migrationFiles = await this.getMigrationFiles();
            const executedMigrations = await this.getExecutedMigrations();
            const executedNames = executedMigrations.map((m) => m.migration);
            // Find pending migrations (skip 000_* setup migrations - require admin permissions)
            const setupMigrations = migrationFiles.filter(m => m.filename.startsWith('000_'));
            if (setupMigrations.length > 0) {
                console.log('[Migrations] ℹ️ Database setup migrations require manual execution as administrator:');
                setupMigrations.forEach(m => {
                    console.log(`[Migrations]   - ${m.filename}`);
                });
            }
            const pendingMigrations = migrationFiles.filter(m => !executedNames.includes(m.filename) && !m.filename.startsWith('000_'));
            if (pendingMigrations.length === 0) {
                console.log('[Migrations] ✅ All migrations are up to date');
                return;
            }
            console.log(`[Migrations] Found ${pendingMigrations.length} pending migration(s)`);
            // Execute pending migrations
            for (const migration of pendingMigrations) {
                try {
                    console.log(`[Migrations] Running: ${migration.filename}`);
                    // Split the migration content by GO statements (SQL Server batch separator)
                    const batches = migration.content
                        .split(/\bGO\b/i)
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                    // Execute each batch
                    for (const batch of batches) {
                        if (batch.length > 0) {
                            await (0, database_1.executeQuery)(batch, {});
                        }
                    }
                    // Record migration as executed
                    await (0, database_1.executeQuery)('INSERT INTO migrations (migration, batch) VALUES (@migration, @batch)', {
                        migration: migration.filename,
                        batch: executedMigrations.length + 1
                    });
                    console.log(`[Migrations] ✅ Completed: ${migration.filename}`);
                }
                catch (error) {
                    console.error(`[Migrations] ❌ Failed to execute ${migration.filename}:`, error);
                    throw error;
                }
            }
            console.log('[Migrations] ✅ All pending migrations completed successfully');
        }
        catch (error) {
            console.error('[Migrations] Error running migrations:', error);
            throw error;
        }
    },
    /**
     * Reset all migrations (useful for development/testing)
     * WARNING: This will drop all tables!
     */
    async resetMigrations() {
        try {
            const query = `
        -- Drop all foreign key constraints
        DECLARE @constraint NVARCHAR(MAX);
        DECLARE constraint_cursor CURSOR FOR
          SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE REFERENCED_TABLE_NAME IS NOT NULL;
        OPEN constraint_cursor;
        FETCH NEXT FROM constraint_cursor INTO @constraint;
        WHILE @@FETCH_STATUS = 0
        BEGIN
          EXEC('ALTER TABLE ' + @constraint + ' DROP CONSTRAINT ' + @constraint);
          FETCH NEXT FROM constraint_cursor INTO @constraint;
        END;
        CLOSE constraint_cursor;
        DEALLOCATE constraint_cursor;
        
        -- Drop all tables
        DECLARE @table NVARCHAR(MAX);
        DECLARE table_cursor CURSOR FOR
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
        OPEN table_cursor;
        FETCH NEXT FROM table_cursor INTO @table;
        WHILE @@FETCH_STATUS = 0
        BEGIN
          EXEC('DROP TABLE ' + @table);
          FETCH NEXT FROM table_cursor INTO @table;
        END;
        CLOSE table_cursor;
        DEALLOCATE table_cursor;
      `;
            await (0, database_1.executeQuery)(query, {});
            console.log('[Migrations] ✅ All tables dropped');
        }
        catch (error) {
            console.error('[Migrations] Error resetting migrations:', error);
            throw error;
        }
    }
};
exports.default = exports.migrationService;
//# sourceMappingURL=migrations.js.map