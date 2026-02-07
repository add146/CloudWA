import type { VectorizeIndex } from '@cloudflare/workers-types';
import type { AIProvider } from './providers/base';

export interface RAGResult {
    answer: string;
    sources: RAGSource[];
}

export interface RAGSource {
    docId: string;
    chunkId: string;
    content: string;
    score: number;
}

/**
 * Search knowledge base using vector similarity
 */
export async function searchKnowledgeBase(
    query: string,
    vectorIndex: VectorizeIndex,
    aiProvider: AIProvider,
    options: {
        tenantId: string;
        docIds?: string[];
        topK?: number;
    }
): Promise<RAGSource[]> {
    const { tenantId, docIds, topK = 3 } = options;

    // Generate embedding for query
    const queryEmbedding = await aiProvider.generateEmbedding(query);

    // Build filter
    const filter: any = {
        tenantId,
    };

    if (docIds && docIds.length > 0) {
        filter.docId = { $in: docIds };
    }

    // Search vectors
    const results = await vectorIndex.query(queryEmbedding, {
        topK,
        filter,
        returnMetadata: true,
    });

    // Map to RAGSource
    return results.matches.map(match => ({
        docId: match.metadata?.docId as string || '',
        chunkId: match.id,
        content: match.metadata?.content as string || '',
        score: match.score || 0,
    }));
}

/**
 * Generate answer using RAG (Retrieval-Augmented Generation)
 */
export async function generateAnswer(
    question: string,
    sources: RAGSource[],
    aiProvider: AIProvider,
    systemPrompt?: string
): Promise<string> {
    // Build context from sources
    const context = sources
        .map((source, i) => `[${i + 1}] ${source.content}`)
        .join('\n\n');

    // Build prompt
    const prompt = `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer based on the context above:`;

    const defaultSystemPrompt =
        'You are a helpful assistant. Answer questions based on the provided context. ' +
        'If the context does not contain enough information, say so. ' +
        'Keep answers concise and natural.';

    return await aiProvider.generateText(prompt, {
        systemPrompt: systemPrompt || defaultSystemPrompt,
        temperature: 0.7,
        maxTokens: 512,
    });
}

/**
 * Full RAG pipeline: search + generate
 */
export async function queryRAG(
    question: string,
    vectorIndex: VectorizeIndex,
    aiProvider: AIProvider,
    options: {
        tenantId: string;
        docIds?: string[];
        topK?: number;
        systemPrompt?: string;
    }
): Promise<RAGResult> {
    // Search knowledge base
    const sources = await searchKnowledgeBase(question, vectorIndex, aiProvider, {
        tenantId: options.tenantId,
        docIds: options.docIds,
        topK: options.topK,
    });

    // Generate answer
    const answer = await generateAnswer(
        question,
        sources,
        aiProvider,
        options.systemPrompt
    );

    return {
        answer,
        sources,
    };
}
