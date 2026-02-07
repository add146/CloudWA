# CloudWA Flow - Setup Guide

## Prerequisites

Before you begin, ensure you have:
- **Node.js 20+** installed
- **Cloudflare Account** (free tier is sufficient)
- **Wrangler CLI** configured with your Cloudflare account

## Step 1: Install Dependencies

```bash
cd workers
npm install
```

## Step 2: Configure Cloudflare Account

Login to Cloudflare:

```bash
npx wrangler login
```

## Step 3: Create Cloudflare Resources

### 3.1 Create D1 Database

```bash
npx wrangler d1 create cloudwa-flow-db
```

**Important**: Copy the `database_id` from the output and update `wrangler.toml`:

```toml
[[ d1_databases]]
binding = "DB"
database_name = "cloudwa-flow-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ← Update this!
```

### 3.2 Create R2 Buckets

```bash
npx wrangler r2 bucket create cloudwa-sessions
npx wrangler r2 bucket create cloudwa-media
npx wrangler r2 bucket create cloudwa-docs
```

### 3.3 Create Vectorize Index

```bash
npx wrangler vectorize create cloudwa-rag-index --dimensions=768 --metric=cosine
```

### 3.4 Create Queue

```bash
npx wrangler queues create broadcast-queue
```

## Step 4: Setup Database Schema

### 4.1 Generate Migrations (Already Done)

The migrations have been generated in `src/db/migrations/`.

### 4.2 Apply Migrations to Local D1

```bash
npx wrangler d1 migrations apply cloudwa-flow-db --local
```

### 4.3 Apply Migrations to Remote D1

```bash
npx wrangler d1 migrations apply cloudwa-flow-db --remote
```

## Step 5: Set Environment Secrets

### 5.1 JWT Secret

```bash
npx wrangler secret put JWT_SECRET
```

When prompted, enter a strong random string (at least 32 characters).

You can generate one with:

```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

## Step 6: Create Initial Super Admin

Since we use stateless JWT, we need to manually insert the first Super Admin:

### 6.1 Generate Password Hash

Create a simple Node script to hash your password:

```javascript
// hash-password.js
const bcrypt = require('bcryptjs');
const password = 'YourSuperSecretPassword123';
bcrypt.hash(password, 10).then(hash => {
  console.log('Hashed password:', hash);
});
```

Run it:

```bash
node hash-password.js
```

### 6.2 Insert Super Admin to D1

```bash
npx wrangler d1 execute cloudwa-flow-db --remote --command "
INSERT INTO super_admins (id, email, password_hash, name)
VALUES (
  lower(hex(randomblob(16))),
  'superadmin@cloudwa.com',
  'YOUR_BCRYPT_HASH_HERE',
  'Super Admin'
)
"
```

## Step 7: Deploy

### 7.1 Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

### 7.2 Get Your Worker URL

After deployment, you'll see the Worker URL (e.g., `https://cloudwa-flow.your-subdomain.workers.dev`)

## Step 8: Test the API

### 8.1 Health Check

```bash
curl https://cloudwa-flow.your-subdomain.workers.dev/health
```

### 82 Super Admin Login

```bash
curl -X POST https://cloudwa-flow.your-subdomain.workers.dev/api/auth/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@cloudwa.com",
    "password": "YourSuperSecretPassword123"
  }'
```

### 8.3 Register a Tenant

```bash
curl -X POST https://cloudwa-flow.your-subdomain.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword",
    "name": "Admin User",
    "tenantName": "Example Company"
  }'
```

You'll get a JWT token in the response. Save this for subsequent requests.

### 8.4 Create a WhatsApp Device

```bash
curl -X POST https://cloudwa-flow.your-subdomain.workers.dev/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "displayName": "My WhatsApp Bot",
    "gatewayType": "baileys"
  }'
```

The response will contain a QR code (base64). Decode and scan it with WhatsApp:

```bash
# Save QR code to file
echo "BASE64_STRING" | base64 -d > qr.png
```

### 8.5 Check Device Status

```bash
curl https://cloudwa-flow.your-subdomain.workers.dev/api/devices/DEVICE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 9: Local Development

For local development with live reload:

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`.

You can use the local D1 database:

```bash
npx wrangler d1 migrations apply cloudwa-flow-db --local
```

## Troubleshooting

### "Database not found"

Make sure you:
1. Created the D1 database with `wrangler d1 create`
2. Updated `wrangler.toml` with the correct `database_id`
3. Applied migrations with `wrangler d1 migrations apply`

### "R2 bucket not found"

Create all three buckets:
```bash
npx wrangler r2 bucket create cloudwa-sessions
npx wrangler r2 bucket create cloudwa-media
npx wrangler r2 bucket create cloudwa-docs
```

### "Vectorize index not found"

```bash
npx wrangler vectorize create cloudwa-rag-index --dimensions=768 --metric=cosine
```

### Network/Fetch Errors

If wrangler commands fail with fetch errors:
1. Check your internet connection
2. Try updating wrangler: `npm install -g wrangler@latest`
3. Clear wrangler cache: Remove `~/.wrangler` directory

## Next Steps

1. **Deploy Frontend** - Set up Next.js frontend (Phase 3)
2. **Configure AI Providers** - Add OpenAI/Gemini API keys via Super Admin
3. **Create Flows** - Build chatbot flows with the visual builder
4. **Test Broadcasting** - Set up broadcast campaigns

## Support

For issues or questions:
- GitHub: https://github.com/your-repo/CloudWA
- Documentation: See `/docs` folder

---

**Happy Building! 🚀**
