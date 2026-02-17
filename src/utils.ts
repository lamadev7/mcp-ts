import { ToolResult } from "./types";


export const TextResponseBuilder = (data: any): ToolResult => ({
    content: [
        {
            type: "text" as const,
            text: JSON.stringify(data)
        }
    ]
});