import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mcp";

export async function connectDatabase(): Promise<void> {
    try {
        await mongoose.connect(MONGO_URI);
        console.error("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
}

export async function disconnectDatabase(): Promise<void> {
    await mongoose.disconnect();
    console.error("Disconnected from MongoDB");
}
