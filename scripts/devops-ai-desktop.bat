@echo off
REM DevOps AI Desktop Launcher for Windows
REM Opens a project and starts the AI assistant

setlocal enabledelayedexpansion

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

echo.
echo ╔══════════════════════════════════════════════════════════════════════════╗
echo ║                    🤖 DevOps AI - Desktop Launcher                       ║
echo ║                    Powered by Accomplish AI                              ║
echo ╚══════════════════════════════════════════════════════════════════════════╝
echo.

REM Get project path from argument or use current directory
if "%~1"=="" (
    set "PROJECT_PATH=%CD%"
) else (
    set "PROJECT_PATH=%~1"
)

echo 📁 Project: %PROJECT_PATH%
echo.

REM Check if server is running
echo Checking server status...
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel%==0 (
    echo ✅ Server is already running
    goto :menu
)

REM Start server
echo 🚀 Starting DevOps AI server...
cd /d "%PROJECT_ROOT%"
start /b cmd /c "npm run dev > %TEMP%\devops-ai-server.log 2>&1"

echo ⏳ Waiting for server to start...
set /a count=0
:wait_loop
timeout /t 1 >nul
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel%==0 (
    echo ✅ Server is running!
    goto :menu
)
set /a count+=1
if %count% lss 30 goto :wait_loop

echo ❌ Server failed to start. Check %TEMP%\devops-ai-server.log
exit /b 1

:menu
echo.
echo ══════════════════════════════════════════════════════════════════════════
echo.
echo Choose an option:
echo.
echo   1) 💬 Open Interactive CLI Chat
echo   2) 🖥️  Open in VS Code
echo   3) 🌐 Open Web Dashboard
echo   4) ▶️  Run Tests
echo   5) 🔨 Build Project
echo   6) 📊 Analyze Logs
echo   7) 🔧 Full Analysis
echo   8) Exit
echo.
echo ══════════════════════════════════════════════════════════════════════════
echo.

set /p choice="Enter choice [1-8]: "

if "%choice%"=="1" goto :cli
if "%choice%"=="2" goto :vscode
if "%choice%"=="3" goto :web
if "%choice%"=="4" goto :tests
if "%choice%"=="5" goto :build
if "%choice%"=="6" goto :analyze
if "%choice%"=="7" goto :full
if "%choice%"=="8" goto :exit

echo Invalid choice
exit /b 1

:cli
echo 💬 Starting Interactive CLI...
cd /d "%PROJECT_ROOT%"
npx ts-node src/cli/cline-cli.ts "%PROJECT_PATH%"
goto :end

:vscode
echo 🖥️ Opening VS Code...
code "%PROJECT_PATH%"
goto :end

:web
echo 🌐 Opening Web Dashboard...
start http://localhost:3000
goto :end

:tests
echo ▶️ Running tests...
cd /d "%PROJECT_PATH%"
if exist package.json (
    npm test
) else if exist requirements.txt (
    python -m pytest
) else (
    echo ❌ Could not determine test command
)
goto :end

:build
echo 🔨 Building project...
cd /d "%PROJECT_PATH%"
if exist package.json (
    npm run build
) else if exist setup.py (
    python setup.py build
) else (
    echo ❌ Could not determine build command
)
goto :end

:analyze
echo 📊 Analyzing logs...
cd /d "%PROJECT_ROOT%"
echo analyze logs | npx ts-node src/cli/cline-cli.ts "%PROJECT_PATH%"
goto :end

:full
echo 🔧 Running full analysis...
cd /d "%PROJECT_PATH%"
if exist package.json (
    echo Step 1: Running tests...
    npm test
)
echo Step 2: Analyzing with AI...
curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d "{\"log\": \"test output\"}"
goto :end

:exit
echo 👋 Goodbye!
exit /b 0

:end
echo.
echo Press any key to exit...
pause >nul