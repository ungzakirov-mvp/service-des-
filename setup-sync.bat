@echo off
REM ===== Service Desk Sync Setup =====
echo.
echo Запуск настройки синхронизации...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0setup-sync.ps1"
echo.
pause