export interface AIProvider {
    provider: string;
    generateText(prompt: string, options?: GenerateOptions): Promise<string>;
    generateEmbedding(text: string): Promise<number[]>;
}

export interface GenerateOptions {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
