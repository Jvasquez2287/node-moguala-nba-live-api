# SQL Server Setup Instructions

## Problem
```
Error: CREATE TABLE permission denied in database 'master'.
```

The user `db-xur` doesn't have permissions to create tables in the `master` database, which is correct—`master` is a system database and shouldn't contain application data.

## Solution

We've created a dedicated `nba_api` database for the application. Follow these steps:

### Step 1: Run the Database Setup Script

You need to execute `src/migrations/000_database_setup.sql` as an administrator on the SQL Server.

**Option A: Using SQL Server Management Studio (SSMS)**

1. Open SQL Server Management Studio
2. Connect to your SQL Server (74.50.90.58)
3. Open File → Open → File
4. Select `src/migrations/000_database_setup.sql`
5. Click **Execute** (or press F5)
6. You should see:
   ```
   Database nba_api created successfully
   Login db-xur created
   User db-xur created in nba_api
   db-xur granted db_owner role on nba_api
   ```

**Option B: Using sqlcmd Command Line**

```bash
# As Administrator, run:
sqlcmd -S 74.50.90.58 -U sa -P <sa_password> -i "src/migrations/000_database_setup.sql"

# Or if using Windows Authentication:
sqlcmd -S 74.50.90.58 -E -i "src/migrations/000_database_setup.sql"
```

**Option C: Connect as sa and Execute**

```powershell
# PowerShell as Administrator
$query = Get-Content "src/migrations/000_database_setup.sql" -Raw
$connectionString = "Server=74.50.90.58;Database=master;User Id=sa;Password=<sa_password>;"
# Then execute the query
```

### Step 2: Verify Setup

After running the script, verify the setup:

```bash
sqlcmd -S 74.50.90.58 -U db-xur -P "Ava+112511@" -d nba_api -Q "SELECT DB_NAME() AS [Current Database]"
```

You should see: `nba_api`

### Step 3: Update Configuration ✅ (Already Done)

The `.env` file has been updated to use the new database:

```env
DB_NAME=nba_api
```

### Step 4: Start the Server

Now you can start the application:

```bash
npm run build
npm start
```

The migrations should run automatically and create all tables in the `nba_api` database.

---

## What the Setup Script Does

1. **Creates Database**
   - Creates new `nba_api` database if it doesn't exist
   
2. **Creates Login**
   - Creates SQL Server login for `db-xur` if it doesn't exist
   
3. **Creates User & Grants Permissions**
   - Creates database user `db-xur` in `nba_api`
   - Grants `db_owner` role (full permissions)
   
4. **Verification**
   - Confirms all setup steps completed

---

## Troubleshooting

### Error: "Login failed for user 'db-xur'"
- The setup script hasn't been run yet
- **Solution:** Run `000_database_setup.sql` as sa/administrator first

### Error: "Permission denied in database 'nba_api'"
- The `db_owner` role wasn't granted
- **Solution:** Re-run the setup script or grant permissions manually:
  ```sql
  USE nba_api;
  ALTER ROLE db_owner ADD MEMBER [db-xur];
  ```

### Error: "Database nba_api doesn't exist"
- The database wasn't created
- **Solution:** Run the setup script

### Error: "Connection timeout"
- The database server isn't responding
- **Solution:** 
  1. Verify server IP: 74.50.90.58
  2. Check network connectivity: `ping 74.50.90.58`
  3. Verify SQL Server is running and listening on port 1433
  4. Check firewall rules

---

## Alternative: Manual Setup

If you prefer to set up manually, execute these commands in SQL Server:

```sql
-- 1. Create database
CREATE DATABASE nba_api;

-- 2. Create login (as sa)
CREATE LOGIN [db-xur] WITH PASSWORD = 'Ava+112511@';

-- 3. Create user and grant permissions
USE nba_api;
CREATE USER [db-xur] FOR LOGIN [db-xur];
ALTER ROLE db_owner ADD MEMBER [db-xur];
```

---

## Security Note

The `db_owner` role grants full permissions including:
- CREATE TABLE
- DROP TABLE
- INSERT, UPDATE, DELETE
- SELECT

This is suitable for development. For production, consider granting only necessary permissions:

```sql
USE nba_api;
GRANT CREATE TABLE, ALTER, INSERT, UPDATE, DELETE, SELECT ON DATABASE::nba_api TO [db-xur];
```

---

## Verification Checklist

- [ ] `000_database_setup.sql` executed successfully
- [ ] `nba_api` database visible in SQL Server Management Studio
- [ ] `db-xur` user assigned to `nba_api` database
- [ ] `.env` file updated with `DB_NAME=nba_api`
- [ ] `npm start` runs without permission errors
- [ ] Migrations execute successfully
- [ ] All tables created in `nba_api` database:
  ```sql
  USE nba_api;
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
  ```

---

## Next Steps

Once setup is complete:

1. ✅ Run setup script
2. ✅ Verify database created
3. ✅ Start server: `npm start`
4. ✅ Server creates all tables automatically
5. ✅ Webhooks ready for Stripe/Clerk

---

**Status:** Setup instructions ready. Execute the setup script and restart the application.
