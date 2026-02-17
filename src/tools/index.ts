import { Tool } from "../types";
import { conversationSummaryTools } from "./conversationSummary";
import { conversationTools } from "./conversations";

// Combine all tools
export const tools: Tool[] = [
    ...conversationSummaryTools,
    ...conversationTools,
];
