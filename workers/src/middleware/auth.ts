import { createMiddleware } from 'hono/factory';
import { verifyToken } from '@/auth/jwt';
import type { HonoContext } from '@/types/env';

export const authMiddleware = createMiddleware<HonoContext>(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
        return c.json({ success: false, error: 'Missing Authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const payload = await verifyToken(token, c.env.JWT_SECRET);
        c.set('user', payload);
        await next();
    } catch (error) {
        return c.json({
            success: false,
            error: 'Invalid or expired token'
        }, 401);
    }
});

export const requireSuperAdmin = createMiddleware<HonoContext>(async (c, next) => {
    const user = c.get('user');

    if (!user || user.role !== 'super_admin') {
        return c.json({
            success: false,
            error: 'Super Admin access required'
        }, 403);
    }

    await next();
});

export const requireTenantAdmin = createMiddleware<HonoContext>(async (c, next) => {
    const user = c.get('user');

    if (!user || user.role !== 'tenant_admin') {
        return c.json({
            success: false,
            error: 'Tenant Admin access required'
        }, 403);
    }

    await next();
});
