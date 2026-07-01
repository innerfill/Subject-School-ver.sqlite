@echo off
echo ========================================
echo  School Schedule - Start
echo ========================================
echo.

echo Checking MySQL on port 3306...
netstat -an | find "3306" | find "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] MySQL is not running.
    echo     Open XAMPP and Start MySQL first.
    echo.
    pause & exit /b 1
)
echo MySQL OK.
echo.

cd /d "%~dp0"

taskkill /f /im node.exe >nul 2>&1

if exist ".next" goto start_server

echo Building for first time, please wait...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    pause & exit /b 1
)

:start_server
echo Starting server...
echo Open browser at: http://localhost:3000
echo DO NOT close this window while using the app.
echo ========================================
echo.

npm start
echo.
echo Server stopped.
pause
