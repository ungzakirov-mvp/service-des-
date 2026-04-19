# Service Desk - Auto Sync Setup
# Запустить: .\setup-sync.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Service Desk - Auto Sync Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Colors
$GREEN = [ConsoleColor]::Green
$RED = [ConsoleColor]::Red
$YELLOW = [ConsoleColor]::Yellow
$CYAN = [ConsoleColor]::Cyan

# 1. Go to project folder
Write-Host "[1/4] Checking project folder..." -ForegroundColor $YELLOW
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $projectPath) { $projectPath = Get-Location }
Write-Host "   Path: $projectPath" -ForegroundColor Gray
Set-Location $projectPath

# 2. Check/fix remote
Write-Host ""
Write-Host "[2/4] Setting up Git remote..." -ForegroundColor $YELLOW

try {
    $currentRemote = git remote get-url origin 2>$null
} catch {
    $currentRemote = ""
}

if ($currentRemote -ne "https://github.com/ungzakirov-mvp/service-des-.git") {
    if ($currentRemote) {
        Write-Host "   Removing old remote: $currentRemote" -ForegroundColor Gray
        git remote remove origin
    }
    Write-Host "   Setting correct remote..." -ForegroundColor $GREEN
    git remote add origin "https://github.com/ungzakirov-mvp/service-des-.git"
    Write-Host "   Done!" -ForegroundColor $GREEN
} else {
    Write-Host "   Remote OK" -ForegroundColor $GREEN
}

# 3. Sync with GitHub
Write-Host ""
Write-Host "[3/4] Syncing with GitHub..." -ForegroundColor $YELLOW
git fetch origin

$behind = [int](git rev-list HEAD..origin/master --count 2>$null)
$ahead = [int](git rev-list origin.master..HEAD --count 2>$null)

if ($behind -gt 0) {
    Write-Host "   GitHub has $behind new commits" -ForegroundColor $YELLOW
    Write-Host "   Pulling..." -ForegroundColor $GREEN
    git pull origin master
    Write-Host "   Done!" -ForegroundColor $GREEN
} else {
    Write-Host "   Already up to date" -ForegroundColor $GREEN
}

if ($ahead -gt 0) {
    Write-Host "   You have $ahead local commits to push" -ForegroundColor $CYAN
}

# 4. Check status
Write-Host ""
Write-Host "[4/4] Project status..." -ForegroundColor $YELLOW
$status = git status --short 2>$null
if ($status) {
    Write-Host "   Uncommitted changes: $status" -ForegroundColor YELLOW
} else {
    Write-Host "   No uncommitted changes" -ForegroundColor $GREEN
}

# Create auto-sync.bat
$batchContent = "@echo off
echo Pull latest...
git pull origin master
echo.
echo Type your commit message and press Enter:
set /p msg=
if ""=="%msg%" set msg=Auto update
echo Committing: %msg%
git add .
git commit -m "%msg%"
git push origin master
echo.
echo Done!
pause"

$batchContent | Out-File -FilePath "auto-sync.bat" -Encoding ASCII
Write-Host ""
Write-Host "Created auto-sync.bat" -ForegroundColor $CYAN

# Result
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Done! Sync is ready." -ForegroundColor $GREEN
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Commands:" -ForegroundColor YELLOW
Write-Host "  pull:   git pull origin master" -ForegroundColor Gray
Write-Host "  push:   Run auto-sync.bat" -ForegroundColor Gray
Write-Host "  VPS:    cd /home/admin/servicedesk && git pull" -ForegroundColor Gray
Write-Host ""

pause