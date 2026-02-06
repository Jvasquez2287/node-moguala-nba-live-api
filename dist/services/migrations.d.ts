interface MigrationFile {
    filename: string;
    content: string;
}
export declare const migrationService: {
    /**
     * Get all migration files from migrations directory
     */
    getMigrationFiles(): Promise<MigrationFile[]>;
    /**
     * Create migrations tracking table
     */
    createMigrationsTable(): Promise<void>;
    /**
     * Get executed migrations
     */
    getExecutedMigrations(): Promise<any[]>;
    /**
     * Run pending migrations
     */
    runPendingMigrations(): Promise<void>;
    /**
     * Reset all migrations (useful for development/testing)
     * WARNING: This will drop all tables!
     */
    resetMigrations(): Promise<void>;
};
export default migrationService;
//# sourceMappingURL=migrations.d.ts.map