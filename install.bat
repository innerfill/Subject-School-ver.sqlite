@echo off
echo ========================================
echo  School Schedule - Install
echo ========================================
echo.

echo [1/2] Installing Node.js...
winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -e
echo.

echo [2/2] Installing project dependencies...
cd /d "%~dp0"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed
    pause & exit /b 1
)

echo.
echo ========================================
echo  Done! Run start.bat to launch the app.
echo ========================================
pause
