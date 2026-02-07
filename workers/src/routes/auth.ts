import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { HonoContext } from '@/types/env';
import { superAdmins, users, tenants } from '@/db/schema';
import { hashPassword, verifyPassword } from '@/auth/password';
import { createToken } from '@/auth/jwt';
import { authMiddleware } from '@/middleware/auth';

const auth = new Hono<HonoContext>();

// ============================================
// SUPER ADMIN LOGIN
// ============================================

auth.post('/super-admin/login', async (c) => {
    try {
        const { email, password } = await c.req.json();

        if (!email || !password) {
            return c.json({
                success: false,
                error: 'Email and password required'
            }, 400);
        }

        const db = drizzle(c.env.DB);

        // Find super admin
        const [admin] = await db
            .select()
            .from(superAdmins)
            .where(eq(superAdmins.email, email))
            .limit(1);

        if (!admin) {
            return c.json({
                success: false,
                error: 'Invalid credentials'
            }, 401);
        }

        // Verify password
        const isValid = await verifyPassword(password, admin.passwordHash);

        if (!isValid) {
            return c.json({
                success: false,
                error: 'Invalid credentials'
            }, 401);
        }

        // Create JWT
        const token = await createToken({
            userId: admin.id,
            tenantId: '', // Super admin not tied to tenant
            role: 'super_admin',
            email: admin.email,
        }, c.env.JWT_SECRET);

        // Update last login
        await db
            .update(superAdmins)
            .set({ lastLogin: new Date().toISOString() })
            .where(eq(superAdmins.id, admin.id));

        return c.json({
            success: true,
            data: {
                token,
                user: {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    role: 'super_admin',
                },
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Login failed'
        }, 500);
    }
});

// ============================================
// TENANT ADMIN LOGIN
// ============================================

auth.post('/login', async (c) => {
    try {
        const { email, password } = await c.req.json();

        if (!email || !password) {
            return c.json({
                success: false,
                error: 'Email and password required'
            }, 400);
        }

        const db = drizzle(c.env.DB);

        // Find user with tenant
        const [user] = await db
            .select({
                user: users,
                tenant: tenants,
            })
            .from(users)
            .leftJoin(tenants, eq(users.tenantId, tenants.id))
            .where(eq(users.email, email))
            .limit(1);

        if (!user || !user.tenant) {
            return c.json({
                success: false,
                error: 'Invalid credentials'
            }, 401);
        }

        // Verify password
        const isValid = await verifyPassword(password, user.user.passwordHash);

        if (!isValid) {
            return c.json({
                success: false,
                error: 'Invalid credentials'
            }, 401);
        }

        // Create JWT
        const token = await createToken({
            userId: user.user.id,
            tenantId: user.user.tenantId,
            role: 'tenant_admin',
            email: user.user.email,
        }, c.env.JWT_SECRET);

        // Update last login
        await db
            .update(users)
            .set({ lastLogin: new Date().toISOString() })
            .where(eq(users.id, user.user.id));

        return c.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.user.id,
                    email: user.user.email,
                    name: user.user.name,
                    role: 'tenant_admin',
                    tenantId: user.user.tenantId,
                    tenantName: user.tenant.name,
                    subscriptionPlan: user.tenant.subscriptionPlan,
                },
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Login failed'
        }, 500);
    }
});

// ============================================
// TENANT REGISTRATION
// ============================================

auth.post('/register', async (c) => {
    try {
        const { email, password, name, tenantName } = await c.req.json();

        if (!email || !password || !name || !tenantName) {
            return c.json({
                success: false,
                error: 'All fields required'
            }, 400);
        }

        const db = drizzle(c.env.DB);

        // Check if email already exists
        const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (existing) {
            return c.json({
                success: false,
                error: 'Email already registered'
            }, 400);
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create tenant
        const [tenant] = await db
            .insert(tenants)
            .values({
                name: tenantName,
                email: email,
                subscriptionPlan: 'free',
                settings: '{}',
            })
            .returning();

        // Create user
        const [user] = await db
            .insert(users)
            .values({
                tenantId: tenant.id,
                email,
                passwordHash,
                name,
            })
            .returning();

        // Create JWT
        const token = await createToken({
            userId: user.id,
            tenantId: tenant.id,
            role: 'tenant_admin',
            email: user.email,
        }, c.env.JWT_SECRET);

        return c.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: 'tenant_admin',
                    tenantId: tenant.id,
                    tenantName: tenant.name,
                },
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Registration failed'
        }, 500);
    }
});

// ============================================
// GET CURRENT USER
// ============================================

auth.get('/me', authMiddleware, async (c) => {
    try {
        const currentUser = c.get('user');
        const db = drizzle(c.env.DB);

        if (currentUser.role === 'super_admin') {
            const [admin] = await db
                .select()
                .from(superAdmins)
                .where(eq(superAdmins.id, currentUser.userId))
                .limit(1);

            if (!admin) {
                return c.json({
                    success: false,
                    error: 'User not found'
                }, 404);
            }

            return c.json({
                success: true,
                data: {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    role: 'super_admin',
                },
            });
        } else {
            const [user] = await db
                .select({
                    user: users,
                    tenant: tenants,
                })
                .from(users)
                .leftJoin(tenants, eq(users.tenantId, tenants.id))
                .where(eq(users.id, currentUser.userId))
                .limit(1);

            if (!user || !user.tenant) {
                return c.json({
                    success: false,
                    error: 'User not found'
                }, 404);
            }

            return c.json({
                success: true,
                data: {
                    id: user.user.id,
                    email: user.user.email,
                    name: user.user.name,
                    role: 'tenant_admin',
                    tenantId: user.user.tenantId,
                    tenantName: user.tenant.name,
                    subscriptionPlan: user.tenant.subscriptionPlan,
                },
            });
        }
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to get user'
        }, 500);
    }
});

export default auth;
