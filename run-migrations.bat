@echo off
setlocal enabledelayedexpansion

REM Database Migration Runner
REM This script executes all database migrations in the correct order
REM Requires sqlcmd to be installed and available in PATH

echo.
echo ========================================
echo NBA API - Database Migration Runner
echo ========================================
echo.

REM Migration files in order
set "SETUP_MIGRATION=src\migrations\000_database_setup.sql"
set "TABLES_MIGRATION=src\migrations\001_create_tables.sql"
set "CACHE_MIGRATION=src\migrations\002_create_cache_tables.sql"
set "STRIPE_MIGRATION=src\migrations\003_add_stripe_to_users.sql"

REM Database connection details from .env
set "DB_SERVER=74.50.90.58"
set "DB_USER=db-xur"
set "DB_PASSWORD=Ava+112511@"
set "DB_NAME=xur_"
set "SA_USER=sa"

REM Check if files exist
if not exist "%SETUP_MIGRATION%" (
    echo ERROR: Cannot find %SETUP_MIGRATION%
    pause
    exit /b 1
)

echo [Step 1/4] Running database setup (requires SA privileges)...
echo Command: sqlcmd -S %DB_SERVER% -U %SA_USER% -P "%DB_PASSWORD%" -i "%SETUP_MIGRATION%"
sqlcmd -S %DB_SERVER% -U %SA_USER% -P "%DB_PASSWORD%" -i "%SETUP_MIGRATION%"

if !errorlevel! neq 0 (
    echo ERROR: Setup migration failed. Make sure you're using SA account credentials.
    pause
    exit /b 1
)

timeout /t 2 /nobreak

echo.
echo [Step 2/4] Running create tables migration...
sqlcmd -S %DB_SERVER% -U %DB_USER% -P "%DB_PASSWORD%" -d %DB_NAME% -i "%TABLES_MIGRATION%"

if !errorlevel! neq 0 (
    echo ERROR: Tables migration failed.
    pause
    exit /b 1
)

timeout /t 2 /nobreak

echo.
echo [Step 3/4] Running cache tables migration...
sqlcmd -S %DB_SERVER% -U %DB_USER% -P "%DB_PASSWORD%" -d %DB_NAME% -i "%CACHE_MIGRATION%"

if !errorlevel! neq 0 (
    echo ERROR: Cache migration failed.
    pause
    exit /b 1
)

timeout /t 2 /nobreak

echo.
echo [Step 4/4] Running Stripe integration migration...
sqlcmd -S %DB_SERVER% -U %DB_USER% -P "%DB_PASSWORD%" -d %DB_NAME% -i "%STRIPE_MIGRATION%"

if !errorlevel! neq 0 (
    echo ERROR: Stripe migration failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ All migrations completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Start the server: npm run dev
echo 2. Server will verify all migrations are in place
echo 3. You should see: [Migrations] ✅ All migrations are up to date
echo.
pause
