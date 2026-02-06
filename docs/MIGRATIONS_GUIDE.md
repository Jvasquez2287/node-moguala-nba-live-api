# Setup Migrations vs Application Migrations

## Problem Fixed

The error "Cannot alter the role 'db_owner'" occurred because:

1. **Setup migrations** (like `000_database_setup.sql`) require **SQL Server Administrator** privileges
2. These contain privileged operations: `CREATE LOGIN`, `ALTER ROLE`, etc.
3. The application runs as regular user `db-xur` which doesn't have these permissions
4. Auto-running setup migrations on app startup caused permission errors

## Solution

We now **skip** setup migrations (files starting with `000_`) from automatic execution.

### Migration Types

#### 1. Setup Migrations (require Admin - `000_*.sql`)
- **Run:** Manually, once, using sa/admin account
- **Time:** During initial database setup
- **Tool:** SQL Server Management Studio, sqlcmd, or setup script
- **Examples:**
  - `000_database_setup.sql` - Create database, login, user, permissions
  - `000_create_initial_schema.sql` - Initial tables (when needed)

#### 2. Application Migrations (auto-run - `001_*.sql`, `002_*.sql`, etc.)
- **Run:** Automatically on app startup
- **Time:** Every time server starts
- **Permissions:** Regular user (`db-xur`)
- **Examples:**
  - `001_create_tables.sql` - Create tables
  - `002_create_cache_tables.sql` - Add cache support
  - Add more as needed for new features

---

## What Happens Now

### Server Startup Flow

```
✅ Connect to database (xur_)
✅ Check if migrations table exists
✅ Find 000_* setup migrations (skip these)
   ℹ️ Log: "Database setup migrations require manual execution..."
✅ Find 001_*, 002_*, etc. (run these)
✅ Execute pending app migrations
✅ Track execution in migrations table
✅ Start server listening on port 8000
```

### When You See This
```
[Migrations] ℹ️ Database setup migrations require manual execution as administrator:
[Migrations]   - 000_database_setup.sql
[Migrations] Found 2 pending migration(s)
[Migrations] Running: 001_create_tables.sql
[Migrations] ✅ Completed: 001_create_tables.sql
[Migrations] Running: 002_create_cache_tables.sql
[Migrations] ✅ Completed: 002_create_cache_tables.sql
[Migrations] ✅ All pending migrations completed successfully
```

This is **normal and expected**! ✅

---

## How to Run Setup Migrations

### Option 1: SQL Server Management Studio (Easiest)
```
1. Open SQL Server Management Studio
2. Connect to: 74.50.90.58
3. File → Open File
4. Select: src/migrations/000_database_setup.sql
5. Click "Execute" button (F5)
6. Check for "Setup complete" in output
```

### Option 2: PowerShell Script
```powershell
.\setup-database.ps1 -AdminPassword "your_sa_password"
```

### Option 3: Batch Script
```batch
setup-database.bat
```
Then enter sa password when prompted.

### Option 4: Command Line (sqlcmd)
```bash
sqlcmd -S 74.50.90.58 -U sa -P "your_sa_password" -i "src/migrations/000_database_setup.sql"
```

---

## Status Check

### Are setup migrations already run?

```sql
-- Connect as sa to check:
SELECT COUNT(*) as [Login Count]
FROM sys.server_principals 
WHERE name = 'db-xur';

-- Should return: 1 (meaning login exists)

-- List all users in database:
SELECT name FROM sys.database_principals 
WHERE type = 'U' AND name = 'db-xur';

-- Should return: db-xur (meaning user exists)
```

### Check database exists
```sql
SELECT name FROM sys.databases 
WHERE name = 'xur_';

-- Should return: xur_
```

---

## File Locations

```
src/migrations/
├── 000_database_setup.sql          ← Run manually (admin required)
├── 001_create_tables.sql           ← Auto-run (app startup)
└── 002_create_cache_tables.sql     ← Auto-run (app startup)
```

---

## Troubleshooting

### "Setup migrations require manual execution" - This is normal ✅
- Just run `000_database_setup.sql` once manually
- After that, ignore this message on future app restarts

### "Cannot alter the role 'db_owner'"
- The setup migration didn't run
- **Solution:** Run `000_database_setup.sql` manually as sa

### "Login failed for user 'db-xur'"
- User and login don't exist yet
- **Solution:** Run `000_database_setup.sql` manually as sa

### "Permission denied to create table"
- Database setup incomplete or user doesn't have permissions
- **Solution:** Run `000_database_setup.sql` manually as sa

---

## Quick Start (After System Setup)

```bash
# 1. Run setup migration ONCE (manually)
# - Use SSMS or sqlcmd to execute 000_database_setup.sql

# 2. Build and start server
npm run build
npm start

# 3. Server will auto-run 001_*, 002_*, etc.
# ✅ Done! Server is ready
```

---

## For Developers

### Adding New Migrations

1. Create new file: `src/migrations/00X_description.sql`
   - Use numbers: 001, 002, 003, etc.
   - **Don't** use 000 (reserved for setup)

2. Write migration SQL (normal user permissions needed):
   ```sql
   CREATE TABLE my_table (
     id INT PRIMARY KEY IDENTITY(1,1),
     name VARCHAR(255)
   );
   GO
   ```

3. Restart server - migration auto-runs
   ```bash
   npm start
   ```

4. Server logs show:
   ```
   [Migrations] Running: 00X_description.sql
   [Migrations] ✅ Completed: 00X_description.sql
   ```

### Rolling Back Migrations

If needed, manually drop tables:
```sql
DROP TABLE [table_name];

-- Then remove from migrations table:
DELETE FROM migrations WHERE migration = '00X_description.sql';
```

---

## Architecture Summary

```
┌─────────────────────────────────────┐
│   Application Startup               │
└──────────────┬──────────────────────┘
               │
         ┌─────▼────────┐
         │Connect to DB │
         └─────┬────────┘
               │
      ┌────────▼────────────┐
      │ Run Migrations?     │
      └────────┬────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────────┐   ┌──────────────────┐
│Setup (000_) │   │App (001_,002_,...) │
│Skip (admin) │   │Auto-run (user)   │
└─────────────┘   └──────────────────┘
    │ (manual)        │ (automatic)
    │                 │
    └────────┬────────┘
             │
      ┌──────▼──────┐
      │ Server Up   │
      │ Port 8000   │
      └─────────────┘
```

---

## Next Steps

1. ✅ Understand setup vs app migrations
2. ✅ Run `000_database_setup.sql` manually (once) as sa
3. ✅ Start server: `npm start`
4. ✅ Server auto-runs 001_*, 002_*, etc.
5. ✅ Add new migrations by creating new 00X files

---

**Status:** Setup separation implemented ✅

Setup migrations now skip auto-execution and log a helpful message.
App migrations auto-run as before.
