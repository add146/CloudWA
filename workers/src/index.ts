import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { HonoContext, Env } from '@/types/env';
import auth from '@/routes/auth';
import devices from '@/routes/devices';
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
app.route('/api', flows); // Flows are under /api/devices/:deviceId/flows
app.route('/api', ai); // AI routes under /api/knowledge-base

// Webhook endpoint for WAHA messages
app.post('/api/webhook/waha', async (c) => {
    try {
        const payload = await c.req.json();

        // WAHA webhook format
        const { event, session, payload: data } = payload;

        console.log('WAHA webhook:', { event, session, data });

        // TODO: Implement flow execution logic
        // 1. Find device by session name (device.id)
        // 2. Process incoming message
        // 3. Execute flows

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
        // Verification for webhook setup
        const mode = c.req.query('hub.mode');
        const token = c.req.query('hub.verify_token');
        const challenge = c.req.query('hub.challenge');

        if (mode === 'subscribe' && token === c.env.WEBHOOK_VERIFY_TOKEN) {
            return new Response(challenge, { status: 200 });
        }

        // Process incoming message
        const payload = await c.req.json();

        console.log('Cloud API webhook:', payload);

        // TODO: Implement flow execution logic

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
