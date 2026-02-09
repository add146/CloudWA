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
// LIST ALL FLOWS (With optional deviceId filter)
// ============================================

flowsRouter.get('/flows', async (c) => {
    try {
        const user = c.get('user');
        const deviceId = c.req.query('deviceId');
        const db = drizzle(c.env.DB);

        // Filter by tenantId (security) AND optional deviceId
        const filters = [eq(flows.tenantId, user.tenantId)];

        if (deviceId) {
            filters.push(eq(flows.deviceId, deviceId));
        }

        const flowList = await db
            .select()
            .from(flows)
            .where(and(...filters))
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
                deviceId: f.deviceId, // Include deviceId
                isOrphaned: f.deviceId === null
            })),
        });
    } catch (error: any) {
        console.error('List flows error:', error);
        return c.json({ success: false, error: 'Failed to list flows' }, 500);
    }
});

// ============================================
// LIST FLOWS FOR DEVICE (Legacy/Specific)
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
                name,
                description,
                deviceId,
                tenantId: user.tenantId, // Save tenantId
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

// ============================================
// GET FLOW BY ID (DIRECT)
// ============================================

flowsRouter.get('/flows/:flowId', async (c) => {
    try {
        const user = c.get('user');
        const flowId = c.req.param('flowId');
        const db = drizzle(c.env.DB);

        // Verify flow exists and user owns the tenant
        const [flow] = await db
            .select()
            .from(flows)
            .where(and(
                eq(flows.id, flowId),
                eq(flows.tenantId, user.tenantId)
            ))
            .limit(1);

        if (!flow) {
            return c.json({
                success: false,
                error: 'Flow not found'
            }, 404);
        }

        return c.json({
            success: true,
            data: {
                id: flow.id,
                name: flow.name,
                description: flow.description,
                triggerKeywords: JSON.parse(flow.triggerKeywords),
                flowJson: JSON.parse(flow.flowJson),
                nodes: JSON.parse(flow.flowJson).nodes, // Helper for frontend
                edges: JSON.parse(flow.flowJson).edges, // Helper for frontend
                isActive: flow.isActive,
                priority: flow.priority,
                version: flow.version,
                updatedAt: flow.updatedAt,
                deviceId: flow.deviceId,
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to get flow'
        }, 500);
    }
});

// ============================================
// UPDATE FLOW BY ID (DIRECT)
// ============================================

flowsRouter.put('/flows/:flowId', async (c) => {
    try {
        const user = c.get('user');
        const flowId = c.req.param('flowId');
        const updates = await c.req.json();
        const db = drizzle(c.env.DB);

        // Verify ownership
        const [flow] = await db
            .select()
            .from(flows)
            .where(and(
                eq(flows.id, flowId),
                eq(flows.tenantId, user.tenantId)
            ))
            .limit(1);

        if (!flow) {
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
            updateData.version = (flow.version || 0) + 1;
        }
        // Handle direct nodes/edges update from frontend
        if (updates.nodes && updates.edges) {
            // Clean up zombie edges (edges pointing to non-existent nodes)
            const validNodeIds = new Set(updates.nodes.map((n: any) => n.id));
            const validEdges = updates.edges.filter((e: any) =>
                validNodeIds.has(e.source) && validNodeIds.has(e.target)
            );

            if (validEdges.length < updates.edges.length) {
                console.log(`[FlowUpdate] Removed ${updates.edges.length - validEdges.length} zombie edges`);
            }

            updateData.flowJson = JSON.stringify({
                nodes: updates.nodes,
                edges: validEdges
            });
            updateData.version = (flow.version || 0) + 1;
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
        console.error('Update error:', error);
        return c.json({
            success: false,
            error: 'Failed to update flow'
        }, 500);
    }
});

// ============================================
// REASSIGN FLOW TO DEVICE (for orphaned flows)
// ============================================

flowsRouter.patch('/flows/:flowId/device', async (c) => {
    try {
        const user = c.get('user');
        const { flowId } = c.req.param();
        const { deviceId } = await c.req.json();
        const db = drizzle(c.env.DB);

        // Verify device belongs to user's tenant
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

        // Update flow device assignment
        await db
            .update(flows)
            .set({ deviceId: deviceId })
            .where(eq(flows.id, flowId));

        return c.json({ success: true });
    } catch (error: any) {
        console.error('Reassign flow error:', error);
        return c.json({ success: false, error: 'Failed to reassign flow' }, 500);
    }
});

export default flowsRouter;
