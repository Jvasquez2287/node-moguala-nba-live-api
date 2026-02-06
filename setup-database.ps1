#!/usr/bin/env powershell
<#
.SYNOPSIS
    NBA API Database Setup Script
    
.DESCRIPTION
    Automatically creates the nba_api database and configures permissions for db-xur user
    
.PARAMETER ServerName
    SQL Server hostname or IP (default: 74.50.90.58)
    
.PARAMETER AdminUser
    Administrator username for SQL Server (default: sa)
    
.PARAMETER AdminPassword
    Administrator password for SQL Server
    
.EXAMPLE
    PS> .\setup-database.ps1 -AdminPassword "your_sa_password"
    
.EXAMPLE
    PS> .\setup-database.ps1 -ServerName "74.50.90.58" -AdminPassword "your_sa_password"
#>

param(
    [string]$ServerName = "74.50.90.58",
    [string]$AdminUser = "sa",
    [string]$AdminPassword = "",
    [string]$AppUser = "db-xur",
    [string]$AppPassword = "Ava+112511@"
)

# Colors for output
$colors = @{
    Success = 'Green'
    Error   = 'Red'
    Warning = 'Yellow'
    Info    = 'Cyan'
}

function Write-Success { Write-Host "✅ $args" -ForegroundColor $colors.Success }
function Write-Error { Write-Host "❌ $args" -ForegroundColor $colors.Error }
function Write-Warning { Write-Host "⚠️ $args" -ForegroundColor $colors.Warning }
function Write-Info { Write-Host "ℹ️ $args" -ForegroundColor $colors.Info }

# Check if sqlcmd is available
Write-Info "Checking for sqlcmd availability..."
$sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue

if (-not $sqlcmd) {
    Write-Error "sqlcmd not found. Please install SQL Server command-line tools."
    Write-Info "Download from: https://learn.microsoft.com/en-us/sql/tools/sqlcmd/sqlcmd-utility"
    exit 1
}

Write-Success "sqlcmd found: $($sqlcmd.Source)"

# Validate inputs
if ([string]::IsNullOrWhiteSpace($AdminPassword)) {
    Write-Error "AdminPassword is required"
    Write-Info "Run: $($MyInvocation.MyCommand.Name) -AdminPassword 'your_password'"
    exit 1
}

Write-Info "Database Setup Configuration:"
Write-Info "  Server: $ServerName"
Write-Info "  Admin User: $AdminUser"
Write-Info "  App User: $AppUser"
Write-Info "  Database: nba_api"

# SQL Setup Script
$setupSQL = @"
-- Create database
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = 'nba_api')
BEGIN
    CREATE DATABASE nba_api;
    PRINT 'Database nba_api created successfully';
END
ELSE
BEGIN
    PRINT 'Database nba_api already exists';
END;

-- Create login
USE master;

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'db-xur')
BEGIN
    CREATE LOGIN [db-xur] WITH PASSWORD = 'Ava+112511@';
    PRINT 'Login db-xur created';
END
ELSE
BEGIN
    PRINT 'Login db-xur already exists';
END;

-- Create user and grant permissions
USE nba_api;

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db-xur')
BEGIN
    CREATE USER [db-xur] FOR LOGIN [db-xur];
    PRINT 'User db-xur created in nba_api';
END;

ALTER ROLE db_owner ADD MEMBER [db-xur];
PRINT 'db-xur granted db_owner role on nba_api';

PRINT '';
PRINT '====== SETUP COMPLETE ======';
PRINT 'Database: nba_api';
PRINT 'User: db-xur';
PRINT 'Status: Ready for application';
"@

# Save SQL to temporary file
$tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.sql'
$setupSQL | Out-File -FilePath $tempFile -Encoding UTF8

try {
    Write-Info "Executing setup script..."
    
    # Execute the SQL script
    $result = sqlcmd -S $ServerName -U $AdminUser -P $AdminPassword -i $tempFile -w 200
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database setup completed successfully!"
        Write-Info "Output:"
        $result | ForEach-Object { Write-Info "  $_" }
    } else {
        Write-Error "Setup failed with exit code: $LASTEXITCODE"
        Write-Info "Output:"
        $result | ForEach-Object { Write-Host "  $_" }
        exit 1
    }
} catch {
    Write-Error "Error executing setup: $_"
    exit 1
} finally {
    # Clean up temporary file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    }
}

# Verify setup
Write-Info "Verifying setup..."
try {
    $verifyResult = sqlcmd -S $ServerName -U $AppUser -P $AppPassword -d nba_api -Q "SELECT DB_NAME() AS [Current Database]" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Verification successful!"
        Write-Info "User $AppUser can connect to nba_api database"
    } else {
        Write-Warning "Verification failed. Please check the configuration."
    }
} catch {
    Write-Warning "Could not verify connection: $_"
}

Write-Info ""
Write-Info "====== NEXT STEPS ======"
Write-Info "1. Update .env file:"
Write-Info "   DB_NAME=nba_api"
Write-Info ""
Write-Info "2. Build the application:"
Write-Info "   npm run build"
Write-Info ""
Write-Info "3. Start the server:"
Write-Info "   npm start"
Write-Info ""
Write-Info "The server will automatically create all tables and run migrations."
