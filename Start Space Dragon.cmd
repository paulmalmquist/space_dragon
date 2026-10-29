@echo off
cd /d "%~dp0"
if not exist "node_modules\vite" (
  echo Preparing Space Dragon...
  call npm.cmd ci
  if errorlevel 1 (
    echo Setup failed. Keep this window open and share the error with your agent.
    pause
    exit /b 1
  )
)
call npm.cmd run start
if errorlevel 1 pause
