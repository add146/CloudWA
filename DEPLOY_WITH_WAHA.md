# CloudWA - Deployment Guide with WAHA

## ✅ WAHA Gateway Ready!

**Your WAHA Instance:**
- URL: `https://waha.khibroh.com`
- API Key: `060731d7987a4c7ebd23a173a8fdb158`
- Default Session: `default`

---

## 🚀 Quick Deployment Steps

### Step 1: Set WAHA Credentials (Manual)

Karena ada network issue di wrangler, set secrets via Cloudflare Dashboard:

1. Go to: https://dash.cloudflare.com
2. Workers & Pages → `cloudwa-flow`
3. Settings → Variables → Add variable

Add these environment variables:

| Name | Type | Value |
|------|------|-------|
| `WAHA_BASE_URL` | Secret | `https://waha.khibroh.com` |
| `WAHA_API_KEY` | Secret | `060731d7987a4c7ebd23a173a8fdb158` |

**Atau via wrangler (jika network sudah oke):**

```bash
cd c:\CloudWA\workers

# Set WAHA Base URL
npx wrangler secret put WAHA_BASE_URL
# Enter: https://waha.khibroh.com

# Set WAHA API Key  
npx wrangler secret put WAHA_API_KEY
# Enter: 060731d7987a4c7ebd23a173a8fdb158
```

---

### Step 2: Deploy Workers

```bash
npx wrangler deploy
```

Jika masih ada network error, coba:
1. Restart terminal
2. Pindah ke CMD (bukan PowerShell)
3. Atau deploy via Cloudflare Dashboard > Workers & Pages

---

### Step 3: Test WAHA Connection

Setelah Workers deployed, test connection:

```bash
curl https://YOUR_WORKER_URL/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "...",
    "gateway": "WAHA + Cloud API"
  }
}
```

---

### Step 4: Create WhatsApp Device

Login dulu untuk get token:

```bash
curl -X POST https://YOUR_WORKER_URL/api/auth/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"glowboxstudio@gmail.com","password":"CloudWA2026!Secure"}'
```

Save the `token`, then create device:

```bash
curl -X POST https://YOUR_WORKER_URL/api/devices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"WhatsApp Bot","gatewayType":"waha"}'
```

**Response should include:**
```json
{
  "success": true,
  "data": {
    "id": "device-id-here",
    "displayName": "WhatsApp Bot",
    "sessionStatus": "scanning",
    "qrCode": "data:image/png;base64,..."
  }
}
```

---

### Step 5: Scan QR Code

1. Decode QR code dari base64
2. Atau get QR via status endpoint:

```bash
curl https://YOUR_WORKER_URL/api/devices/DEVICE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. Scan dengan WhatsApp mobile app:
   - WhatsApp → Settings → Linked Devices → Link a Device

---

### Step 6: Test Send Message

Setelah connected:

```bash
curl -X POST https://YOUR_WORKER_URL/api/devices/DEVICE_ID/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"628123456789","message":"Hello from CloudWA!"}'
```

---

## 🧪 Test WAHA Directly (Optional)

Test koneksi langsung ke WAHA:

### Check WAHA Status
```bash
curl https://waha.khibroh.com/api/sessions \
  -H "X-Api-Key: 060731d7987a4c7ebd23a173a8fdb158"
```

### Start Session
```bash
curl -X POST https://waha.khibroh.com/api/sessions/test-session/start \
  -H "X-Api-Key: 060731d7987a4c7ebd23a173a8fdb158" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Get QR Code
```bash
curl https://waha.khibroh.com/api/sessions/test-session/qr \
  -H "X-Api-Key: 060731d7987a4c7ebd23a173a8fdb158"
```

---

## 📋 Current Status

**✅ Completed:**
- Database (D1) with 14 tables
- JWT Secret set
- Super Admin created
- WAHA credentials ready (need to set in dashboard)
- Workers code refactored for WAHA
- Dry-run successful (319 KiB)

**⏳ Pending:**
- Set WAHA environment variables (manual via dashboard)
- Deploy Workers (retry wrangler deploy)
- Test device creation & QR scan

---

## 🔧 Troubleshooting

### "Session not found"
WAHA session belum di-start. Workers akan auto-start ketika create device.

### "Invalid API Key"
Check WAHA_API_KEY sudah di-set correct: `060731d7987a4c7ebd23a173a8fdb158`

### "Cannot connect to WAHA"
Check WAHA_BASE_URL: `https://waha.khibroh.com` (no trailing slash)

### Wrangler network error
- Use Cloudflare dashboard untuk set secrets
- Try CMD instead of PowerShell
- Update wrangler: `npm install -g wrangler@latest`

---

## 📌 Quick Reference

**Account**: glowboxstudio@gmail.com  
**Super Admin Password**: CloudWA2026!Secure  
**WAHA URL**: https://waha.khibroh.com  
**WAHA API Key**: 060731d7987a4c7ebd23a173a8fdb158  
**Database ID**: 75b8fc35-c6cb-4994-9938-e1e159c18356  

**Next**: Frontend development (Phase 3) 🚀
