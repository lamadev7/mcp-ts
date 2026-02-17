import { DataTypes, Model, Optional, literal } from "sequelize";
import { sequelize } from "../config/database";

// Interface for ConversationSummary attributes
export interface ConversationSummaryAttributes {
    id: number;
    summary_text: string;
    conversation_ids: string[];
    summary_embedding?: number[] | null;
    created_at?: Date;
    updated_at?: Date;
}

// Interface for ConversationSummary creation
export interface ConversationSummaryCreationAttributes 
    extends Optional<ConversationSummaryAttributes, "id" | "summary_embedding" | "created_at" | "updated_at"> {}

// ConversationSummary Model
export class ConversationSummary 
    extends Model<ConversationSummaryAttributes, ConversationSummaryCreationAttributes> 
    implements ConversationSummaryAttributes {
    declare id: number;
    declare summary_text: string;
    declare conversation_ids: string[];
    declare summary_embedding: number[] | null;
    declare readonly created_at: Date;
    declare readonly updated_at: Date;
}

ConversationSummary.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        summary_text: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        conversation_ids: {
            type: DataTypes.ARRAY(DataTypes.STRING(255)),
            allowNull: false,
            defaultValue: [],
        },
        summary_embedding: {
            type: "VECTOR(1536)" as any, // pgvector type
            allowNull: true,
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
        tableName: "conversations_summary",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

// DTO types for API
export interface CreateConversationSummaryDTO {
    summary_text: string;
    conversation_ids: string[];
    summary_embedding?: number[];
}

export interface UpdateConversationSummaryDTO {
    summary_text?: string;
    conversation_ids?: string[];
    summary_embedding?: number[];
}

// Semantic search result type
export interface SemanticSearchResult {
    id: number;
    summary_text: string;
    conversation_ids: string[];
    similarity_score: number;
    created_at: Date;
}
