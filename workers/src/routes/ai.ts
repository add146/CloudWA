import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { HonoContext } from '@/types/env';
import { knowledgeDocs, documentChunks } from '@/db/schema';
import { authMiddleware, requireTenantAdmin } from '@/middleware/auth';
import { generateAnswer, searchKnowledgeBase } from '@/ai/rag';

const aiRouter = new Hono<HonoContext>();

// All AI routes require authentication
aiRouter.use('*', authMiddleware, requireTenantAdmin);

// ============================================
// LIST KNOWLEDGE BASE DOCUMENTS
// ============================================

aiRouter.get('/knowledge-base', async (c) => {
    try {
        const user = c.get('user');
        const db = drizzle(c.env.DB);

        const docs = await db
            .select()
            .from(knowledgeDocs)
            .where(eq(knowledgeDocs.tenantId, user.tenantId));

        return c.json({
            success: true,
            data: docs,
        });
    } catch (error: any) {
        return c.json({
            success: false,
            error: error.message || 'Failed to list knowledge base documents'
        }, 500);
    }
});

// ============================================
// GET DOCUMENT CHUNKS
// ============================================

aiRouter.get('/knowledge-base/:docId/chunks', async (c) => {
    try {
        const user = c.get('user');
        const docId = c.req.param('docId');
        const db = drizzle(c.env.DB);

        // Verify document ownership
        const [doc] = await db
            .select()
            .from(knowledgeDocs)
            .where(eq(knowledgeDocs.id, docId))
            .limit(1);

        if (!doc || doc.tenantId !== user.tenantId) {
            return c.json({
                success: false,
                error: 'Document not found'
            }, 404);
        }

        const chunks = await db
            .select()
            .from(documentChunks)
            .where(eq(documentChunks.docId, docId));

        return c.json({
            success: true,
            data: {
                document: doc,
                chunks,
            },
        });
    } catch (error: any) {
        return c.json({
            success: false,
            error: error.message || 'Failed to get document chunks'
        }, 500);
    }
});

// ============================================
// QUERY KNOWLEDGE BASE (RAG)
// ============================================

aiRouter.post('/knowledge-base/query', async (c) => {
    try {
        const user = c.get('user');
        const { query, knowledgeBaseIds, provider = 'workersai', maxResults = 3 } = await c.req.json();

        if (!query) {
            return c.json({
                success: false,
                error: 'Query is required'
            }, 400);
        }

        // Search knowledge base
        const searchResults = await searchKnowledgeBase(
            c.env.VECTOR_INDEX,
            c.env.AI,
            query,
            {
                tenantId: user.tenantId,
                knowledgeBaseIds: knowledgeBaseIds || [],
                maxResults,
            }
        );

        // Generate AI answer
        const answer = await generateAnswer(
            query,
            searchResults,
            provider,
            {
                workersAI: c.env.AI,
                // Add other provider configs from DB if needed
            }
        );

        return c.json({
            success: true,
            data: {
                query,
                answer,
                sources: searchResults.map(r => ({
                    docId: r.docId,
                    chunkIndex: r.chunkIndex,
                    score: r.score,
                    text: r.text.substring(0, 200) + '...',
                })),
            },
        });
    } catch (error: any) {
        return c.json({
            success: false,
            error: error.message || 'Failed to query knowledge base'
        }, 500);
    }
});

// ============================================
// DELETE DOCUMENT
// ============================================

aiRouter.delete('/knowledge-base/:docId', async (c) => {
    try {
        const user = c.get('user');
        const docId = c.req.param('docId');
        const db = drizzle(c.env.DB);

        // Verify ownership
        const [doc] = await db
            .select()
            .from(knowledgeDocs)
            .where(eq(knowledgeDocs.id, docId))
            .limit(1);

        if (!doc || doc.tenantId !== user.tenantId) {
            return c.json({
                success: false,
                error: 'Document not found'
            }, 404);
        }

        // Delete chunks first
        await db
            .delete(documentChunks)
            .where(eq(documentChunks.docId, docId));

        // Delete document
        await db
            .delete(knowledgeDocs)
            .where(eq(knowledgeDocs.id, docId));

        return c.json({
            success: true,
            data: {
                deleted: true,
            },
        });
    } catch (error: any) {
        return c.json({
            success: false,
            error: error.message || 'Failed to delete document'
        }, 500);
    }
});

export default aiRouter;
