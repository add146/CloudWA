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
        const chatId = c.req.query('phone') || '628996781919';
        const url = 'https://cloudwa-flow.khibroh.workers.dev/api/media/1770633807687-202.png';
        const results: any = {};

        // 1. Download and Convert to Base64
        console.log('Downloading image...');
        const imgRes = await fetch(url);
        if (!imgRes.ok) throw new Error('Failed to download image');
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const dataUri = `data:image/png;base64,${base64}`;

        results.base64Length = dataUri.length;

        // 2. Test Method A: sendImage with Data URI object
        try {
            console.log('Testing sendImage with Data URI object...');
            results.methodA = await waha.sendImage({
                session: 'default',
                chatId,
                file: { url: dataUri },
                caption: 'Test Method A (sendImage obj)'
            });
        } catch (e: any) { results.methodA_error = e.message; }

        // 3. Test Method B: sendFile with Data URI object
        try {
            console.log('Testing sendFile with Data URI object...');
            results.methodB = await waha.sendFile({
                session: 'default',
                chatId,
                file: { url: dataUri, filename: 'image.png' },
                caption: 'Test Method B (sendFile obj)'
            });
        } catch (e: any) { results.methodB_error = e.message; }

        // 4. Test Method C: sendImage with Data URI string
        try {
            console.log('Testing sendImage with Data URI string...');
            results.methodC = await waha.sendImage({
                session: 'default',
                chatId,
                file: dataUri,
                caption: 'Test Method C (sendImage string)'
            });
        } catch (e: any) { results.methodC_error = e.message; }

        return c.json({
            success: true,
            results: results
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
