# Restart Server Script
Write-Host "Restarting NoTrack Backend Server..." -ForegroundColor Cyan

# Find and kill existing Node process on port 3000
Write-Host "Checking for existing server process..." -ForegroundColor Yellow

$port = 3000
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    Write-Host "Found server running on port $port" -ForegroundColor Yellow
    foreach ($pid in $processes) {
        Write-Host "Stopping process ID: $pid" -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "Server stopped." -ForegroundColor Green
} else {
    Write-Host "No server process found on port $port" -ForegroundColor Gray
}

# Start new server process
Write-Host ""
Write-Host "Starting server with API docs enabled..." -ForegroundColor Cyan
Write-Host "Location: app/server" -ForegroundColor Gray

Set-Location -Path "app/server"

# Start server in background
Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow

Write-Host ""
Write-Host "Server is starting..." -ForegroundColor Green
Write-Host "Waiting 5 seconds for server to initialize..." -ForegroundColor Yellow

Start-Sleep -Seconds 5

# Test if server is responding
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing -TimeoutSec 3
    Write-Host ""
    Write-Host "SUCCESS: Server is running and responding!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "WARNING: Server may not be ready yet. Please wait a moment and test manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Server restart complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now run: test-endpoints.ps1" -ForegroundColor White
Write-Host ""
