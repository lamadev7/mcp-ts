import { Router, Request, Response } from "express";
import { sessionService, userService } from "../services";
import { CreateSessionDTO, UpdateSessionDTO } from "../models";

const router = Router();

/**
 * GET /api/sessions
 * Get all sessions with pagination
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;
        const userId = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;

        let sessions;
        if (userId) {
            sessions = await sessionService.findByUserId(userId, limit, offset);
        } else {
            sessions = await sessionService.findAll(limit, offset);
        }

        res.json({
            success: true,
            data: sessions,
            pagination: { limit, offset },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sessions/:id
 * Get session by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid session ID" });
        }

        const session = await sessionService.findById(id);
        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        res.json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sessions/by-session-id/:sessionId
 * Get session by session_id string
 */
router.get("/by-session-id/:sessionId", async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;
        
        const session = await sessionService.findBySessionId(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        res.json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sessions
 * Create a new session
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { title, user_id, session_id } = req.body as CreateSessionDTO;

        if (!user_id || !session_id) {
            return res.status(400).json({
                success: false,
                error: "user_id and session_id are required",
            });
        }

        // Check if session_id already exists
        if (await sessionService.sessionIdExists(session_id)) {
            return res.status(409).json({ success: false, error: "Session ID already exists" });
        }

        const session = await sessionService.create({ title, user_id, session_id });
        res.status(201).json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/sessions/:id
 * Update session by ID
 */
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid session ID" });
        }

        const data: UpdateSessionDTO = req.body;
        const session = await sessionService.update(id, data);
        
        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        res.json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/sessions/:id
 * Delete session by ID
 */
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid session ID" });
        }

        const deleted = await sessionService.delete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        res.json({ success: true, message: "Session deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/sessions/by-session-id/:sessionId
 * Delete session by session_id string
 */
router.delete("/by-session-id/:sessionId", async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;
        
        const deleted = await sessionService.deleteBySessionId(sessionId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        res.json({ success: true, message: "Session deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
