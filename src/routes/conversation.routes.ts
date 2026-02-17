import { Router, Request, Response } from "express";
import { conversationService } from "../services";
import { CreateConversationDTO, UpdateConversationDTO } from "../models";

const router = Router();

/**
 * GET /api/conversations
 * Get all conversations with pagination and filters
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;
        const sessionId = req.query.session_id as string | undefined;
        const userId = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;

        let conversations;
        if (sessionId) {
            conversations = await conversationService.findBySessionId(sessionId, limit, offset);
        } else if (userId) {
            conversations = await conversationService.findByUserId(userId, limit, offset);
        } else {
            conversations = await conversationService.findAll(limit, offset);
        }

        res.json({
            success: true,
            data: conversations,
            pagination: { limit, offset },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/conversations/:id
 * Get conversation by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid conversation ID" });
        }

        const conversation = await conversationService.findById(id);
        if (!conversation) {
            return res.status(404).json({ success: false, error: "Conversation not found" });
        }

        res.json({ success: true, data: conversation });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/conversations/by-conversation-id/:conversationId
 * Get conversation by conversation_id string
 */
router.get("/by-conversation-id/:conversationId", async (req: Request, res: Response) => {
    try {
        const conversationId = req.params.conversationId as string;
        
        const conversation = await conversationService.findByConversationId(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, error: "Conversation not found" });
        }

        res.json({ success: true, data: conversation });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/conversations/session/:sessionId/context
 * Get recent conversation context for a session (for AI)
 */
router.get("/session/:sessionId/context", async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;
        const limit = parseInt(req.query.limit as string) || 10;

        const conversations = await conversationService.getRecentContext(sessionId, limit);
        
        res.json({
            success: true,
            data: conversations,
            count: conversations.length,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { content, user_id, session_id, conversation_id, role } = req.body as CreateConversationDTO;

        if (!content || !user_id || !session_id || !conversation_id || !role) {
            return res.status(400).json({
                success: false,
                error: "content, user_id, session_id, conversation_id, and role are required",
            });
        }

        if (!["user", "assistant", "system"].includes(role)) {
            return res.status(400).json({
                success: false,
                error: "role must be one of: user, assistant, system",
            });
        }

        const conversation = await conversationService.create({
            content,
            user_id,
            session_id,
            conversation_id,
            role,
        });
        
        res.status(201).json({ success: true, data: conversation });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/conversations/batch
 * Create multiple conversations in batch
 */
router.post("/batch", async (req: Request, res: Response) => {
    try {
        const conversations: CreateConversationDTO[] = req.body.conversations;

        if (!Array.isArray(conversations) || conversations.length === 0) {
            return res.status(400).json({
                success: false,
                error: "conversations array is required",
            });
        }

        // Validate each conversation
        for (const conv of conversations) {
            if (!conv.content || !conv.user_id || !conv.session_id || !conv.conversation_id || !conv.role) {
                return res.status(400).json({
                    success: false,
                    error: "Each conversation must have content, user_id, session_id, conversation_id, and role",
                });
            }
            if (!["user", "assistant", "system"].includes(conv.role)) {
                return res.status(400).json({
                    success: false,
                    error: "role must be one of: user, assistant, system",
                });
            }
        }

        const created = await conversationService.createBatch(conversations);
        res.status(201).json({ success: true, data: created, count: created.length });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/conversations/:id
 * Update conversation by ID
 */
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid conversation ID" });
        }

        const data: UpdateConversationDTO = req.body;
        
        if (data.role && !["user", "assistant", "system"].includes(data.role)) {
            return res.status(400).json({
                success: false,
                error: "role must be one of: user, assistant, system",
            });
        }

        const conversation = await conversationService.update(id, data);
        if (!conversation) {
            return res.status(404).json({ success: false, error: "Conversation not found" });
        }

        res.json({ success: true, data: conversation });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/conversations/:id
 * Delete conversation by ID
 */
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid conversation ID" });
        }

        const deleted = await conversationService.delete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Conversation not found" });
        }

        res.json({ success: true, message: "Conversation deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/conversations/session/:sessionId
 * Delete all conversations for a session
 */
router.delete("/session/:sessionId", async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;
        
        const deletedCount = await conversationService.deleteBySessionId(sessionId);
        
        res.json({
            success: true,
            message: `Deleted ${deletedCount} conversations`,
            deletedCount,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
