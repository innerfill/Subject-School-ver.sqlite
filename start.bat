@echo off
echo ========================================
echo  School Schedule - Start
echo ========================================
echo.

cd /d "%~dp0"

taskkill /f /im node.exe >nul 2>&1

echo Building latest version, please wait...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    pause & exit /b 1
)

echo Starting server...
echo Open browser at: http://localhost:3000
echo DO NOT close this window while using the app.
echo ========================================
echo.

npm start
echo.
echo Server stopped.
pause
