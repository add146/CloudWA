# Tech Stack Documentation

## Overview

CloudWA Flow menggunakan arsitektur **Full Serverless** dengan Cloudflare sebagai satu-satunya infrastructure. WhatsApp Gateway menggunakan **WAHA (WhatsApp HTTP API)** sebagai gateway utama.

---

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE EDGE (Full Stack)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────────┐ │
│  │ Cloudflare Pages │    │ Workers (API)    │    │ Durable Objects│ │
│  │ ─────────────────│    │ ─────────────────│    │ ───────────────│ │
│  │ • Next.js (SSR)  │◄──►│ • Auth API       │◄──►│ • WA Sessions  │ │
│  │ • Dashboard UI   │    │ • Flow Executor  │    │ • WebSocket    │ │
│  │ • Flow Builder   │    │ • Broadcast API  │    │ • State Persist│ │
│  │ • Landing Page   │    │ • Webhook Handler│    │ • WAHA Client  │ │
│  └──────────────────┘    └────────┬─────────┘    └───────┬────────┘ │
│                                   │                      │          │
│    ┌──────────────────────────────┼──────────────────────┼────┐     │
│    │              CLOUDFLARE SERVICES                    │    │     │
│    │                              │                      │    │     │
│    │  ┌────────┐  ┌────────┐  ┌───┴────┐             │    │     │
│    │  │   D1   │  │   R2   │  │ Queues │             │    │     │
│    │  │ SQLite │  │ Storage│  │ Jobs   │◄────────────┘    │     │
│    │  └────────┘  └────────┘  └────────┘                  │     │
│    │                                                          │     │
│    │  ┌────────────────┐  ┌────────────────┐                 │     │
│    │  │   Vectorize    │  │   Workers AI   │                 │     │
│    │  │ Vector Search  │  │ LLM + Embedding│                 │     │
│    │  └────────────────┘  └────────────────┘                 │     │
│    └──────────────────────────────────────────────────────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ WebSocket
                        ┌───────────────────┐
                        │   WhatsApp Server │
                        └───────────────────┘
```

---

## 2. Component Details

### 2.1 Frontend Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Next.js 14 (App Router) | SSR, RSC, SEO |
| **UI Library** | Shadcn/UI | Accessible components |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Flow Builder** | React Flow (@xyflow/react) | Visual node editor |
| **State** | Zustand / React Query | Client state management |
| **Hosting** | Cloudflare Pages | Edge deployment |

### 2.2 Backend Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Cloudflare Workers | Serverless compute |
| **Persistent State** | Durable Objects | WhatsApp session management |
| **Database** | Cloudflare D1 (SQLite) | Relational data |
| **ORM** | Drizzle | Type-safe queries |
| **Object Storage** | Cloudflare R2 | Media & credentials |
| **Auth** | JWT (Stateless) | No storage needed, free tier friendly |
| **Queue** | Cloudflare Queues | Broadcast jobs |
| **Vector DB** | Cloudflare Vectorize | RAG embeddings |
| **AI** | Workers AI | LLM + Embedding |

### 2.3 WhatsApp Gateway (Dual Options)

> 💡 **Switchable per Device**: Setiap device dapat memilih gateway yang berbeda.

| Gateway | Technology | Use Case |
|---------|------------|----------|
| **WAHA** | WhatsApp HTTP API | Personal WA, self-hosted gateway |
| **Cloud API** | Official Meta | Business WA, unlimited messaging |

#### Option A: WAHA (WhatsApp HTTP API)

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Gateway** | WAHA | WhatsApp Web Protocol via HTTP API |
| **Runtime** | Docker / External Server | Persistent session |
| **Storage** | WAHA built-in | Session management |
| **Anti-Ban** | WAHA + Custom | Typing simulation |

#### Option B: WhatsApp Cloud API (Official Meta)

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API** | Graph API v21.0 | Official messaging endpoint |
| **Auth** | System User Token | Permanent access token |
| **Webhook** | Cloudflare Workers | Receive messages |
| **Templates** | Pre-approved | Required for initiating conversations |

**Prerequisites for Cloud API:**
1. Meta Business Account (verified)
2. WhatsApp Business Account
3. Phone number (dedicated for WhatsApp Business)
4. System User with `whatsapp_business_messaging` permission

**Cloud API Endpoints:**
```
Base URL: https://graph.facebook.com/v21.0/{phone_number_id}
- POST /messages         → Send message
- GET  /media/{media_id} → Download media
- POST /media            → Upload media
```

---

## 3. WhatsApp Gateway Architecture

### 3.1 WAHA Gateway Overview

WAHA (WhatsApp HTTP API) adalah Docker container yang menjalankan WhatsApp libraries dan menyediakan REST API yang dapat dipanggil dari Workers.

```
┌─────────────────────────────────────────────────┐
│         Cloudflare Workers (Backend)            │
│                                                  │
│  ┌───────────────────────────────────────┐      │
│  │  Device Routes                        │      │
│  │  - POST /api/devices (start session)  │      │
│  │  - GET  /api/devices/:id (get QR)     │      │
│  │  - POST /api/devices/:id/send         │      │
│  │  - DELETE /api/devices/:id            │      │
│  └─────────────┬─────────────────────────┘      │
│                │                                 │
│                │ HTTP REST API                   │
└────────────────┼─────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         WAHA Server (Docker)                    │
│         Railway / VPS / Self-hosted             │
│                                                  │
│  ┌───────────────────────────────────────┐      │
│  │  WhatsApp Sessions                    │      │
│  │  - Session management                 │      │
│  │  - QR code generation                 │      │
│  │  - Message sending/receiving          │      │
│  │  - Built-in session storage           │      │
│  └───────────────────────────────────────┘      │
│                                                  │
└─────────────────────────────────────────────────┘
                 │
                 │ WebSocket
                 ▼
       ┌─────────────────────┐
       │   WhatsApp Servers  │
       └─────────────────────┘
```

### 3.2 WAHA Client Implementation

```typescript
// src/gateway/waha-client.ts
import type { WAHAConfig, WAHASession } from './waha-client';

export class WAHAClient {
  constructor(private config: WAHAConfig) {}
  
  // Start session and get QR
  async startSession(sessionName: string, webhookUrl?: string): Promise<WAHASession> {
    const response = await fetch(`${this.config.baseUrl}/api/sessions/${sessionName}/start`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhooks: webhookUrl ? [{
          url: webhookUrl,
          events: ['message', 'session.status'],
        }] : undefined,
      }),
    });
    
    return await response.json();
  }
  
  // Send message
  async sendMessage(params: { session: string; chatId: string; text: string }) {
    const response = await fetch(`${this.config.baseUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: params.session,
        chatId: params.chatId.includes('@') ? params.chatId : `${params.chatId}@c.us`,
        text: params.text,
      }),
    });
    
    return await response.json();
  }
}
```

### 3.3 Worker Routes Integration

```typescript
// src/routes/devices.ts
import { WAHAClient } from '@/gateway/waha-client';

// Create device and get QR
devicesRouter.post('/', async (c) => {
  const waha = new WAHAClient({
    baseUrl: c.env.WAHA_BASE_URL,
    apiKey: c.env.WAHA_API_KEY,
  });
  
  // Start WAHA session
  const webhookUrl = `https://${c.req.header('host')}/api/webhook/waha`;
  await waha.startSession(device.id, webhookUrl);
  
  // Get QR code
  const qr = await waha.getQRCode(device.id);
  
  return c.json({
    success: true,
    data: {
      id: device.id,
      qrCode: `data:${qr.mimetype};base64,${qr.data}`,
    },
  });
});

// Send message
devicesRouter.post('/:id/send', async (c) => {
  const { chatId, message } = await c.req.json();
  
  const waha = new WAHAClient({
    baseUrl: c.env.WAHA_BASE_URL,
    apiKey: c.env.WAHA_API_KEY,
  });
  
  await waha.sendMessage({
    session: device.id,
    chatId,
    text: message,
  });
  
  return c.json({ success: true });
});
```

---

## 4. Cloudflare Configuration

### 4.1 wrangler.toml

```toml
name = "cloudwa-flow"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Durable Objects for WhatsApp Sessions
[durable_objects]
bindings = [
  { name = "WHATSAPP_SESSION", class_name = "WhatsAppSession" }
]

[[migrations]]
tag = "v1"
new_classes = ["WhatsAppSession"]

# Database D1
[[d1_databases]]
binding = "DB"
database_name = "cloudwa-flow-db"
database_id = "<D1_DATABASE_ID>"

# Object Storage R2 (for session credentials)
[[r2_buckets]]
binding = "SESSION_BUCKET"
bucket_name = "cloudwa-sessions"

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "cloudwa-media"

# Message Queue for Broadcast
[[queues.producers]]
binding = "BLAST_QUEUE"
queue = "broadcast-queue"

[[queues.consumers]]
queue = "broadcast-queue"
max_batch_size = 10
max_batch_timeout = 5
max_concurrency = 5

# Auth: JWT Stateless (No KV needed - free tier friendly)
# Session token stored in HTTP-only cookie, verified via JWT signature
# No KV namespace required!

# Vector Database for RAG
[[vectorize]]
binding = "VECTOR_INDEX"
index_name = "cloudwa-rag-index"

# Workers AI
[ai]
binding = "AI"
```

### 4.2 Environment Variables

```env
# Cloudflare (set in dashboard)
CF_ACCOUNT_ID=your_account_id
CF_API_TOKEN=your_api_token

# Auth
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Payment (optional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 5. Anti-Ban Implementation

### 5.1 Typing Simulation dengan WAHA

```typescript
// Fungsi helper untuk typing simulation via WAHA
export async function sendWithAntiBan(
  wahaClient: WAHAClient,
  chatId: string,
  message: string,
  config: AntiBanConfig
): Promise<void> {
  if (!config.enabled) {
    await wahaClient.sendText(chatId, message);
    return;
  }
  
  // 1. Start typing indicator
  await wahaClient.startTyping(chatId);
  
  // 2. Calculate and wait for typing delay
  const delay = calculateTypingDelay(message, config);
  await sleep(delay);
  
  // 3. Send the message
  await wahaClient.sendText(chatId, message);
  
  // 4. Stop typing
  await wahaClient.stopTyping(chatId);
}

function calculateTypingDelay(
  message: string, 
  config: AntiBanConfig
): number {
  const { typingMin, typingMax } = config;
  
  // Base delay on message length
  const words = message.split(' ').length;
  const baseMs = words * 100; // 100ms per word
  
  // Add randomness within min-max range
  const minMs = typingMin * 1000;
  const maxMs = typingMax * 1000;
  
  const finalDelay = Math.max(minMs, Math.min(baseMs, maxMs));
  
  // Add ±20% randomness
  const randomFactor = 0.8 + Math.random() * 0.4;
  return Math.round(finalDelay * randomFactor);
}

interface AntiBanConfig {
  enabled: boolean;
  typingMin: number; // seconds
  typingMax: number; // seconds
}
```

### 5.2 Broadcast dengan Rate Limiting

```typescript
// Queue consumer untuk broadcast
export async function handleBroadcastBatch(
  batch: MessageBatch<BroadcastItem>,
  env: Env
): Promise<void> {
  for (const msg of batch.messages) {
    const item = msg.body;
    
    try {
      // Get Durable Object for this device
      const id = env.WHATSAPP_SESSION.idFromName(item.deviceId);
      const stub = env.WHATSAPP_SESSION.get(id);
      
      // Send with typing simulation
      await stub.fetch(new Request('http://internal/send', {
        method: 'POST',
        body: JSON.stringify({
          chatId: item.phone + '@s.whatsapp.net',
          message: item.renderedMessage,
          withTyping: true
        })
      }));
      
      // Update status
      await updateCampaignItemStatus(env.DB, item.id, 'sent');
      
      // Wait between messages (rate limiting)
      const gap = calculateMessageGap(item.rateConfig);
      await sleep(gap);
      
      msg.ack();
      
    } catch (error) {
      await updateCampaignItemStatus(env.DB, item.id, 'failed');
      msg.ack();
    }
  }
}

function calculateMessageGap(config: RateConfig): number {
  const { minGap, maxGap } = config;
  const gap = minGap + Math.random() * (maxGap - minGap);
  
  // 10% chance of longer pause (2x)
  if (Math.random() < 0.1) {
    return gap * 2 * 1000;
  }
  
  return gap * 1000;
}
```

---

## 6. Dependency Versions

### 6.1 package.json

```json
{
  "dependencies": {
    "next": "^14.1.0",
    "@xyflow/react": "^12.0.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "^1.0.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.0.0",
    "lucide-react": "^0.300.0",
    "hono": "^4.0.0",
    "drizzle-orm": "^0.29.0",
    "jose": "^5.2.0",
    "qrcode": "^1.5.0"
  },
  "devDependencies": {
    "wrangler": "^3.30.0",
    "drizzle-kit": "^0.20.0",
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.3.0"
  }
}
```

---

## 7. Deployment

### 7.1 Deploy to Cloudflare

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Deploy Workers + Durable Objects
npx wrangler deploy

# Deploy Pages (frontend)
npx wrangler pages deploy .vercel/output/static
```

### 7.2 CI/CD (GitHub Actions)

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install & Build
        run: |
          npm ci
          npm run build
          
      - name: Deploy Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: deploy
          
      - name: Deploy Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: pages deploy .vercel/output/static --project-name=cloudwa-flow
```

---

## 8. Estimated Costs

| Service | Free Tier | Paid Estimate (10K users) |
|---------|-----------|---------------------------|
| **Workers** | 100K req/day | $5/mo |
| **Durable Objects** | 1M req/mo | ~$5/mo (requests + storage) |
| **D1** | 5GB | $5/mo (25GB) |
| **R2** | 10GB + 10M ops | $10/mo (50GB) |
| **Queues** | 1M ops | $0.40/million |
| **Vectorize** | 30M vectors | $0.01/1K vectors |
| **Workers AI** | 10K neurons/day | Pay-per-use |

**Total Estimate: ~$25-35/mo** for 10K active users (tidak termasuk WAHA server)

> 💡 WAHA dapat di-host secara self-hosted atau menggunakan layanan cloud terpisah.
