import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import type { HonoContext } from '@/types/env';
import { devices, tenants } from '@/db/schema';
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

        // For WAHA devices, sync status from WAHA
        const [tenant] = await db
            .select()
            .from(tenants)
            .where(eq(tenants.id, user.tenantId))
            .limit(1);

        const settings = tenant?.settings ? JSON.parse(tenant.settings) : {};
        const wahaConfig = settings.waha || {};
        const wahaBaseUrl = wahaConfig.baseUrl || c.env.WAHA_BASE_URL;
        const wahaApiKey = wahaConfig.apiKey || c.env.WAHA_API_KEY;

        let wahaStatus: string | null = null;
        let wahaPhoneNumber: string | null = null;
        if (wahaBaseUrl && wahaApiKey) {
            try {
                const waha = new WAHAClient({ baseUrl: wahaBaseUrl, apiKey: wahaApiKey });
                const session = await waha.getSessionStatus('default');
                wahaStatus = session.status.toLowerCase();

                // Extract phone number from session.me.id (format: "6285232364446@c.us")
                if (session.me?.id) {
                    wahaPhoneNumber = session.me.id.replace('@c.us', '');
                }

                // If WAHA is WORKING, update any device that's still scanning or missing phone
                if (session.status === 'WORKING') {
                    for (const device of deviceList) {
                        if (device.gatewayType === 'waha') {
                            const needsUpdate = device.sessionStatus !== 'connected' ||
                                (wahaPhoneNumber && !device.phoneNumber);

                            if (needsUpdate) {
                                await db
                                    .update(devices)
                                    .set({
                                        sessionStatus: 'connected',
                                        phoneNumber: wahaPhoneNumber || device.phoneNumber,
                                        connectedAt: device.connectedAt || new Date().toISOString()
                                    })
                                    .where(eq(devices.id, device.id));
                                device.sessionStatus = 'connected';
                                if (wahaPhoneNumber) device.phoneNumber = wahaPhoneNumber;
                            }
                        }
                    }
                }
            } catch (e) {
                // WAHA not available
            }
        }


        return c.json({
            success: true,
            data: deviceList.map(d => ({
                id: d.id,
                phoneNumber: d.phoneNumber,
                displayName: d.displayName,
                gatewayType: d.gatewayType,
                sessionStatus: d.gatewayType === 'waha' && wahaStatus === 'working' ? 'connected' : d.sessionStatus,
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

        // Check max 1 device limit per tenant (WAHA free tier)
        const existingDevices = await db
            .select()
            .from(devices)
            .where(eq(devices.tenantId, user.tenantId))
            .limit(1);

        if (existingDevices.length > 0) {
            return c.json({
                success: false,
                error: 'Maximum 1 device per tenant. Please delete existing device first.'
            }, 400);
        }

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
        if (gatewayType === 'waha') {
            // Get tenant settings for custom WAHA config
            const [tenant] = await db
                .select()
                .from(tenants)
                .where(eq(tenants.id, user.tenantId))
                .limit(1);

            const settings = tenant?.settings ? JSON.parse(tenant.settings) : {};
            const wahaConfig = settings.waha || {};

            // Prioritize tenant config, fallback to global env
            const wahaBaseUrl = wahaConfig.baseUrl || c.env.WAHA_BASE_URL;
            const wahaApiKey = wahaConfig.apiKey || c.env.WAHA_API_KEY;

            if (wahaBaseUrl && wahaApiKey) {
                const waha = new WAHAClient({
                    baseUrl: wahaBaseUrl,
                    apiKey: wahaApiKey,
                });

                // WAHA Core (free) only supports 'default' session name
                const wahaSessionName = 'default';

                // Start session with webhook pointing back to our Workers
                const webhookUrl = `https://${c.req.header('host')}/api/webhook/waha`;

                try {
                    // First, try to stop/delete any existing session to ensure fresh start with new config
                    try {
                        await waha.stopSession(wahaSessionName);
                        console.log('Stopped existing session');
                        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for cleanup
                    } catch (stopError: any) {
                        // Session might not exist, that's OK
                        console.log('No existing session to stop:', stopError.message);
                    }

                    // Now start fresh session with store.enabled = true config
                    await waha.startSession(wahaSessionName, webhookUrl);
                    console.log('Started new session with store enabled');
                } catch (startError: any) {
                    // If session already exists and won't stop, that's OK - continue to get QR
                    console.log('Start session result:', startError.message);
                }

                // Give WAHA a moment to generate QR
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Try to get QR code
                try {
                    const qr = await waha.getQRCode(wahaSessionName);

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
                } catch (qrError: any) {
                    // QR not ready yet, return pending status
                    return c.json({
                        success: true,
                        data: {
                            id: device.id,
                            displayName: device.displayName,
                            sessionStatus: 'starting',
                            message: 'Session starting, please refresh to get QR code',
                        },
                    });
                }


            } else {
                return c.json({
                    success: false,
                    error: 'WAHA configuration missing. Please configure WAHA Server in Settings.'
                }, 400);
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

        // Get real-time status from WAHA using tenant settings
        if (device.gatewayType === 'waha') {
            // Fetch tenant WAHA config
            const [tenant] = await db
                .select()
                .from(tenants)
                .where(eq(tenants.id, user.tenantId))
                .limit(1);

            const settings = tenant?.settings ? JSON.parse(tenant.settings) : {};
            const wahaConfig = settings.waha || {};
            const wahaBaseUrl = wahaConfig.baseUrl || c.env.WAHA_BASE_URL;
            const wahaApiKey = wahaConfig.apiKey || c.env.WAHA_API_KEY;

            if (wahaBaseUrl && wahaApiKey) {
                const waha = new WAHAClient({
                    baseUrl: wahaBaseUrl,
                    apiKey: wahaApiKey,
                });

                // WAHA Core (free) only supports 'default' session name
                const wahaSessionName = 'default';

                try {
                    const status = await waha.getSessionStatus(wahaSessionName);

                    // Sync status to database if changed
                    const wahaStatus = status.status.toLowerCase();
                    let dbStatus = device.sessionStatus;

                    if (status.status === 'WORKING' && device.sessionStatus !== 'connected') {
                        dbStatus = 'connected';
                        await db
                            .update(devices)
                            .set({
                                sessionStatus: 'connected',
                                connectedAt: new Date().toISOString()
                            })
                            .where(eq(devices.id, device.id));
                    }

                    // Try to get QR if scanning
                    let qrCode;
                    if (status.status === 'SCAN_QR_CODE') {
                        try {
                            const qr = await waha.getQRCode(wahaSessionName);
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
                            sessionStatus: wahaStatus === 'working' ? 'connected' : wahaStatus,
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

        // Send via WAHA using tenant settings
        if (device.gatewayType === 'waha') {
            // Fetch tenant WAHA config
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
                return c.json({
                    success: false,
                    error: 'WAHA not configured. Please configure in Settings.'
                }, 400);
            }

            const waha = new WAHAClient({
                baseUrl: wahaBaseUrl,
                apiKey: wahaApiKey,
            });

            // WAHA Core (free) only supports 'default' session name
            const result = await waha.sendMessage({
                session: 'default',
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

        // Stop WAHA session using tenant settings
        if (device.gatewayType === 'waha') {
            const [tenant] = await db
                .select()
                .from(tenants)
                .where(eq(tenants.id, user.tenantId))
                .limit(1);

            const settings = tenant?.settings ? JSON.parse(tenant.settings) : {};
            const wahaConfig = settings.waha || {};
            const wahaBaseUrl = wahaConfig.baseUrl || c.env.WAHA_BASE_URL;
            const wahaApiKey = wahaConfig.apiKey || c.env.WAHA_API_KEY;

            if (wahaBaseUrl && wahaApiKey) {
                const waha = new WAHAClient({
                    baseUrl: wahaBaseUrl,
                    apiKey: wahaApiKey,
                });

                try {
                    // WAHA Core (free) only supports 'default' session name
                    await waha.deleteSession('default');
                } catch (error) {
                    console.error('Failed to delete WAHA session:', error);
                }
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
