# Database Schema Documentation

## Overview

CloudWA Flow menggunakan **Cloudflare D1** (SQLite) sebagai database utama dengan penyimpanan tambahan di R2 dan Vectorize. **KV tidak digunakan** untuk mengoptimalkan free tier.

---

## 1. Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   TENANTS   │◄──────│    USERS    │       │   DEVICES   │
│             │       │             │       │             │
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ name        │       │ tenant_id   │──────►│ tenant_id   │
│ email       │       │ email       │       │ phone_number│
│ plan        │       │ password    │       │ status      │
│ settings    │       │ role        │       │ waha_session│
└──────┬──────┘       └─────────────┘       └──────┬──────┘
       │                                          │
       │                                          │
       ▼                                          ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  CONTACTS   │       │    FLOWS    │◄──────│  MESSAGES   │
│             │       │             │       │             │
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ tenant_id   │       │ device_id   │       │ device_id   │
│ phone       │       │ name        │       │ contact     │
│ name        │       │ trigger     │       │ direction   │
│ tags        │       │ flow_json   │       │ content     │
└─────────────┘       │ is_active   │       │ timestamp   │
                      └──────┬──────┘       └─────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │FLOW_SESSIONS│
                      │             │
                      │ id (PK)     │
                      │ flow_id     │
                      │ contact     │
                      │ current_node│
                      │ variables   │
                      └─────────────┘
```

---

## 2. Table Definitions

### 2.1 tenants

Menyimpan data organisasi/workspace.

```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  subscription_plan TEXT DEFAULT 'free', -- free, pro, business
  settings TEXT DEFAULT '{}', -- JSON: timezone, language, branding
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_email ON tenants(email);
```

### 2.2 User Roles

> 📌 **Struktur Role Sederhana**: Hanya 2 level untuk kemudahan pengelolaan.

| Role | Scope | Akses |
|------|-------|-------|
| **Super Admin** | Platform-level | Manage all tenants, pricing, global settings |
| **Tenant Admin** | Workspace-level | Full access ke semua fitur dalam tenant |

### 2.3 super_admins

Menyimpan kredensial Super Admin (platform owner).

```sql
CREATE TABLE super_admins (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_super_admins_email ON super_admins(email);
```

### 2.4 users (Tenant Admins)

Menyimpan kredensial Tenant Admin (workspace owner).

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
```

### 2.3 devices

Menyimpan nomor WhatsApp yang terhubung.

```sql
CREATE TABLE devices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  session_status TEXT DEFAULT 'disconnected', -- connected, scanning, disconnected
  waha_session_id TEXT, -- session ID di WAHA
  webhook_url TEXT,
  anti_ban_config TEXT DEFAULT '{"typing_min":1,"typing_max":3,"enabled":true}',
  ai_fallback_enabled INTEGER DEFAULT 0,
  ai_fallback_kb_ids TEXT DEFAULT '[]', -- JSON array of knowledge_docs IDs
  ai_fallback_prompt TEXT,
  connected_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_devices_tenant ON devices(tenant_id);
CREATE INDEX idx_devices_phone ON devices(phone_number);
CREATE INDEX idx_devices_status ON devices(session_status);
```

### 2.4 flows

Menyimpan struktur visual chatbot.

```sql
CREATE TABLE flows (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_keywords TEXT NOT NULL, -- JSON array: ["halo", "hai", "menu"]
  flow_json TEXT NOT NULL, -- React Flow JSON: {nodes: [], edges: []}
  is_active INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0, -- higher = checked first
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flows_device ON flows(device_id);
CREATE INDEX idx_flows_active ON flows(is_active);
```

### 2.5 flow_sessions

Melacak state percakapan user dalam flow.

```sql
CREATE TABLE flow_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  flow_id TEXT NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  current_node_id TEXT NOT NULL,
  variables TEXT DEFAULT '{}', -- JSON: collected user inputs
  context TEXT DEFAULT '[]', -- JSON: conversation history for AI
  status TEXT DEFAULT 'active', -- active, completed, expired
  last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_contact ON flow_sessions(contact_phone, device_id);
CREATE INDEX idx_sessions_flow ON flow_sessions(flow_id);
CREATE UNIQUE INDEX idx_sessions_unique ON flow_sessions(device_id, contact_phone, status) 
  WHERE status = 'active';
```

### 2.6 contacts

CRM sederhana untuk kontak WhatsApp.

```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  tags TEXT DEFAULT '[]', -- JSON array: ["vip", "customer"]
  custom_attributes TEXT DEFAULT '{}', -- JSON: any custom fields
  source TEXT DEFAULT 'manual', -- manual, import, chat
  last_contacted DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE UNIQUE INDEX idx_contacts_unique ON contacts(tenant_id, phone);
```

### 2.7 campaigns

Job broadcast pesan massal.

```sql
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL, -- with {{variables}}
  media_url TEXT, -- R2 URL for image/video
  media_type TEXT, -- image, video, document
  status TEXT DEFAULT 'draft', -- draft, scheduled, processing, completed, paused, failed
  scheduled_at DATETIME,
  started_at DATETIME,
  completed_at DATETIME,
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  rate_config TEXT DEFAULT '{"typing_delay":3,"message_gap":15}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_at);
```

### 2.8 campaign_items

Status pengiriman per kontak dalam campaign.

```sql
CREATE TABLE campaign_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued', -- queued, sending, sent, failed, skipped
  rendered_message TEXT, -- message with variables replaced
  error_reason TEXT,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_items_campaign ON campaign_items(campaign_id);
CREATE INDEX idx_items_status ON campaign_items(status);
```

### 2.9 messages

Log semua pesan masuk/keluar.

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  direction TEXT NOT NULL, -- incoming, outgoing
  message_type TEXT DEFAULT 'text', -- text, image, video, document, audio
  content TEXT,
  media_url TEXT, -- R2 URL
  wa_message_id TEXT, -- WhatsApp message ID
  flow_id TEXT REFERENCES flows(id), -- if triggered by flow
  campaign_id TEXT REFERENCES campaigns(id), -- if from campaign
  metadata TEXT DEFAULT '{}', -- JSON: any additional data
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_device ON messages(device_id);
CREATE INDEX idx_messages_contact ON messages(contact_phone);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
```

### 2.10 knowledge_docs

Dokumen untuk AI Knowledge Base.

```sql
CREATE TABLE knowledge_docs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL, -- R2 URL
  file_type TEXT NOT NULL, -- pdf, txt, url
  total_chunks INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing', -- processing, ready, failed
  error_message TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_docs_tenant ON knowledge_docs(tenant_id);
CREATE INDEX idx_docs_status ON knowledge_docs(status);
```

### 2.12 ai_providers

Menyimpan API key untuk provider AI eksternal.

```sql
CREATE TABLE ai_providers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- openai, gemini, anthropic, groq, together, workers_ai
  api_key TEXT NOT NULL, -- encrypted
  model_id TEXT, -- gpt-4o, gemini-pro, claude-3-sonnet, etc
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  settings TEXT DEFAULT '{}', -- JSON: temperature, max_tokens, etc
  usage_quota INTEGER DEFAULT 0, -- monthly quota limit (0 = unlimited)
  usage_current INTEGER DEFAULT 0, -- current month usage
  last_used DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_providers_tenant ON ai_providers(tenant_id);
CREATE INDEX idx_ai_providers_default ON ai_providers(tenant_id, is_default);
CREATE UNIQUE INDEX idx_ai_providers_unique ON ai_providers(tenant_id, provider, model_id);
```

**Supported Providers:**

| Provider | API Key Format | Models |
|----------|---------------|--------|
| `openai` | `sk-...` | gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| `gemini` | `AIza...` | gemini-pro, gemini-1.5-flash, gemini-1.5-pro |
| `anthropic` | `sk-ant-...` | claude-3-opus, claude-3-sonnet, claude-3-haiku |
| `groq` | `gsk_...` | llama3-70b, mixtral-8x7b |
| `together` | `...` | llama3-70b, mixtral-8x22b |
| `workers_ai` | (built-in) | @cf/meta/llama-3-8b-instruct |

**Settings JSON Example:**
```json
{
  "temperature": 0.7,
  "max_tokens": 1024,
  "system_prompt_prefix": "You are a helpful customer service agent for {{tenant_name}}."
}
```

### 2.11 document_chunks

Potongan dokumen untuk RAG.

```sql
CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  doc_id TEXT NOT NULL REFERENCES knowledge_docs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  vector_id TEXT, -- ID di Cloudflare Vectorize
  metadata TEXT DEFAULT '{}', -- JSON: page number, section, etc
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chunks_doc ON document_chunks(doc_id);
CREATE INDEX idx_chunks_vector ON document_chunks(vector_id);
```

---

## 3. External Storage

### 3.1 Cloudflare R2 (Object Storage)

| Bucket | Konten | Path Pattern |
|--------|--------|--------------|
| `cloudwa-sessions` | WAHA session files | `/{tenant_id}/{device_id}/session.json` |
| `cloudwa-media` | Media untuk broadcast | `/{tenant_id}/media/{filename}` |
| `cloudwa-docs` | Dokumen knowledge base | `/{tenant_id}/docs/{doc_id}/{filename}` |

### 3.2 Auth Strategy (JWT Stateless - No KV)

> ⚠️ **Free Tier Optimization**: KV tidak digunakan untuk menghindari limit free tier.

| Komponen | Solusi | Alasan |
|----------|--------|--------|
| **Auth Session** | JWT + HTTP-only Cookie | Stateless, tidak perlu storage |
| **Token Refresh** | Rotate via new JWT | Tidak perlu invalidation store |
| **Session Data** | Encode di JWT payload | User ID, tenant ID, role |

```typescript
// JWT-based auth (no KV needed)
import { SignJWT, jwtVerify } from 'jose';

async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(env.JWT_SECRET));
  
  return token;
}

async function verifySession(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(env.JWT_SECRET)
  );
  return payload;
}
```

### 3.3 Cloudflare Vectorize

| Index | Konten | Dimensions | Metric |
|-------|--------|------------|--------|
| `cloudwa-rag-index` | Document embeddings | 768 (BGE-M3) | Cosine |

Metadata stored with each vector:
```json
{
  "tenant_id": "...",
  "doc_id": "...",
  "chunk_id": "...",
  "chunk_index": 0
}
```

---

## 4. Drizzle ORM Schema

```typescript
// schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  subscriptionPlan: text('subscription_plan').default('free'),
  settings: text('settings').default('{}'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const superAdmins = sqliteTable('super_admins', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  lastLogin: text('last_login'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  lastLogin: text('last_login'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  phoneNumber: text('phone_number').notNull(),
  displayName: text('display_name'),
  sessionStatus: text('session_status').default('disconnected'),
  wahaSessionId: text('waha_session_id'),
  webhookUrl: text('webhook_url'),
  antiBanConfig: text('anti_ban_config').default('{}'),
  aiFallbackEnabled: integer('ai_fallback_enabled').default(0),
  aiFallbackKbIds: text('ai_fallback_kb_ids').default('[]'),
  aiFallbackPrompt: text('ai_fallback_prompt'),
  connectedAt: text('connected_at'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const flows = sqliteTable('flows', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull().references(() => devices.id),
  name: text('name').notNull(),
  description: text('description'),
  triggerKeywords: text('trigger_keywords').notNull(),
  flowJson: text('flow_json').notNull(),
  isActive: integer('is_active').default(0),
  priority: integer('priority').default(0),
  version: integer('version').default(1),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const aiProviders = sqliteTable('ai_providers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  provider: text('provider').notNull(), // openai, gemini, anthropic, groq, together, workers_ai
  apiKey: text('api_key').notNull(), // encrypted
  modelId: text('model_id'),
  isDefault: integer('is_default').default(0),
  isActive: integer('is_active').default(1),
  settings: text('settings').default('{}'),
  usageQuota: integer('usage_quota').default(0),
  usageCurrent: integer('usage_current').default(0),
  lastUsed: text('last_used'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// ... more tables
```

---

## 5. Migration Strategy

### Initial Migration
```bash
# Generate migration
npx drizzle-kit generate:sqlite

# Apply to D1
npx wrangler d1 migrations apply cloudwa-flow-db
```

### Data Isolation (Multi-Tenant)
```typescript
// Middleware to inject tenant_id filter
export function withTenant(db: DrizzleD1, tenantId: string) {
  return {
    ...db,
    // All queries automatically filtered by tenant_id
  };
}
```
