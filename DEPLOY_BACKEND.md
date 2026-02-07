# Deploy Backend CloudWA ke Cloudflare

Panduan deployment khusus untuk **Backend Workers** dengan akun `glowboxstudio@gmail.com`.

---

## ✅ Status Saat Ini

- ✅ Code sudah di GitHub: `https://github.com/add146/CloudWA`
- ✅ Wrangler sudah login dengan akun: `glowboxstudio@gmail.com`
- ✅ D1 Database sudah dibuat: `cloudwa-flow-db`
- ✅ R2 Buckets sudah dibuat: `cloudwa-sessions`, `cloudwa-media`, `cloudwa-docs`
- ✅ Vectorize Index sudah dibuat: `cloudwa-rag-index`
- ❌ Queue perlu dibuat manual (opsional untuk testing awal)

---

## 🚀 Deploy Steps

### Step 1: Fix Migration Path

Buka file `c:\CloudWA\workers\wrangler.toml` dan tambahkan setelah baris `compatibility_flags`:

```toml
# Migrations directory
[d1_databases]
migrations_dir = "src/db/migrations"
```

Atau edit yang sudah ada menjadi:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cloudwa-flow-db"  
database_id = "58b4564b-debc-4248-aede-5e6c8b1c57c1"
migrations_dir = "src/db/migrations"
```

### Step 2: Apply Database Migrations

```bash
cd c:\CloudWA\workers
npx wrangler d1 migrations apply cloudwa-flow-db --remote
```

Expected output:
```
Migrations to be applied:
  └─ 0000_fast_vulture.sql

✅ Successfully applied 1 migration(s)!
```

### Step 3: Generate JWT Secret

Buka PowerShell dan run:

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Copy hasilnya, contoh: `9kD2mF7nP3qW8xR5tY1vC4bN6hJ0sL3a`

### Step 4: Set JWT Secret ke Cloudflare

```bash
npx wrangler secret put JWT_SECRET
```

Paste secret yang di-generate tadi ketika diminta.

Expected output:
```
✅ Successfully created secret JWT_SECRET
```

### Step 5: Create Super Admin

**5.1. Generate Password Hash**

Buat file sementara `hash.js`:

```javascript
const bcrypt = require('bcryptjs');
const password = 'CloudWA2026!Secure'; // ← Ganti dengan password Anda
bcrypt.hash(password, 10).then(hash => {
  console.log('Hashed password:');
  console.log(hash);
});
```

Run:
```bash
cd c:\CloudWA\workers
node hash.js
```

Copy hash yang dihasilkan (mulai dengan `$2a$10$...`)

**5.2. Insert ke Database**

Ganti `HASH_DARI_STEP_5.1` dengan hash yang baru saja di-generate:

```bash
npx wrangler d1 execute cloudwa-flow-db --remote --command "INSERT INTO super_admins (id, email, password_hash, name, created_at) VALUES (lower(hex(randomblob(16))), 'glowboxstudio@gmail.com', 'HASH_DARI_STEP_5.1', 'Super Admin', datetime('now'))"
```

**5.3. Verify**

```bash
npx wrangler d1 execute cloudwa-flow-db --remote --command "SELECT email, name FROM super_admins"
```

Expected output:
```
┌──────────────────────────┬─────────────┐
│ email                    │ name        │
├──────────────────────────┼─────────────┤
│ glowboxstudio@gmail.com  │ Super Admin │
└──────────────────────────┴─────────────┘
```

### Step 6: Deploy Workers

```bash
cd c:\CloudWA\workers
npx wrangler deploy
```

Expected output:
```
⛅️ wrangler 4.63.0
-------------------

Total Upload: xxx KiB / gzip: xxx KiB
Uploaded cloudwa-flow (x.xx sec)
Published cloudwa-flow (x.xx sec)
  https://cloudwa-flow.YOUR_SUBDOMAIN.workers.dev
```

**SAVE YOUR WORKER URL!**

---

## 🧪 Testing

### Test 1: Health Check

Ganti `YOUR_SUBDOMAIN` dengan subdomain yang didapat dari deployment:

```bash
curl https://cloudwa-flow.YOUR_SUBDOMAIN.workers.dev/health
```

Expected:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-07T01:05:00.000Z"
  }
}
```

### Test 2: Super Admin Login

```bash
curl -X POST https://cloudwa-flow.YOUR_SUBDOMAIN.workers.dev/api/auth/super-admin/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"glowboxstudio@gmail.com\",\"password\":\"CloudWA2026!Secure\"}"
```

Expected:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "xxx",
      "email": "glowboxstudio@gmail.com",
      "name": "Super Admin",
      "role": "super_admin"
    }
  }
}
```

**SAVE THE TOKEN!** Anda akan gunakan untuk API calls berikutnya.

### Test 3: Register Tenant (Optional)

```bash
curl -X POST https://cloudwa-flow.YOUR_SUBDOMAIN.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"test123\",\"name\":\"Test User\",\"tenantName\":\"Test Company\"}"
```

### Test 4: Create WhatsApp Device

Gunakan token dari Test 2:

```bash
curl -X POST https://cloudwa-flow.YOUR_SUBDOMAIN.workers.dev/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"displayName\":\"Test WhatsApp Bot\",\"gatewayType\":\"baileys\"}"
```

Response akan berisi QR code (base64). Decode dan scan dengan WhatsApp.

---

## 📊 Cloudflare Dashboard

Monitor deployment di:
- **Workers**: https://dash.cloudflare.com → Workers & Pages
- **D1**: https://dash.cloudflare.com → D1
- **R2**: https://dash.cloudflare.com → R2
- **Vectorize**: https://dash.cloudflare.com → Vectorize

---

## 🔧 Troubleshooting

### "Migrations not found"
- Pastikan sudah tambahkan `migrations_dir` di wrangler.toml
- Path: `src/db/migrations` (bukan `migrations`)

### "Database not found"
- Cek `database_id` di wrangler.toml sudah benar
- ID: `58b4564b-debc-4248-aede-5e6c8b1c57c1`

### "Invalid token"
- JWT_SECRET belum di-set
- Run: `npx wrangler secret put JWT_SECRET`

### Deploy gagal
```bash
# Check syntax
cd c:\CloudWA\workers
npm run build

# View logs
npx wrangler tail
```

---

## ✅ Checklist Deployment

- [ ] Migration path fixed di wrangler.toml
- [ ] Migrations applied ke D1
- [ ] JWT secret di-set
- [ ] Super Admin created dengan email `glowboxstudio@gmail.com`
- [ ] Workers deployed successfully
- [ ] Health endpoint tested
- [ ] Super Admin login tested
- [ ] Worker URL saved

---

## 🎯 Next Steps

Setelah backend deployed:

1. **Setup Postman/Insomnia** - Import API endpoints untuk testing
2. **Test WhatsApp Connection** - Create device & scan QR
3. **Create AI Provider** - Add OpenAI/Gemini API key (via Super Admin)
4. **Phase 3: Frontend** - Build Next.js dashboard

---

**Account**: glowboxstudio@gmail.com  
**GitHub**: https://github.com/add146/CloudWA  
**Backend Ready**: ✅
