import { Router, Request, Response } from "express";
import { conversationSummaryService } from "../services";
import { CreateConversationSummaryDTO, UpdateConversationSummaryDTO } from "../models";

const router = Router();

/**
 * GET /api/conversation-summaries
 * Get all conversation summaries with pagination
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;

        const summaries = await conversationSummaryService.findAll(limit, offset);
        const total = await conversationSummaryService.count();

        res.json({
            success: true,
            data: summaries,
            pagination: { limit, offset, total },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/conversation-summaries/:id
 * Get conversation summary by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid summary ID" });
        }

        const summary = await conversationSummaryService.findById(id);
        if (!summary) {
            return res.status(404).json({ success: false, error: "Summary not found" });
        }

        res.json({ success: true, data: summary });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/conversation-summaries/by-conversation/:conversationId
 * Get summaries containing a specific conversation_id
 */
router.get("/by-conversation/:conversationId", async (req: Request, res: Response) => {
    try {
        const conversationId = req.params.conversationId as string;
        
        const summaries = await conversationSummaryService.findByConversationId(conversationId);
        
        res.json({
            success: true,
            data: summaries,
            count: summaries.length,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/conversation-summaries
 * Create a new conversation summary
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { summary_text, conversation_ids, summary_embedding } = req.body as CreateConversationSummaryDTO;

        if (!summary_text || !conversation_ids || !Array.isArray(conversation_ids)) {
            return res.status(400).json({
                success: false,
                error: "summary_text and conversation_ids (array) are required",
            });
        }

        // Validate embedding if provided
        if (summary_embedding && !Array.isArray(summary_embedding)) {
            return res.status(400).json({
                success: false,
                error: "summary_embedding must be an array of numbers",
            });
        }

        const summary = await conversationSummaryService.create({
            summary_text,
            conversation_ids,
            summary_embedding,
        });

        res.status(201).json({ success: true, data: summary });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/conversation-summaries/semantic-search
 * Perform semantic search on conversation summaries
 */
router.post("/semantic-search", async (req: Request, res: Response) => {
    try {
        const { query_embedding, query_text, limit = 5, similarity_threshold = 0.7 } = req.body;

        if (!query_embedding || !Array.isArray(query_embedding)) {
            return res.status(400).json({
                success: false,
                error: "query_embedding (array of numbers) is required",
            });
        }

        const results = await conversationSummaryService.searchByText(
            query_text || "",
            query_embedding,
            limit,
            similarity_threshold
        );

        res.json({
            success: true,
            data: results,
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/conversation-summaries/text-search
 * Perform text-based search (fallback when no embeddings)
 */
router.post("/text-search", async (req: Request, res: Response) => {
    try {
        const { query, limit = 5 } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: "query string is required",
            });
        }

        const results = await conversationSummaryService.textSearch(query, limit);

        res.json({
            success: true,
            data: results,
            count: results.length,
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/conversation-summaries/:id
 * Update conversation summary by ID
 */
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid summary ID" });
        }

        const data: UpdateConversationSummaryDTO = req.body;

        // Validate embedding if provided
        if (data.summary_embedding && !Array.isArray(data.summary_embedding)) {
            return res.status(400).json({
                success: false,
                error: "summary_embedding must be an array of numbers",
            });
        }

        const summary = await conversationSummaryService.update(id, data);
        if (!summary) {
            return res.status(404).json({ success: false, error: "Summary not found" });
        }

        res.json({ success: true, data: summary });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/conversation-summaries/:id/embedding
 * Update only the embedding for a summary
 */
router.put("/:id/embedding", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid summary ID" });
        }

        const { embedding } = req.body;

        if (!embedding || !Array.isArray(embedding)) {
            return res.status(400).json({
                success: false,
                error: "embedding (array of numbers) is required",
            });
        }

        const updated = await conversationSummaryService.updateEmbedding(id, embedding);
        if (!updated) {
            return res.status(404).json({ success: false, error: "Summary not found" });
        }

        res.json({ success: true, message: "Embedding updated successfully" });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/conversation-summaries/:id
 * Delete conversation summary by ID
 */
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid summary ID" });
        }

        const deleted = await conversationSummaryService.delete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Summary not found" });
        }

        res.json({ success: true, message: "Summary deleted successfully" });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/conversation-summaries/stats/embeddings
 * Get statistics about embeddings
 */
router.get("/stats/embeddings", async (req: Request, res: Response) => {
    try {
        const withEmbeddings = await conversationSummaryService.countWithEmbeddings();
        const total = await conversationSummaryService.count();

        res.json({
            success: true,
            data: {
                total,
                withEmbeddings,
                withoutEmbeddings: total - withEmbeddings,
                percentage: total > 0 ? ((withEmbeddings / total) * 100).toFixed(2) : 0,
            },
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
        console.error(error);
    }
});

/**
 * GET /api/conversation-summaries/without-embeddings
 * Get summaries that don't have embeddings yet
 */
router.get("/without-embeddings", async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        
        const summaries = await conversationSummaryService.findWithoutEmbeddings(limit);

        res.json({
            success: true,
            data: summaries,
            count: summaries.length,
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
