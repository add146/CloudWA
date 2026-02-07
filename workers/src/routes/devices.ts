import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import type { HonoContext } from '@/types/env';
import { devices } from '@/db/schema';
import { authMiddleware, requireTenantAdmin } from '@/middleware/auth';
import { WAHAClient } from '@/gateway/waha-client';
import { CloudAPIClient } from '@/gateway/cloud-api-client';

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
        const { displayName, gatewayType = 'waha' } = await c.req.json();

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

        // If WAHA gateway, start session and get QR
        if (gatewayType === 'waha' && c.env.WAHA_BASE_URL && c.env.WAHA_API_KEY) {
            const waha = new WAHAClient({
                baseUrl: c.env.WAHA_BASE_URL,
                apiKey: c.env.WAHA_API_KEY,
            });

            // Start session with webhook pointing back to our Workers
            const webhookUrl = `https://${c.req.header('host')}/api/webhook/waha`;
            await waha.startSession(device.id, webhookUrl);

            // Get QR code
            try {
                const qr = await waha.getQRCode(device.id);

                // Update status
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
                        qrCode: `data:${qr.mimetype};base64,${qr.data}`,
                    },
                });
            } catch (error) {
                // QR not ready yet, return pending status
                return c.json({
                    success: true,
                    data: {
                        id: device.id,
                        displayName: device.displayName,
                        sessionStatus: 'starting',
                        message: 'Session starting, QR code will be available soon',
                    },
                });
            }
        }

        // For Cloud API, return device info with setup instructions
        return c.json({
            success: true,
            data: {
                id: device.id,
                displayName: device.displayName,
                gatewayType: device.gatewayType,
                message: 'Configure WhatsApp Cloud API credentials in settings',
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
// GET DEVICE STATUS & QR CODE
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

        // Get real-time status from WAHA
        if (device.gatewayType === 'waha' && c.env.WAHA_BASE_URL && c.env.WAHA_API_KEY) {
            const waha = new WAHAClient({
                baseUrl: c.env.WAHA_BASE_URL,
                apiKey: c.env.WAHA_API_KEY,
            });

            try {
                const status = await waha.getSessionStatus(device.id);

                // Try to get QR if scanning
                let qrCode;
                if (status.status === 'SCAN_QR_CODE') {
                    try {
                        const qr = await waha.getQRCode(device.id);
                        qrCode = `data:${qr.mimetype};base64,${qr.data}`;
                    } catch (e) { }
                }

                return c.json({
                    success: true,
                    data: {
                        id: device.id,
                        phoneNumber: device.phoneNumber,
                        displayName: device.displayName,
                        gatewayType: device.gatewayType,
                        sessionStatus: status.status.toLowerCase(),
                        qrCode,
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
            } catch (error) {
                // WAHA not available, return DB status
            }
        }

        // Fallback to database info
        return c.json({
            success: true,
            data: {
                id: device.id,
                phoneNumber: device.phoneNumber,
                displayName: device.displayName,
                gatewayType: device.gatewayType,
                sessionStatus: device.sessionStatus,
                cloudApiConfig: device.gatewayType === 'cloudapi' ? JSON.parse(device.cloudApiConfig || '{}') : null,
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

        // Send via WAHA
        if (device.gatewayType === 'waha' && c.env.WAHA_BASE_URL && c.env.WAHA_API_KEY) {
            const waha = new WAHAClient({
                baseUrl: c.env.WAHA_BASE_URL,
                apiKey: c.env.WAHA_API_KEY,
            });

            const result = await waha.sendMessage({
                session: device.id,
                chatId,
                text: message,
            });

            return c.json({
                success: true,
                data: {
                    sent: true,
                    chatId,
                    result,
                },
            });
        }

        // Send via Cloud API
        if (device.gatewayType === 'cloudapi') {
            const config = JSON.parse(device.cloudApiConfig || '{}');

            if (!config.phoneNumberId || !config.accessToken) {
                return c.json({
                    success: false,
                    error: 'Cloud API not configured for this device'
                }, 400);
            }

            const cloudApi = new CloudAPIClient({
                phoneNumberId: config.phoneNumberId,
                accessToken: config.accessToken,
            });

            const result = await cloudApi.sendText(chatId, message);

            return c.json({
                success: true,
                data: {
                    sent: true,
                    chatId,
                    result,
                },
            });
        }

        return c.json({
            success: false,
            error: 'Unknown gateway type'
        }, 400);
    } catch (error: any) {
        return c.json({
            success: false,
            error: error.message || 'Failed to send message'
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

        // Stop WAHA session
        if (device.gatewayType === 'waha' && c.env.WAHA_BASE_URL && c.env.WAHA_API_KEY) {
            const waha = new WAHAClient({
                baseUrl: c.env.WAHA_BASE_URL,
                apiKey: c.env.WAHA_API_KEY,
            });

            try {
                await waha.deleteSession(device.id);
            } catch (error) {
                console.error('Failed to delete WAHA session:', error);
            }
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
