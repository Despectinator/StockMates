$ErrorActionPreference = "Stop"

$root = "D:\StockMates"
$mongoDbPath = "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
$serverDir = Join-Path $root "server"
$clientDir = Join-Path $root "client"
$analyticsDir = Join-Path $root "analytics-service"

$mongoDataDir = "C:\data\db"
if (-not (Test-Path $mongoDataDir)) {
    New-Item -ItemType Directory -Path $mongoDataDir -Force | Out-Null
}

$mongoRunning = Get-Process mongod -ErrorAction SilentlyContinue
if (-not $mongoRunning) {
    Write-Host "Starting MongoDB..."
    Start-Process -FilePath $mongoDbPath -ArgumentList "--dbpath", $mongoDataDir -WindowStyle Minimized
    Start-Sleep -Seconds 3
}

Write-Host "Starting backend..."
$backendJob = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit","-Command","Set-Location '$serverDir'; npm run dev"
) -PassThru

Write-Host "Starting analytics service..."
$analyticsJob = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit","-Command","Set-Location '$analyticsDir'; .\venv\Scripts\Activate.ps1; python -m uvicorn app:app --host 127.0.0.1 --port 8001"
) -PassThru

Write-Host "Starting client..."
$clientJob = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit","-Command","Set-Location '$clientDir'; npm run dev"
) -PassThru

Write-Host ""
Write-Host "======================================"
Write-Host "StockMates startup launched"
Write-Host "Backend: http://localhost:5000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Analytics: http://127.0.0.1:8001/health"
Write-Host "======================================"
Write-Host ""
Write-Host "MongoDB running: $($mongoRunning -ne $null)"
Write-Host "Backend PID: $($backendJob.Id)"
Write-Host "Analytics PID: $($analyticsJob.Id)"
Write-Host "Client PID: $($clientJob.Id)"
