import { z } from "zod";
import { encode } from '@toon-format/toon';
import { Tool, ToolResult } from "../types";
import { TextResponseBuilder } from "../utils";
import { conversationService } from "../services";

/**
 * Tool: Get conversations list by topic (search term in content)
 */
export const getConversationsList: Tool = {
    name: "get-conversations-list",
    description: `
        Get a list of conversations filtered by topic/search term.
        
        Searches conversation content for the given search term and returns
        matching conversations. Use when the user asks for conversations
        about a specific topic (e.g. "anxiety", "sleep", "work stress").
        
        Returns: id, content, role, session_id, user_id, conversation_id, created_at.
        Default limit: 50.
    `,
    parameters: {
        searchTerm: z.string().describe(`
            Topic or search term to filter conversations by.
            Matches against conversation content (case-insensitive).
            Examples: "anxiety", "sleep", "work stress", "feeling sad"
        `),
        limit: z.number().optional().default(50).describe(`
            Maximum number of conversations to return (default: 50)
        `),
        offset: z.number().optional().default(0).describe(`
            Number of records to skip for pagination (default: 0)
        `),
    },
    handler: async (params: {
        searchTerm: string;
        limit?: number;
        offset?: number;
    }): Promise<ToolResult> => {
        const searchTerm = params?.searchTerm ?? "";
        const limit = params?.limit ?? 50;
        const offset = params?.offset ?? 0;

        try {
            const conversations = await conversationService.searchByTopic(
                searchTerm,
                limit,
                offset
            );
            const conversationsData = conversations.map((c) => ({
                id: c.id,
                content: c.content,
                role: c.role,
                session_id: c.session_id,
                user_id: c.user_id,
                conversation_id: c.conversation_id,
                created_at: c.created_at,
            }));
            const encodedData = encode(conversationsData);

            return TextResponseBuilder({
                success: true,
                searchTerm: searchTerm || "(all)",
                count: conversations.length,
                data: encodedData,
            });
        } catch (error: any) {
            return TextResponseBuilder({
                success: false,
                error: error.message,
            });
        }
    },
};

export const conversationTools = [getConversationsList];
