# Test login
$loginResponse = Invoke-WebRequest -Uri "https://cloudwa-flow.khibroh.workers.dev/api/auth/super-admin/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"glowboxstudio@gmail.com","password":"CloudWA2026!Secure"}'

$loginResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
