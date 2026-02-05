import { Tool } from "../types";
import { conversationSummaryTools } from "./conversationSummary";

// Combine all tools
export const tools: Tool[] = [
    ...conversationSummaryTools,
];
