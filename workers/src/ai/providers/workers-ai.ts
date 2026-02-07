import type { Ai } from '@cloudflare/workers-types';
import type { AIProvider, GenerateOptions } from './base';

export class WorkersAIProvider implements AIProvider {
    provider = 'workers_ai';

    constructor(
        private ai: Ai,
        private model: string = '@cf/meta/llama-3-8b-instruct'
    ) { }

    async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
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

        const response = await this.ai.run(this.model, {
            messages,
        }) as any;

        return response.response || '';
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const response = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
            text: [text],
        }) as any;

        return response.data[0];
    }
}
