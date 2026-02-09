/**
 * Flow Trigger - Matches incoming messages to flows and executes them
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, isNotNull } from 'drizzle-orm';
import type { Env } from '@/types/env';
import { flows, flowSessions, devices, tenants } from '@/db/schema';
import { FlowExecutor, type FlowGraph, type FlowSession } from './flow-executor';
import { WAHAClient } from '@/gateway/waha-client';
import { CloudAPIClient } from '@/gateway/cloud-api-client';


export async function triggerFlow(
    env: Env,
    deviceId: string,
    contactPhone: string,
    incomingMessage: string
): Promise<void> {
    console.log('=== TRIGGER FLOW START ===');
    console.log('Device ID:', deviceId);
    console.log('Contact Phone:', contactPhone);
    console.log('Incoming Message:', incomingMessage);

    const db = drizzle(env.DB);

    // 1. Check for existing active session first
    const existingSessions = await db
        .select()
        .from(flowSessions)
        .where(and(
            eq(flowSessions.deviceId, deviceId),
            eq(flowSessions.contactPhone, contactPhone),
            eq(flowSessions.status, 'active')
        ))
        .limit(1);

    if (existingSessions.length > 0) {
        console.log('✓ Existing session found, validating...');
        const session = existingSessions[0];

        // Validate session: check if flow and current node still exist
        const [flow] = await db
            .select()
            .from(flows)
            .where(eq(flows.id, session.flowId))
            .limit(1);

        if (flow) {
            const flowGraph: FlowGraph = JSON.parse(flow.flowJson);
            const currentNode = flowGraph.nodes.find(n => n.id === session.currentNodeId);

            if (currentNode) {
                console.log('✓ Session is valid, continuing flow...');
                await continueFlow(env, flow, session, incomingMessage);
                return;
            } else {
                console.warn('⚠ Session points to non-existent node:', session.currentNodeId);
                console.warn('Invalidating broken session and starting fresh...');
                // Invalidate broken session
                await db
                    .update(flowSessions)
                    .set({ status: 'completed' })
                    .where(eq(flowSessions.id, session.id));
            }
        } else {
            console.warn('⚠ Session points to non-existent flow:', session.flowId);
            console.warn('Invalidating broken session...');
            // Invalidate broken session
            await db
                .update(flowSessions)
                .set({ status: 'completed' })
                .where(eq(flowSessions.id, session.id));
        }
    }

    console.log('✗ No existing session, searching for matching flow...');

    // 2. Find matching flow by trigger keywords (skip orphaned flows)
    const activeFlows = await db
        .select()
        .from(flows)
        .where(and(
            eq(flows.deviceId, deviceId),
            eq(flows.isActive, true),
            isNotNull(flows.deviceId) // Skip orphaned flows without device
        ))
        .orderBy(flows.priority);

    console.log(`Found ${activeFlows.length} active flows for device`);

    let matchedFlow = null;
    for (const flow of activeFlows) {
        const keywords = JSON.parse(flow.triggerKeywords);
        console.log(`Checking flow "${flow.name}" with keywords:`, keywords);

        const matched = keywords.some((kw: any) => {
            if (typeof kw === 'string') {
                // Legacy: Contains match
                const isMatch = incomingMessage.toLowerCase().includes(kw.toLowerCase());
                console.log(`  - Legacy keyword "${kw}": ${isMatch ? '✓ MATCH' : '✗ no match'}`);
                return isMatch;
            } else if (typeof kw === 'object' && kw.term) {
                // New: Check type
                if (kw.type === 'exact') {
                    const isMatch = incomingMessage.toLowerCase().trim() === kw.term.toLowerCase().trim();
                    console.log(`  - Exact keyword "${kw.term}": ${isMatch ? '✓ MATCH' : '✗ no match'}`);
                    return isMatch;
                } else {
                    // Default to contains
                    const isMatch = incomingMessage.toLowerCase().includes(kw.term.toLowerCase());
                    console.log(`  - Contains keyword "${kw.term}": ${isMatch ? '✓ MATCH' : '✗ no match'}`);
                    return isMatch;
                }
            }
            return false;
        });

        if (matched) {
            console.log(`✓✓✓ FLOW MATCHED: "${flow.name}"`);
            matchedFlow = flow;
            break;
        }
    }

    if (!matchedFlow) {
        // No flow matched - AI fallback could be triggered here
        console.log(`✗✗✗ NO FLOW MATCHED for message: "${incomingMessage}"`);
        console.log('=== TRIGGER FLOW END (no match) ===');
        return;
    }

    console.log('Starting new flow session...');
    // 3. Create new session and start flow
    await startNewFlow(env, matchedFlow, deviceId, contactPhone, incomingMessage);
    console.log('=== TRIGGER FLOW END (success) ===');
}

async function startNewFlow(
    env: Env,
    flow: any,
    deviceId: string,
    contactPhone: string,
    incomingMessage: string
): Promise<void> {
    const db = drizzle(env.DB);
    const flowGraph: FlowGraph = JSON.parse(flow.flowJson);

    // Find 'start' node OR 'keyword_trigger' node
    const triggerNode = flowGraph.nodes.find(n => n.type === 'start' || n.type === 'keyword_trigger');

    if (!triggerNode) {
        console.error('No start/trigger node found in flow');
        throw new Error(`No start/trigger node found in flow: ${flow.id}`);
    }

    console.log('Found trigger node:', { id: triggerNode.id, type: triggerNode.type });

    // ROBUST NODE RESOLUTION WITH FALLBACKS
    let firstActionNode = null;

    // Strategy 1: Find edge from trigger and validate target exists
    const edgesFromTrigger = flowGraph.edges.filter(e => e.source === triggerNode.id);
    console.log(`Found ${edgesFromTrigger.length} edge(s) from trigger node`);

    for (const edge of edgesFromTrigger) {
        const targetNode = flowGraph.nodes.find(n => n.id === edge.target);
        if (targetNode) {
            firstActionNode = targetNode;
            console.log('✓ Found valid target node via edge:', { id: targetNode.id, type: targetNode.type });
            break;
        } else {
            console.warn('⚠ Edge points to non-existent node:', edge.target);
        }
    }

    // Strategy 2: If no valid edge found, find first message node in the graph
    if (!firstActionNode) {
        console.warn('No valid edge found, searching for first message node...');
        firstActionNode = flowGraph.nodes.find(n =>
            n.type === 'message' ||
            n.type === 'send_image' ||
            n.type === 'send_pdf' ||
            n.type === 'send_video'
        );

        if (firstActionNode) {
            console.log('✓ Found first message node in graph:', { id: firstActionNode.id, type: firstActionNode.type });
        }
    }

    // Strategy 3: If still nothing, just find ANY non-trigger node
    if (!firstActionNode) {
        console.warn('No message node found, searching for any executable node...');
        firstActionNode = flowGraph.nodes.find(n =>
            n.type !== 'start' &&
            n.type !== 'keyword_trigger'
        );

        if (firstActionNode) {
            console.log('✓ Found executable node:', { id: firstActionNode.id, type: firstActionNode.type });
        }
    }

    if (!firstActionNode) {
        console.error('✗ No executable node found in flow');
        throw new Error(`No executable node found in flow: ${flow.id}`);
    }

    console.log('Starting execution from node:', { id: firstActionNode.id, type: firstActionNode.type });

    // Create session starting from the FIRST ACTION NODE, not the trigger
    const [newSession] = await db
        .insert(flowSessions)
        .values({
            flowId: flow.id,
            deviceId,
            contactPhone,
            currentNodeId: firstActionNode.id, // Start from first action, not trigger
            variables: '{}',
            context: JSON.stringify([
                { role: 'user', content: incomingMessage }
            ]),
            status: 'active',
        })
        .returning();

    // Execute flow
    const sessionData: FlowSession = {
        flowId: newSession.flowId,
        deviceId: newSession.deviceId,
        contactPhone: newSession.contactPhone,
        currentNodeId: newSession.currentNodeId,
        variables: {},
        context: [{ role: 'user', content: incomingMessage }],
        visitedNodes: new Set(),
    };

    const executor = new FlowExecutor(env, flowGraph, sessionData);

    // Get WAHA client for typing indicator
    const wahaClient = await getWAHAClient(env, deviceId);
    const chatId = contactPhone.includes('@') ? contactPhone : `${contactPhone}@c.us`;

    console.log('=== STARTING FLOW EXECUTION ===');
    console.log('Contact Phone:', contactPhone);
    console.log('Chat ID:', chatId);

    // Execute nodes until we need to wait for user input
    let result;
    try {
        result = await executor.executeNext();
    } catch (error: any) {
        console.error('Error executing first step in new flow:', error);
        await db.update(flowSessions).set({ status: 'error' }).where(eq(flowSessions.id, newSession.id));
        return;
    }

    try {
        console.log('First execution result:', {
            hasMessages: !!result.messages?.length,
            messageCount: result.messages?.length || 0,
            shouldWait: result.shouldWait,
            completed: result.completed,
            nextNodeId: result.nextNodeId
        });

        // Send immediately
        if (result.messages && result.messages.length > 0) {
            console.log('Sending', result.messages.length, 'messages from first execution');
            for (const msg of result.messages) {
                await sendMessage(env, deviceId, contactPhone, msg);
            }
        }

        // Auto-execute subsequent nodes that don't require user input
        while (!result.shouldWait && !result.completed && result.nextNodeId) {
            // Handle delay with typing indicator
            if (result.delaySeconds && result.delaySeconds > 0) {
                console.log(`Delaying for ${result.delaySeconds}s (Node: ${sessionData.currentNodeId})`);

                if (wahaClient) {
                    try {
                        console.log('Starting typing indicator');
                        await wahaClient.startTyping('default', chatId);
                    } catch (e) {
                        console.error('Failed to start typing:', e);
                    }
                }

                await delay(result.delaySeconds * 1000);

                if (wahaClient) {
                    try {
                        await wahaClient.stopTyping('default', chatId);
                    } catch (e) {
                        // Ignore stop typing error
                    }
                }
            }

            sessionData.currentNodeId = result.nextNodeId;
            sessionData.visitedNodes = new Set(); // reset for new execution chain

            console.log(`Executing next node: ${result.nextNodeId}`);
            result = await executor.executeNext();

            // Send messages immediately from this step
            if (result.messages && result.messages.length > 0) {
                for (const msg of result.messages) {
                    await sendMessage(env, deviceId, contactPhone, msg);
                }
            }
        }

        // Update session
        if (result.completed) {
            await db
                .update(flowSessions)
                .set({ status: 'completed' })
                .where(eq(flowSessions.id, newSession.id));
        } else {
            await db
                .update(flowSessions)
                .set({
                    currentNodeId: result.nextNodeId || newSession.currentNodeId,
                    variables: JSON.stringify(sessionData.variables),
                    context: JSON.stringify(sessionData.context),
                    lastInteraction: new Date().toISOString(),
                })
                .where(eq(flowSessions.id, newSession.id));
        }
    } catch (error: any) {
        console.error('Error in new flow execution loop:', error);
        await db.update(flowSessions).set({ status: 'error' }).where(eq(flowSessions.id, newSession.id));
    }
}

/**
 * Helper: delay for ms milliseconds
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper: Get WAHA client for a device
 */
async function getWAHAClient(env: Env, deviceId: string): Promise<WAHAClient | null> {
    const db = drizzle(env.DB);

    const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId))
        .limit(1);

    if (!device || device.gatewayType !== 'waha') {
        return null;
    }

    const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, device.tenantId))
        .limit(1);

    const settings = tenant?.settings ? JSON.parse(tenant.settings) : {};
    const wahaConfig = settings.waha || {};
    const wahaBaseUrl = wahaConfig.baseUrl || env.WAHA_BASE_URL;
    const wahaApiKey = wahaConfig.apiKey || env.WAHA_API_KEY;

    if (!wahaBaseUrl || !wahaApiKey) {
        return null;
    }

    return new WAHAClient({
        baseUrl: wahaBaseUrl,
        apiKey: wahaApiKey,
    });
}

async function continueFlow(
    env: Env,
    flow: any,
    session: any,
    incomingMessage: string
): Promise<void> {
    const db = drizzle(env.DB);
    const flowGraph: FlowGraph = JSON.parse(flow.flowJson);

    // Restore session data
    const sessionData: FlowSession = {
        flowId: session.flowId,
        deviceId: session.deviceId,
        contactPhone: session.contactPhone,
        currentNodeId: session.currentNodeId,
        variables: JSON.parse(session.variables),
        context: JSON.parse(session.context),
        visitedNodes: new Set(),
    };

    // Add user message to context
    sessionData.context.push({ role: 'user', content: incomingMessage });

    const executor = new FlowExecutor(env, flowGraph, sessionData);

    // Get WAHA client for typing indicator
    const wahaClient = await getWAHAClient(env, session.deviceId);
    const chatId = session.contactPhone.includes('@') ? session.contactPhone : `${session.contactPhone}@c.us`;

    // Execute with user message
    let result;
    try {
        result = await executor.executeNext(incomingMessage);
    } catch (error: any) {
        console.error('Error executing first step:', error);
        await db.update(flowSessions).set({ status: 'error' }).where(eq(flowSessions.id, session.id));
        return;
    }

    try {
        // Send immediately
        if (result.messages && result.messages.length > 0) {
            for (const msg of result.messages) {
                await sendMessage(env, session.deviceId, session.contactPhone, msg);
            }
        }

        // Auto-execute subsequent nodes that don't require user input
        while (!result.shouldWait && !result.completed && result.nextNodeId) {
            // Handle delay with typing indicator
            if (result.delaySeconds && result.delaySeconds > 0) {
                console.log(`Delaying for ${result.delaySeconds}s (Node: ${sessionData.currentNodeId})`);

                if (wahaClient) {
                    try {
                        console.log('Starting typing indicator');
                        await wahaClient.startTyping('default', chatId);
                    } catch (e) {
                        console.error('Failed to start typing:', e);
                    }
                }

                await delay(result.delaySeconds * 1000);

                if (wahaClient) {
                    try {
                        await wahaClient.stopTyping('default', chatId);
                    } catch (e) {
                        // Ignore stop typing error
                    }
                }
            }

            sessionData.currentNodeId = result.nextNodeId;
            sessionData.visitedNodes = new Set(); // reset for new execution chain

            console.log(`Executing next node: ${result.nextNodeId}`);
            result = await executor.executeNext();

            // Send messages immediately
            if (result.messages && result.messages.length > 0) {
                for (const msg of result.messages) {
                    await sendMessage(env, session.deviceId, session.contactPhone, msg);
                }
            }
        }

        // Update session
        if (result.completed) {
            await db
                .update(flowSessions)
                .set({ status: 'completed' })
                .where(eq(flowSessions.id, session.id));
        } else {
            await db
                .update(flowSessions)
                .set({
                    currentNodeId: result.nextNodeId || session.currentNodeId,
                    variables: JSON.stringify(sessionData.variables),
                    context: JSON.stringify(sessionData.context),
                    lastInteraction: new Date().toISOString(),
                })
                .where(eq(flowSessions.id, session.id));
        }
    } catch (error: any) {
        console.error('Error in flow execution loop:', error);
        await db.update(flowSessions).set({ status: 'error' }).where(eq(flowSessions.id, session.id));
    }
}

/**
 * Send message via appropriate gateway
 */
async function sendMessage(
    env: Env,
    deviceId: string,
    contactPhone: string,
    message: { type: string; content: any }
): Promise<void> {
    console.log('=== SEND MESSAGE START ===');
    console.log('Device ID:', deviceId);
    console.log('Contact Phone:', contactPhone);
    console.log('Message Type:', message.type);
    console.log('Message Content:', message.content);

    const db = drizzle(env.DB);

    // Get device to determine gateway type
    const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId))
        .limit(1);

    if (!device) {
        console.error('✗ Device not found:', deviceId);
        throw new Error(`Device not found: ${deviceId}`);
    }

    console.log('✓ Device found:', { id: device.id, gatewayType: device.gatewayType });

    // Format chatId
    const chatId = contactPhone.includes('@') ? contactPhone : `${contactPhone}@c.us`;
    console.log('Formatted Chat ID:', chatId);

    if (device.gatewayType === 'waha') {
        console.log('Using WAHA gateway...');
        // Fetch tenant WAHA config
        const [tenant] = await db
            .select()
            .from(tenants)
            .where(eq(tenants.id, device.tenantId))
            .limit(1);

        const settings = tenant?.settings ? JSON.parse(tenant.settings) : {};
        const wahaConfig = settings.waha || {};
        const wahaBaseUrl = wahaConfig.baseUrl || env.WAHA_BASE_URL;
        const wahaApiKey = wahaConfig.apiKey || env.WAHA_API_KEY;

        console.log('WAHA Config:', {
            baseUrl: wahaBaseUrl,
            hasApiKey: !!wahaApiKey
        });

        if (!wahaBaseUrl || !wahaApiKey) {
            console.error('✗ WAHA not configured for this tenant');
            throw new Error('WAHA not configured for this tenant');
        }

        const waha = new WAHAClient({
            baseUrl: wahaBaseUrl,
            apiKey: wahaApiKey,
        });

        if (message.type === 'text') {
            console.log('Sending text message to', chatId, ':', message.content);
            await waha.sendMessage({
                session: 'default',
                chatId,
                text: message.content,
            });
            console.log('✓ Text message sent successfully');
        } else if (message.type === 'image') {
            await waha.sendImage({
                session: 'default',
                chatId,
                file: message.content, // { url, mimetype, filename }
                caption: message.content.caption
            });
        } else if (message.type === 'video' || message.type === 'pdf') {
            await waha.sendFile({
                session: 'default',
                chatId,
                file: message.content, // { url, mimetype, filename }
                caption: message.content.caption
            });
        } else if (message.type === 'quick_reply') {
            // Fallback to text + options if native not supported
            await waha.sendButtons({
                session: 'default',
                chatId,
                title: message.content.header,
                text: message.content.body,
                footer: message.content.footer,
                buttons: message.content.buttons.map((b: any) => ({ id: b.id, text: b.title }))
            });
        } else if (message.type === 'button') {
            // Legacy button support
            await waha.sendButtons({
                session: 'default',
                chatId,
                text: message.content.text,
                buttons: message.content.buttons.map((b: any) => ({ id: b.id, text: b.title }))
            });
        } else if (message.type === 'mark_read') {
            console.log('Marking chat as read (Blue Ticks)...');
            await waha.sendSeen('default', chatId);
        }
    } else if (device.gatewayType === 'cloudapi') {
        const config = JSON.parse(device.cloudApiConfig || '{}');

        if (!config.phoneNumberId || !config.accessToken) {
            throw new Error('Cloud API not configured for this device');
        }

        const cloudApi = new CloudAPIClient({
            phoneNumberId: config.phoneNumberId,
            accessToken: config.accessToken,
        });

        if (message.type === 'text') {
            await cloudApi.sendText(contactPhone, message.content);
        }
        // TODO: Implement media for Cloud API
    }
}
