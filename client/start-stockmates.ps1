$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting MongoDB..." -ForegroundColor Cyan
$mongo = Get-Command mongod -ErrorAction SilentlyContinue
if (-not $mongo) {
    Write-Host "MongoDB not found in PATH. Please install it or add its bin directory to PATH." -ForegroundColor Red
    exit 1
}

$mongoData = Join-Path $projectRoot 'data\db'
New-Item -ItemType Directory -Force -Path $mongoData | Out-Null

$mongoProcess = Start-Process -FilePath $mongo.Source -ArgumentList @('--dbpath', $mongoData) -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 2

Write-Host "Starting analytics service..." -ForegroundColor Cyan
$analyticsDir = Join-Path $projectRoot 'analytics-service'
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command py -ErrorAction SilentlyContinue
}
if (-not $pythonCmd) {
    Write-Host "Python not found in PATH." -ForegroundColor Red
    exit 1
}

$analyticsProc = Start-Process -FilePath $pythonCmd.Source -ArgumentList @('-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', '8001') -WorkingDirectory $analyticsDir -PassThru

Write-Host "Starting Node server..." -ForegroundColor Cyan
$serverProc = Start-Process -FilePath 'npm' -ArgumentList @('run', 'dev') -WorkingDirectory (Join-Path $projectRoot 'server') -PassThru

Write-Host "Starting client..." -ForegroundColor Cyan
$clientProc = Start-Process -FilePath 'npm' -ArgumentList @('run', 'dev') -WorkingDirectory (Join-Path $projectRoot 'client') -PassThru

Write-Host "All services started." -ForegroundColor Green
Write-Host "MongoDB PID: $($mongoProcess.Id)" -ForegroundColor Gray
Write-Host "Analytics PID: $($analyticsProc.Id)" -ForegroundColor Gray
Write-Host "Server PID: $($serverProc.Id)" -ForegroundColor Gray
Write-Host "Client PID: $($clientProc.Id)" -ForegroundColor Gray
