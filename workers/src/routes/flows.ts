import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import type { HonoContext } from '@/types/env';
import { flows, devices } from '@/db/schema';
import { authMiddleware, requireTenantAdmin } from '@/middleware/auth';

const flowsRouter = new Hono<HonoContext>();

// All flow routes require authentication
flowsRouter.use('*', authMiddleware, requireTenantAdmin);

// ============================================
// LIST FLOWS FOR DEVICE
// ============================================

flowsRouter.get('/devices/:deviceId/flows', async (c) => {
    try {
        const user = c.get('user');
        const deviceId = c.req.param('deviceId');
        const db = drizzle(c.env.DB);

        // Verify device ownership
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

        // Get flows
        const flowList = await db
            .select()
            .from(flows)
            .where(eq(flows.deviceId, deviceId))
            .orderBy(flows.priority);

        return c.json({
            success: true,
            data: flowList.map(f => ({
                id: f.id,
                name: f.name,
                description: f.description,
                triggerKeywords: JSON.parse(f.triggerKeywords),
                isActive: f.isActive,
                priority: f.priority,
                version: f.version,
                updatedAt: f.updatedAt,
            })),
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to list flows'
        }, 500);
    }
});

// ============================================
// CREATE FLOW
// ============================================

flowsRouter.post('/devices/:deviceId/flows', async (c) => {
    try {
        const user = c.get('user');
        const deviceId = c.req.param('deviceId');
        const { name, description, triggerKeywords, flowJson } = await c.req.json();
        const db = drizzle(c.env.DB);

        // Verify device ownership
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

        if (!name || !triggerKeywords || !flowJson) {
            return c.json({
                success: false,
                error: 'name, triggerKeywords, and flowJson required'
            }, 400);
        }

        // Create flow
        const [flow] = await db
            .insert(flows)
            .values({
                deviceId,
                name,
                description,
                triggerKeywords: JSON.stringify(triggerKeywords),
                flowJson: JSON.stringify(flowJson),
                isActive: false,
                priority: 0,
                version: 1,
            })
            .returning();

        return c.json({
            success: true,
            data: {
                id: flow.id,
                name: flow.name,
                triggerKeywords: JSON.parse(flow.triggerKeywords),
                isActive: flow.isActive,
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to create flow'
        }, 500);
    }
});

// ============================================
// UPDATE FLOW
// ============================================

flowsRouter.put('/devices/:deviceId/flows/:flowId', async (c) => {
    try {
        const user = c.get('user');
        const deviceId = c.req.param('deviceId');
        const flowId = c.req.param('flowId');
        const updates = await c.req.json();
        const db = drizzle(c.env.DB);

        // Verify ownership
        const [flow] = await db
            .select({
                flow: flows,
                device: devices,
            })
            .from(flows)
            .leftJoin(devices, eq(flows.deviceId, devices.id))
            .where(and(
                eq(flows.id, flowId),
                eq(flows.deviceId, deviceId)
            ))
            .limit(1);

        if (!flow || !flow.device || flow.device.tenantId !== user.tenantId) {
            return c.json({
                success: false,
                error: 'Flow not found'
            }, 404);
        }

        const updateData: any = {};

        if (updates.name) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.triggerKeywords) updateData.triggerKeywords = JSON.stringify(updates.triggerKeywords);
        if (updates.flowJson) {
            updateData.flowJson = JSON.stringify(updates.flowJson);
            updateData.version = (flow.flow.version || 0) + 1;
        }
        if (updates.priority !== undefined) updateData.priority = updates.priority;

        if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date().toISOString();

            await db
                .update(flows)
                .set(updateData)
                .where(eq(flows.id, flowId));
        }

        return c.json({
            success: true,
            data: {
                id: flowId,
                updated: true,
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to update flow'
        }, 500);
    }
});

// ============================================
// ACTIVATE/DEACTIVATE FLOW
// ============================================

flowsRouter.patch('/devices/:deviceId/flows/:flowId/activate', async (c) => {
    try {
        const user = c.get('user');
        const deviceId = c.req.param('deviceId');
        const flowId = c.req.param('flowId');
        const { isActive } = await c.req.json();
        const db = drizzle(c.env.DB);

        // Verify ownership
        const [flow] = await db
            .select({
                flow: flows,
                device: devices,
            })
            .from(flows)
            .leftJoin(devices, eq(flows.deviceId, devices.id))
            .where(and(
                eq(flows.id, flowId),
                eq(flows.deviceId, deviceId)
            ))
            .limit(1);

        if (!flow || !flow.device || flow.device.tenantId !== user.tenantId) {
            return c.json({
                success: false,
                error: 'Flow not found'
            }, 404);
        }

        await db
            .update(flows)
            .set({
                isActive: isActive ? 1 : 0,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(flows.id, flowId));

        return c.json({
            success: true,
            data: {
                id: flowId,
                isActive,
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to activate flow'
        }, 500);
    }
});

// ============================================
// DELETE FLOW
// ============================================

flowsRouter.delete('/devices/:deviceId/flows/:flowId', async (c) => {
    try {
        const user = c.get('user');
        const deviceId = c.req.param('deviceId');
        const flowId = c.req.param('flowId');
        const db = drizzle(c.env.DB);

        // Verify ownership
        const [flow] = await db
            .select({
                flow: flows,
                device: devices,
            })
            .from(flows)
            .leftJoin(devices, eq(flows.deviceId, devices.id))
            .where(and(
                eq(flows.id, flowId),
                eq(flows.deviceId, deviceId)
            ))
            .limit(1);

        if (!flow || !flow.device || flow.device.tenantId !== user.tenantId) {
            return c.json({
                success: false,
                error: 'Flow not found'
            }, 404);
        }

        await db
            .delete(flows)
            .where(eq(flows.id, flowId));

        return c.json({
            success: true,
            data: {
                deleted: true,
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to delete flow'
        }, 500);
    }
});

export default flowsRouter;
