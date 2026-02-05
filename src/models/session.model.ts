import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./user.model";

// Interface for Session attributes
export interface SessionAttributes {
    id: number;
    title: string | null;
    user_id: number;
    session_id: string;
    created_at?: Date;
    updated_at?: Date;
}

// Interface for Session creation
export interface SessionCreationAttributes extends Optional<SessionAttributes, "id" | "title" | "created_at" | "updated_at"> {}

// Session Model
export class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
    declare id: number;
    declare title: string | null;
    declare user_id: number;
    declare session_id: string;
    declare readonly created_at: Date;
    declare readonly updated_at: Date;
}

Session.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: true,
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
            unique: true,
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
        tableName: "sessions",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            { fields: ["user_id"] },
            { fields: ["session_id"], unique: true },
        ],
    }
);

// Define association
User.hasMany(Session, { foreignKey: "user_id", as: "sessions" });
Session.belongsTo(User, { foreignKey: "user_id", as: "user" });

// DTO types for API
export interface CreateSessionDTO {
    title?: string;
    user_id: number;
    session_id: string;
}

export interface UpdateSessionDTO {
    title?: string;
}
