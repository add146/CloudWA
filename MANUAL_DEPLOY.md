# Manual Deployment - Cloudflare Workers

**Ready to Deploy!** Code sudah di GitHub, build verified (319 KiB).

Karena ada network issue dengan wrangler, berikut cara deploy manual.

---

## Method 1: Via Cloudflare Dashboard (Easiest)

### Step 1: Login Dashboard
Go to: https://dash.cloudflare.com

### Step 2: Open Worker
1. Click **Workers & Pages**
2. Click **cloudwa-flow**

###Step 3: Set Missing Environment Variable
1. Go to **Settings** tab
2. Scroll to **Environment Variables**
3. Click **Edit variables**
4. Add:
   - **Name**: `WAHA_API_KEY`
   - **Type**: Secret
   - **Value**: `060731d7987a4c7ebd23a173a8fdb158`
5. **Save**

### Step 4: Create New Deployment
1. Go to **Deployments** tab  
2. Click **Create deployment**
3. **Upload** option → drag `workers` folder atau:
4. **Connect to Git** → select repository `add146/CloudWA`
   - Root directory: `workers`
   - Build command: (leave empty)
5. Click **Save and Deploy**

---

## Method 2: Retry Wrangler (When Network OK)

### Step 1: Update Wrangler
```bash
npm install -g wrangler@latest
```

### Step 2: Set Missing Secret
```bash
cd c:\CloudWA\workers
npx wrangler secret put WAHA_API_KEY
# Enter: 060731d7987a4c7ebd23a173a8fdb158
```

### Step 3: Deploy
```bash
npx wrangler deploy
```

---

## After Deployment

### Get Worker URL
Your Worker will be at:
```
https://cloudwa-flow.YOUR_ACCOUNT.workers.dev
```

Or check custom domain if configured.

### Test Health Endpoint
```powershell
curl https://cloudwa-flow.YOUR_ACCOUNT.workers.dev/health
```

Expected:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "gateway": "WAHA + Cloud API"
  }
}
```

### Test Login  
```powershell
Invoke-WebRequest -Uri "https://cloudwa-flow.YOUR_ACCOUNT.workers.dev/api/auth/super-admin/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"glowboxstudio@gmail.com","password":"CloudWA2026!Secure"}' | 
  Select-Object -ExpandProperty Content
```

Save the `token` from response.

### Create Device
```powershell
$token = "YOUR_TOKEN_HERE"

Invoke-WebRequest -Uri "https://cloudwa-flow.YOUR_ACCOUNT.workers.dev/api/devices" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"} `
  -ContentType "application/json" `
  -Body '{"displayName":"My WhatsApp","gatewayType":"waha"}' |
  Select-Object -ExpandProperty Content
```

Response will include QR code (base64).

---

## Summary

**✅ Ready:**
- Code on GitHub: https://github.com/add146/CloudWA
- Build: 319 KiB  
- WAHA: https://waha.khibroh.com
- Secrets Set: JWT_SECRET, WAHA_BASE_URL

**⏳ Manual:**
1. Set `WAHA_API_KEY` via dashboard
2. Deploy via dashboard or wrangler
3. Test endpoints

**Time**: ~5 minutes 🚀
