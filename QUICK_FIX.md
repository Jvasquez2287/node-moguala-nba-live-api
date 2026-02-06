# Database Permission Error - FIXED ✅

## What Was Wrong

```
Error: Cannot alter the role 'db_owner', because it does not exist or you do not have permission.
```

**Root Cause:** 
- Setup migrations (like `000_database_setup.sql`) contain admin-only SQL:
  - `CREATE LOGIN`
  - `ALTER ROLE`
  - `CREATE USER`
- Server runs as regular user `db-xur` (no admin privileges)
- Auto-running these migrations caused permission errors

---

## What We Fixed

✅ **Skip setup migrations** (000_*) from auto-execution
✅ **Only auto-run** application migrations (001_*, 002_*, etc.)
✅ **Log helpful message** telling you setup needs manual execution
✅ **Handle permission errors** gracefully

---

## What to Do Now

### Step 1: Run Setup Migration ONCE (Manually)

Choose one method:

#### Method A: SQL Server Management Studio (Easiest)
```
1. Open SQL Server Management Studio
2. Connect to 74.50.90.58 (with sa account)
3. File → Open File
4. Select: src/migrations/000_database_setup.sql
5. Click "Execute" (F5)
```

#### Method B: PowerShell
```powershell
.\setup-database.ps1 -AdminPassword "your_sa_password"
```

#### Method C: Batch File
```batch
setup-database.bat
```

#### Method D: Command Line
```bash
sqlcmd -S 74.50.90.58 -U sa -P "your_sa_password" -i "src/migrations/000_database_setup.sql"
```

### Step 2: Start Server

```bash
npm run build
npm start
```

**Expected Output:**
```
[Migrations] ℹ️ Database setup migrations require manual execution...
[Migrations] Found 2 pending migration(s)
[Migrations] Running: 001_create_tables.sql
[Migrations] ✅ Completed: 001_create_tables.sql
[Migrations] Running: 002_create_cache_tables.sql
[Migrations] ✅ Completed: 002_create_cache_tables.sql
[Migrations] ✅ All pending migrations completed successfully
[Server] ✅ Successfully listening on 0.0.0.0:8000
```

---

## Important Notes

### 📋 Setup Migrations (000_*)
- **Run:** Once, manually, as **sa/admin**
- **When:** During initial setup
- **File:** `000_database_setup.sql`
- **What:** Create database, login, user, permissions
- **Check:** Use SSMS, sqlcmd, or setup script

### 📋 Application Migrations (001_*, 002_*, etc.)
- **Run:** Automatically on server startup
- **When:** Every time you start the server
- **User:** Regular `db-xur` user (no admin needed)
- **What:** Create tables, indexes, schema changes
- **Status:** Auto-executed by the app

---

## Verify It Worked

### In SQL Server:
```sql
-- Check setup was run
SELECT COUNT(*) FROM sys.server_principals WHERE name = 'db-xur';
-- Should return: 1

-- Check tables were created
USE xur_;
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES;
-- Should show: migrations, users, subscriptions, invoices, cache, cache_locks, etc.

-- Check migration tracking
SELECT * FROM migrations;
-- Should show: 001_create_tables, 002_create_cache_tables
```

---

## Files Changed

### Modified Files
- `src/services/migrations.ts` - Skip 000_* migrations, better error handling
- `src/migrations/000_database_setup.sql` - Clear instructions that this is manual-only
- `docs/MIGRATIONS_GUIDE.md` - New comprehensive migration guide

### No Changes Needed
- `.env` - Already has correct database name
- Your application code - Everything else works as-is

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Setup migrations require manual execution" | This is normal! | Run `000_database_setup.sql` manually |
| "Cannot alter role 'db_owner'" | Setup not run yet | Execute `000_database_setup.sql` as sa |
| "Login failed for user 'db-xur'" | User not created | Execute `000_database_setup.sql` as sa |
| "Table already exists" | Migrations already ran | Delete migration records and re-run, or create fresh database |

---

## Quick Summary

```
┌────────────────────────────────────────────┐
│ 1. Run 000_database_setup.sql manually      │
│    (one time, as sa/admin)                  │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ 2. npm start                                │
│    (auto-runs 001_, 002_, migration table) │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ ✅ Server running on port 8000              │
│ ✅ All tables created                       │
│ ✅ Webhooks ready                           │
└────────────────────────────────────────────┘
```

---

## Build Status

✅ **TypeScript Build:** Successful  
✅ **Migration Service:** Updated  
✅ **Permission Handling:** Improved  
✅ **Ready to Start:** Yes  

---

**Next Command:**
```bash
npm start
```

Then check the logs - you should see the setup migration message (normal), followed by auto-executed app migrations, and the server starting successfully.

**Need Detailed Documentation?** See [docs/MIGRATIONS_GUIDE.md](docs/MIGRATIONS_GUIDE.md)
