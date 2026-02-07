/**
 * Flow Trigger - Matches incoming messages to flows and executes them
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import type { Env } from '@/types/env';
import { flows, flowSessions, devices } from '@/db/schema';
import { FlowExecutor, type FlowGraph, type FlowSession } from './flow-executor';
import { WAHAClient } from '@/gateway/waha-client';
import { CloudAPIClient } from '@/gateway/cloud-api-client';

export async function triggerFlow(
    env: Env,
    deviceId: string,
    contactPhone: string,
    incomingMessage: string
): Promise<void> {
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
        // Continue existing flow
        const session = existingSessions[0];
        const [flow] = await db
            .select()
            .from(flows)
            .where(eq(flows.id, session.flowId))
            .limit(1);

        if (flow) {
            await continueFlow(env, flow, session, incomingMessage);
            return;
        }
    }

    // 2. Find matching flow by trigger keywords
    const activeFlows = await db
        .select()
        .from(flows)
        .where(and(
            eq(flows.deviceId, deviceId),
            eq(flows.isActive, true)
        ))
        .orderBy(flows.priority);

    let matchedFlow = null;
    for (const flow of activeFlows) {
        const keywords = JSON.parse(flow.triggerKeywords);
        const matched = keywords.some((kw: string) =>
            incomingMessage.toLowerCase().includes(kw.toLowerCase())
        );
        if (matched) {
            matchedFlow = flow;
            break;
        }
    }

    if (!matchedFlow) {
        // No flow matched - AI fallback could be triggered here
        console.log(`No flow matched for message: "${incomingMessage}"`);
        return;
    }

    // 3. Create new session and start flow
    await startNewFlow(env, matchedFlow, deviceId, contactPhone, incomingMessage);
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
    const startNode = flowGraph.nodes.find(n => n.type === 'start');

    if (!startNode) {
        throw new Error(`No start node found in flow: ${flow.id}`);
    }

    // Create session
    const [newSession] = await db
        .insert(flowSessions)
        .values({
            flowId: flow.id,
            deviceId,
            contactPhone,
            currentNodeId: startNode.id,
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

    // Execute nodes until we need to wait for user input
    let result = await executor.executeNext();

    // Auto-execute nodes that don't require user input
    while (!result.shouldWait && !result.completed && result.nextNodeId) {
        sessionData.currentNodeId = result.nextNodeId;
        sessionData.visitedNodes = new Set(); // reset for new execution chain
        result = await executor.executeNext();
    }

    // Send all messages
    for (const msg of result.messages) {
        await sendMessage(env, deviceId, contactPhone, msg);
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

    // Execute with user message
    let result = await executor.executeNext(incomingMessage);

    // Auto-execute subsequent nodes that don't require user input
    while (!result.shouldWait && !result.completed && result.nextNodeId) {
        sessionData.currentNodeId = result.nextNodeId;
        sessionData.visitedNodes = new Set(); // reset for new execution chain
        result = await executor.executeNext();
    }

    // Send all messages
    for (const msg of result.messages) {
        await sendMessage(env, session.deviceId, session.contactPhone, msg);
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
    const db = drizzle(env.DB);

    // Get device to determine gateway type
    const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId))
        .limit(1);

    if (!device) {
        throw new Error(`Device not found: ${deviceId}`);
    }

    // Format chatId
    const chatId = contactPhone.includes('@') ? contactPhone : `${contactPhone}@c.us`;

    if (device.gatewayType === 'waha' && env.WAHA_BASE_URL && env.WAHA_API_KEY) {
        const waha = new WAHAClient({
            baseUrl: env.WAHA_BASE_URL,
            apiKey: env.WAHA_API_KEY,
        });

        if (message.type === 'text') {
            await waha.sendMessage({
                session: deviceId,
                chatId,
                text: message.content,
            });
        }
        // TODO: Handle button and list messages
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
        // TODO: Handle button and list messages
    }
}
