@echo off
:: NetControl Dependency Installer for Enterprise Windows Deployments

echo ====================================================================
echo      NETCONTROL GATEWAY PLATFORM - DEPENDENCY INSTALLER (WINDOWS)
echo ====================================================================

echo [Prerequisite] Checking NodeJS runtime...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] NodeJS was not found on your system PATH!
    echo Please install NodeJS (v18 or v20+) and restart this installer.
    pause
    exit /b 1
) else (
    echo   - NodeJS found.
)

echo [Prerequisite] Checking Python runtime...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found on your system PATH!
    echo Please install Python 3.9+ (bundled with pip) and restart this installer.
    pause
    exit /b 1
) else (
    echo   - Python found.
)

echo [Installer] Installing Node.js frontend and master proxy packages...
call npm install

echo [Installer] Checking and compiling Python SQLAlchemy databases...
python -m pip install sqlalchemy psutil
python -m backend.database.db_session

echo ====================================================================
echo   Dependencies Installed successfully!
echo   You can now start the platform by running: start_platform.bat
echo ====================================================================
pause
