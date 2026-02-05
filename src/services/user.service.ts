import { User, CreateUserDTO, UpdateUserDTO, UserAttributes } from "../models";
import { Op } from "sequelize";

class UserService {
    /**
     * Create a new user
     */
    async create(data: CreateUserDTO): Promise<User> {
        return User.create(data);
    }

    /**
     * Get all users with optional pagination
     */
    async findAll(limit: number = 100, offset: number = 0): Promise<User[]> {
        return User.findAll({
            limit,
            offset,
            order: [["created_at", "DESC"]],
        });
    }

    /**
     * Get user by ID
     */
    async findById(id: number): Promise<User | null> {
        return User.findByPk(id);
    }

    /**
     * Get user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        return User.findOne({ where: { email } });
    }

    /**
     * Update user by ID
     */
    async update(id: number, data: UpdateUserDTO): Promise<User | null> {
        const user = await User.findByPk(id);
        if (!user) return null;
        
        await user.update(data);
        return user;
    }

    /**
     * Delete user by ID
     */
    async delete(id: number): Promise<boolean> {
        const deleted = await User.destroy({ where: { id } });
        return deleted > 0;
    }

    /**
     * Check if email exists
     */
    async emailExists(email: string, excludeId?: number): Promise<boolean> {
        const where: any = { email };
        if (excludeId) {
            where.id = { [Op.ne]: excludeId };
        }
        const user = await User.findOne({ where });
        return user !== null;
    }

    /**
     * Count total users
     */
    async count(): Promise<number> {
        return User.count();
    }
}

export const userService = new UserService();
