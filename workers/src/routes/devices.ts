import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import type { HonoContext } from '@/types/env';
import { devices } from '@/db/schema';
import { authMiddleware, requireTenantAdmin } from '@/middleware/auth';

const devicesRouter = new Hono<HonoContext>();

// All device routes require authentication
devicesRouter.use('*', authMiddleware, requireTenantAdmin);

// ============================================
// LIST DEVICES
// ============================================

devicesRouter.get('/', async (c) => {
    try {
        const user = c.get('user');
        const db = drizzle(c.env.DB);

        const deviceList = await db
            .select()
            .from(devices)
            .where(eq(devices.tenantId, user.tenantId));

        return c.json({
            success: true,
            data: deviceList.map(d => ({
                id: d.id,
                phoneNumber: d.phoneNumber,
                displayName: d.displayName,
                gatewayType: d.gatewayType,
                sessionStatus: d.sessionStatus,
                connectedAt: d.connectedAt,
                createdAt: d.createdAt,
            })),
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to list devices'
        }, 500);
    }
});

// ============================================
// CREATE DEVICE (GET QR CODE)
// ============================================

devicesRouter.post('/', async (c) => {
    try {
        const user = c.get('user');
        const { displayName, gatewayType = 'baileys' } = await c.req.json();

        const db = drizzle(c.env.DB);

        // Create device in database
        const [device] = await db
            .insert(devices)
            .values({
                tenantId: user.tenantId,
                displayName: displayName || 'WhatsApp Device',
                gatewayType,
                sessionStatus: 'disconnected',
            })
            .returning();

        // If Baileys gateway, create Durable Object and get QR
        if (gatewayType === 'baileys') {
            const id = c.env.WHATSAPP_SESSION.idFromName(device.id);
            const stub = c.env.WHATSAPP_SESSION.get(id);

            // Trigger connection
            const response = await stub.fetch(new Request('http://internal/connect', {
                method: 'POST',
            }));

            const result = await response.json() as any;

            // Update status to scanning
            await db
                .update(devices)
                .set({ sessionStatus: 'scanning' })
                .where(eq(devices.id, device.id));

            return c.json({
                success: true,
                data: {
                    id: device.id,
                    displayName: device.displayName,
                    sessionStatus: 'scanning',
                    qrCode: result.data?.qrCode,
                },
            });
        }

        // For Cloud API, return device info
        return c.json({
            success: true,
            data: {
                id: device.id,
                displayName: device.displayName,
                gatewayType: device.gatewayType,
                message: 'Configure Cloud API credentials',
            },
        });
    } catch (error: any) {
        return c.json({
            success: false,
            error: error.message || 'Failed to create device'
        }, 500);
    }
});

// ============================================
// GET DEVICE STATUS
// ============================================

devicesRouter.get('/:id', async (c) => {
    try {
        const user = c.get('user');
        const deviceId = c.req.param('id');
        const db = drizzle(c.env.DB);

        const [device] = await db
            .select()
            .from(devices)
            .where(and(
                eq(devices.id, deviceId),
                eq(devices.tenantId, user.tenantId)
            ))
            .limit(1);

        if (!device) {
            return c.json({
                success: false,
                error: 'Device not found'
            }, 404);
        }

        // Get real-time status from Durable Object
        if (device.gatewayType === 'baileys') {
            const id = c.env.WHATSAPP_SESSION.idFromName(device.id);
            const stub = c.env.WHATSAPP_SESSION.get(id);

            const response = await stub.fetch(new Request('http://internal/status'));
            const status = await response.json() as any;

            return c.json({
                success: true,
                data: {
                    id: device.id,
                    phoneNumber: status.data?.phoneNumber || device.phoneNumber,
                    displayName: device.displayName,
                    gatewayType: device.gatewayType,
                    sessionStatus: status.data?.status || device.sessionStatus,
                    qrCode: status.data?.qrCode,
                    antiBanConfig: JSON.parse(device.antiBanConfig || '{}'),
                    aiFallback: {
                        enabled: device.aiFallbackEnabled,
                        knowledgeBaseIds: JSON.parse(device.aiFallbackKbIds || '[]'),
                        prompt: device.aiFallbackPrompt,
                    },
                    connectedAt: device.connectedAt,
                    createdAt: device.createdAt,
                },
            });
        }

        // Cloud API device
        return c.json({
            success: true,
            data: {
                id: device.id,
                phoneNumber: device.phoneNumber,
                displayName: device.displayName,
                gatewayType: device.gatewayType,
                sessionStatus: device.sessionStatus,
                cloudApiConfig: JSON.parse(device.cloudApiConfig || '{}'),
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to get device status'
        }, 500);
    }
});

// ============================================
// UPDATE DEVICE SETTINGS
// ============================================

devicesRouter.patch('/:id', async (c) => {
    try {
        const user = c.get('user');
        const deviceId = c.req.param('id');
        const updates = await c.req.json();
        const db = drizzle(c.env.DB);

        // Verify ownership
        const [device] = await db
            .select()
            .from(devices)
            .where(and(
                eq(devices.id, deviceId),
                eq(devices.tenantId, user.tenantId)
            ))
            .limit(1);

        if (!device) {
            return c.json({
                success: false,
                error: 'Device not found'
            }, 404);
        }

        const updateData: any = {};

        if (updates.displayName) {
            updateData.displayName = updates.displayName;
        }

        if (updates.antiBanConfig) {
            updateData.antiBanConfig = JSON.stringify(updates.antiBanConfig);

            // Update Durable Object config
            if (device.gatewayType === 'baileys') {
                const id = c.env.WHATSAPP_SESSION.idFromName(device.id);
                const stub = c.env.WHATSAPP_SESSION.get(id);

                await stub.fetch(new Request('http://internal/config', {
                    method: 'POST',
                    body: JSON.stringify(updates.antiBanConfig),
                }));
            }
        }

        if (updates.aiFallback) {
            if (updates.aiFallback.enabled !== undefined) {
                updateData.aiFallbackEnabled = updates.aiFallback.enabled ? 1 : 0;
            }
            if (updates.aiFallback.knowledgeBaseIds) {
                updateData.aiFallbackKbIds = JSON.stringify(updates.aiFallback.knowledgeBaseIds);
            }
            if (updates.aiFallback.prompt) {
                updateData.aiFallbackPrompt = updates.aiFallback.prompt;
            }
        }

        if (Object.keys(updateData).length > 0) {
            await db
                .update(devices)
                .set(updateData)
                .where(eq(devices.id, deviceId));
        }

        return c.json({
            success: true,
            data: {
                id: deviceId,
                updated: true,
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to update device'
        }, 500);
    }
});

// ============================================
// SEND MESSAGE (MANUAL)
// ============================================

devicesRouter.post('/:id/send', async (c) => {
    try {
        const user = c.get('user');
        const deviceId = c.req.param('id');
        const { chatId, message } = await c.req.json();
        const db = drizzle(c.env.DB);

        // Verify ownership
        const [device] = await db
            .select()
            .from(devices)
            .where(and(
                eq(devices.id, deviceId),
                eq(devices.tenantId, user.tenantId)
            ))
            .limit(1);

        if (!device) {
            return c.json({
                success: false,
                error: 'Device not found'
            }, 404);
        }

        if (!chatId || !message) {
            return c.json({
                success: false,
                error: 'chatId and message required'
            }, 400);
        }

        // Send via Durable Object
        const id = c.env.WHATSAPP_SESSION.idFromName(device.id);
        const stub = c.env.WHATSAPP_SESSION.get(id);

        const response = await stub.fetch(new Request('http://internal/send', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                message,
                useAntiBan: true,
            }),
        }));

        const result = await response.json() as any;

        if (!result.success) {
            return c.json({
                success: false,
                error: result.error || 'Failed to send message'
            }, 400);
        }

        return c.json({
            success: true,
            data: {
                sent: true,
                chatId,
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to send message'
        }, 500);
    }
});

// ============================================
// DISCONNECT DEVICE
// ============================================

devicesRouter.delete('/:id', async (c) => {
    try {
        const user = c.get('user');
        const deviceId = c.req.param('id');
        const db = drizzle(c.env.DB);

        // Verify ownership
        const [device] = await db
            .select()
            .from(devices)
            .where(and(
                eq(devices.id, deviceId),
                eq(devices.tenantId, user.tenantId)
            ))
            .limit(1);

        if (!device) {
            return c.json({
                success: false,
                error: 'Device not found'
            }, 404);
        }

        // Disconnect Durable Object
        if (device.gatewayType === 'baileys') {
            const id = c.env.WHATSAPP_SESSION.idFromName(device.id);
            const stub = c.env.WHATSAPP_SESSION.get(id);

            await stub.fetch(new Request('http://internal/disconnect', {
                method: 'POST',
            }));
        }

        // Delete from database
        await db
            .delete(devices)
            .where(eq(devices.id, deviceId));

        return c.json({
            success: true,
            data: {
                deleted: true,
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to disconnect device'
        }, 500);
    }
});

export default devicesRouter;
