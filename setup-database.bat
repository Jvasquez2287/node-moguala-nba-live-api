@echo off
REM ====================================================================
REM NBA API Database Setup
REM Run this as Administrator
REM ====================================================================

setlocal enabledelayedexpansion

echo.
echo ====== NBA API Database Setup ======
echo.

REM Configuration
set SERVER=74.50.90.58
set ADMIN_USER=sa
set APP_USER=db-xur
set APP_PASSWORD=Ava+112511@
set DATABASE=nba_api

REM Check if sqlcmd exists
where sqlcmd >nul 2>nul
if errorlevel 1 (
    echo [ERROR] sqlcmd not found
    echo Please install SQL Server Command Line Tools:
    echo https://learn.microsoft.com/en-us/sql/tools/sqlcmd/sqlcmd-utility
    pause
    exit /b 1
)

echo [INFO] sqlcmd found
echo [INFO] Server: %SERVER%
echo [INFO] Database: %DATABASE%
echo.

REM Prompt for admin password
set /p ADMIN_PASSWORD="Enter SQL Server sa password: "

REM Create SQL setup file
setlocal
set TEMP_FILE=%TEMP%\nba_setup_%RANDOM%.sql
(
    echo -- Create database
    echo IF NOT EXISTS ^(SELECT 1 FROM sys.databases WHERE name = '%DATABASE%'^)
    echo BEGIN
    echo     CREATE DATABASE %DATABASE%;
    echo     PRINT 'Database %DATABASE% created successfully';
    echo END
    echo ELSE
    echo BEGIN
    echo     PRINT 'Database %DATABASE% already exists';
    echo END;
    echo.
    echo -- Create login
    echo USE master;
    echo.
    echo IF NOT EXISTS ^(SELECT 1 FROM sys.server_principals WHERE name = '%APP_USER%'^)
    echo BEGIN
    echo     CREATE LOGIN [%APP_USER%] WITH PASSWORD = '%APP_PASSWORD%';
    echo     PRINT 'Login %APP_USER% created';
    echo END
    echo ELSE
    echo BEGIN
    echo     PRINT 'Login %APP_USER% already exists';
    echo END;
    echo.
    echo -- Create user and grant permissions
    echo USE %DATABASE%;
    echo.
    echo IF NOT EXISTS ^(SELECT 1 FROM sys.database_principals WHERE name = '%APP_USER%'^)
    echo BEGIN
    echo     CREATE USER [%APP_USER%] FOR LOGIN [%APP_USER%];
    echo     PRINT 'User %APP_USER% created in %DATABASE%';
    echo END;
    echo.
    echo ALTER ROLE db_owner ADD MEMBER [%APP_USER%];
    echo PRINT '%APP_USER% granted db_owner role on %DATABASE%';
    echo.
    echo PRINT '';
    echo PRINT '====== SETUP COMPLETE ======';
    echo PRINT 'Database: %DATABASE%';
    echo PRINT 'User: %APP_USER%';
    echo PRINT 'Status: Ready for application';
) > "%TEMP_FILE%"

echo [INFO] Running setup script...
echo.

REM Execute the SQL script
sqlcmd -S %SERVER% -U %ADMIN_USER% -P !ADMIN_PASSWORD! -i "%TEMP_FILE%" -w 200

if errorlevel 1 (
    echo.
    echo [ERROR] Setup failed
    del "%TEMP_FILE%" 2>nul
    pause
    exit /b 1
) else (
    echo.
    echo [SUCCESS] Database setup completed!
)

REM Clean up
del "%TEMP_FILE%" 2>nul

REM Verify setup
echo.
echo [INFO] Verifying setup...
echo.

sqlcmd -S %SERVER% -U %APP_USER% -P %APP_PASSWORD% -d %DATABASE% -Q "SELECT DB_NAME() AS [Current Database]"

if errorlevel 1 (
    echo.
    echo [WARNING] Verification failed - please check configuration
    pause
    exit /b 1
) else (
    echo.
    echo [SUCCESS] Verification successful!
)

echo.
echo ====== NEXT STEPS ======
echo 1. Update .env file: DB_NAME=nba_api
echo 2. Build: npm run build
echo 3. Start: npm start
echo.
echo The server will create all tables automatically.
echo.
pause
