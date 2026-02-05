import { ConversationSummary, CreateConversationSummaryDTO, UpdateConversationSummaryDTO, SemanticSearchResult } from "../models";
import { sequelize } from "../config/database";
import { Op, QueryTypes } from "sequelize";

class ConversationSummaryService {
    /**
     * Create a new conversation summary
     */
    async create(data: CreateConversationSummaryDTO): Promise<ConversationSummary> {
        // Handle embedding separately if provided (due to pgvector type)
        if (data.summary_embedding && data.summary_embedding.length > 0) {
            const embeddingStr = `[${data.summary_embedding.join(",")}]`;
            const result = await sequelize.query<any>(
                `INSERT INTO conversations_summary (summary_text, conversation_ids, summary_embedding, created_at, updated_at)
                 VALUES (:summary_text, :conversation_ids::text[], :embedding::vector, NOW(), NOW())
                 RETURNING *`,
                {
                    replacements: {
                        summary_text: data.summary_text,
                        conversation_ids: `{${data.conversation_ids.map((id) => `"${id}"`).join(",")}}`,
                        embedding: embeddingStr,
                    },
                    type: QueryTypes.SELECT,
                }
            );
            return result[0] as ConversationSummary;
        }

        return ConversationSummary.create({
            summary_text: data.summary_text,
            conversation_ids: data.conversation_ids,
        });
    }

    /**
     * Get all summaries with optional pagination
     */
    async findAll(limit: number = 100, offset: number = 0): Promise<ConversationSummary[]> {
        return ConversationSummary.findAll({
            attributes: ["id", "summary_text", "conversation_ids", "created_at", "updated_at"],
            limit,
            offset,
            order: [["created_at", "DESC"]],
        });
    }

    /**
     * Get summary by ID
     */
    async findById(id: number): Promise<ConversationSummary | null> {
        return ConversationSummary.findByPk(id, {
            attributes: ["id", "summary_text", "conversation_ids", "created_at", "updated_at"],
        });
    }

    /**
     * Get summaries containing specific conversation_id
     */
    async findByConversationId(conversationId: string): Promise<ConversationSummary[]> {
        return ConversationSummary.findAll({
            where: sequelize.literal(`'${conversationId}' = ANY(conversation_ids)`),
            attributes: ["id", "summary_text", "conversation_ids", "created_at", "updated_at"],
            order: [["created_at", "DESC"]],
        });
    }

    /**
     * Update summary by ID
     */
    async update(id: number, data: UpdateConversationSummaryDTO): Promise<ConversationSummary | null> {
        // Handle embedding update separately if provided
        if (data.summary_embedding && data.summary_embedding.length > 0) {
            const embeddingStr = `[${data.summary_embedding.join(",")}]`;
            await sequelize.query(
                `UPDATE conversations_summary 
                 SET summary_embedding = :embedding::vector, updated_at = NOW()
                 WHERE id = :id`,
                {
                    replacements: { embedding: embeddingStr, id },
                    type: QueryTypes.UPDATE,
                }
            );
            // Remove embedding from data to avoid double update
            const { summary_embedding, ...restData } = data;
            if (Object.keys(restData).length > 0) {
                await ConversationSummary.update(restData, { where: { id } });
            }
        } else if (Object.keys(data).length > 0) {
            await ConversationSummary.update(data, { where: { id } });
        }

        return this.findById(id);
    }

    /**
     * Delete summary by ID
     */
    async delete(id: number): Promise<boolean> {
        const deleted = await ConversationSummary.destroy({ where: { id } });
        return deleted > 0;
    }

    /**
     * SEMANTIC SEARCH: Find similar summaries using vector similarity
     * This is the core method for the MCP tool
     * 
     * @param queryEmbedding - The embedding vector of the patient's message
     * @param limit - Maximum number of results to return
     * @param similarityThreshold - Minimum similarity score (0-1, cosine similarity)
     * @returns Array of summaries with similarity scores, sorted by relevance
     */
    async semanticSearch(
        queryEmbedding: number[],
        limit: number = 5,
        similarityThreshold: number = 0.7
    ): Promise<SemanticSearchResult[]> {
        const embeddingStr = `[${queryEmbedding.join(",")}]`;

        // Use cosine similarity (1 - cosine distance)
        // pgvector's <=> operator returns cosine distance
        const results = await sequelize.query<SemanticSearchResult>(
            `SELECT 
                id,
                summary_text,
                conversation_ids,
                1 - (summary_embedding <=> :embedding::vector) as similarity_score,
                created_at
             FROM conversations_summary
             WHERE summary_embedding IS NOT NULL
               AND 1 - (summary_embedding <=> :embedding::vector) >= :threshold
             ORDER BY summary_embedding <=> :embedding::vector
             LIMIT :limit`,
            {
                replacements: {
                    embedding: embeddingStr,
                    threshold: similarityThreshold,
                    limit,
                },
                type: QueryTypes.SELECT,
            }
        );

        return results;
    }

    /**
     * SEMANTIC SEARCH with text query wrapper
     * Expects pre-computed embedding from external service
     */
    async searchByText(
        queryText: string,
        queryEmbedding: number[],
        limit: number = 5,
        similarityThreshold: number = 0.7
    ): Promise<{
        query: string;
        results: SemanticSearchResult[];
        totalMatches: number;
    }> {
        const results = await this.semanticSearch(queryEmbedding, limit, similarityThreshold);

        return {
            query: queryText,
            results,
            totalMatches: results.length,
        };
    }

    /**
     * Count summaries that have embeddings
     */
    async countWithEmbeddings(): Promise<number> {
        const result = await sequelize.query<{ count: string }>(
            `SELECT COUNT(*) as count FROM conversations_summary WHERE summary_embedding IS NOT NULL`,
            { type: QueryTypes.SELECT }
        );
        return parseInt(result[0]?.count || "0", 10);
    }

    /**
     * Update embedding for a specific summary
     */
    async updateEmbedding(id: number, embedding: number[]): Promise<boolean> {
        const embeddingStr = `[${embedding.join(",")}]`;
        const [, affected] = await sequelize.query(
            `UPDATE conversations_summary 
             SET summary_embedding = :embedding::vector, updated_at = NOW() 
             WHERE id = :id`,
            {
                replacements: { embedding: embeddingStr, id },
                type: QueryTypes.UPDATE,
            }
        );
        return (affected as number) > 0;
    }

    /**
     * Get summaries without embeddings (for batch processing)
     */
    async findWithoutEmbeddings(limit: number = 100): Promise<ConversationSummary[]> {
        return ConversationSummary.findAll({
            where: { summary_embedding: null },
            attributes: ["id", "summary_text", "conversation_ids", "created_at", "updated_at"],
            limit,
        });
    }

    /**
     * Full-text search fallback when embeddings are not available
     */
    async textSearch(searchQuery: string, limit: number = 5): Promise<ConversationSummary[]> {
        return ConversationSummary.findAll({
            where: {
                summary_text: { [Op.iLike]: `%${searchQuery}%` },
            },
            attributes: ["id", "summary_text", "conversation_ids", "created_at", "updated_at"],
            order: [["created_at", "DESC"]],
            limit,
        });
    }

    /**
     * Count total summaries
     */
    async count(): Promise<number> {
        return ConversationSummary.count();
    }
}

export const conversationSummaryService = new ConversationSummaryService();
