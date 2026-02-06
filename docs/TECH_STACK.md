# Tech Stack Documentation

## Overview

CloudWA Flow menggunakan arsitektur **Full Serverless** dengan Cloudflare sebagai satu-satunya infrastructure. WhatsApp Gateway dibangun sendiri menggunakan **Baileys + Durable Objects**.

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
│  │ • Landing Page   │    │ • Webhook Handler│    │ • Baileys Lib  │ │
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

### 2.3 WhatsApp Gateway (Self-Built)

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Library** | Baileys | WhatsApp Web Protocol |
| **Runtime** | Durable Objects | Persistent WebSocket |
| **Storage** | R2 | Session credentials |
| **Anti-Ban** | Custom implementation | Typing simulation |

---

## 3. WhatsApp Gateway Architecture

### 3.1 Durable Object per Device

Setiap nomor WhatsApp yang terhubung memiliki Durable Object sendiri:

```typescript
// src/durable-objects/WhatsAppSession.ts
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState 
} from '@whiskeysockets/baileys';

export class WhatsAppSession {
  private sock: ReturnType<typeof makeWASocket> | null = null;
  private state: DurableObjectState;
  private env: Env;
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/connect':
        return this.handleConnect();
      case '/send':
        return this.handleSendMessage(request);
      case '/disconnect':
        return this.handleDisconnect();
      case '/status':
        return this.handleStatus();
      default:
        return new Response('Not found', { status: 404 });
    }
  }
  
  private async handleConnect(): Promise<Response> {
    // Load auth state from R2
    const { state, saveCreds } = await this.loadAuthState();
    
    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });
    
    // Handle events
    this.sock.ev.on('creds.update', saveCreds);
    this.sock.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(update);
    });
    this.sock.ev.on('messages.upsert', (msg) => {
      this.handleIncomingMessage(msg);
    });
    
    return new Response(JSON.stringify({ status: 'connecting' }));
  }
  
  private async handleSendMessage(request: Request): Promise<Response> {
    const { chatId, message, withTyping } = await request.json();
    
    if (!this.sock) {
      return new Response('Not connected', { status: 400 });
    }
    
    if (withTyping) {
      await this.sendWithTypingSimulation(chatId, message);
    } else {
      await this.sock.sendMessage(chatId, { text: message });
    }
    
    return new Response(JSON.stringify({ success: true }));
  }
  
  // Anti-ban: Typing simulation
  private async sendWithTypingSimulation(
    jid: string, 
    message: string
  ): Promise<void> {
    // 1. Subscribe to presence
    await this.sock!.presenceSubscribe(jid);
    
    // 2. Send "composing" (typing indicator)
    await this.sock!.sendPresenceUpdate('composing', jid);
    
    // 3. Wait based on message length
    const typingDelay = this.calculateTypingDelay(message);
    await this.sleep(typingDelay);
    
    // 4. Send message
    await this.sock!.sendMessage(jid, { text: message });
    
    // 5. Stop typing
    await this.sock!.sendPresenceUpdate('paused', jid);
  }
  
  private calculateTypingDelay(message: string): number {
    const wordsPerMinute = 40;
    const words = message.split(' ').length;
    const baseDelay = (words / wordsPerMinute) * 60 * 1000;
    const randomFactor = 0.8 + Math.random() * 0.4;
    return Math.min(Math.max(baseDelay * randomFactor, 1000), 5000);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async loadAuthState() {
    // Load from R2 storage
    const deviceId = this.state.id.toString();
    const bucket = this.env.SESSION_BUCKET;
    
    // ... R2 auth state implementation
  }
}
```

### 3.2 Worker Entry Point

```typescript
// src/index.ts
import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

// Route to Durable Object
app.post('/api/devices/:deviceId/send', async (c) => {
  const deviceId = c.req.param('deviceId');
  const id = c.env.WHATSAPP_SESSION.idFromName(deviceId);
  const stub = c.env.WHATSAPP_SESSION.get(id);
  
  const body = await c.req.json();
  return stub.fetch(new Request('http://internal/send', {
    method: 'POST',
    body: JSON.stringify(body)
  }));
});

app.get('/api/devices/:deviceId/qr', async (c) => {
  const deviceId = c.req.param('deviceId');
  const id = c.env.WHATSAPP_SESSION.idFromName(deviceId);
  const stub = c.env.WHATSAPP_SESSION.get(id);
  
  return stub.fetch(new Request('http://internal/connect'));
});

export default app;

// Export Durable Object
export { WhatsAppSession } from './durable-objects/WhatsAppSession';
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

### 5.1 Typing Simulation dengan Baileys

```typescript
// Fungsi helper untuk typing simulation
export async function sendWithAntiBan(
  sock: WASocket,
  jid: string,
  message: string,
  config: AntiBanConfig
): Promise<void> {
  if (!config.enabled) {
    await sock.sendMessage(jid, { text: message });
    return;
  }
  
  // 1. Subscribe to presence updates
  await sock.presenceSubscribe(jid);
  
  // 2. Mark as online
  await sock.sendPresenceUpdate('available');
  
  // 3. Start typing indicator
  await sock.sendPresenceUpdate('composing', jid);
  
  // 4. Calculate and wait for typing delay
  const delay = calculateTypingDelay(message, config);
  await sleep(delay);
  
  // 5. Send the message
  await sock.sendMessage(jid, { text: message });
  
  // 6. Stop typing
  await sock.sendPresenceUpdate('paused', jid);
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
    "@whiskeysockets/baileys": "^6.6.0",
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

**Total Estimate: ~$25-35/mo** for 10K active users

> ✅ Lebih hemat dibanding opsi WAHA karena tidak perlu server terpisah!
