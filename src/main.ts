import server from "./server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function startServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

startServer().catch(console.error);