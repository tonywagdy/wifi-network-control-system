@echo off
:: NetControl Windows Automated Bootstrapper

echo ====================================================================
echo     NETCONTROL ENTERPRISE PLATFORM - AUTOMATED WINDOWS BOOTSTRAPPER    
echo ====================================================================

echo [Setup] Checking system dependencies...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] NodeJS not found! Please install Node.js prior to starting.
    pause
    exit /b 1
)

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Please install Python prior to starting.
    pause
    exit /b 1
)

echo [Setup] Creating persistent database folder directories...
if not exist "data" mkdir "data"

echo [Setup] Pulling NodeJS dependencies...
call npm install

echo [Setup] Seeding local SQLAlchemy SQLite tables...
python -m backend.database.db_session

echo [Setup] Packaging static React & Express server files...
call npm run build

echo [Setup] Booting up active Windows QoS and DNS filtering daemons...
echo ====================================================================
echo   Fullstack system is now running on http://localhost:3000
echo   To abort operations, close this terminal window gracefully.
echo ====================================================================
call npm start
pause
