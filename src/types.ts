import { z } from "zod";

export interface ToolContent {
    type: "text";
    text: string;
    [key: string]: unknown;
}

export interface ToolResult {
    content: ToolContent[];
    [key: string]: unknown;
}

export interface Tool {
    name: string;
    description: string;
    parameters: Record<string, z.ZodType<any>>;
    handler: (args: any, extra?: any) => Promise<ToolResult>;
}