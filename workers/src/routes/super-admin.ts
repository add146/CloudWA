import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, count, sql, desc } from 'drizzle-orm';
import type { HonoContext } from '@/types/env';
import { tenants, devices, aiProviders, users } from '@/db/schema';
import { authMiddleware } from '@/middleware/auth';

const superAdmin = new Hono<HonoContext>();

// Middleware to ensure user is Super Admin
superAdmin.use('*', authMiddleware, async (c, next) => {
    const user = c.get('user');
    if (user.role !== 'super_admin') {
        return c.json({ success: false, error: 'Unauthorized: Super Admin access required' }, 403);
    }
    await next();
});

// GET /api/super-admin/stats
superAdmin.get('/stats', async (c) => {
    try {
        const db = drizzle(c.env.DB);

        // Count Tenants
        const [tenantsCount] = await db.select({ count: count() }).from(tenants);

        // Count Active Devices
        const [devicesCount] = await db.select({ count: count() }).from(devices).where(eq(devices.sessionStatus, 'WORKING')); // Assuming 'connected' or similar status

        // Calculate Revenue (Placeholder - assuming fixed price for now or mock)
        // For now returning 0 as per screenshot until billing is implemented

        return c.json({
            success: true,
            data: {
                totalTenants: tenantsCount.count,
                activeDevices: devicesCount.count,
                totalRevenue: 0
            }
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
    }
});

// GET /api/super-admin/tenants
superAdmin.get('/tenants', async (c) => {
    try {
        const db = drizzle(c.env.DB);

        // Fetch tenants with their admin user
        const allTenants = await db
            .select({
                id: tenants.id,
                name: tenants.name,
                email: tenants.email,
                plan: tenants.subscriptionPlan,
                createdAt: tenants.createdAt,
                status: sql<string>`'active'`, // Default to active for now
            })
            .from(tenants)
            .orderBy(desc(tenants.createdAt));

        return c.json({
            success: true,
            data: allTenants
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch tenants' }, 500);
    }
});

// GET /api/super-admin/ai-providers
superAdmin.get('/ai-providers', async (c) => {
    try {
        const db = drizzle(c.env.DB);
        const providers = await db.select().from(aiProviders);
        return c.json({ success: true, data: providers });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch AI providers' }, 500);
    }
});

// POST /api/super-admin/ai-providers
superAdmin.post('/ai-providers', async (c) => {
    try {
        const body = await c.req.json();
        const db = drizzle(c.env.DB);

        const [newProvider] = await db.insert(aiProviders).values({
            displayName: body.name,
            provider: body.provider, // 'openai', 'gemini', 'anthropic'
            apiKey: body.apiKey, // System-wide key
            modelId: body.modelId, // Default model
            isActive: body.isActive ?? true
        }).returning();

        return c.json({ success: true, data: newProvider });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to create AI provider' }, 500);
    }
});

export default superAdmin;
