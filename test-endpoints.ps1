# API Endpoints Test Script
# Tests all health monitoring endpoints

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "NoTrack API Endpoints Test" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$endpoints = @(
    @{Name="Root Health Check"; Url="/"; Method="GET"},
    @{Name="Redis Health Check"; Url="/api/health/redis"; Method="GET"},
    @{Name="Kubernetes Readiness"; Url="/health/ready"; Method="GET"},
    @{Name="Kubernetes Liveness"; Url="/health/live"; Method="GET"},
    @{Name="Prometheus Metrics"; Url="/metrics"; Method="GET"},
    @{Name="API Documentation"; Url="/api-docs"; Method="GET"}
)

$results = @()

foreach ($endpoint in $endpoints) {
    $fullUrl = $baseUrl + $endpoint.Url
    Write-Host "Testing: $($endpoint.Name)" -ForegroundColor Yellow
    Write-Host "URL: $fullUrl" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $fullUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        
        $status = "[PASS]"
        $statusColor = "Green"
        $statusCode = $response.StatusCode
        
        Write-Host "$status - Status Code: $statusCode" -ForegroundColor $statusColor
        
        # Show preview of response for JSON endpoints
        if ($endpoint.Url -ne "/metrics" -and $endpoint.Url -ne "/api-docs") {
            $preview = $response.Content.Substring(0, [Math]::Min(100, $response.Content.Length))
            Write-Host "Preview: $preview..." -ForegroundColor DarkGray
        }
        
        $results += @{
            Name = $endpoint.Name
            Status = "PASS"
            StatusCode = $statusCode
            Url = $fullUrl
        }
    }
    catch {
        $status = "[FAIL]"
        $statusColor = "Red"
        $errorMsg = $_.Exception.Message
        
        Write-Host "$status - Error: $errorMsg" -ForegroundColor $statusColor
        
        $results += @{
            Name = $endpoint.Name
            Status = "FAIL"
            StatusCode = "N/A"
            Url = $fullUrl
            Error = $errorMsg
        }
    }
    
    Write-Host ""
}

# Summary
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

$passed = @($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = @($results | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $results.Count

Write-Host "Total Endpoints: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round(($passed/$total)*100, 1))%" -ForegroundColor Cyan
Write-Host ""

if ($failed -eq 0) {
    Write-Host "[SUCCESS] All endpoints are working!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Some endpoints failed. Check the logs above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Detailed Results:" -ForegroundColor Cyan
Write-Host ""

foreach ($result in $results) {
    $statusIcon = if ($result.Status -eq "PASS") { "[OK]" } else { "[X]" }
    $statusColor = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
    
    Write-Host "$statusIcon $($result.Name)" -ForegroundColor $statusColor
    Write-Host "  URL: $($result.Url)" -ForegroundColor Gray
    Write-Host "  Status Code: $($result.StatusCode)" -ForegroundColor Gray
    if ($result.Error) {
        Write-Host "  Error: $($result.Error)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "Test completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "=" * 70 -ForegroundColor Cyan
