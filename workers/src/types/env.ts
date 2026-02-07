import type { D1Database } from '@cloudflare/workers-types';
import type { DurableObjectNamespace } from '@cloudflare/workers-types';
import type { R2Bucket } from '@cloudflare/workers-types';
import type { Queue } from '@cloudflare/workers-types';
import type { VectorizeIndex } from '@cloudflare/workers-types';
import type { Ai } from '@cloudflare/workers-types';

export interface Env {
    // D1 Database
    DB: D1Database;

    // R2 Buckets
    SESSION_BUCKET: R2Bucket;
    MEDIA_BUCKET: R2Bucket;
    DOCS_BUCKET: R2Bucket;

    // Durable Objects
    WHATSAPP_SESSION: DurableObjectNamespace;

    // Queues
    BLAST_QUEUE: Queue;

    // Vectorize
    VECTOR_INDEX: VectorizeIndex;

    // Workers AI
    AI: Ai;

    // Environment Variables
    JWT_SECRET: string;
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
