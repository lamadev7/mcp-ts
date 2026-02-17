import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

// Interface for User attributes
export interface UserAttributes {
    id: number;
    email: string;
    password: string;
    fullname: string;
    created_at?: Date;
    updated_at?: Date;
}

// Interface for User creation (id is optional)
export interface UserCreationAttributes extends Optional<UserAttributes, "id" | "created_at" | "updated_at"> {}

// User Model
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    declare id: number;
    declare email: string;
    declare password: string;
    declare fullname: string;
    declare readonly created_at: Date;
    declare readonly updated_at: Date;
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        fullname: {
            type: DataTypes.STRING(255),
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
        tableName: "users",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

// DTO types for API
export interface CreateUserDTO {
    email: string;
    password: string;
    fullname: string;
}

export interface UpdateUserDTO {
    email?: string;
    password?: string;
    fullname?: string;
}
