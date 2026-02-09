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

// Get Available AI Providers (with configured models)
settingsRouter.get('/ai-providers', async (c) => {
    try {
        const user = c.get('user');
        const db = drizzle(c.env.DB);
        const { tenantAiSettings, aiProviders } = await import('@/db/schema');
        const { and } = await import('drizzle-orm');

        console.log(`[ai-providers] Request from user:`, JSON.stringify(user));

        // Get tenant's configured AI providers with their settings
        // Get all active system providers
        const systemProviders = await db
            .select()
            .from(aiProviders)
            .where(eq(aiProviders.isActive, true));

        // Get tenant's specific settings
        const tenantSettings = await db
            .select({
                provider: aiProviders.provider,
                providerId: aiProviders.id,
                apiKey: tenantAiSettings.apiKey,
                config: tenantAiSettings.config,
                tenantId: tenantAiSettings.tenantId,
            })
            .from(tenantAiSettings)
            .innerJoin(aiProviders, eq(tenantAiSettings.aiProviderId, aiProviders.id))
            .where(and(
                eq(tenantAiSettings.tenantId, user.tenantId),
                eq(aiProviders.isActive, true)
            ));

        // Create a map of configured providers
        const configuredMap = new Map(tenantSettings.map(s => [s.providerId, s]));

        // Merge: System providers + Tenant overrides
        const mergedProviders = systemProviders.map(sys => {
            const tenantConfig = configuredMap.get(sys.id);
            // If tenant has config, use it. If not, use system default if it has a key (like binding)
            // For workers_ai, apiKey is 'binding', so it effectively has a key.
            const hasKey = tenantConfig?.apiKey || sys.apiKey;

            return {
                id: sys.id,
                name: sys.displayName,
                provider: sys.provider,
                models: [], // Will be filled below
                hasKey: !!hasKey
            };
        }).filter(p => p.hasKey); // Only return providers that are usable (have key either from system or tenant)



        // Define available models per provider
        const providerModels: Record<string, string[]> = {
            'openai': [
                'gpt-4o',
                'gpt-4o-mini',
                'gpt-4-turbo',
                'gpt-3.5-turbo',
                'gpt-4.1',
                'gpt-4.1-mini'
            ],
            'anthropic': [
                'claude-sonnet-4',
                'claude-3.7-sonnet',
                'claude-3.5-sonnet'
            ],
            'google': [
                'gemini-2.0-flash',
                'gemini-2.5-flash-preview-05-20',
                'gemini-2.5-pro-preview-06-05',
                'gemini-2.5-pro-preview-05-06',
                'gemini-2.5-flash-preview-04-17',
                'gemini-2.0-flash-lite',
                'gemini-1.5-flash',
                'gemini-1.5-flash-8b'
            ],
            'gemini': [
                'gemini-2.0-flash',
                'gemini-2.5-flash-preview-05-20',
                'gemini-2.5-pro-preview-06-05',
                'gemini-2.5-pro-preview-05-06',
                'gemini-2.5-flash-preview-04-17',
                'gemini-2.0-flash-lite',
                'gemini-1.5-flash',
                'gemini-1.5-flash-8b'
            ],
            'deepseek': [
                'deepseek-v3-0324',
                'deepseek-v3-0324-free',
                'deepseek-r1-0528-free',
                'deepseek-r1-free'
            ],
            'mistral': [
                'mistral-nemo'
            ],
            'meta': [
                'llama-3.3-70b-instruct'
            ],
            'workers_ai': [
                '@cf/meta/llama-3-8b-instruct',
                '@cf/meta/llama-3-70b-instruct',
                '@cf/mistral/mistral-7b-instruct-v0.1'
            ],
            'xai': [
                'grok-3-beta'
            ]
        };

        // Build response
        const availableProviders = mergedProviders.map(mp => ({
            id: mp.id,
            name: mp.name, // Display Name from DB
            models: providerModels[mp.provider] || [],
            configured: mp.hasKey,
            provider: mp.provider
        }));

        // Remove duplicates (by provider type, or keep all distinct provider IDs?)
        // We might have multiple OpenAI providers (system vs tenant custom)?
        // For now, let's keep all valid ones.
        // Actually, logic above already merged system + tenant into one entry per provider ID.


        return c.json({
            success: true,
            data: availableProviders,
        });
    } catch (error: any) {
        console.error('Get AI providers error:', error);
        return c.json({ success: false, error: 'Failed to get AI providers' }, 500);
    }
});

export default settingsRouter;
