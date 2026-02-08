
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, sql } from 'drizzle-orm';
import type { HonoContext } from '@/types/env';
import { aiProviders, tenantAiSettings } from '@/db/schema';
import { authMiddleware, requireTenantAdmin } from '@/middleware/auth';

const aiSettingsRouter = new Hono<HonoContext>();

// All routes require authentication and tenant admin role
aiSettingsRouter.use('*', authMiddleware, requireTenantAdmin);

// ============================================
// GET AI SETTINGS
// ============================================

aiSettingsRouter.get('/', async (c) => {
    try {
        const user = c.get('user');
        const db = drizzle(c.env.DB);

        // 1. Get all available providers (system level)
        const providers = await db
            .select()
            .from(aiProviders)
            .where(eq(aiProviders.isActive, true));

        // 2. Get tenant settings
        const settings = await db
            .select()
            .from(tenantAiSettings)
            .where(eq(tenantAiSettings.tenantId, user.tenantId));

        // 3. Merge data
        const merged = providers.map(provider => {
            const setting = settings.find(s => s.aiProviderId === provider.id);
            return {
                ...provider,
                apiKey: null, // Don't return the global system API key
                tenantSetting: setting ? {
                    id: setting.id,
                    isDefault: setting.isDefault,
                    // Return masked API key if exists
                    hasApiKey: !!setting.apiKey,
                    maskedApiKey: setting.apiKey ? `${setting.apiKey.substring(0, 3)}...${setting.apiKey.slice(-4)}` : null,
                    config: JSON.parse(setting.config || '{}'),
                    customSystemPrompt: setting.customSystemPrompt,
                } : null
            };
        });

        return c.json({
            success: true,
            data: merged,
        });
    } catch (error: any) {
        return c.json({
            success: false,
            error: error.message || 'Failed to fetch AI settings'
        }, 500);
    }
});

// ============================================
// UPDATE AI SETTINGS
// ============================================

aiSettingsRouter.put('/', async (c) => {
    try {
        const user = c.get('user');
        const db = drizzle(c.env.DB);
        const { providerId, apiKey, config, isDefault, customSystemPrompt } = await c.req.json();

        if (!providerId) {
            return c.json({ success: false, error: 'Provider ID is required' }, 400);
        }

        // Check if provider exists
        const [provider] = await db
            .select()
            .from(aiProviders)
            .where(eq(aiProviders.id, providerId))
            .limit(1);

        if (!provider) {
            return c.json({ success: false, error: 'Invalid provider' }, 400);
        }

        // Check if setting exists
        const [existing] = await db
            .select()
            .from(tenantAiSettings)
            .where(and(
                eq(tenantAiSettings.tenantId, user.tenantId),
                eq(tenantAiSettings.aiProviderId, providerId)
            ))
            .limit(1);

        if (existing) {
            // Update
            await db.update(tenantAiSettings)
                .set({
                    // Only update API Key if provided (allow empty to keep existing, or special value to clear?)
                    // For now: if provided, update it. If null but not undefined, clear it?
                    // Let's assume if key is provided and length > 0, update it.
                    ...(apiKey ? { apiKey } : {}),
                    config: JSON.stringify(config || {}),
                    isDefault: isDefault ?? existing.isDefault,
                    customSystemPrompt: customSystemPrompt ?? existing.customSystemPrompt,
                    lastUsed: new Date().toISOString()
                })
                .where(eq(tenantAiSettings.id, existing.id));
        } else {
            // Insert
            await db.insert(tenantAiSettings).values({
                tenantId: user.tenantId,
                aiProviderId: providerId,
                apiKey: apiKey || null,
                config: JSON.stringify(config || {}),
                isDefault: isDefault || false,
                customSystemPrompt,
            });
        }

        // If this is set to default, unset others (optional logic, maybe strictly one default?)
        if (isDefault) {
            await db.update(tenantAiSettings)
                .set({ isDefault: false })
                .where(and(
                    eq(tenantAiSettings.tenantId, user.tenantId),
                    sql`${tenantAiSettings.aiProviderId} != ${providerId}`
                ));
        }

        return c.json({
            success: true,
            message: 'AI settings updated successfully'
        });

    } catch (error: any) {
        return c.json({
            success: false,
            error: error.message || 'Failed to update AI settings'
        }, 500);
    }
});

export default aiSettingsRouter;
