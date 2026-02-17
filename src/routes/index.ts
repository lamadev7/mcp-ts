import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import sessionRoutes from "./session.routes";
import conversationRoutes from "./conversation.routes";
import conversationSummaryRoutes from "./conversationSummary.routes";
import chatRoutes from "./chat.routes";

const router = Router();

// Mount all routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/sessions", sessionRoutes);
router.use("/conversations", conversationRoutes);
router.use("/conversation-summaries", conversationSummaryRoutes);
router.use("/chat", chatRoutes);

// Health check endpoint
router.get("/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
    });
});

export default router;
