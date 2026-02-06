# 🚨 Database Initialization Required

## Error: Cannot find the object "dbo.users"

**Status:** Your database schema hasn't been created yet.

## Quick Fix - Choose One Method:

### ✅ Method 1: SQL Server Management Studio (Recommended)

1. Open **SQL Server Management Studio (SSMS)**
2. Click **File → Open → File**
3. Navigate to: `c:\xampp\htdocs\nba-api.local\src\migrations\000_database_setup.sql`
4. Click **Execute** (or press F5)
5. Wait for completion (should see "Database xur_ created successfully")
6. Then run: `c:\xampp\htdocs\nba-api.local\src\migrations\001_create_tables.sql`
7. Then run: `c:\xampp\htdocs\nba-api.local\src\migrations\002_create_cache_tables.sql`
8. Then run: `c:\xampp\htdocs\nba-api.local\src\migrations\003_add_stripe_to_users.sql`

### ✅ Method 2: PowerShell Command Line

Open PowerShell **as Administrator** and run:

```powershell
# Run the setup migration (must use SA account)
sqlcmd -S 74.50.90.58 -U sa -P "Ava+112511@" -i "c:\xampp\htdocs\nba-api.local\src\migrations\000_database_setup.sql"

# Run other migrations (will use db-xur user from connection string)
sqlcmd -S 74.50.90.58 -U db-xur -P "Ava+112511@" -d xur_ -i "c:\xampp\htdocs\nba-api.local\src\migrations\001_create_tables.sql"
sqlcmd -S 74.50.90.58 -U db-xur -P "Ava+112511@" -d xur_ -i "c:\xampp\htdocs\nba-api.local\src\migrations\002_create_cache_tables.sql"
sqlcmd -S 74.50.90.58 -U db-xur -P "Ava+112511@" -d xur_ -i "c:\xampp\htdocs\nba-api.local\src\migrations\003_add_stripe_to_users.sql"
```

### ✅ Method 3: Using Batch File (Easiest)

Create a file named `run-migrations.bat` in the root folder with this content:

```batch
@echo off
REM Run all migrations
echo ========================================
echo Running Database Migrations...
echo ========================================

echo.
echo [1/4] Running: 000_database_setup.sql
sqlcmd -S 74.50.90.58 -U sa -P "Ava+112511@" -i "src\migrations\000_database_setup.sql"

echo.
echo [2/4] Running: 001_create_tables.sql
sqlcmd -S 74.50.90.58 -U db-xur -P "Ava+112511@" -d xur_ -i "src\migrations\001_create_tables.sql"

echo.
echo [3/4] Running: 002_create_cache_tables.sql
sqlcmd -S 74.50.90.58 -U db-xur -P "Ava+112511@" -d xur_ -i "src\migrations\002_create_cache_tables.sql"

echo.
echo [4/4] Running: 003_add_stripe_to_users.sql
sqlcmd -S 74.50.90.58 -U db-xur -P "Ava+112511@" -d xur_ -i "src\migrations\003_add_stripe_to_users.sql"

echo.
echo ========================================
echo Migrations Complete!
echo ========================================
pause
```

Then double-click `run-migrations.bat` to execute all migrations.

---

## What These Migrations Do:

| File | Purpose |
|------|---------|
| `000_database_setup.sql` | Creates database `xur_` and user `db-xur` (REQUIRES SA) |
| `001_create_tables.sql` | Creates users, subscriptions, invoices, contacts tables |
| `002_create_cache_tables.sql` | Creates cache tables for performance |
| `003_add_stripe_to_users.sql` | Adds `stripe_id` column for Clerk-Stripe integration |

---

## After Running Migrations:

1. Restart the Node server: `npm run dev`
2. Server will automatically run remaining pending migrations
3. You should see: `[Migrations] ✅ All migrations are up to date`

---

## Troubleshooting:

**Connection refused to 74.50.90.58:**
- Check your network connection
- Verify SQL Server is running on that IP
- Check firewall/security group allows port 1433

**Authentication failed:**
- Verify credentials in `.env` file
- For SSMS: Use Server: `74.50.90.58`, Login: `sa`, Password: `Ava+112511@`

**Permission denied:**
- Ensure you're using **SA account** for `000_database_setup.sql`
- Use **db-xur** account for other migrations

---

**Questions?** Check the migration files in `/src/migrations/` for detailed SQL
