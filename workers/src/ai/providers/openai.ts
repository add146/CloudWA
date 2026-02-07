import type { AIProvider, GenerateOptions, AIMessage } from './base';

export class OpenAIProvider implements AIProvider {
    provider = 'openai';

    constructor(
        private apiKey: string,
        private model: string = 'gpt-4o'
    ) { }

    async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
        const messages: AIMessage[] = [];

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

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature: options?.temperature || 0.7,
                max_tokens: options?.maxTokens || 1024,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.choices[0].message.content;
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: text,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI Embedding API error: ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.data[0].embedding;
    }
}
