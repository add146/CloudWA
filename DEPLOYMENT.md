# CloudWA Flow - Deployment Guide

Step-by-step instructions for pushing to Git and deploying to Cloudflare.

---

## 📋 Prerequisites

Before starting, ensure you have:
- [x] Code implementation complete in `c:\CloudWA`
- [ ] Git installed
- [ ] GitHub account (or other Git provider)
- [ ] Cloudflare account (free tier is fine)
- [ ] Cloudflare API token

---

## Part 1: Push to Git Repository

### Step 1: Initialize Git Repository

Open terminal in `c:\CloudWA` and run:

```bash
cd c:\CloudWA
git init
```

### Step 2: Create .gitignore

The .gitignore is already created in `workers/` directory, but let's create one for the root:

```bash
# Create root .gitignore
echo "node_modules" > .gitignore
echo ".wrangler" >> .gitignore
echo ".dev.vars" >> .gitignore
echo ".env" >> .gitignore
echo "*.log" >> .gitignore
echo ".DS_Store" >> .gitignore
echo "dist" >> .gitignore
```

### Step 3: Stage All Files

```bash
git add .
```

### Step 4: Create Initial Commit

```bash
git commit -m "Initial commit: Phase 2 Backend Core implementation

- Project setup with Cloudflare Workers
- Database schema with 14 tables (Drizzle ORM)
- JWT authentication system
- WhatsApp gateway with Baileys + Durable Objects
- Anti-ban protection (typing simulation)
- Device and flow management routes
- AI integration (OpenAI, Gemini, Workers AI)
- RAG with Vectorize
- Complete API documentation"
```

### Step 5: Create GitHub Repository

**Option A: Via GitHub Website**

1. Go to https://github.com/new
2. Repository name: `CloudWA` (or your preferred name)
3. Description: "SaaS WhatsApp All-in-One with Visual Flow Builder"
4. Choose: Private or Public
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

**Option B: Via GitHub CLI (if installed)**

```bash
gh repo create CloudWA --private --description "SaaS WhatsApp All-in-One"
```

### Step 6: Add Remote and Push

Replace `YOUR_USERNAME` with your GitHub username:

```bash
git remote add origin https://github.com/YOUR_USERNAME/CloudWA.git
git branch -M main
git push -u origin main
```

**If prompted for credentials:**
- Username: Your GitHub username
- Password: Use a Personal Access Token (not your password)
  - Generate at: https://github.com/settings/tokens
  - Required scopes: `repo`

✅ **Code is now on GitHub!**

---

## Part 2: Deploy to Cloudflare

### Step 1: Install/Update Wrangler

```bash
cd c:\CloudWA\workers
npm install -g wrangler@latest
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This will:
1. Open a browser window
2. Ask you to authorize Wrangler
3. Save your credentials locally

**Alternative: Use API Token**

If browser login doesn't work:

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use template "Edit Cloudflare Workers"
4. Copy the token
5. Set environment variable:

```bash
# PowerShell
$env:CLOUDFLARE_API_TOKEN="your_token_here"

# Or create .env file
echo "CLOUDFLARE_API_TOKEN=your_token_here" > .env
```

### Step 3: Create D1 Database

```bash
wrangler d1 create cloudwa-flow-db
```

**Expected output:**
```
✅ Successfully created DB 'cloudwa-flow-db'!

[[d1_databases]]
binding = "DB"
database_name = "cloudwa-flow-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy the `database_id`** and update `wrangler.toml`:

Open `c:\CloudWA\workers\wrangler.toml` and replace:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cloudwa-flow-db"
database_id = ""  # ← PASTE YOUR DATABASE_ID HERE
```

### Step 4: Create R2 Buckets

```bash
wrangler r2 bucket create cloudwa-sessions
wrangler r2 bucket create cloudwa-media
wrangler r2 bucket create cloudwa-docs
```

Expected output for each:
```
✅ Successfully created bucket 'cloudwa-sessions'
```

### Step 5: Create Vectorize Index

```bash
wrangler vectorize create cloudwa-rag-index --dimensions=768 --metric=cosine
```

Expected output:
```
✅ Successfully created index 'cloudwa-rag-index'
```

### Step 6: Create Queue

```bash
wrangler queues create broadcast-queue
```

Expected output:
```
✅ Successfully created queue 'broadcast-queue'
```

### Step 7: Apply Database Migrations

First, apply to remote (production) D1:

```bash
wrangler d1 migrations apply cloudwa-flow-db --remote
```

Expected output:
```
Migrations to be applied:
  └─ 0000_fast_vulture.sql

✅ Successfully applied 1 migration(s)!
```

### Step 8: Set JWT Secret

Generate a strong random secret:

**PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Or use online generator:** https://randomkeygen.com/

Then set it:

```bash
wrangler secret put JWT_SECRET
```

When prompted, paste your generated secret.

Expected output:
```
✅ Successfully created secret JWT_SECRET
```

### Step 9: Deploy Workers

```bash
wrangler deploy
```

Expected output:
```
⛅️ wrangler 4.x.x
-------------------

Total Upload: xxx KiB / gzip: xxx KiB
Uploaded cloudwa-flow (x.xx sec)
Published cloudwa-flow (x.xx sec)
  https://cloudwa-flow.YOUR_SUBDOMAIN.workers.dev
```

**Copy your Worker URL!** You'll need it for testing.

✅ **Backend is now live on Cloudflare!**

---

## Part 3: Create Super Admin

### Step 1: Generate Password Hash

Create a temporary file `hash-password.js`:

```bash
cd c:\CloudWA\workers
```

Create file with this content:

```javascript
const bcrypt = require('bcryptjs');
const password = 'YourSuperSecretPassword123'; // ← Change this!
bcrypt.hash(password, 10).then(hash => {
  console.log('Hashed password:', hash);
});
```

Run it:

```bash
node hash-password.js
```

Copy the hashed password from output.

### Step 2: Insert Super Admin to D1

Replace `$2a$10$HASH_HERE` with your hashed password from Step 1:

```bash
wrangler d1 execute cloudwa-flow-db --remote --command "INSERT INTO super_admins (id, email, password_hash, name, created_at) VALUES (lower(hex(randomblob(16))), 'glowboxstudio@gmail.com', '$2a$10$HASH_HERE', 'Super Admin', datetime('now'))"
```

Expected output:
```
✅ Executed query successfully.
```

### Step 3: Verify Super Admin Created

```bash
wrangler d1 execute cloudwa-flow-db --remote --command "SELECT email, name FROM super_admins"
```

Expected output:
```
┌──────────────────────────┬─────────────┐
│ email                    │ name        │
├──────────────────────────┼─────────────┤
│ glowboxstudio@gmail.com  │ Super Admin │
└──────────────────────────┴─────────────┘
```

✅ **Super Admin is ready!**

---

## Part 4: Test the Deployment

### Step 1: Test Health Endpoint

Replace `YOUR_SUBDOMAIN` with your actual subdomain from Step 9:

```bash
curl https://cloudwa-flow.YOUR_SUBDOMAIN.workers.dev/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-07T00:52:57.000Z"
  }
}
```

### Step 2: Test Super Admin Login

Replace `YOUR_SUBDOMAIN` with your actual subdomain from deployment:

```bash
curl -X POST https://cloudwa-flow.YOUR_SUBDOMAIN.workers.dev/api/auth/super-admin/login -H "Content-Type: application/json" -d "{\"email\":\"glowboxstudio@gmail.com\",\"password\":\"YourSuperSecretPassword123\"}"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "glowboxstudio@gmail.com",
      "name": "Super Admin",
      "role": "super_admin"
    }
  }
}
```

**Save the `token` value!** You'll need it for future API calls.

### Step 3: Test Tenant Registration

```bash
curl -X POST https://cloudwa-flow.YOUR_SUBDOMAIN.workers.dev/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"test123\",\"name\":\"Test User\",\"tenantName\":\"Test Company\"}"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {
      "id": "...",
      "email": "test@example.com",
      "name": "Test User",
      "role": "tenant_admin",
      "tenantId": "...",
      "tenantName": "Test Company"
    }
  }
}
```

### Step 4: Test Device Creation (WhatsApp)

Use the tenant token from Step 3:

```bash
curl -X POST https://cloudwa-flow.YOUR_SUBDOMAIN.workers.dev/api/devices -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TENANT_TOKEN" -d "{\"displayName\":\"Test WhatsApp Bot\",\"gatewayType\":\"baileys\"}"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "displayName": "Test WhatsApp Bot",
    "sessionStatus": "scanning",
    "qrCode": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

**To scan the QR code:**

1. Copy the base64 string (after `data:image/png;base64,`)
2. Use online tool: https://base64.guru/converter/decode/image
3. Or save to file and open:

```bash
# Save QR code (PowerShell)
$qr = "PASTE_BASE64_HERE"
[System.Convert]::FromBase64String($qr) | Set-Content -Path qr.png -Encoding Byte
```

4. Open `qr.png` and scan with WhatsApp mobile app:
   - WhatsApp → Settings → Linked Devices → Link a Device

✅ **All systems operational!**

---

## Part 5: Monitor and Maintain

### View Logs

```bash
wrangler tail
```

This shows real-time logs from your Worker.

### View D1 Data

```bash
# List all tenants
wrangler d1 execute cloudwa-flow-db --remote --command "SELECT * FROM tenants"

# List all devices
wrangler d1 execute cloudwa-flow-db --remote --command "SELECT id, display_name, session_status FROM devices"

# List all users
wrangler d1 execute cloudwa-flow-db --remote --command "SELECT email, name FROM users"
```

### Update Code

After making changes:

```bash
# Commit changes
git add .
git commit -m "Description of changes"
git push

# Deploy to Cloudflare
cd c:\CloudWA\workers
wrangler deploy
```

### Rollback if Needed

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback --message "Rolling back to previous version"
```

---

## 🎉 Deployment Complete!

Your CloudWA Flow backend is now:
- ✅ Version controlled on GitHub
- ✅ Deployed to Cloudflare Workers
- ✅ Database created and migrated
- ✅ R2 buckets ready
- ✅ Vectorize index created
- ✅ Queue configured
- ✅ Super Admin created
- ✅ Tested and verified

**Your API is live at:**
`https://cloudwa-flow.YOUR_SUBDOMAIN.workers.dev`

---

## 📝 Important URLs

Save these for future reference:

- **Worker Dashboard**: https://dash.cloudflare.com > Workers & Pages
- **D1 Dashboard**: https://dash.cloudflare.com > D1
- **R2 Dashboard**: https://dash.cloudflare.com > R2
- **Vectorize Dashboard**: https://dash.cloudflare.com > Vectorize
- **GitHub Repo**: https://github.com/YOUR_USERNAME/CloudWA

---

## 🆘 Troubleshooting

### "Unknown command: d1"
Update wrangler: `npm install -g wrangler@latest`

### "Authentication error"
Re-login: `wrangler login` or `wrangler logout` then `wrangler login`

### "Database not found"
Ensure you updated `wrangler.toml` with the correct `database_id`

### "Permission denied"
Check your Cloudflare API token has correct permissions

### "Deploy failed"
Check syntax errors in code, run `npm run build` to verify

---

## 📞 Need Help?

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers
- Cloudflare Discord: https://discord.gg/cloudflaredev
- Project Issues: Create issue on GitHub repo

---

**Happy Deploying! 🚀**
