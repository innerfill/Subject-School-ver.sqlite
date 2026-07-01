@echo off
echo ========================================
echo  School Schedule - Install
echo ========================================
echo.

echo [1/3] Installing Node.js...
winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -e
echo.

echo [2/3] Installing XAMPP...
winget install --id ApacheFriends.Xampp.8.2 --accept-source-agreements --accept-package-agreements -e
echo.

echo [3/3] Installing project dependencies...
cd /d "%~dp0"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed
    pause & exit /b 1
)

echo.
echo ========================================
echo  [4/4] Setting up database...
echo  Make sure XAMPP MySQL is running first!
echo ========================================
pause

set MYSQL=C:\xampp\mysql\bin\mysql.exe
if not exist "%MYSQL%" (
    echo [ERROR] MySQL not found at %MYSQL%
    echo        Install XAMPP first then re-run this file.
    pause & exit /b 1
)

"%MYSQL%" -u root -e "CREATE DATABASE IF NOT EXISTS school_schedule CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if %errorlevel% neq 0 (
    echo [ERROR] Cannot connect to MySQL. Start MySQL in XAMPP first.
    pause & exit /b 1
)
echo Database created.

"%MYSQL%" -u root school_schedule < "%~dp0school_schedule.sql"
if %errorlevel% neq 0 (
    echo [ERROR] Import failed.
    pause & exit /b 1
)
echo Schema imported.

echo.
echo ========================================
echo  Done! Run start.bat to launch the app.
echo ========================================
pause
