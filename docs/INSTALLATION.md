# Installation Guide - CloudWA Flow

Panduan langkah demi langkah untuk setup CloudWA Flow SaaS.

---

## Prerequisites

### Required Accounts
- [ ] [Cloudflare Account](https://dash.cloudflare.com/sign-up) (Workers, D1, R2, Queues)
- [ ] [GitHub Account](https://github.com) (untuk repository)
- [ ] Domain name (opsional, bisa pakai *.workers.dev)

### Required Tools
- [ ] Node.js v18+ 
- [ ] npm atau pnpm
- [ ] Git
- [ ] Wrangler CLI (`npm install -g wrangler`)

### Optional (untuk WhatsApp Cloud API)
- [ ] Meta Business Account (verified)
- [ ] WhatsApp Business Account

---

## Step 1: Clone & Setup Project

```bash
# Clone repository
git clone https://github.com/add146/CloudWA.git
cd CloudWA

# Install dependencies
npm install

# Login ke Cloudflare
wrangler login
```

---

## Step 2: Create Cloudflare Resources

### 2.1 Create D1 Database
```bash
wrangler d1 create cloudwa-db
```
Copy database_id yang muncul ke `wrangler.toml`

### 2.2 Create R2 Bucket
```bash
wrangler r2 bucket create cloudwa-storage
```

### 2.3 Create Queues
```bash
wrangler queues create broadcast-queue
```

---

## Step 3: Configure Environment

### 3.1 Update wrangler.toml
```toml
name = "cloudwa-api"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "cloudwa-db"
database_id = "<YOUR_DATABASE_ID>"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "cloudwa-storage"

[[queues.producers]]
queue = "broadcast-queue"
binding = "BROADCAST_QUEUE"

[durable_objects]
bindings = [
  { name = "WHATSAPP_SESSION", class_name = "WhatsAppSession" }
]
```

### 3.2 Set Secrets
```bash
# JWT Secret untuk auth
wrangler secret put JWT_SECRET

# Super Admin credentials (first run)
wrangler secret put SUPER_ADMIN_EMAIL
wrangler secret put SUPER_ADMIN_PASSWORD
```

---

## Step 4: Run Database Migrations

```bash
# Apply migrations
wrangler d1 execute cloudwa-db --file=./migrations/0001_initial.sql
```

---

## Step 5: Deploy

### Development
```bash
npm run dev
# atau
wrangler dev
```

### Production
```bash
npm run deploy
# atau
wrangler deploy
```

---

## Step 6: Initial Setup

### 6.1 Access Super Admin
1. Buka `https://your-domain.workers.dev/admin`
2. Login dengan SUPER_ADMIN_EMAIL & SUPER_ADMIN_PASSWORD
3. Setup AI providers (ChatGPT, Gemini, dll)

### 6.2 Create First Tenant
1. Super Admin → Tenants → Create
2. Input: name, email, subscription plan
3. Tenant akan dapat link untuk setup password

---

## Step 7: Connect WhatsApp Device

### Option A: WAHA (Personal WA)
1. Tenant login → Devices → Add Device
2. Pilih "WAHA (Personal WhatsApp)"
3. Input WAHA server URL dan API Key
4. Scan QR code dengan WhatsApp mobile

### Option B: Cloud API (Business WA)
1. Tenant login → Devices → Add Device
2. Pilih "WhatsApp Cloud API"
3. Input:
   - Phone Number ID
   - WhatsApp Business Account ID
   - Access Token
   - Verify Token

---

## Verification

### Check API Health
```bash
curl https://your-domain.workers.dev/api/health
```

### Expected Response
```json
{
  "status": "ok",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| D1 connection error | Check database_id di wrangler.toml |
| R2 permission denied | Re-run `wrangler login` |
| QR not appearing | Check Durable Object binding |
| Cloud API 401 | Verify access token permissions |

---

## Next Steps

Setelah instalasi selesai:
1. Review [API Reference](./API_REFERENCE.md)
2. Baca [Anti-Ban Strategy](./ANTI_BAN_STRATEGY.md)
3. Setup flows sesuai [User Flow](./USER_FLOW.md)
4. Customize UI dengan [UI/UX Guidelines](./UI_UX_GUIDELINES.md)
