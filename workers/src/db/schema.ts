import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Helper for auto-generated IDs
const id = () => text('id').primaryKey().$defaultFn(() => {
    return crypto.randomUUID();
});

const timestamp = () => text('created_at').default(sql`CURRENT_TIMESTAMP`);

// ============================================
// TENANTS & USERS
// ============================================

export const tenants = sqliteTable('tenants', {
    id: id(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    subscriptionPlan: text('subscription_plan').default('free'), // free, pro, business
    settings: text('settings').default('{}'), // JSON
    createdAt: timestamp(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const superAdmins = sqliteTable('super_admins', {
    id: id(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    lastLogin: text('last_login'),
    createdAt: timestamp(),
});

export const users = sqliteTable('users', {
    id: id(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    lastLogin: text('last_login'),
    createdAt: timestamp(),
});

// ============================================
// WHATSAPP DEVICES
// ============================================

export const devices = sqliteTable('devices', {
    id: id(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    phoneNumber: text('phone_number'),
    displayName: text('display_name'),

    // Gateway Configuration
    gatewayType: text('gateway_type').default('waha'), // 'waha' or 'cloud_api'

    // WAHA-specific (WhatsApp HTTP API)
    sessionStatus: text('session_status').default('disconnected'), // STOPPED, STARTING, SCAN_QR_CODE, WORKING, FAILED
    wahaSessionData: text('waha_session_data'), // WAHA session metadata

    // Cloud API-specific
    cloudApiConfig: text('cloud_api_config').default('{}'), // JSON

    webhookUrl: text('webhook_url'),
    antiBanConfig: text('anti_ban_config').default('{"enabled":true,"typingMin":1,"typingMax":3}'),

    // AI Fallback
    aiFallbackEnabled: integer('ai_fallback_enabled', { mode: 'boolean' }).default(false),
    aiFallbackKbIds: text('ai_fallback_kb_ids').default('[]'), // JSON array
    aiFallbackPrompt: text('ai_fallback_prompt'),

    connectedAt: text('connected_at'),
    createdAt: timestamp(),
});

// ============================================
// FLOWS
// ============================================

export const flows = sqliteTable('flows', {
    id: id(),
    deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    triggerKeywords: text('trigger_keywords').notNull(), // JSON array
    flowJson: text('flow_json').notNull(), // React Flow JSON
    isActive: integer('is_active', { mode: 'boolean' }).default(false),
    priority: integer('priority').default(0),
    version: integer('version').default(1),
    createdAt: timestamp(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const flowSessions = sqliteTable('flow_sessions', {
    id: id(),
    flowId: text('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
    deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
    contactPhone: text('contact_phone').notNull(),
    currentNodeId: text('current_node_id').notNull(),
    variables: text('variables').default('{}'), // JSON
    context: text('context').default('[]'), // JSON: conversation history
    status: text('status').default('active'), // active, completed, expired
    lastInteraction: text('last_interaction').default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp(),
});

// ============================================
// CONTACTS & CRM
// ============================================

export const contacts = sqliteTable('contacts', {
    id: id(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    name: text('name'),
    email: text('email'),
    tags: text('tags').default('[]'), // JSON array
    customAttributes: text('custom_attributes').default('{}'), // JSON
    source: text('source').default('manual'), // manual, import, chat
    lastContacted: text('last_contacted'),
    createdAt: timestamp(),
});

// ============================================
// CAMPAIGNS (BROADCAST)
// ============================================

export const campaigns = sqliteTable('campaigns', {
    id: id(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    messageTemplate: text('message_template').notNull(),
    mediaUrl: text('media_url'),
    mediaType: text('media_type'), // image, video, document
    status: text('status').default('draft'), // draft, scheduled, processing, completed, paused, failed
    scheduledAt: text('scheduled_at'),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
    totalContacts: integer('total_contacts').default(0),
    sentCount: integer('sent_count').default(0),
    failedCount: integer('failed_count').default(0),
    rateConfig: text('rate_config').default('{"minGap":10,"maxGap":30}'), // JSON
    createdAt: timestamp(),
});

export const campaignItems = sqliteTable('campaign_items', {
    id: id(),
    campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    contactId: text('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
    status: text('status').default('queued'), // queued, sending, sent, failed, skipped
    renderedMessage: text('rendered_message'),
    errorReason: text('error_reason'),
    sentAt: text('sent_at'),
    createdAt: timestamp(),
});

// ============================================
// MESSAGES
// ============================================

export const messages = sqliteTable('messages', {
    id: id(),
    deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
    contactPhone: text('contact_phone').notNull(),
    direction: text('direction').notNull(), // incoming, outgoing
    messageType: text('message_type').default('text'), // text, image, video, document, audio
    content: text('content'),
    mediaUrl: text('media_url'),
    waMessageId: text('wa_message_id'),
    flowId: text('flow_id').references(() => flows.id),
    campaignId: text('campaign_id').references(() => campaigns.id),
    metadata: text('metadata').default('{}'), // JSON
    timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================
// KNOWLEDGE BASE (AI/RAG)
// ============================================

export const knowledgeDocs = sqliteTable('knowledge_docs', {
    id: id(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    fileUrl: text('file_url').notNull(), // R2 URL
    fileType: text('file_type').notNull(), // pdf, txt, url
    totalChunks: integer('total_chunks').default(0),
    status: text('status').default('processing'), // processing, ready, failed
    errorMessage: text('error_message'),
    uploadedAt: timestamp(),
});

export const documentChunks = sqliteTable('document_chunks', {
    id: id(),
    docId: text('doc_id').notNull().references(() => knowledgeDocs.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    vectorId: text('vector_id'), // Vectorize ID
    metadata: text('metadata').default('{}'), // JSON
    createdAt: timestamp(),
});

// ============================================
// AI PROVIDERS (Super Admin Only)
// ============================================

export const aiProviders = sqliteTable('ai_providers', {
    id: id(),
    provider: text('provider').notNull(), // openai, gemini, anthropic, groq, together, workers_ai
    apiKey: text('api_key').notNull(), // encrypted
    displayName: text('display_name').notNull(),
    modelId: text('model_id'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    settings: text('settings').default('{}'), // JSON
    rateLimitPerTenant: integer('rate_limit_per_tenant').default(100),
    createdAt: timestamp(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const tenantAiSettings = sqliteTable('tenant_ai_settings', {
    id: id(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    aiProviderId: text('ai_provider_id').notNull().references(() => aiProviders.id, { onDelete: 'cascade' }),
    isDefault: integer('is_default', { mode: 'boolean' }).default(false),
    apiKey: text('api_key'), // Encrypted or raw key for BYOK
    config: text('config').default('{}'), // JSON: model whitelist, specific settings
    customSystemPrompt: text('custom_system_prompt'),
    usageCurrent: integer('usage_current').default(0),
    usageLimit: integer('usage_limit').default(0),
    lastUsed: text('last_used'),
    createdAt: timestamp(),
});
