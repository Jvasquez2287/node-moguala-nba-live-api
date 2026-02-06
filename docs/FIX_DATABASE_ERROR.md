# Fix Database Permission Error

## Quick Fix (Choose One)

### Option 1: Using PowerShell Script (Easiest) ⭐

```powershell
# Run as Administrator in the project directory
PS C:\xampp\htdocs\nba-api.local> .\setup-database.ps1 -AdminPassword "your_sa_password"

# Or with Windows Authentication:
PS C:\xampp\htdocs\nba-api.local> .\setup-database.ps1
```

Then start the server:
```bash
npm start
```

---

### Option 2: Using SQL Server Management Studio

**Steps:**
1. Open SQL Server Management Studio
2. Connect to `74.50.90.58`
3. Open File → Open File → `src/migrations/000_database_setup.sql`
4. Click **Execute** (F5)
5. Verify "Setup complete" message
6. Restart the application: `npm start`

---

### Option 3: Using sqlcmd Command Line

```bash
# As Administrator:
sqlcmd -S 74.50.90.58 -U sa -P "your_sa_password" -i "src/migrations/000_database_setup.sql"

# Then start server:
npm start
```

---

## What Was Changed

### ✅ .env Updated
```env
# Before
DB_NAME=master

# After
DB_NAME=nba_api
```

### ✅ New Database Setup Script
- Created: `src/migrations/000_database_setup.sql`
- Creates: `nba_api` database
- Configures: `db-xur` user with permissions
- Ready to run with administrator credentials

### ✅ Helper Script Created
- Created: `setup-database.ps1`
- Use: `.\setup-database.ps1 -AdminPassword "your_sa_password"`
- Automates the entire setup

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `CREATE TABLE permission denied in database 'master'` | User has no permissions | Run setup script (Option 1, 2, or 3) |
| `Login failed for user 'db-xur'` | User not created in nba_api | Run setup script |
| `Database nba_api doesn't exist` | Database not created | Run setup script |
| `sqlcmd is not recognized` | SQL tools not installed | Install SQL Server Command Line Tools |
| Connection timeout | Server unreachable | Verify IP 74.50.90.58 and network |

---

## Verification

After running the setup, verify it worked:

```bash
# This should connect successfully and show "nba_api"
sqlcmd -S 74.50.90.58 -U db-xur -P "Ava+112511@" -d nba_api -Q "SELECT DB_NAME() AS [Current Database]"
```

---

## Start Server

Once setup is complete:

```bash
npm run build    # Build TypeScript
npm start        # Start server

# Expected output:
# [Database] ✅ Successfully connected to SQL Server
# [Migrations] Starting migration check...
# [Migrations] ✅ All migrations are up to date
# [Server] ✅ Successfully listening on 0.0.0.0:8000
```

---

## Details

**New Database:** `nba_api`
- Database for all application tables
- Separate from system `master` database
- Proper way to organize application data

**User Permissions:** `db-xur` granted `db_owner`
- Can create tables, indexes, constraints
- Can insert, update, delete data
- Can alter schema

**Automatic Migrations:**
- On first start, server creates all tables
- `users`, `subscriptions`, `invoices`, `cache`, etc.
- No manual table creation needed

---

## Questions?

See detailed documentation:
- **Setup Instructions:** `docs/DATABASE_SETUP.md`
- **API Documentation:** `docs/WEBHOOKS.md`
- **Quick Start:** `docs/QUICK_START.md`

---

**Status:** Fix ready. Choose Option 1 (easiest) and run the command.
