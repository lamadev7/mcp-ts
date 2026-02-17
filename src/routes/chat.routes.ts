import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { conversationService, sessionService } from "../services";
import { ConversationRole } from "../models";

const router = Router();

/**
 * POST /api/chat/message
 * Save a chat message (user or assistant)
 */
router.post("/message", async (req: Request, res: Response) => {
    try {
        const { user_id, session_id, content, role } = req.body;

        // Validation
        if (!user_id || !session_id || !content || !role) {
            return res.status(400).json({
                success: false,
                error: "user_id, session_id, content, and role are required",
            });
        }

        if (!["user", "assistant", "system"].includes(role)) {
            return res.status(400).json({
                success: false,
                error: "role must be one of: user, assistant, system",
            });
        }

        // Check if session exists, create if not
        let session = await sessionService.findBySessionId(session_id);
        if (!session) {
            session = await sessionService.create({
                user_id: parseInt(user_id),
                session_id,
                title: undefined, // Can be updated later
            });
        }

        // Create conversation entry
        const conversation = await conversationService.create({
            user_id: parseInt(user_id),
            session_id,
            conversation_id: uuidv4(),
            content,
            role: role as ConversationRole,
        });

        res.status(201).json({
            success: true,
            data: conversation,
        });
    } catch (error: any) {
        console.error("Chat message error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/chat/messages/batch
 * Save multiple messages at once (e.g., user message + assistant response)
 */
router.post("/messages/batch", async (req: Request, res: Response) => {
    try {
        const { user_id, session_id, messages } = req.body;

        // Validation
        if (!user_id || !session_id || !messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                error: "user_id, session_id, and messages array are required",
            });
        }

        // Check if session exists, create if not
        let session = await sessionService.findBySessionId(session_id);
        if (!session) {
            session = await sessionService.create({
                user_id: parseInt(user_id),
                session_id,
                title: undefined,
            });
        }

        // Prepare conversations
        const conversations = messages.map((msg: { content: string; role: ConversationRole }) => ({
            user_id: parseInt(user_id),
            session_id,
            conversation_id: uuidv4(),
            content: msg.content,
            role: msg.role,
        }));

        // Create all conversations
        const created = await conversationService.createBatch(conversations);

        res.status(201).json({
            success: true,
            data: created,
            count: created.length,
        });
    } catch (error: any) {
        console.error("Chat batch error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/chat/history/:sessionId
 * Get chat history for a session
 */
router.get("/history/:sessionId", async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;

        // Get conversations for this session
        const conversations = await conversationService.findBySessionId(sessionId, limit, offset);

        // Get session info
        const session = await sessionService.findBySessionId(sessionId);

        res.json({
            success: true,
            data: {
                session,
                messages: conversations.map((c) => ({
                    id: c.id,
                    conversation_id: c.conversation_id,
                    content: c.content,
                    role: c.role,
                    created_at: c.created_at,
                })),
            },
            count: conversations.length,
        });
    } catch (error: any) {
        console.error("Chat history error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/chat/sessions/:userId
 * Get all chat sessions for a user
 */
router.get("/sessions/:userId", async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId as string);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, error: "Invalid user ID" });
        }

        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const sessions = await sessionService.findByUserId(userId, limit, offset);

        // Get message count for each session
        const sessionsWithCount = await Promise.all(
            sessions.map(async (session) => {
                const count = await conversationService.countBySessionId(session.session_id);
                // Get last message for preview
                const recentMessages = await conversationService.getRecentContext(session.session_id, 1);
                const lastMessage = recentMessages[0];
                
                return {
                    id: session.id,
                    session_id: session.session_id,
                    title: session.title,
                    message_count: count,
                    last_message: lastMessage ? {
                        content: lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? "..." : ""),
                        role: lastMessage.role,
                        created_at: lastMessage.created_at,
                    } : null,
                    created_at: session.created_at,
                    updated_at: session.updated_at,
                };
            })
        );

        res.json({
            success: true,
            data: sessionsWithCount,
            count: sessionsWithCount.length,
        });
    } catch (error: any) {
        console.error("Chat sessions error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/chat/session/:sessionId/title
 * Update session title
 */
router.put("/session/:sessionId/title", async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: "title is required" });
        }

        const session = await sessionService.updateBySessionId(sessionId, { title });
        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        res.json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/chat/session/:sessionId
 * Delete a chat session and all its messages
 */
router.delete("/session/:sessionId", async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;

        // Delete all conversations first (cascade should handle this, but being explicit)
        const deletedMessages = await conversationService.deleteBySessionId(sessionId);
        
        // Delete session
        const deleted = await sessionService.deleteBySessionId(sessionId);
        
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        res.json({
            success: true,
            message: "Session and messages deleted",
            deletedMessages,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
