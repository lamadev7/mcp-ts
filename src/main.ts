import "dotenv/config";
import cors from "cors";
import express from "express";
import server from "./server";
import { connectDatabase } from "./config/database";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import apiRoutes from "./routes";

async function startServer() {
    // Connect to PostgreSQL first
    await connectDatabase();
    
    // express instance
    const app = express();
    app.use(express.json({ limit: "10mb" })); // Increased limit for embeddings
    app.use(cors({ origin: "*" }));
    app.use(express.urlencoded({ extended: true }));

    // Mount API routes
    app.use("/api", apiRoutes);

    // SSE transports list
    const transports = new Map<string, SSEServerTransport>();

    // SSE Endpoint for MCP server
    app.get("/sse", async (req, res) => {
        const clientId = `client-${Date.now()}`;
        const transport = new SSEServerTransport(`/messages/${clientId}`, res);
        transports.set(clientId, transport);
        console.log(`🔌 Client ${clientId} connected`);

        // connect mcp server to this transport
        await server.connect(transport);

        res.on("close", () => {
            console.log(`🔌 Client ${clientId} disconnected`);
            transports.delete(clientId);
        });
    });

    // POST messages/:clientId, client sends message to MCP server
    app.post("/messages/:clientId", async (req, res) => {
        const clientId = req.params.clientId;
        const transport = transports.get(clientId);
        if (!transport) {
            return res.status(404).json({ error: "Client not found" });
        }

        await transport.handlePostMessage(req, res, req.body);
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 MCP server is running on port ${PORT}`);
        console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
        console.log(`🔗 API endpoints: http://localhost:${PORT}/api`);
        console.log(`   - Users: /api/users`);
        console.log(`   - Sessions: /api/sessions`);
        console.log(`   - Conversations: /api/conversations`);
        console.log(`   - Summaries: /api/conversation-summaries`);
        console.log(`   - Auth: /api/auth (register, login, me)`);
        console.log(`   - Chat: /api/chat (message, history, sessions)`);
    });
}

startServer().catch(console.error);
