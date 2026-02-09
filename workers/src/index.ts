import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { HonoContext, Env } from '@/types/env';
import auth from '@/routes/auth';
import devices from '@/routes/devices';
import settings from '@/routes/settings';
import flows from '@/routes/flows';
import ai from '@/routes/ai';
import aiSettings from '@/routes/ai-settings';
import media from '@/routes/media';
import chats from '@/routes/chats';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { devices as devicesTable } from '@/db/schema';

import superAdmin from '@/routes/super-admin';

// Durable Objects removed - using WAHA HTTP API instead

const app = new Hono<HonoContext>();

// ============================================
// MIDDLEWARE
// ============================================

// CORS
app.use('*', cors({
    origin: '*', // TODO: Configure based on environment
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
    return c.json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            gateway: 'WAHA + Cloud API',
        },
    });
});

// ============================================
// PUBLIC WEBHOOK ROUTES (no auth required)
// These MUST be registered before protected routes
// ============================================
// Webhook endpoint for WAHA messages
app.post('/api/webhook/waha', async (c) => {
    try {
        const payload = await c.req.json();

        // WAHA webhook format
        const { event, session, payload: data } = payload;
        // 1. Initial Device ID from Query or Session
        let deviceId = c.req.query('deviceId') || session;

        // 2. Validate Device ID (Check if it's a UUID)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId);

        // 3. Fallback: If not a UUID (like 'default'), resolve using Phone Number
        if (!isUuid && data?.to) {
            console.log(`Device ID '${deviceId}' is not a UUID. Resolving by phone number...`);

            try {
                const to = data.to.split('@')[0]; // Remove @c.us suffix. e.g. "62812345"
                const { or, eq } = await import('drizzle-orm');

                // Attempt to handle "62" vs "0" prefix issues
                // If "628...", also try "08..."
                let altPhone = to;
                if (to.startsWith('62')) {
                    altPhone = '0' + to.substring(2);
                } else if (to.startsWith('0')) {
                    altPhone = '62' + to.substring(1);
                }

                console.log(`Searching for device with phone '${to}' or '${altPhone}'`);

                const db = drizzle(c.env.DB);
                const devices = await db
                    .select()
                    .from(devicesTable)
                    .where(or(
                        eq(devicesTable.phoneNumber, to),
                        eq(devicesTable.phoneNumber, altPhone)
                    ))
                    .limit(1);

                if (devices.length > 0) {
                    deviceId = devices[0].id; // Use the actual UUID
                    console.log('Resolved Device ID:', deviceId);
                } else {
                    console.warn(`No device found for phone number: ${to} or ${altPhone}`);
                }
            } catch (err: any) {
                console.error('Error resolving device by phone number:', err.message);
            }
        } else {
            console.log('Using provided Device ID (UUID):', deviceId);
        }

        console.log('=== WAHA WEBHOOK RECEIVED ===');
        console.log('Full Payload:', JSON.stringify(payload, null, 2));
        console.log('Event Type:', event);
        console.log('Session:', session);
        console.log('Data.to:', data?.to);
        console.log('Data.from:', data?.from);
        console.log('Data.body:', data?.body);
        console.log('Final Device ID for Flow Trigger:', deviceId);
        console.log('=== END DEBUG ===');

        // WAHA message format: body is directly in data.body
        // Handle various WAHA event types: 'message', 'message.any', etc.
        const isMessageEvent = event === 'message' || event?.startsWith('message.');

        if (isMessageEvent && data?.body) {
            console.log('✓ Message event detected, triggering flow...');
            // Trigger flow execution
            const { triggerFlow } = await import('@/engine/flow-trigger');

            // Process in background to avoid webhook timeout
            c.executionCtx.waitUntil(
                (async () => {
                    try {
                        await triggerFlow(
                            c.env,
                            deviceId, // deviceId (from query param or session)
                            data.from, // contactPhone
                            data.body // incomingMessage - WAHA uses data.body directly
                        );
                    } catch (error: any) {
                        console.error('Flow execution error:', error.message);
                        console.error('Error stack:', error.stack);
                    }
                })()
            );
        } else {
            console.log('✗ Skipping non-message event or missing body');
            console.log('  - isMessageEvent:', isMessageEvent);
            console.log('  - has body:', !!data?.body);
        }

        return c.json({
            success: true,
            data: {
                received: true,
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Webhook processing failed',
        }, 500);
    }
});

// Webhook endpoint for WhatsApp Cloud API
app.post('/api/webhook/cloud-api', async (c) => {
    try {
        // Verification for webhook setup (GET request from Meta)
        const mode = c.req.query('hub.mode');
        const token = c.req.query('hub.verify_token');
        const challenge = c.req.query('hub.challenge');

        if (mode === 'subscribe' && token === c.env.WEBHOOK_VERIFY_TOKEN) {
            return new Response(challenge, { status: 200 });
        }

        // Verify webhook signature for security
        const signature = c.req.header('X-Hub-Signature-256') || '';
        const rawBody = await c.req.text();

        if (c.env.WHATSAPP_APP_SECRET) {
            const { CloudAPIClient } = await import('@/gateway/cloud-api-client');
            const isValid = await CloudAPIClient.verifyWebhookSignature(
                rawBody,
                signature,
                c.env.WHATSAPP_APP_SECRET
            );

            if (!isValid) {
                console.error('Invalid webhook signature');
                return c.json({ error: 'Invalid signature' }, 401);
            }
        }

        // Process incoming message
        const payload = JSON.parse(rawBody);
        const { CloudAPIClient } = await import('@/gateway/cloud-api-client');
        const parsed = CloudAPIClient.parseWebhook(payload);

        if (parsed) {
            // Trigger flow execution
            const { triggerFlow } = await import('@/engine/flow-trigger');

            try {
                // Extract phone number ID to find device
                const phoneNumberId = payload.entry[0]?.changes[0]?.value?.metadata?.phone_number_id;

                // TODO: Map phoneNumberId to deviceId
                // For now, we'll need to store phoneNumber mapping in device table
                console.log('Cloud API webhook received:', {
                    from: parsed.from,
                    message: parsed.message,
                    phoneNumberId,
                });

                // Uncomment when phone mapping is implemented:
                // await triggerFlow(c.env, deviceId, parsed.from, parsed.message);
            } catch (error: any) {
                console.error('Flow execution error:', error.message);
            }

            // Future: Find device by phone_number_id, execute flows, send responses
        }

        return c.json({
            success: true,
            data: { received: true },
        });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return c.json({
            success: false,
            error: 'Webhook processing failed',
        }, 500);
    }
});

// ============================================
// PUBLIC ROUTES (no authentication required)
// Media GET endpoints must be public so WAHA can download files
// ============================================

app.route('/api/media', media); // Media Routes - GET is public, POST requires auth

// ============================================
// PROTECTED API ROUTES (require authentication)
// These are registered AFTER webhooks to ensure webhooks bypass auth
// ============================================

app.route('/api/auth', auth);
app.route('/api/devices', devices);
app.route('/api/settings', settings); // Tenant settings
app.route('/api', flows); // Flows are under /api/devices/:deviceId/flows
app.route('/api', ai); // AI routes under /api/knowledge-base
app.route('/api/settings/ai', aiSettings); // AI Settings
app.route('/api/super-admin', superAdmin); // Super Admin Routes
app.route('/api/chats', chats); // Chat Routes

// 404 handler
app.notFound((c) => {
    return c.json({
        success: false,
        error: 'Not found',
    }, 404);
});

// Error handler
app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json({
        success: false,
        error: 'Internal server error',
    }, 500);
});

// ============================================
// EXPORT
// ============================================

export default {
    fetch: app.fetch,
} satisfies ExportedHandler<Env>;
