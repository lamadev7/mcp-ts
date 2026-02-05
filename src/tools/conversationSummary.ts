import { z } from "zod";
import { Tool, ToolResult } from "../types";
import { TextResponseBuilder } from "../utils";
import { conversationSummaryService, conversationService } from "../services";

/**
 * Tool: Search conversation summaries using semantic similarity
 * 
 * This is the primary tool for the agent to retrieve relevant historical context
 * from past conversations. It uses vector embeddings to find semantically similar
 * conversation summaries.
 * 
 * The tool accepts a patient's message and its embedding, then returns the most
 * relevant historical summaries that can inform the agent's decision-making process.
 */
export const searchConversationSummaries: Tool = {
    name: "search-conversation-summaries",
    description: `
        🔍 SEMANTIC SEARCH for relevant conversation history and context.
        
        Use this tool to find past conversation summaries that are semantically 
        similar to the current patient message. This helps provide context-aware 
        responses based on historical interactions.

        🎯 USE WHEN:
        - Patient mentions something that might relate to past conversations
        - You need historical context to understand patient's situation better
        - Patient refers to previous discussions ("like we talked about", "remember when")
        - Patient shows recurring patterns that need historical validation
        - Making decisions that require understanding patient history

        🚫 DON'T USE WHEN:
        - First interaction with no conversation history
        - Simple greetings or farewells
        - Query is completely standalone with no contextual needs

        📤 RETURNS:
        - Ranked list of similar conversation summaries with relevance scores
        - Associated conversation IDs for retrieving full conversations if needed
        - Empty results if no sufficiently similar history exists

        💡 TIP: Use lower similarity threshold (0.5-0.6) for broader context,
        higher threshold (0.8+) for precise matches.
    `,
    parameters: {
        patientMessage: z.string().describe(`
            The patient's current message to search for similar past contexts.
            Pass the exact message text for accurate semantic matching.
            Example: "I've been feeling anxious about work again"
        `),
        queryEmbedding: z.array(z.number()).describe(`
            The 1536-dimensional embedding vector of the patient's message.
            This must be pre-computed using an embedding model (e.g., OpenAI text-embedding-ada-002).
            Required for semantic similarity search.
        `),
        limit: z.number().optional().default(5).describe(`
            Maximum number of results to return (default: 5, max: 20).
            Higher limits provide more context but may include less relevant results.
        `),
        similarityThreshold: z.number().optional().default(0.7).describe(`
            Minimum similarity score (0.0-1.0) for results (default: 0.7).
            - 0.9+: Very high similarity (near-exact matches)
            - 0.7-0.9: Good similarity (related topics)
            - 0.5-0.7: Moderate similarity (loosely related)
            - <0.5: Low similarity (may not be relevant)
        `),
        includeConversations: z.boolean().optional().default(false).describe(`
            If true, fetches and includes the full conversation messages 
            referenced by each summary. Useful for deep context but increases response size.
        `),
    },
    handler: async (params: {
        patientMessage: string;
        queryEmbedding: number[];
        limit?: number;
        similarityThreshold?: number;
        includeConversations?: boolean;
    }): Promise<ToolResult> => {
        const {
            patientMessage,
            queryEmbedding,
            limit = 5,
            similarityThreshold = 0.7,
            includeConversations = false,
        } = params;

        // Validate inputs
        if (!patientMessage?.trim()) {
            return TextResponseBuilder({
                success: false,
                error: "Patient message is required",
            });
        }

        if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
            return TextResponseBuilder({
                success: false,
                error: "Query embedding (array of numbers) is required",
            });
        }

        // Validate embedding dimension (should be 1536 for most models)
        if (queryEmbedding.length !== 1536) {
            return TextResponseBuilder({
                success: false,
                error: `Invalid embedding dimension: expected 1536, got ${queryEmbedding.length}`,
            });
        }

        // Clamp values
        const effectiveLimit = Math.min(Math.max(1, limit), 20);
        const effectiveThreshold = Math.min(Math.max(0, similarityThreshold), 1);

        try {
            // Perform semantic search
            const searchResults = await conversationSummaryService.semanticSearch(
                queryEmbedding,
                effectiveLimit,
                effectiveThreshold
            );

            // If no results found
            if (searchResults.length === 0) {
                return TextResponseBuilder({
                    success: true,
                    query: patientMessage,
                    message: "No sufficiently similar conversation summaries found",
                    results: [],
                    totalMatches: 0,
                    suggestion: similarityThreshold > 0.5
                        ? "Try lowering the similarity threshold for broader results"
                        : "This may be a new topic with no historical context",
                });
            }

            // Optionally fetch full conversations
            let enrichedResults = searchResults.map((result) => ({
                id: result.id,
                summaryText: result.summary_text,
                conversationIds: result.conversation_ids,
                similarityScore: parseFloat(result.similarity_score.toFixed(4)),
                relevanceLevel: getRelevanceLevel(result.similarity_score),
                createdAt: result.created_at,
                conversations: [] as any[],
            }));

            if (includeConversations) {
                // Fetch conversations for each summary
                for (const result of enrichedResults) {
                    if (result.conversationIds.length > 0) {
                        const conversations = await conversationService.findByConversationIds(
                            result.conversationIds
                        );
                        result.conversations = conversations.map((c) => ({
                            id: c.id,
                            conversationId: c.conversation_id,
                            role: c.role,
                            content: c.content,
                            createdAt: c.created_at,
                        }));
                    }
                }
            }

            return TextResponseBuilder({
                success: true,
                query: patientMessage,
                results: enrichedResults,
                totalMatches: searchResults.length,
                searchParams: {
                    limit: effectiveLimit,
                    similarityThreshold: effectiveThreshold,
                    includeConversations,
                },
                recommendation: generateRecommendation(searchResults),
            });
        } catch (error: any) {
            return TextResponseBuilder({
                success: false,
                error: `Search failed: ${error.message}`,
            });
        }
    },
};

/**
 * Tool: Search conversation summaries using text (fallback)
 * 
 * Fallback tool when embeddings are not available.
 * Uses simple text matching instead of semantic similarity.
 */
export const textSearchConversationSummaries: Tool = {
    name: "text-search-conversation-summaries",
    description: `
        📝 TEXT-BASED SEARCH for conversation summaries (fallback tool).
        
        Use when embeddings are not available. Performs simple text matching
        instead of semantic similarity search.

        🎯 USE WHEN:
        - Embedding service is unavailable
        - Simple keyword search is sufficient
        - Looking for exact phrases in summaries

        ⚠️ PREFER: Use 'search-conversation-summaries' with embeddings for 
        better semantic matching when possible.
    `,
    parameters: {
        searchQuery: z.string().describe(`
            Keywords or phrase to search for in conversation summaries.
            Example: "anxiety work stress"
        `),
        limit: z.number().optional().default(5).describe(`
            Maximum number of results to return (default: 5)
        `),
    },
    handler: async (params: {
        searchQuery: string;
        limit?: number;
    }): Promise<ToolResult> => {
        const { searchQuery, limit = 5 } = params;

        if (!searchQuery?.trim()) {
            return TextResponseBuilder({
                success: false,
                error: "Search query is required",
            });
        }

        try {
            const results = await conversationSummaryService.textSearch(searchQuery, limit);

            return TextResponseBuilder({
                success: true,
                query: searchQuery,
                results: results.map((r) => ({
                    id: r.id,
                    summaryText: r.summary_text,
                    conversationIds: r.conversation_ids,
                    createdAt: r.created_at,
                })),
                totalMatches: results.length,
                note: "Results are from text matching, not semantic similarity",
            });
        } catch (error: any) {
            return TextResponseBuilder({
                success: false,
                error: `Search failed: ${error.message}`,
            });
        }
    },
};

/**
 * Tool: Get conversation summary statistics
 * 
 * Utility tool to check the status of the summary database.
 */
export const getConversationSummaryStats: Tool = {
    name: "get-conversation-summary-stats",
    description: `
        📊 Get statistics about conversation summaries and embeddings.
        
        Use to check:
        - Total number of summaries available
        - How many have embeddings for semantic search
        - Database health for context retrieval
    `,
    parameters: {},
    handler: async (): Promise<ToolResult> => {
        try {
            const total = await conversationSummaryService.count();
            const withEmbeddings = await conversationSummaryService.countWithEmbeddings();

            return TextResponseBuilder({
                success: true,
                stats: {
                    totalSummaries: total,
                    withEmbeddings,
                    withoutEmbeddings: total - withEmbeddings,
                    embeddingCoverage: total > 0 
                        ? `${((withEmbeddings / total) * 100).toFixed(1)}%` 
                        : "N/A",
                    semanticSearchReady: withEmbeddings > 0,
                },
            });
        } catch (error: any) {
            return TextResponseBuilder({
                success: false,
                error: `Failed to get stats: ${error.message}`,
            });
        }
    },
};

// Helper functions
function getRelevanceLevel(score: number): string {
    if (score >= 0.9) return "very_high";
    if (score >= 0.8) return "high";
    if (score >= 0.7) return "good";
    if (score >= 0.6) return "moderate";
    return "low";
}

function generateRecommendation(results: any[]): string {
    if (results.length === 0) {
        return "No historical context found. Treat as new topic.";
    }

    const avgScore = results.reduce((sum, r) => sum + r.similarity_score, 0) / results.length;

    if (avgScore >= 0.85) {
        return "Strong historical context found. Reference past discussions in response.";
    }
    if (avgScore >= 0.7) {
        return "Relevant historical context available. Consider incorporating insights.";
    }
    return "Some related context found but may not be directly relevant.";
}

// Export all tools
export const conversationSummaryTools = [
    searchConversationSummaries,
    textSearchConversationSummaries,
    getConversationSummaryStats,
];
