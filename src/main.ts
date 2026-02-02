import "dotenv/config";
import server from "./server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { connectDatabase } from "./config/database";

async function startServer() {
    // Connect to MongoDB first
    await connectDatabase();
    
    // Then start the MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

startServer().catch(console.error);