import "dotenv/config";
import cors from "cors";
import express from "express";
import server from "./server";
import { connectDatabase } from "./config/database";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

async function startServer() {
    // Connect to MongoDB first
    await connectDatabase();
    
    // express instance
    const app = express();
    app.use(express.json());
    app.use(cors({ origin: "*" }));
    app.use(express.urlencoded({ extended: true }));

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

        // send client id to client
        res.write(`data: ${JSON.stringify({ type: 'connected',clientId })}\n\n`);

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

    app.listen(process.env.PORT, () => {
        console.log(`🚀 MCP server is running on port ${process.env.PORT || 3000}`);
    });
}

startServer().catch(console.error);