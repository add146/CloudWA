import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { HonoContext } from '@/types/env';
import { tenants } from '@/db/schema';
import { authMiddleware, requireTenantAdmin } from '@/middleware/auth';
import { WAHAClient } from '@/gateway/waha-client';

const chatsRouter = new Hono<HonoContext>();

// All chat routes require authentication
chatsRouter.use('*', authMiddleware, requireTenantAdmin);

// Helper function to get WAHA client for current tenant
async function getWAHAClient(c: any): Promise<{ waha: WAHAClient; sessionName: string } | null> {
    const user = c.get('user');
    const db = drizzle(c.env.DB);

    const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, user.tenantId))
        .limit(1);

    const settings = tenant?.settings ? JSON.parse(tenant.settings) : {};
    const wahaConfig = settings.waha || {};
    const wahaBaseUrl = wahaConfig.baseUrl || c.env.WAHA_BASE_URL;
    const wahaApiKey = wahaConfig.apiKey || c.env.WAHA_API_KEY;

    if (!wahaBaseUrl || !wahaApiKey) {
        return null;
    }

    return {
        waha: new WAHAClient({ baseUrl: wahaBaseUrl, apiKey: wahaApiKey }),
        sessionName: 'default' // WAHA Core only supports 'default'
    };
}

// ============================================
// LIST CHATS (Overview)
// ============================================

chatsRouter.get('/', async (c) => {
    try {
        const limit = parseInt(c.req.query('limit') || '50');
        const offset = parseInt(c.req.query('offset') || '0');

        const wahaClient = await getWAHAClient(c);
        if (!wahaClient) {
            return c.json({
                success: false,
                error: 'WAHA not configured. Please configure WAHA Server in Settings.'
            }, 400);
        }

        const chats = await wahaClient.waha.getChatsOverview(wahaClient.sessionName, limit, offset);

        return c.json({
            success: true,
            data: chats.map(chat => ({
                id: chat.id,
                name: chat.name || chat.id.split('@')[0],
                picture: chat.picture,
                lastMessage: chat.lastMessage ? {
                    body: chat.lastMessage.body,
                    timestamp: chat.lastMessage.timestamp,
                    fromMe: chat.lastMessage.fromMe,
                    hasMedia: chat.lastMessage.hasMedia
                } : null,
                unreadCount: chat.unreadCount || 0,
                isGroup: chat.id.includes('@g.us')
            }))
        });
    } catch (error: any) {
        console.error('Error fetching chats:', error);
        return c.json({
            success: false,
            error: error.message || 'Failed to fetch chats'
        }, 500);
    }
});

// ============================================
// GET CHAT MESSAGES
// ============================================

chatsRouter.get('/:chatId/messages', async (c) => {
    try {
        const chatId = c.req.param('chatId');
        const limit = parseInt(c.req.query('limit') || '50');
        const downloadMedia = c.req.query('downloadMedia') === 'true';

        const wahaClient = await getWAHAClient(c);
        if (!wahaClient) {
            return c.json({
                success: false,
                error: 'WAHA not configured. Please configure WAHA Server in Settings.'
            }, 400);
        }

        const messages = await wahaClient.waha.getChatMessages(
            wahaClient.sessionName,
            chatId,
            limit,
            downloadMedia
        );

        return c.json({
            success: true,
            data: messages.map(msg => ({
                id: msg.id,
                timestamp: msg.timestamp,
                from: msg.from,
                fromMe: msg.fromMe,
                body: msg.body,
                hasMedia: msg.hasMedia,
                media: msg.media,
                ack: msg.ack
            }))
        });
    } catch (error: any) {
        console.error('Error fetching messages:', error);
        return c.json({
            success: false,
            error: error.message || 'Failed to fetch messages'
        }, 500);
    }
});

// ============================================
// SEND MESSAGE TO CHAT
// ============================================

chatsRouter.post('/:chatId/send', async (c) => {
    try {
        const chatId = c.req.param('chatId');
        const { message, type = 'text' } = await c.req.json();

        if (!message) {
            return c.json({
                success: false,
                error: 'Message content is required'
            }, 400);
        }

        const wahaClient = await getWAHAClient(c);
        if (!wahaClient) {
            return c.json({
                success: false,
                error: 'WAHA not configured. Please configure WAHA Server in Settings.'
            }, 400);
        }

        let result;
        if (type === 'text') {
            result = await wahaClient.waha.sendMessage({
                session: wahaClient.sessionName,
                chatId,
                text: message
            });
        } else if (type === 'image') {
            result = await wahaClient.waha.sendImage({
                session: wahaClient.sessionName,
                chatId,
                file: message.file,
                caption: message.caption
            });
        } else if (type === 'file') {
            result = await wahaClient.waha.sendFile({
                session: wahaClient.sessionName,
                chatId,
                file: message.file,
                caption: message.caption
            });
        } else {
            return c.json({
                success: false,
                error: `Unsupported message type: ${type}`
            }, 400);
        }

        return c.json({
            success: true,
            data: {
                sent: true,
                chatId,
                result
            }
        });
    } catch (error: any) {
        console.error('Error sending message:', error);
        return c.json({
            success: false,
            error: error.message || 'Failed to send message'
        }, 500);
    }
});

export default chatsRouter;
