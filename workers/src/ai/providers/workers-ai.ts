import type { Ai } from '@cloudflare/workers-types';
import type { AIProvider, GenerateOptions } from './base';

export class WorkersAIProvider implements AIProvider {
    provider = 'workers_ai';
    private accountId: string;

    constructor(
        private ai: Ai,
        private model: string = '@cf/meta/llama-3-8b-instruct',
        private apiKey?: string
    ) {
        // We might need account ID for REST API. 
        // For now, let's assume if apiKey is provided, we use the gateway or a specific endpoint that doesn't strictly need account ID if using a worker-specific token? 
        // Actually, Cloudflare REST API usually requires Account ID: https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model_name}
        // However, we don't have account ID here easily unless passed.
        // BUT, if we use the AI binding locally, we don't need it.
        // If we want BYOK for "Hybrid", users might just provide the API Token.
        // Let's assume for now the user provides "AccountID:Token" or we rely on the binding if no key.
        // OR: "AI Hybrid" might just mean "Use my own Cloudflare Worker via HTTP" or similar?
        // Let's stick to the binding mostly, but if apiKey is passed, we try to use it with a standard endpoint if possible.
        // A common pattern for "BYOK" with Workers AI is using the REST API.
        // Warning: Without Account ID, we can't easily construct the REST URL.
        // Let's fallback to asking the user to put "AccountID:Token" in the key field if they want BYOK, or just Token and we default to a system Account ID?
        // Actually, for simplicity/MVP: If apiKey is present, we should probably assume it's a standard OpenAI-compatible endpoint or similar? 
        // No, Workers AI REST API is specific.
        // Let's try to parse Account ID from the key if possible, or just ignore BYOK for strictly "Workers AI" if it's too complex, 
        // BUT the user specifically asked for "AI Hybrid" input.
        // If "AI Hybrid" == "Workers AI", then BYOK means they want to use THEIR Cloudflare account.
        // Let's allow passing Account ID in the config or key. 
        // For now, let's just use the binding if key is missing, and if key IS present, we try to use REST API.
        // We will assume the key is just the token. We need the account ID. 
        // Let's allow the key to be "ACCOUNT_ID|API_TOKEN" format for BYOK?
        // Or just fail back to binding for now and only implement generic if easy.

        // REVISION: The User just said "AI Hybrid input api... if not filled use global".
        // This likely means: If they fill it, use IT. If not, use the global one (which works).
        // Global one uses `env.AI`. 
        // User's private one would presumably need to be a remote call if they are on a different account.
        // If they are on the SAME account, `env.AI` works for everything. 
        // So this implies they want to use a DIFFERENT account.
        // I will implement a parser for the key: "ACCOUNT_ID:API_TOKEN".
        this.accountId = '';
        if (this.apiKey && this.apiKey.includes(':')) {
            const [accId, token] = this.apiKey.split(':');
            this.accountId = accId;
            this.apiKey = token;
        }
    }

    async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
        // 1. Use REST API if Account ID and Key are present
        if (this.accountId && this.apiKey) {
            return this.generateTextRest(prompt, options);
        }

        // 2. Use Binding
        const messages: any[] = [];

        if (options?.systemPrompt) {
            messages.push({
                role: 'system',
                content: options.systemPrompt,
            });
        }

        messages.push({
            role: 'user',
            content: prompt,
        });

        const response = await this.ai.run(this.model as any, {
            messages,
        }) as any;

        return response.response || '';
    }

    async generateTextRest(prompt: string, options?: GenerateOptions): Promise<string> {
        const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`;

        const messages: any[] = [];
        if (options?.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            throw new Error(`Workers AI REST Error: ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.result?.response || '';
    }

    async generateEmbedding(text: string): Promise<number[]> {
        // 1. Use REST API
        if (this.accountId && this.apiKey) {
            const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/@cf/baai/bge-base-en-v1.5`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: [text] })
            });

            if (!response.ok) {
                throw new Error(`Workers AI Embedding REST Error: ${response.statusText}`);
            }

            const data = await response.json() as any;
            return data.result?.data[0] || [];
        }

        // 2. Use Binding
        const response = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
            text: [text],
        }) as any;

        return response.data[0];
    }
}

