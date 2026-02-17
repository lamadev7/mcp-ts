import { Conversation, CreateConversationDTO, UpdateConversationDTO, User, Session } from "../models";
import { Op } from "sequelize";

class ConversationService {
    /**
     * Create a new conversation
     */
    async create(data: CreateConversationDTO): Promise<Conversation> {
        return Conversation.create(data);
    }

    /**
     * Create multiple conversations in a batch
     */
    async createBatch(conversations: CreateConversationDTO[]): Promise<Conversation[]> {
        if (conversations.length === 0) return [];
        return Conversation.bulkCreate(conversations);
    }

    /**
     * Get all conversations with optional pagination
     */
    async findAll(limit: number = 100, offset: number = 0): Promise<Conversation[]> {
        return Conversation.findAll({
            limit,
            offset,
            order: [["created_at", "DESC"]],
        });
    }

    /**
     * Get conversation by ID
     */
    async findById(id: number): Promise<Conversation | null> {
        return Conversation.findByPk(id);
    }

    /**
     * Get conversation by conversation_id
     */
    async findByConversationId(conversationId: string): Promise<Conversation | null> {
        return Conversation.findOne({ where: { conversation_id: conversationId } });
    }

    /**
     * Get all conversations for a session (ordered chronologically)
     */
    async findBySessionId(sessionId: string, limit: number = 100, offset: number = 0): Promise<Conversation[]> {
        return Conversation.findAll({
            where: { session_id: sessionId },
            limit,
            offset,
            order: [["created_at", "ASC"]],
        });
    }

    /**
     * Get all conversations for a user
     */
    async findByUserId(userId: number, limit: number = 100, offset: number = 0): Promise<Conversation[]> {
        return Conversation.findAll({
            where: { user_id: userId },
            limit,
            offset,
            order: [["created_at", "DESC"]],
        });
    }

    /**
     * Get conversations by multiple conversation_ids
     */
    async findByConversationIds(conversationIds: string[]): Promise<Conversation[]> {
        if (conversationIds.length === 0) return [];
        
        return Conversation.findAll({
            where: { conversation_id: { [Op.in]: conversationIds } },
            order: [["created_at", "ASC"]],
        });
    }

    /**
     * Get conversation with related user and session
     */
    async findByIdWithRelations(id: number): Promise<Conversation | null> {
        return Conversation.findByPk(id, {
            include: [
                { model: User, as: "user" },
                { model: Session, as: "session" },
            ],
        });
    }

    /**
     * Update conversation by ID
     */
    async update(id: number, data: UpdateConversationDTO): Promise<Conversation | null> {
        const conversation = await Conversation.findByPk(id);
        if (!conversation) return null;
        
        await conversation.update(data);
        return conversation;
    }

    /**
     * Delete conversation by ID
     */
    async delete(id: number): Promise<boolean> {
        const deleted = await Conversation.destroy({ where: { id } });
        return deleted > 0;
    }

    /**
     * Delete all conversations for a session
     */
    async deleteBySessionId(sessionId: string): Promise<number> {
        return Conversation.destroy({ where: { session_id: sessionId } });
    }

    /**
     * Count conversations in a session
     */
    async countBySessionId(sessionId: string): Promise<number> {
        return Conversation.count({ where: { session_id: sessionId } });
    }

    /**
     * Get recent conversations for context (useful for AI)
     * Returns in reverse chronological order
     */
    async getRecentContext(sessionId: string, limit: number = 10): Promise<Conversation[]> {
        return Conversation.findAll({
            where: { session_id: sessionId },
            order: [["created_at", "DESC"]],
            limit,
        });
    }

    /**
     * Get conversations after a specific timestamp
     */
    async findAfterTimestamp(sessionId: string, timestamp: Date): Promise<Conversation[]> {
        return Conversation.findAll({
            where: {
                session_id: sessionId,
                created_at: { [Op.gt]: timestamp },
            },
            order: [["created_at", "ASC"]],
        });
    }

    /**
     * Search conversations by topic (search term in content)
     */
    async searchByTopic(
        searchTerm: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<Conversation[]> {
        if (!searchTerm || !searchTerm.trim()) {
            return this.findAll(limit, offset);
        }
        return Conversation.findAll({
            where: {
                content: { [Op.iLike]: `%${searchTerm.trim()}%` },
            },
            limit,
            offset,
            order: [["created_at", "DESC"]],
        });
    }
}

export const conversationService = new ConversationService();
