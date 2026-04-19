@echo off
echo ====== Service Desk Sync Check ======
echo.

echo [1] Checking current branch and commits...
git log --oneline -5

echo.
echo [2] Checking remote URLs...
git remote -v

echo.
echo [3] Comparing with GitHub...
git fetch origin
git log HEAD..origin/master --oneline
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] GitHub has NEW commits! Run: git pull origin master
) else (
    echo [OK] Up to date with GitHub
)

echo.
echo [4] Checking uncommitted changes...
git status --short
if %errorlevel% neq 0 (
    echo [WARNING] You have uncommitted changes!
) else (
    echo [OK] No uncommitted changes
)

echo.
echo ====== DONE ======
pause