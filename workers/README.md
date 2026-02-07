# CloudWA Flow - Workers Backend

Backend infrastructure untuk CloudWA Flow menggunakan Cloudflare Workers, Durable Objects, D1, R2, dan Baileys.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd workers
npm install
```

### 2. Create D1 Database

```bash
npx wrangler d1 create cloudwa-flow-db
```

Copy the `database_id` dari output dan update di `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cloudwa-flow-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 3. Generate Database Migrations

```bash
npm run db:generate
```

### 4. Apply Migrations (Local)

```bash
npm run db:migrate:local
```

### 5. Create R2 Buckets

```bash
npx wrangler r2 bucket create cloudwa-sessions
npx wrangler r2 bucket create cloudwa-media
npx wrangler r2 bucket create cloudwa-docs
```

### 6. Create Vectorize Index

```bash
npx wrangler vectorize create cloudwa-rag-index --dimensions=768 --metric=cosine
```

### 7. Create Queue

```bash
npx wrangler queues create broadcast-queue
```

### 8. Set JWT Secret

```bash
npx wrangler secret put JWT_SECRET
# Enter your secret when prompted
```

### 9. Run Development Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:8787`

## 📝 API Documentation

### Health Check

```bash
curl http://localhost:8787/health
```

### Register Tenant

```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "name": "Admin",
    "tenantName": "My Company"
  }'
```

### Login

```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

Response akan berisi `token` yang digunakan untuk request berikutnya.

### Create Device (Get QR Code)

```bash
curl -X POST http://localhost:8787/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "displayName": "WhatsApp Bot",
    "gatewayType": "baileys"
  }'
```

Response akan berisi QR code (base64) yang perlu di-scan.

### Get Device Status

```bash
curl http://localhost:8787/api/devices/DEVICE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Send Message

```bash
curl -X POST http://localhost:8787/api/devices/DEVICE_ID/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "chatId": "6281234567890",
    "message": "Hello from CloudWA!"
  }'
```

## 🧪 Testing

### Create Super Admin (Manual)

```bash
npx wrangler d1 execute cloudwa-flow-db --local --command "
INSERT INTO super_admins (id, email, password_hash, name)
VALUES (
  lower(hex(randomblob(16))),
  'superadmin@cloudwa.com',
  '\$2a\$10\$EXAMPLE_HASH',
  'Super Admin'
)
"
```

Gunakan bcrypt untuk generate hash dari password Anda.

## 📦 Deployment

### Deploy to Cloudflare

```bash
# Apply migrations to production D1
npm run db:migrate:prod

# Deploy workers
npm run deploy
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Cloudflare Workers                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │   Hono API   │◄──►│ Durable      │                  │
│  │   Routes     │    │ Objects      │                  │
│  └──────┬───────┘    │ (WhatsApp)   │                  │
│         │            └──────┬───────┘                  │
│         │                   │                           │
│    ┌────┴────────────────────┴──────┐                  │
│    │  D1   R2   Queues   Vectorize  │                  │
│    └────────────────────────────────┘                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Development

### Database Schema Updates

1. Edit `src/db/schema.ts`
2. Generate migrations: `npm run db:generate`
3. Apply to local D1: `npm run db:migrate:local`
4. Test locally
5. Apply to production: `npm run db:migrate:prod`

### View Database (Drizzle Studio)

```bash
npm run db:studio
```

## 📚 Features

- ✅ JWT-based authentication (stateless)
- ✅ Multi-tenant architecture
- ✅ WhatsApp gateway dengan Baileys + Durable Objects
- ✅ Anti-ban typing simulation
- ✅ Flow management (CRUD)
- ✅ AI integration (OpenAI, Gemini, Workers AI)
- ✅ RAG dengan Vectorize
- ⏳ Flow execution engine (TODO)
- ⏳ Broadcast queue processor (TODO)
- ⏳ Knowledge base document processing (TODO)

## 🐛 Troubleshooting

### Database not found

Make sure you created the D1 database and updated `wrangler.toml` with the correct `database_id`.

### R2 bucket not found

Create all required R2 buckets using `wrangler r2 bucket create`.

### Baileys connection issues

1. Check if Durable Objects are properly configured in `wrangler.toml`
2. Verify R2 bucket ACCESS for session storage
3. Check console logs for specific errors

## 📄 License

MIT
