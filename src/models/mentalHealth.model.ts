import mongoose, { Schema, Document } from "mongoose";

export interface IMentalHealth {
    tag: string;
    patterns: string[];
    responses: string[];
}

export interface IMentalHealthDocument extends IMentalHealth, Document {}

const MentalHealthSchema = new Schema<IMentalHealthDocument>(
    {
        tag: {
            type: String,
            required: true,
            unique: true,
            lowercase: true, // Normalize to lowercase
            index: true,
        },
        patterns: {
            type: [String],
            required: true,
            default: [],
        },
        responses: {
            type: [String],
            required: true,
            default: [],
        },
    },
    {
        timestamps: true,
        collection: "mentalHealth",
    }
);

// Indexes for efficient queries:

// 1. Text index for full-text search (used by searchTopics)
MentalHealthSchema.index(
    { patterns: "text", responses: "text", tag: "text" },
    { weights: { patterns: 10, tag: 5, responses: 1 } } // Prioritize pattern matches
);

// 2. Index on patterns array for $elemMatch queries (used by analyzeCondition)
MentalHealthSchema.index({ patterns: 1 });

// 3. Compound index for common query patterns
MentalHealthSchema.index({ tag: 1, patterns: 1 });

export const MentalHealthModel = mongoose.model<IMentalHealthDocument>(
    "MentalHealth",
    MentalHealthSchema
);
