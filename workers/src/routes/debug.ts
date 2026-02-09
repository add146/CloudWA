import { Hono } from 'hono';
import { type HonoContext } from '@/types/env';
import { WAHAClient } from '@/gateway/waha-client';

const debugRouter = new Hono<HonoContext>();

debugRouter.get('/send-image', async (c) => {
    try {
        const waha = new WAHAClient({
            baseUrl: c.env.WAHA_BASE_URL,
            apiKey: c.env.WAHA_API_KEY
        });
        const chatId = c.req.query('phone') || '628996781919'; // Default or param
        const url = 'https://cloudwa-flow.khibroh.workers.dev/api/media/1770633807687-202.png'; // Known working public URL

        console.log(`Debug sending image to ${chatId} with URL ${url}`);

        const result = await waha.sendImage({
            session: 'default',
            chatId: chatId,
            file: { url: url },
            caption: 'Debug test message'
        });

        return c.json({
            success: true,
            result: result
        });
    } catch (error: any) {
        return c.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, 500);
    }
});

export default debugRouter;
