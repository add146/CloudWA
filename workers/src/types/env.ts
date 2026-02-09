import type { D1Database, R2Bucket, Queue, Vectorize, Ai, DurableObjectNamespace } from '@cloudflare/workers-types';
import type { Context } from 'hono';

export interface Env {
    // Database
    DB: D1Database;

    // Storage
    SESSION_BUCKET: R2Bucket;
    MEDIA_BUCKET: R2Bucket;
    DOCS_BUCKET: R2Bucket; // Optional - for knowledge base documents

    // Queues (optional - can be added later)
    // BLAST_QUEUE: Queue;

    // AI (optional - for RAG feature)
    VECTOR_INDEX: Vectorize;
    AI: Ai;

    // Secrets
    JWT_SECRET: string;

    // WhatsApp Gateway Configuration
    WAHA_BASE_URL?: string; // e.g., https://waha.railway.app
    WAHA_API_KEY?: string;

    // WhatsApp Cloud API (optional)
    WA_PHONE_NUMBER_ID?: string;
    WA_ACCESS_TOKEN?: string;

    // Webhook verification
    WEBHOOK_VERIFY_TOKEN?: string;
    WHATSAPP_APP_SECRET?: string;
}

export interface UserPayload {
    userId: string;
    tenantId: string;
    role: 'super_admin' | 'tenant_admin';
    email: string;
}

export interface HonoContext {
    Bindings: Env;
    Variables: {
        user: UserPayload;
    };
}

export type AppContext = Context<HonoContext>;
