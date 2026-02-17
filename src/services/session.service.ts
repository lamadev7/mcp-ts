import { Session, CreateSessionDTO, UpdateSessionDTO, User } from "../models";

class SessionService {
    /**
     * Create a new session
     */
    async create(data: CreateSessionDTO): Promise<Session> {
        return Session.create(data);
    }

    /**
     * Get all sessions with optional pagination
     */
    async findAll(limit: number = 100, offset: number = 0): Promise<Session[]> {
        return Session.findAll({
            limit,
            offset,
            order: [["created_at", "DESC"]],
        });
    }

    /**
     * Get session by ID
     */
    async findById(id: number): Promise<Session | null> {
        return Session.findByPk(id);
    }

    /**
     * Get session by session_id (unique string identifier)
     */
    async findBySessionId(sessionId: string): Promise<Session | null> {
        return Session.findOne({ where: { session_id: sessionId } });
    }

    /**
     * Get all sessions for a user
     */
    async findByUserId(userId: number, limit: number = 100, offset: number = 0): Promise<Session[]> {
        return Session.findAll({
            where: { user_id: userId },
            limit,
            offset,
            order: [["created_at", "DESC"]],
        });
    }

    /**
     * Get session with user details
     */
    async findByIdWithUser(id: number): Promise<Session | null> {
        return Session.findByPk(id, {
            include: [{ model: User, as: "user" }],
        });
    }

    /**
     * Update session by ID
     */
    async update(id: number, data: UpdateSessionDTO): Promise<Session | null> {
        const session = await Session.findByPk(id);
        if (!session) return null;
        
        await session.update(data);
        return session;
    }

    /**
     * Update session by session_id
     */
    async updateBySessionId(sessionId: string, data: UpdateSessionDTO): Promise<Session | null> {
        const session = await Session.findOne({ where: { session_id: sessionId } });
        if (!session) return null;
        
        await session.update(data);
        return session;
    }

    /**
     * Delete session by ID
     */
    async delete(id: number): Promise<boolean> {
        const deleted = await Session.destroy({ where: { id } });
        return deleted > 0;
    }

    /**
     * Delete session by session_id
     */
    async deleteBySessionId(sessionId: string): Promise<boolean> {
        const deleted = await Session.destroy({ where: { session_id: sessionId } });
        return deleted > 0;
    }

    /**
     * Check if session_id exists
     */
    async sessionIdExists(sessionId: string): Promise<boolean> {
        const session = await Session.findOne({ where: { session_id: sessionId } });
        return session !== null;
    }

    /**
     * Count sessions for a user
     */
    async countByUserId(userId: number): Promise<number> {
        return Session.count({ where: { user_id: userId } });
    }
}

export const sessionService = new SessionService();
