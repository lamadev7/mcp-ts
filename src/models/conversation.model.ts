import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./user.model";
import { Session } from "./session.model";

// Enum for conversation role
export type ConversationRole = "user" | "assistant" | "system";

// Interface for Conversation attributes
export interface ConversationAttributes {
    id: number;
    content: string;
    user_id: number;
    session_id: string;
    conversation_id: string;
    role: ConversationRole;
    created_at?: Date;
    updated_at?: Date;
}

// Interface for Conversation creation
export interface ConversationCreationAttributes extends Optional<ConversationAttributes, "id" | "created_at" | "updated_at"> { }

// Conversation Model
export class Conversation extends Model<ConversationAttributes, ConversationCreationAttributes> implements ConversationAttributes {
    declare id: number;
    declare content: string;
    declare user_id: number;
    declare session_id: string;
    declare conversation_id: string;
    declare role: ConversationRole;
    declare readonly created_at: Date;
    declare readonly updated_at: Date;
}

Conversation.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: "id",
            },
            onDelete: "CASCADE",
        },
        session_id: {
            type: DataTypes.STRING(255),
            allowNull: false,
            references: {
                model: Session,
                key: "session_id",
            },
            onDelete: "CASCADE",
        },
        conversation_id: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        role: {
            type: DataTypes.ENUM("user", "assistant", "system"),
            allowNull: false,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: "conversations",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            { fields: ["user_id"] },
            { fields: ["session_id"] },
            { fields: ["conversation_id"] },
        ],
    }
);

// Define associations
User.hasMany(Conversation, { foreignKey: "user_id", as: "conversations" });
Conversation.belongsTo(User, { foreignKey: "user_id", as: "user" });

Session.hasMany(Conversation, { foreignKey: "session_id", sourceKey: "session_id", as: "conversations" });
Conversation.belongsTo(Session, { foreignKey: "session_id", targetKey: "session_id", as: "session" });

// DTO types for API
export interface CreateConversationDTO {
    content: string;
    user_id: number;
    session_id: string;
    conversation_id: string;
    role: ConversationRole;
}

export interface UpdateConversationDTO {
    content?: string;
    role?: ConversationRole;
}
