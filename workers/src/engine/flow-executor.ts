/**
 * Flow Executor - Core engine for executing chatbot flows
 * 
 * Interprets node graphs (React Flow JSON format) and executes conversation flows.
 */

import type { Env } from '@/types/env';

export interface FlowNode {
    id: string;
    type: 'start' | 'message' | 'button' | 'list' | 'condition' | 'ai' | 'delay' | 'human_takeover' | 'keyword_trigger' | 'send_pdf' | 'send_video' | 'send_image' | 'quick_reply';
    data: Record<string, any>;
}

export interface FlowEdge {
    id: string;
    source: string; // node ID
    target: string; // node ID
    sourceHandle?: string; // for conditional branches (e.g., 'true', 'false', button IDs)
}

export interface FlowGraph {
    nodes: FlowNode[];
    edges: FlowEdge[];
}

export interface FlowSession {
    flowId: string;
    deviceId: string;
    contactPhone: string;
    currentNodeId: string;
    variables: Record<string, any>;
    context: Array<{ role: 'user' | 'assistant'; content: string }>;
    visitedNodes: Set<string>; // for loop detection
}

export interface FlowExecutionResult {
    messages: Array<{ type: string; content: any }>;
    nextNodeId: string | null;
    shouldWait: boolean; // true if waiting for user input
    completed: boolean;
}

export class FlowExecutor {
    constructor(
        private env: Env,
        private flowGraph: FlowGraph,
        private session: FlowSession
    ) { }

    /**
     * Execute the next node in the flow
     */
    async executeNext(userMessage?: string): Promise<FlowExecutionResult> {
        const node = this.flowGraph.nodes.find(n => n.id === this.session.currentNodeId);

        if (!node) {
            throw new Error(`Node not found: ${this.session.currentNodeId}`);
        }

        // Loop detection (except for conditions which can be revisited)
        if (this.session.visitedNodes.has(node.id) && node.type !== 'condition') {
            throw new Error(`Loop detected at node: ${node.id}`);
        }
        this.session.visitedNodes.add(node.id);

        // Execute node based on type
        switch (node.type) {
            case 'start':
                return this.executeStart(node);
            case 'message':
                return this.executeMessage(node);
            case 'button':
                return this.executeButton(node, userMessage);
            case 'list':
                return this.executeList(node, userMessage);
            case 'condition':
                return this.executeCondition(node);
            case 'ai':
                return this.executeAI(node, userMessage);
            case 'delay':
                return this.executeDelay(node);
            case 'human_takeover':
                return this.executeHumanTakeover(node);
            case 'keyword_trigger':
                return this.executeStart(node); // Same behavior as start node
            case 'send_pdf':
            case 'send_video':
            case 'send_image':
                return this.executeSendMedia(node);
            case 'quick_reply':
                return this.executeQuickReply(node, userMessage);
            default:
                throw new Error(`Unknown node type: ${(node as any).type}`);
        }
    }

    /**
     * Start node - just moves to next node
     */
    private async executeStart(node: FlowNode): Promise<FlowExecutionResult> {
        const nextNode = this.getNextNode(node.id);

        return {
            messages: [],
            nextNodeId: nextNode?.id || null,
            shouldWait: false,
            completed: !nextNode,
        };
    }

    /**
     * Message node - sends text message
     */
    private async executeMessage(node: FlowNode): Promise<FlowExecutionResult> {
        const message = this.resolveVariables(node.data.message || node.data.text || '');
        const nextNode = this.getNextNode(node.id);

        return {
            messages: [{ type: 'text', content: message }],
            nextNodeId: nextNode?.id || null,
            shouldWait: false,
            completed: !nextNode,
        };
    }

    /**
     * Button node - presents buttons and waits for selection
     */
    private async executeButton(node: FlowNode, userMessage?: string): Promise<FlowExecutionResult> {
        if (!userMessage) {
            // Send button options
            const buttons = (node.data.buttons || []).map((b: any) => ({
                id: b.id,
                title: this.resolveVariables(b.title || b.label),
            }));

            return {
                messages: [{
                    type: 'button',
                    content: {
                        text: this.resolveVariables(node.data.text || ''),
                        buttons,
                    },
                }],
                nextNodeId: node.id, // stay on this node
                shouldWait: true,
                completed: false,
            };
        }

        // Process button click
        const buttons = node.data.buttons || [];
        const selectedButton = buttons.find((b: any) =>
            (b.title || b.label).toLowerCase() === userMessage.toLowerCase()
        );

        if (!selectedButton) {
            return {
                messages: [{ type: 'text', content: 'Invalid option. Please select a button.' }],
                nextNodeId: node.id,
                shouldWait: true,
                completed: false,
            };
        }

        // Save button selection to variables
        if (node.data.saveAs) {
            this.session.variables[node.data.saveAs] = selectedButton.value || userMessage;
        }

        // Find edge with matching sourceHandle
        const nextNode = this.getNextNode(node.id, selectedButton.id);

        return {
            messages: [],
            nextNodeId: nextNode?.id || null,
            shouldWait: false,
            completed: !nextNode,
        };
    }

    /**
     * List node - presents list options
     */
    private async executeList(node: FlowNode, userMessage?: string): Promise<FlowExecutionResult> {
        if (!userMessage) {
            // Send list options
            const sections = (node.data.sections || []).map((s: any) => ({
                title: this.resolveVariables(s.title || ''),
                rows: (s.rows || []).map((r: any) => ({
                    id: r.id,
                    title: this.resolveVariables(r.title || ''),
                    description: r.description ? this.resolveVariables(r.description) : undefined,
                })),
            }));

            return {
                messages: [{
                    type: 'list',
                    content: {
                        text: this.resolveVariables(node.data.text || ''),
                        buttonText: node.data.buttonText || 'Options',
                        sections,
                    },
                }],
                nextNodeId: node.id, // stay on this node
                shouldWait: true,
                completed: false,
            };
        }

        // Process list selection
        const sections = node.data.sections || [];
        let selectedRow: any = null;

        for (const section of sections) {
            const row = (section.rows || []).find((r: any) =>
                r.title.toLowerCase() === userMessage.toLowerCase()
            );
            if (row) {
                selectedRow = row;
                break;
            }
        }

        if (!selectedRow) {
            return {
                messages: [{ type: 'text', content: 'Invalid selection. Please choose an option from the list.' }],
                nextNodeId: node.id,
                shouldWait: true,
                completed: false,
            };
        }

        // Save selection to variables
        if (node.data.saveAs) {
            this.session.variables[node.data.saveAs] = selectedRow.value || userMessage;
        }

        // Find edge with matching sourceHandle
        const nextNode = this.getNextNode(node.id, selectedRow.id);

        return {
            messages: [],
            nextNodeId: nextNode?.id || null,
            shouldWait: false,
            completed: !nextNode,
        };
    }

    /**
     * Condition node - evaluates condition and branches
     */
    private async executeCondition(node: FlowNode): Promise<FlowExecutionResult> {
        const condition = node.data.condition || '';
        const result = this.evaluateCondition(condition);

        // Find edge with matching sourceHandle (true/false)
        const nextNode = this.getNextNode(node.id, result ? 'true' : 'false');

        return {
            messages: [],
            nextNodeId: nextNode?.id || null,
            shouldWait: false,
            completed: !nextNode,
        };
    }

    /**
     * AI node - calls AI provider and responds
     */
    private async executeAI(node: FlowNode, userMessage?: string): Promise<FlowExecutionResult> {
        const prompt = this.resolveVariables(node.data.prompt || node.data.systemPrompt || '');
        const context = this.session.context;

        // Call AI provider
        // Call AI provider
        const response = await this.callAI(prompt, userMessage || '', context, node.data);

        // Save AI response to variables
        if (node.data.saveAs) {
            this.session.variables[node.data.saveAs] = response;
        }

        // Update context
        if (userMessage) {
            this.session.context.push({ role: 'user', content: userMessage });
        }
        this.session.context.push({ role: 'assistant', content: response });

        const nextNode = this.getNextNode(node.id);

        return {
            messages: [{ type: 'text', content: response }],
            nextNodeId: nextNode?.id || null,
            shouldWait: false,
            completed: !nextNode,
        };
    }

    /**
     * Delay node - schedules next execution
     */
    private async executeDelay(node: FlowNode): Promise<FlowExecutionResult> {
        let delaySeconds = 0;

        if (node.data.random) {
            const min = parseInt(node.data.minDelay || '0');
            const max = parseInt(node.data.maxDelay || '0');
            // Random integer between min and max (inclusive)
            delaySeconds = Math.floor(Math.random() * (max - min + 1)) + min;
        } else {
            delaySeconds = parseInt(node.data.delay || '0');
        }

        const nextNode = this.getNextNode(node.id);

        // TODO: Implement actual delayed execution using Queues or Durable Objects Alarms
        // For now logging it to verify logic is triggered
        console.log(`Delay node: ${delaySeconds}s (Random: ${!!node.data.random})`);

        return {
            messages: [],
            nextNodeId: nextNode?.id || null,
            shouldWait: true, // wait for delay to complete
            completed: false,
        };
    }

    /**
     * Human takeover node - flags for manual intervention
     */
    private async executeHumanTakeover(node: FlowNode): Promise<FlowExecutionResult> {
        const message = this.resolveVariables(
            node.data.message || 'Connecting you with a human agent...'
        );

        // TODO: Implement human takeover notification/queue

        return {
            messages: [{ type: 'text', content: message }],
            nextNodeId: null,
            shouldWait: true,
            completed: true, // flow ends here
        };
    }

    /**
     * Resolve variables in text
     * Example: "Hello {{name}}, your age is {{age}}" -> "Hello John, your age is 25"
     */
    private resolveVariables(text: string): string {
        return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            const value = this.session.variables[varName];
            return value !== undefined ? String(value) : match;
        });
    }

    /**
     * Evaluate condition expression (safe parser)
     * Supports: >, <, >=, <=, ==, !=
     * Example: "{{age}} > 18" -> true/false
     */
    private evaluateCondition(condition: string): boolean {
        // Resolve variables first
        const resolved = this.resolveVariables(condition).trim();

        // Parse comparison operators
        const operators = [
            { symbol: '>=', fn: (a: any, b: any) => a >= b },
            { symbol: '<=', fn: (a: any, b: any) => a <= b },
            { symbol: '>', fn: (a: any, b: any) => a > b },
            { symbol: '<', fn: (a: any, b: any) => a < b },
            { symbol: '==', fn: (a: any, b: any) => a == b },
            { symbol: '!=', fn: (a: any, b: any) => a != b },
        ];

        for (const op of operators) {
            if (resolved.includes(op.symbol)) {
                const [left, right] = resolved.split(op.symbol).map(s => s.trim());
                const leftVal = this.parseValue(left);
                const rightVal = this.parseValue(right);
                return op.fn(leftVal, rightVal);
            }
        }

        // No operator found - treat as boolean
        return resolved.toLowerCase() === 'true' || resolved === '1';
    }

    /**
     * Parse value (number, string, boolean)
     */
    private parseValue(value: string): any {
        // Try number
        if (/^-?\d+(\.\d+)?$/.test(value)) {
            return parseFloat(value);
        }

        // Try boolean
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;

        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }

        return value;
    }

    /**
     * Get next node from current node
     */
    private getNextNode(currentNodeId: string, sourceHandle?: string): FlowNode | null {
        const edge = this.flowGraph.edges.find(e =>
            e.source === currentNodeId &&
            (!sourceHandle || e.sourceHandle === sourceHandle)
        );

        if (!edge) return null;

        return this.flowGraph.nodes.find(n => n.id === edge.target) || null;
    }

    /**
     * Call AI provider
     */
    private async callAI(
        prompt: string,
        userMessage: string,
        context: Array<{ role: 'user' | 'assistant'; content: string }>,
        nodeData: Record<string, any>
    ): Promise<string> {
        // 1. Get Tenant ID from session (need to pass it or fetch it)
        // Since we don't have tenantId in session, we might need to lookup device -> tenant
        // Optimization: Pass tenantId to FlowExecutor constructor
        // For now, let's assume we can query it or it's in the environment context if we had it.
        // Actually, we can fetch device to get tenantId.

        try {
            const { drizzle } = await import('drizzle-orm/d1');
            const { eq, and } = await import('drizzle-orm');
            const { devices: devicesTable, tenantAiSettings, aiProviders } = await import('@/db/schema');
            const { OpenAIProvider } = await import('@/ai/providers/openai');

            const db = drizzle(this.env.DB);

            // Get Device -> Tenant
            const deviceId = this.session.deviceId;
            const [device] = await db
                .select()
                .from(devicesTable)
                .where(eq(devicesTable.id, deviceId))
                .limit(1);

            if (!device) {
                console.error(`Device not found for AI execution: ${deviceId}`);
                return "Error: Device not found.";
            }

            const tenantId = device.tenantId;
            const requestedProvider = nodeData.provider || 'openai'; // default to openai
            const requestedModel = nodeData.model;

            // Get Tenant Settings for this provider
            const query = await db
                .select({
                    setting: tenantAiSettings,
                    provider: aiProviders
                })
                .from(tenantAiSettings)
                .innerJoin(aiProviders, eq(tenantAiSettings.aiProviderId, aiProviders.id))
                .where(and(
                    eq(tenantAiSettings.tenantId, tenantId),
                    eq(aiProviders.provider, requestedProvider)
                ))
                .limit(1);

            let config = query[0];
            let apiKey = '';
            let modelId = requestedModel;

            if (config) {
                // Tenant has specific settings exists
                const settingConfig = config.setting.config ? JSON.parse(config.setting.config) : {};
                apiKey = config.setting.apiKey || config.provider.apiKey;
                // Use requested model -> tenant config model -> provider default model
                modelId = modelId || settingConfig.model || config.provider.modelId;
            } else {
                // No tenant setting found, check if System Provider exists and is active
                const [systemProvider] = await db
                    .select()
                    .from(aiProviders)
                    .where(and(
                        eq(aiProviders.provider, requestedProvider),
                        eq(aiProviders.isActive, true)
                    ))
                    .limit(1);

                if (!systemProvider) {
                    console.error(`AI Provider not found/active: ${requestedProvider}`);
                    return "Error: AI Provider not configured or inactive.";
                }

                apiKey = systemProvider.apiKey;
                modelId = modelId || systemProvider.modelId;
            }

            if (!apiKey) {
                return "Error: AI API Key not configured (System default is also missing).";
            }

            // Instantiate Provider
            let provider;
            if (requestedProvider === 'openai') {
                provider = new OpenAIProvider(apiKey, modelId || 'gpt-4o');
            } else {
                return `Error: Provider ${requestedProvider} not supported yet.`;
            }

            // Generate
            // Extract prompts from nodeData (new enhanced format)
            const systemPrompt = this.resolveVariables(nodeData.systemPrompt || nodeData.prompt || 'You are a helpful AI assistant.');
            const userPrompt = this.resolveVariables(nodeData.userPrompt || userMessage);
            const temperature = nodeData.temperature !== undefined ? nodeData.temperature : 0.7;
            const maxTokens = nodeData.maxTokens || 1000;

            // TODO: Handle intentions if defined
            // If nodeData.intentions is populated, we should include them in the system prompt
            // For intent classification, we can add: "Classify user intent as one of: [intention names]"

            // TODO: Pass context to provider if supported (OpenAI chat history)
            // Current OpenAIProvider implementation splits system prompt and user prompt.
            // We need to enhance OpenAIProvider to accept history or handle it here.
            // For now, let's just send the user message and system prompt.

            return await provider.generateText(userPrompt, {
                systemPrompt: systemPrompt,
                temperature: temperature,
                maxTokens: maxTokens
            });

        } catch (error: any) {
            console.error('AI Execution Error:', error);
            return "Thinking failed: " + error.message;
        }
    }
    /**
     * Send Media Node (Image, Video, PDF)
     */
    private async executeSendMedia(node: FlowNode): Promise<FlowExecutionResult> {
        const typeMap: Record<string, string> = {
            'send_image': 'image',
            'send_video': 'video',
            'send_pdf': 'pdf'
        };

        const mediaType = typeMap[node.type] || 'file';
        const fileUrl = this.resolveVariables(node.data.fileUrl || '');
        const fileName = this.resolveVariables(node.data.fileName || 'file');
        const fileType = node.data.fileType || 'application/octet-stream';
        const caption = this.resolveVariables(node.data.caption || '');

        const nextNode = this.getNextNode(node.id);

        if (!fileUrl) {
            // Skip if no file
            return {
                messages: [{ type: 'text', content: `[Error: No file uploaded for ${mediaType}]` }],
                nextNodeId: nextNode?.id || null,
                shouldWait: false,
                completed: !nextNode
            };
        }

        return {
            messages: [{
                type: mediaType,
                content: {
                    url: fileUrl,
                    filename: fileName,
                    mimetype: fileType,
                    caption: caption
                }
            }],
            nextNodeId: nextNode?.id || null,
            shouldWait: false,
            completed: !nextNode,
        };
    }

    /**
     * Quick Reply Node
     */
    private async executeQuickReply(node: FlowNode, userMessage?: string): Promise<FlowExecutionResult> {
        if (!userMessage) {
            // Send buttons
            const buttons = (node.data.buttons || []).map((b: any) => ({
                id: b.id,
                title: this.resolveVariables(b.label || b.title || ''),
            }));

            return {
                messages: [{
                    type: 'quick_reply',
                    content: {
                        header: this.resolveVariables(node.data.header || ''),
                        body: this.resolveVariables(node.data.body || ''),
                        footer: this.resolveVariables(node.data.footer || ''),
                        buttons,
                    },
                }],
                nextNodeId: node.id, // wait for response
                shouldWait: true,
                completed: false,
            };
        }

        // Handle Response
        const buttons = node.data.buttons || [];
        const selectedButton = buttons.find((b: any) =>
            (b.label || b.title).toLowerCase() === userMessage.toLowerCase()
        );

        // Even if not an exact button match, we might want to allow it if it's "Fallback" or just proceed?
        // But usually Quick Reply implies strict selection or at least handling it.
        // For now, similar to ButtonNode, we check match.

        if (!selectedButton && !node.data.fallback) {
            // If we had a fallback logic, we'd use it. For now, strict or just pass through if we treat as text?
            // Let's behave like ButtonNode for consistency: require match or show error
            return {
                messages: [{ type: 'text', content: 'Invalid option. Please select a button.' }],
                nextNodeId: node.id,
                shouldWait: true,
                completed: false,
            };
        }

        if (node.data.saveAs) {
            this.session.variables[node.data.saveAs] = selectedButton ? (selectedButton.value || userMessage) : userMessage;
        }

        // Find edge
        const nextNode = this.getNextNode(node.id, selectedButton?.id || 'fallback');

        return {
            messages: [],
            nextNodeId: nextNode?.id || null,
            shouldWait: false,
            completed: !nextNode,
        };
    }
}
