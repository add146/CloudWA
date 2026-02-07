# CloudWA Backend - Manual Verification Checklist

**Date**: February 7, 2026  
**Environment**: Production (https://cloudwa-flow.khibroh.workers.dev)

---

## Prerequisites

Before starting, ensure:
- [x] Backend deployed to production
- [x] Database migrations applied
- [x] JWT_SECRET configured
- [ ] WAHA_API_KEY configured (via dashboard)
- [x] Super Admin created

---

## 1. Super Admin Authentication ✅

### Test: Super Admin Login
```powershell
$login = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev/api/auth/super-admin/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"glowboxstudio@gmail.com","password":"CloudWA2026!Secure"}'

$response = $login.Content | ConvertFrom-Json
$superAdminToken = $response.data.token

Write-Host "✅ Super Admin Token: $($superAdminToken.Substring(0,20))..."
Write-Host "✅ User ID: $($response.data.user.id)"
Write-Host "✅ Role: $($response.data.user.role)"
```

**Expected Result**:
- ✅ Status 200
- ✅ Token returned (JWT format)
- ✅ User role = "super_admin"
- ✅ Email = "glowboxstudio@gmail.com"

**Status**: ⏳ Pending Test

---

## 2. Tenant Registration & Login

### Test: Tenant Registration
```powershell
$register = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"name":"Test Company","email":"testadmin@company.com","password":"TestPass123!"}'

$regResponse = $register.Content | ConvertFrom-Json
Write-Host "✅ Tenant Created: $($regResponse.data.tenant.name)"
Write-Host "✅ Admin Email: $($regResponse.data.user.email)"
```

### Test: Tenant Admin Login
```powershell
$tenantLogin = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"testadmin@company.com","password":"TestPass123!"}'

$tenantResponse = $tenantLogin.Content | ConvertFrom-Json
$tenantToken = $tenantResponse.data.token

Write-Host "✅ Tenant Token: $($tenantToken.Substring(0,20))..."
Write-Host "✅ Role: $($tenantResponse.data.user.role)"
```

**Expected Result**:
- ✅ Tenant created with unique ID
- ✅ Admin user created
- ✅ Login successful with tenant_admin role

**Status**: ⏳ Pending Test

---

## 3. WhatsApp Device Management

### Test: Create Device (Get QR Code)
```powershell
$createDevice = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev/api/devices" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $tenantToken"} `
  -ContentType "application/json" `
  -Body '{"displayName":"Test WhatsApp Bot","gatewayType":"waha"}'

$deviceResponse = $createDevice.Content | ConvertFrom-Json
$deviceId = $deviceResponse.data.id

Write-Host "✅ Device ID: $deviceId"
Write-Host "✅ Status: $($deviceResponse.data.sessionStatus)"

# Save QR Code
if ($deviceResponse.data.qrCode) {
    $qrData = $deviceResponse.data.qrCode -replace 'data:image/png;base64,',''
    $qrBytes = [Convert]::FromBase64String($qrData)
    [IO.File]::WriteAllBytes("C:\CloudWA\verification-qr.png", $qrBytes)
    Start-Process "C:\CloudWA\verification-qr.png"
    Write-Host "✅ QR Code saved and opened"
}
```

**Expected Result**:
- ✅ Device created with unique ID
- ✅ Session status = "scanning" or "starting"
- ✅ QR code returned (base64 image)
- ✅ QR code opens successfully

**Manual Action**: Scan QR code with WhatsApp mobile app

**Status**: ⏳ Pending Test (requires WAHA_API_KEY)

---

## 4. WhatsApp Connection & Status

### Test: Check Device Status
```powershell
Start-Sleep -Seconds 15 # Wait for QR scan

$status = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev/api/devices/$deviceId" `
  -Headers @{"Authorization"="Bearer $tenantToken"}

$statusData = $status.Content | ConvertFrom-Json
Write-Host "✅ Status: $($statusData.data.sessionStatus)"
Write-Host "✅ Phone: $($statusData.data.phoneNumber)"
Write-Host "✅ Display Name: $($statusData.data.displayName)"
```

**Expected Result**:
- ✅ Status = "working" or "connected"
- ✅ Phone number populated
- ✅ Display name matches WhatsApp account

**Status**: ⏳ Pending Test

---

## 5. Send Message with Typing Simulation

### Test: Send Test Message
```powershell
$testNumber = "628123456789" # Replace with real number

$sendMessage = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev/api/devices/$deviceId/send" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $tenantToken"} `
  -ContentType "application/json" `
  -Body "{`"chatId`":`"$testNumber`",`"message`":`"Hello from CloudWA! This is a test message. 🚀`"}"

$sendData = $sendMessage.Content | ConvertFrom-Json
Write-Host "✅ Message Sent: $($sendData.data.sent)"
Write-Host "✅ Chat ID: $($sendData.data.chatId)"
```

**Expected Result**:
- ✅ Message sent successfully
- ✅ Recipient receives message
- ⏳ Typing simulation delay observed (1-3 seconds)

**Manual Action**: Verify message received on WhatsApp

**Status**: ⏳ Pending Test

---

## 6. Flow Management

### Test: Create Flow
```powershell
$flowJson = @'
{
  "nodes": [
    {"id": "start", "type": "trigger", "data": {"keywords": ["hello", "hi"]}},
    {"id": "msg1", "type": "message", "data": {"text": "Hello! Welcome to CloudWA."}}
  ],
  "edges": [
    {"source": "start", "target": "msg1"}
  ]
}
'@

$createFlow = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev/api/devices/$deviceId/flows" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $tenantToken"} `
  -ContentType "application/json" `
  -Body "{`"name`":`"Test Flow`",`"description`":`"Simple hello flow`",`"triggerKeywords`":`"hello,hi`",`"flowJson`":$flowJson,`"isActive`":true}"

$flowData = $createFlow.Content | ConvertFrom-Json
$flowId = $flowData.data.id

Write-Host "✅ Flow Created: $flowId"
Write-Host "✅ Active: $($flowData.data.isActive)"
```

**Expected Result**:
- ✅ Flow created successfully
- ✅ Flow marked as active
- ✅ Trigger keywords stored

**Status**: ⏳ Pending Test

---

## 7. AI Provider Configuration

### Test: Query Knowledge Base (RAG)
```powershell
# First, verify AI routes are accessible
$kbQuery = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev/api/knowledge-base/query" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $tenantToken"} `
  -ContentType "application/json" `
  -Body '{"query":"What is CloudWA?","provider":"workersai","maxResults":3}'

$queryData = $kbQuery.Content | ConvertFrom-Json
Write-Host "✅ Query Processed"
Write-Host "✅ Answer: $($queryData.data.answer)"
Write-Host "✅ Sources: $($queryData.data.sources.Count)"
```

**Expected Result**:
- ✅ Query processed (even if no documents)
- ✅ AI response generated
- ✅ Workers AI integration working

**Status**: ⏳ Pending Test

---

## 8. Database Integrity

### Test: List Devices
```powershell
$devices = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev/api/devices" `
  -Headers @{"Authorization"="Bearer $tenantToken"}

$deviceList = ($devices.Content | ConvertFrom-Json).data
Write-Host "✅ Total Devices: $($deviceList.Count)"
$deviceList | ForEach-Object {
    Write-Host "  - $($_.displayName) ($($_.sessionStatus))"
}
```

**Expected Result**:
- ✅ Devices listed correctly
- ✅ Only tenant's devices shown (ownership verification)

**Status**: ⏳ Pending Test

---

## 9. Error Handling

### Test: Unauthorized Access
```powershell
try {
    $unauthorized = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev/api/devices" `
      -Headers @{"Authorization"="Bearer invalid-token"}
} catch {
    Write-Host "✅ Unauthorized request rejected (expected)"
    Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)"
}
```

**Expected Result**:
- ✅ Status 401 Unauthorized
- ✅ Error message returned

**Status**: ⏳ Pending Test

---

## 10. Performance Check

### Test: Response Times
```powershell
$endpoints = @(
    "/health",
    "/api/auth/super-admin/login" # (with body)
)

foreach ($endpoint in $endpoints) {
    $start = Get-Date
    $response = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev$endpoint"
    $elapsed = (Get-Date) - $start
    
    Write-Host "✅ $endpoint - $($elapsed.TotalMilliseconds)ms"
}
```

**Expected Result**:
- ✅ Health check < 100ms
- ✅ Login < 500ms
- ✅ All responses < 1s

**Status**: ⏳ Pending Test

---

## Summary Checklist

- [ ] 1. Super Admin login working
- [ ] 2. Tenant registration & login working
- [ ] 3. Device creation & QR generation working
- [ ] 4. WhatsApp connection successful
- [ ] 5. Message sending with anti-ban working
- [ ] 6. Flow creation working
- [ ] 7. AI provider/RAG working
- [ ] 8. Database queries correct
- [ ] 9. Error handling proper
- [ ] 10. Performance acceptable

---

## Next Steps

After all tests pass:
1. ✅ Mark section 9 in task.md as complete
2. ✅ Update PROGRESS.md with test results
3. ✅ Commit verification scripts
4. ✅ Move to Phase 3 (Frontend)

---

**Verification Script**: Run `test-cloudwa.ps1` for automated testing  
**Manual Tests**: Follow this checklist step-by-step  
**Issues**: Document in GitHub issues if any test fails
