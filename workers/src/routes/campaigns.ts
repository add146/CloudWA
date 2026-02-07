import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and } from 'drizzle-orm';
import type { HonoContext } from '@/types/env';
import { campaigns, campaignItems, contacts, devices } from '@/db/schema';
import { authMiddleware, requireTenantAdmin } from '@/middleware/auth';
import { WAHAClient } from '@/gateway/waha-client';

const campaignsRouter = new Hono<HonoContext>();

// All routes require authentication
campaignsRouter.use('*', authMiddleware, requireTenantAdmin);

// ============================================
// LIST CAMPAIGNS
// ============================================

campaignsRouter.get('/', async (c) => {
    try {
        const user = c.get('user');
        const db = drizzle(c.env.DB);

        const campaignList = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.tenantId, user.tenantId))
            .orderBy(desc(campaigns.createdAt));

        return c.json({
            success: true,
            data: campaignList,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to list campaigns'
        }, 500);
    }
});

// ============================================
// CREATE CAMPAIGN (BROADCAST)
// ============================================

campaignsRouter.post('/', async (c) => {
    try {
        const user = c.get('user');
        const { name, deviceId, message, scheduledAt } = await c.req.json();
        const db = drizzle(c.env.DB);

        if (!name || !deviceId || !message) {
            return c.json({
                success: false,
                error: 'Name, deviceId, and message are required'
            }, 400);
        }

        // 1. Validate Device
        const [device] = await db
            .select()
            .from(devices)
            .where(and(
                eq(devices.id, deviceId),
                eq(devices.tenantId, user.tenantId)
            ))
            .limit(1);

        if (!device) {
            return c.json({ success: false, error: 'Device not found' }, 404);
        }

        // 2. Get All Contacts (Simple implementation: send to ALL contacts)
        // In real world, we should filter by tags
        const allContacts = await db
            .select()
            .from(contacts)
            .where(eq(contacts.tenantId, user.tenantId));

        if (allContacts.length === 0) {
            return c.json({ success: false, error: 'No contacts found to broadcast to' }, 400);
        }

        // 3. Create Campaign Record
        const [campaign] = await db
            .insert(campaigns)
            .values({
                tenantId: user.tenantId,
                name,
                messageTemplate: message,
                status: 'processing',
                totalContacts: allContacts.length,
                sentCount: 0,
                failedCount: 0,
                scheduledAt: scheduledAt || new Date().toISOString(),
            })
            .returning();

        // 4. Background Process: Send Messages
        // Using ctx.waitUntil to process in background without blocking response
        c.executionCtx.waitUntil((async () => {
            const waha = new WAHAClient({
                baseUrl: c.env.WAHA_BASE_URL,
                apiKey: c.env.WAHA_API_KEY,
            });

            let sent = 0;
            let failed = 0;

            for (const contact of allContacts) {
                try {
                    // Replace variables
                    const personalizedMessage = message.replace('{{name}}', contact.name || 'Friend');

                    // Send via WAHA
                    await waha.sendMessage({
                        session: device.id,
                        chatId: contact.phone.endsWith('@c.us') ? contact.phone : `${contact.phone}@c.us`,
                        text: personalizedMessage,
                    });

                    // Log Item (Optional, might be heavy for large lists)
                    /* await db.insert(campaignItems).values({
                        campaignId: campaign.id,
                        contactId: contact.id,
                        status: 'sent',
                    }); */

                    sent++;

                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5s delay

                } catch (err) {
                    failed++;
                    console.error(`Failed to send to ${contact.phone}:`, err);
                }
            }

            // Update Campaign Status
            await db
                .update(campaigns)
                .set({
                    status: 'completed',
                    sentCount: sent,
                    failedCount: failed,
                    completedAt: new Date().toISOString(),
                })
                .where(eq(campaigns.id, campaign.id));

        })());

        return c.json({
            success: true,
            data: campaign,
            message: `Broadcasting to ${allContacts.length} contacts started in background.`
        });

    } catch (error: any) {
        return c.json({
            success: false,
            error: error.message || 'Failed to create campaign'
        }, 500);
    }
});

export default campaignsRouter;
