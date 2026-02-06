# Database Permission Error - Complete Fix Guide

## 🔴 Error Your Received

```
CREATE TABLE permission denied in database 'master'.
```

**Cause:** The database user `db-xur` doesn't have permissions to create tables on the `master` database.

**Root Issue:** `master` is a SQL Server system database and shouldn't be used for application data.

---

## ✅ Solution Applied

We've fixed this by:
1. ✅ Creating a dedicated `nba_api` database
2. ✅ Setting up proper permissions for `db-xur` user
3. ✅ Updated `.env` to use `DB_NAME=nba_api`
4. ✅ Created setup scripts to configure everything

---

## 🚀 How to Fix (Pick Your Method)

### **Method 1: PowerShell Script (Recommended)**

**Easiest way - one command:**

```powershell
# Run as Administrator
PS C:\xampp\htdocs\nba-api.local> .\setup-database.ps1 -AdminPassword "your_sa_password"
```

Replace `your_sa_password` with your SQL Server sa password.

**What it does:**
- ✅ Creates `nba_api` database
- ✅ Creates `db-xur` login
- ✅ Grants permissions
- ✅ Verifies connection

---

### **Method 2: Batch Script**

**For those who prefer .bat files:**

```batch
# Run as Administrator
C:\xampp\htdocs\nba-api.local> setup-database.bat
```

Then enter your sa password when prompted.

---

### **Method 3: SQL Server Management Studio (Manual)**

**If you prefer GUI:**

1. Open **SQL Server Management Studio**
2. Connect to `74.50.90.58`
3. File → Open → File
4. Select: `src/migrations/000_database_setup.sql`
5. Click **Execute** (or press F5)
6. Verify you see "Setup complete" message

---

### **Method 4: sqlcmd Command Line**

**If you prefer command line:**

```bash
# Run as Administrator
sqlcmd -S 74.50.90.58 -U sa -P "your_sa_password" -i "src/migrations/000_database_setup.sql"
```

---

## 📝 What Gets Created

When you run the setup, it:

1. **Creates Database**
   ```sql
   CREATE DATABASE nba_api;
   ```

2. **Creates Login** (if needed)
   ```sql
   CREATE LOGIN [db-xur] WITH PASSWORD = 'Ava+112511@';
   ```

3. **Creates User & Grants Permissions**
   ```sql
   USE nba_api;
   CREATE USER [db-xur] FOR LOGIN [db-xur];
   ALTER ROLE db_owner ADD MEMBER [db-xur];
   ```

4. **Result**
   - Database: `nba_api` ✅
   - User: `db-xur` ✅
   - Permissions: Full (db_owner) ✅

---

## ✅ After Running Setup

Once the setup script completes successfully:

### 1. Verify Connection
```bash
sqlcmd -S 74.50.90.58 -U db-xur -P "Ava+112511@" -d nba_api -Q "SELECT DB_NAME() AS [Database]"
```

Should show:
```
Database
---------
nba_api
```

### 2. Build Application
```bash
npm run build
```

Should complete without errors:
```
> nba-api-server@1.0.0 build
> tsc

✅ Build successful
```

### 3. Start Server
```bash
npm start
```

Should show:
```
[Database] ✅ Successfully connected to SQL Server
[Migrations] Starting migration check...
[Migrations] Running: 001_create_tables.sql
[Migrations] ✅ Completed: 001_create_tables.sql
[Migrations] Running: 002_create_cache_tables.sql
[Migrations] ✅ Completed: 002_create_cache_tables.sql
[Migrations] ✅ All pending migrations completed successfully
[Server] ✅ Successfully listening on 0.0.0.0:8000
```

---

## 📊 Files Changed

### New Setup Scripts
```
✅ src/migrations/000_database_setup.sql  - SQL setup script
✅ setup-database.ps1                    - PowerShell setup
✅ setup-database.bat                    - Batch file setup
```

### Updated Configuration
```
✅ .env
   - Changed: DB_NAME=master → DB_NAME=nba_api
```

### New Documentation
```
✅ docs/DATABASE_SETUP.md                - Detailed setup guide
✅ FIX_DATABASE_ERROR.md                 - This file
```

---

## 🐛 Troubleshooting

### "sqlcmd is not recognized"
```
Error: sqlcmd is not found
```
**Solution:** Install SQL Server Command Line Tools
- Download: https://learn.microsoft.com/en-us/sql/tools/sqlcmd/sqlcmd-utility
- Then retry the setup

### "Password incorrect"
```
Error: Login failed for user 'sa'
```
**Solution:** Use correct sa password from your SQL Server installation

### "Cannot connect to server"
```
Error: Connection timeout when connecting to 74.50.90.58
```
**Solution:**
1. Verify server IP is correct
2. Test: `ping 74.50.90.58`
3. Check firewall rules
4. Verify SQL Server is running

### "Database already exists"
```
Output: Database nba_api already exists
```
**This is fine!** Setup script handles this gracefully and will:
- Skip creating database
- Skip creating login if exists
- Grant permissions again (harmless)

---

## 🔐 Security Notes

### Current Setup
- User: `db-xur` has `db_owner` role
- Permissions: Full (CREATE, ALTER, DROP, etc.)
- **Suitable for:** Development/Testing

### For Production
Consider limiting permissions:
```sql
USE nba_api;
GRANT CREATE TABLE, INSERT, UPDATE, DELETE, SELECT ON DATABASE::nba_api TO [db-xur];
DENY ALTER ON DATABASE::nba_api TO [db-xur];
DENY DROP ON DATABASE::nba_api TO [db-xur];
```

---

## 📋 Quick Reference

| Step | Command | Notes |
|------|---------|-------|
| 1 | `.\setup-database.ps1 -AdminPassword "..."` | Run as Administrator |
| 2 | `npm run build` | Build TypeScript |
| 3 | `npm start` | Start server |
| Done! | Server listening on port 8000 | Ready for webhooks |

---

## 📚 Complete Documentation

For more details, see:

- **[docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)** - Comprehensive setup guide
- **[docs/QUICK_START.md](docs/QUICK_START.md)** - Quick start guide
- **[docs/WEBHOOKS.md](docs/WEBHOOKS.md)** - Webhook integration
- **[docs/CONVERSION_COMPLETE.md](docs/CONVERSION_COMPLETE.md)** - Full implementation details

---

## ✨ What Happens Next

### Automatic on Server Start
1. Connects to `nba_api` database
2. Creates `migrations` tracking table
3. Discovers migration files
4. Runs pending migrations:
   - `001_create_tables.sql` - Creates users, subscriptions, invoices, etc.
   - `002_create_cache_tables.sql` - Creates cache tables
5. Creates all indexes
6. Ready for webhooks!

### Manual Verification
```sql
-- Check tables created
USE nba_api;
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- Check migration tracking
SELECT * FROM migrations;
```

---

## 🎯 Next Action

1. **Choose your setup method** (PowerShell recommended)
2. **Run the setup script** with your sa password
3. **Build and start the server**: `npm start`
4. **Verify with logs** showing successful migration and server listening

---

## ✅ Before Running Setup

Make sure you have:
- [ ] SQL Server running at 74.50.90.58
- [ ] SA account password available
- [ ] Network access to the server
- [ ] Administrator rights on your computer (for PowerShell script)

---

## 📞 Help

If you get stuck:

1. Check SQL Server is running
2. Verify sa password is correct
3. Check .env file has correct values
4. See [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) for detailed troubleshooting

---

**Status:** ✅ Ready to fix - run setup script and restart server

```
╔════════════════════════════════════════╗
║  1. Run: .\setup-database.ps1          ║
║  2. Run: npm start                     ║
║  ✅ Done!                               ║
╚════════════════════════════════════════╝
```
