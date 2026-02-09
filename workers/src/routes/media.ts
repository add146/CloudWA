import { Hono } from 'hono';
import { type HonoContext } from '@/types/env';
import { authMiddleware } from '@/middleware/auth';

const mediaRouter = new Hono<HonoContext>();

// OPTIONS handler for CORS preflight
mediaRouter.options('/:key', async (c) => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
});

// Serve media file (Public)
mediaRouter.get('/:key', async (c) => {
    const key = c.req.param('key');
    const object = await c.env.MEDIA_BUCKET.get(key);

    if (!object) {
        return c.json({ error: 'File not found' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    // Add CORS headers to allow browser to load images
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, {
        headers,
    });
});

// Upload media file (Authenticated)
mediaRouter.post('/upload', authMiddleware, async (c) => {
    try {
        const body = await c.req.parseBody();
        const file = body['file'];

        if (!file || !(file instanceof File)) {
            return c.json({ success: false, error: 'No file uploaded' }, 400);
        }

        // Generate minimal unique key
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const ext = file.name.split('.').pop();
        const key = `${timestamp}-${random}.${ext}`;

        // Upload to R2
        await c.env.MEDIA_BUCKET.put(key, file, {
            httpMetadata: {
                contentType: file.type,
            },
        });

        const url = `${new URL(c.req.url).origin}/api/media/${key}`;

        return c.json({
            success: true,
            data: {
                url,
                key,
                filename: file.name,
                contentType: file.type,
            },
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return c.json({ success: false, error: 'Upload failed' }, 500);
    }
});

export default mediaRouter;
