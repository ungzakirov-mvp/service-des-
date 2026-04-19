# ===== Service Desk - Автонастройка синхронизации =====

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Service Desk - Настройка синхронизации" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Цвета
$GREEN = [ConsoleColor]::Green
$RED = [ConsoleColor]::Red
$YELLOW = [ConsoleColor]::Yellow
$CYAN = [ConsoleColor]::Cyan

function Git-Command {
    param($args)
    & git @args 2>&1
}

# 1. Проверяем текущую директорию
Write-Host "[1/5] Проверка директории проекта..." -ForegroundColor $YELLOW
$projectPath = $PSScriptRoot
if (-not $projectPath) { $projectPath = Get-Location }
Write-Host "   Путь: $projectPath" -ForegroundColor Gray

Set-Location $projectPath

# 2. Проверяем/устанавливаем правильный remote
Write-Host ""
Write-Host "[2/5] Настройка Git remote..." -ForegroundColor $YELLOW

$currentRemote = Git-Command remote get-url origin 2>$null

if ($currentRemote -ne "https://github.com/ungzakirov-mvp/service-des-.git") {
    Write-Host "   Текущий remote: $currentRemote" -ForegroundColor Gray
    
    if ($currentRemote) {
        Write-Host "   Удаляю старый remote..." -ForegroundColor Gray
        Git-Command remote remove origin
    }
    
    Write-Host "   Устанавливаю правильный remote..." -ForegroundColor $GREEN
    Git-Command remote add origin "https://github.com/ungzakirov-mvp/service-des-.git"
    Write-Host "   ✓ Remote установлен" -ForegroundColor $GREEN
} else {
    Write-Host "   ✓ Remote уже правильный" -ForegroundColor $GREEN
}

# 3. Fetch и проверка изменений
Write-Host ""
Write-Host "[3/5] Синхронизация с GitHub..." -ForegroundColor $YELLOW
Git-Command fetch origin

$behind = (Git-Command rev-list HEAD..origin/master --count 2>$null)
$ahead = (Git-Command rev-list origin/master..HEAD --count 2>$null)

if ($behind -gt 0) {
    Write-Host "   На GitHub есть $behind новых коммитов" -ForegroundColor $YELLOW
    Write-Host "   Выполняю pull..." -ForegroundColor $GREEN
    Git-Command pull origin master
    Write-Host "   ✓ Синхронизировано" -ForegroundColor $GREEN
} else {
    Write-Host "   ✓ Всё актуально" -ForegroundColor $GREEN
}

if ($ahead -gt 0) {
    Write-Host "   У вас есть $ahead локальных коммитов" -ForegroundColor $CYAN
}

# 4. Проверка статуса
Write-Host ""
Write-Host "[4/5] Статус проекта..." -ForegroundColor $YELLOW
$status = Git-Command status --short 2>$null
if ($status) {
    Write-Host "   Есть несохранённые изменения:" -ForegroundColor $YELLOW
    $status | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
} else {
    Write-Host "   ✓ Нет несохранённых изменений" -ForegroundColor $GREEN
}

# 5. Проверка конфигурации
Write-Host ""
Write-Host "[5/5] Git конфигурация..." -ForegroundColor $YELLOW
$userName = Git-Command config user.name 2>$null
$userEmail = Git-Command config user.email 2>$null

if ($userName -and $userEmail) {
    Write-Host "   User: $userName <$userEmail>" -ForegroundColor Gray
    Write-Host "   ✓ Git настроен" -ForegroundColor $GREEN
} else {
    Write-Host "   ⚠ Git user не настроен!" -ForegroundColor $RED
    Write-Host "   Настройте: git config user.name 'Ваше Имя'" -ForegroundColor Gray
    Write-Host "   Настройте: git config user.email 'email@example.com'" -ForegroundColor Gray
}

# Итог
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Готово! Синхронизация настроена." -ForegroundColor $GREEN
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Команды для работы:" -ForegroundColor $YELLOW
Write-Host "  git pull origin master  - скачать обновления" -ForegroundColor Gray
Write-Host "  git add .              - сохранить изменения" -ForegroundColor Gray
Write-Host "  git commit -m 'описание' - закоммитить" -ForegroundColor Gray
Write-Host "  git push origin master - загрузить на GitHub" -ForegroundColor Gray
Write-Host ""
Write-Host "На VPS для обновления:" -ForegroundColor $YELLOW
Write-Host "  cd /home/admin/servicedesk && git pull" -ForegroundColor Gray
Write-Host ""

# Создаём скрипт автопуша
$autoPushScript = @"
@echo off
REM ===== Auto Push для Service Desk =====
cd /d "%~dp0"
echo Pull latest changes...
git pull origin master
echo.
echo Push to GitHub...
git add .
git commit -m "Auto update from second PC" 
git push origin master
echo.
echo Done!
pause
"@

$autoPushScript | Out-File -FilePath "auto-sync.bat" -Encoding UTF8
Write-Host "Создан скрипт auto-sync.bat для быстрой синхронизации" -ForegroundColor $CYAN
Write-Host ""

pause