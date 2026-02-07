# CloudWA Quick Test Script

$baseUrl = "https://cloudwa-flow.khibroh.workers.dev"

# 1. Login
Write-Host "=== Login ===" -ForegroundColor Green
$login = Invoke-WebRequest -Uri "$baseUrl/api/auth/super-admin/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"glowboxstudio@gmail.com","password":"CloudWA2026!Secure"}'
$token = ($login.Content | ConvertFrom-Json).data.token
Write-Host "Token obtained: $($token.Substring(0,20))..." -ForegroundColor Yellow

# 2. Create Device
Write-Host "`n=== Create Device ===" -ForegroundColor Green
$createDevice = Invoke-WebRequest -Uri "$baseUrl/api/devices" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"} `
  -ContentType "application/json" `
  -Body '{"displayName":"Test Bot","gatewayType":"waha"}'
$device = ($createDevice.Content | ConvertFrom-Json).data
$deviceId = $device.id
Write-Host "Device ID: $deviceId" -ForegroundColor Yellow

# 3. Save QR Code
if ($device.qrCode) {
    Write-Host "`n=== Saving QR Code ===" -ForegroundColor Green
    $qrData = $device.qrCode -replace 'data:image/png;base64,',''
    $qrBytes = [Convert]::FromBase64String($qrData)
    [IO.File]::WriteAllBytes("$PSScriptRoot\qr-code.png", $qrBytes)
    Write-Host "QR Code saved to: $PSScriptRoot\qr-code.png" -ForegroundColor Yellow
    Start-Process "$PSScriptRoot\qr-code.png"
}

Write-Host "`n=== Scan QR with WhatsApp ===" -ForegroundColor Green
Write-Host "Waiting 30 seconds for you to scan..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 4. Check Status
Write-Host "`n=== Check Status ===" -ForegroundColor Green
$status = Invoke-WebRequest -Uri "$baseUrl/api/devices/$deviceId" `
  -Headers @{"Authorization"="Bearer $token"}
$statusData = ($status.Content | ConvertFrom-Json).data
Write-Host "Status: $($statusData.sessionStatus)" -ForegroundColor Yellow
if ($statusData.phoneNumber) {
    Write-Host "Phone: $($statusData.phoneNumber)" -ForegroundColor Yellow
}

# 5. Send Test Message (optional - enter your number)
$testNumber = Read-Host "`nEnter test WhatsApp number (e.g., 628123456789) or press Enter to skip"
if ($testNumber) {
    Write-Host "`n=== Send Test Message ===" -ForegroundColor Green
    try {
        $send = Invoke-WebRequest -Uri "$baseUrl/api/devices/$deviceId/send" `
          -Method POST `
          -Headers @{"Authorization"="Bearer $token"} `
          -ContentType "application/json" `
          -Body "{`"chatId`":`"$testNumber`",`"message`":`"Hello from CloudWA! 🚀`"}"
        Write-Host "Message sent successfully!" -ForegroundColor Yellow
    } catch {
        Write-Host "Failed to send message: $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Complete! ===" -ForegroundColor Green
Write-Host "Device ID: $deviceId"
Write-Host "`nYou can now manage this device via API or wait for frontend dashboard."
