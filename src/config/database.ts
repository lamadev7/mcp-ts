import { Sequelize } from "sequelize";

const POSTGRES_URI = process.env.POSTGRES_URI || "postgresql://localhost:5432/vectordb";

// Create Sequelize instance
export const sequelize = new Sequelize(POSTGRES_URI, {
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
        max: 20,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});

export async function connectDatabase(): Promise<void> {
    try {
        // Test connection
        await sequelize.authenticate();
        console.log("✅ Connected to PostgreSQL");

        // Enable pgvector extension
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector');
        console.log("✅ pgvector extension enabled");

        // Sync models (creates tables if they don't exist)
        await sequelize.sync({ alter: false });
        console.log("✅ Database models synchronized");
    } catch (error) {
        console.error("❌ PostgreSQL connection error:", error);
        throw error;
    }
}

export async function disconnectDatabase(): Promise<void> {
    await sequelize.close();
    console.log("Disconnected from PostgreSQL");
}

export { Sequelize };
