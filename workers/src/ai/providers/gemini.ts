import type { AIProvider, GenerateOptions } from './base';

export class GeminiProvider implements AIProvider {
    provider = 'gemini';

    constructor(
        private apiKey: string,
        private model: string = 'gemini-1.5-flash'
    ) { }

    async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
        const contents: any[] = [];

        if (options?.systemPrompt) {
            contents.push({
                role: 'user',
                parts: [{ text: options.systemPrompt }],
            });
            contents.push({
                role: 'model',
                parts: [{ text: 'Understood. I will follow these instructions.' }],
            });
        }

        contents.push({
            role: 'user',
            parts: [{ text: prompt }],
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: options?.temperature || 0.7,
                    maxOutputTokens: options?.maxTokens || 1024,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.candidates[0].content.parts[0].text;
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'models/text-embedding-004',
                content: {
                    parts: [{ text }],
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini Embedding API error: ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.embedding.values;
    }
}
