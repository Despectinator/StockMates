$ErrorActionPreference = "Stop"

$root = "D:\StockMates"
$serverDir = Join-Path $root "server"
$clientDir = Join-Path $root "client"
$analyticsDir = Join-Path $root "analytics-service"

# Kill stale listeners on the app ports
$ports = @(5000, 8001, 5173)
foreach ($port in $ports) {
    $rows = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($rows) {
        foreach ($row in $rows) {
            $procId = $row.OwningProcess
            if ($procId) {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# Start backend
Write-Host "Starting backend..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit", "-Command", "Set-Location '$serverDir'; npm run dev"
)

# Start analytics service
Write-Host "Starting analytics service..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit", "-Command", "Set-Location '$analyticsDir'; .\venv\Scripts\Activate.ps1; python -m uvicorn app:app --host 127.0.0.1 --port 8001"
)

# Start client
Write-Host "Starting client..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit", "-Command", "Set-Location '$clientDir'; npm run dev"
)

Write-Host ""
Write-Host "======================================"
Write-Host "Services restarted"
Write-Host "Backend: http://localhost:5000"
Write-Host "Client: http://localhost:5173"
Write-Host "Analytics: http://127.0.0.1:8001/health"
Write-Host "======================================"
