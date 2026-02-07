import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { HonoContext, Env } from '@/types/env';
import auth from '@/routes/auth';
import devices from '@/routes/devices';
import flows from '@/routes/flows';

// Export Durable Objects
export { WhatsAppSession } from '@/durable-objects/WhatsAppSession';

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
        },
    });
});

// ============================================
// ROUTES
// ============================================

app.route('/api/auth', auth);
app.route('/api/devices', devices);
app.route('/api', flows); // Flows are under /api/devices/:deviceId/flows

// Webhook endpoint for Baileys messages
app.post('/api/webhook/baileys/:deviceId', async (c) => {
    try {
        const deviceId = c.req.param('deviceId');
        const payload = await c.req.json();

        // TODO: Implement flow execution logic
        console.log('Baileys webhook:', { deviceId, payload });

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
