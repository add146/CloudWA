import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { HonoContext, Env } from '@/types/env';
import auth from '@/routes/auth';
import devices from '@/routes/devices';
import settings from '@/routes/settings';
import flows from '@/routes/flows';
import ai from '@/routes/ai';

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
// ROUTES
// ============================================

app.route('/api/auth', auth);
app.route('/api/devices', devices);
app.route('/api/settings', settings); // Tenant settings
app.route('/api', flows); // Flows are under /api/devices/:deviceId/flows
app.route('/api', ai); // AI routes under /api/knowledge-base

// Webhook endpoint for WAHA messages
app.post('/api/webhook/waha', async (c) => {
    try {
        const payload = await c.req.json();

        // WAHA webhook format
        const { event, session, payload: data } = payload;

        console.log('WAHA webhook:', { event, session, data });

        if (event === 'message' && data?.text) {
            // Trigger flow execution
            const { triggerFlow } = await import('@/engine/flow-trigger');

            try {
                await triggerFlow(
                    c.env,
                    session, // deviceId
                    data.from, // contactPhone
                    data.text.body // incomingMessage
                );
            } catch (error: any) {
                console.error('Flow execution error:', error.message);
            }
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
