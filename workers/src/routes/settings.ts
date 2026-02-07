import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { HonoContext } from '@/types/env';
import { tenants } from '@/db/schema';
import { authMiddleware, requireTenantAdmin } from '@/middleware/auth';

const settingsRouter = new Hono<HonoContext>();

// Middleware: Auth required
settingsRouter.use('*', authMiddleware, requireTenantAdmin);

// Get Settings
settingsRouter.get('/', async (c) => {
    try {
        const user = c.get('user');
        const db = drizzle(c.env.DB);

        const [tenant] = await db
            .select()
            .from(tenants)
            .where(eq(tenants.id, user.tenantId))
            .limit(1);

        if (!tenant) {
            return c.json({ success: false, error: 'Tenant not found' }, 404);
        }

        const settings = JSON.parse(tenant.settings || '{}');

        return c.json({
            success: true,
            data: settings,
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch settings' }, 500);
    }
});

// Update Settings
settingsRouter.put('/', async (c) => {
    try {
        const user = c.get('user');
        const db = drizzle(c.env.DB);
        const body = await c.req.json();

        // Validate body structure for WAHA
        if (body.waha) {
            // Basic validation
            if (typeof body.waha.baseUrl !== 'string') {
                return c.json({ success: false, error: 'Invalid WAHA URL' }, 400);
            }
        }

        // Fetch current settings to merge
        const [tenant] = await db
            .select()
            .from(tenants)
            .where(eq(tenants.id, user.tenantId))
            .limit(1);

        if (!tenant) {
            return c.json({ success: false, error: 'Tenant not found' }, 404);
        }

        const currentSettings = JSON.parse(tenant.settings || '{}');

        // Merge settings (deep merge for waha object)
        const newSettings = {
            ...currentSettings,
            ...body,
            waha: {
                ...(currentSettings.waha || {}),
                ...(body.waha || {}),
            }
        };

        if (body.waha === null) {
            delete newSettings.waha;
        }

        await db
            .update(tenants)
            .set({
                settings: JSON.stringify(newSettings),
                updatedAt: new Date().toISOString()
            })
            .where(eq(tenants.id, user.tenantId));

        return c.json({
            success: true,
            data: newSettings,
        });
    } catch (error) {
        console.error('Update settings error:', error);
        return c.json({ success: false, error: 'Failed to update settings' }, 500);
    }
});

export default settingsRouter;
