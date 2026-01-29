import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tools } from "./tools";


const server = new McpServer({
  name: "mcp-server",
  version: "1.0.0",
});


// registering tools
for (const tool of tools) {
  server.tool(tool.name, tool.description, tool.parameters, tool.handler);
}

export default server;