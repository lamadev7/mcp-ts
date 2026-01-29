import { MentalHealthModel, IMentalHealth } from "../models/mentalHealth.model";

export interface MatchResult {
    tag: string;
    confidence: number;
    matchedPattern: string;
}

export interface TopicInfo {
    tag: string;
    description: string;
    samplePatterns: string[];
    responseCount: number;
}

class MentalHealthService {
    /**
     * Search for relevant mental health topics using MongoDB text search
     * Efficient: Uses database-side text index, returns only top results
     */
    async searchTopics(query: string, limit: number = 5): Promise<IMentalHealth[]> {
        // MongoDB text search - done on DB side, very efficient
        const textResults = await MentalHealthModel.find(
            { $text: { $search: query } },
            { score: { $meta: "textScore" } }
        )
            .sort({ score: { $meta: "textScore" } })
            .limit(limit)
            .lean();

        if (textResults.length > 0) {
            return textResults;
        }

        // Fallback: indexed regex search with limit
        const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        if (words.length === 0) return [];

        return MentalHealthModel.find({
            patterns: { $elemMatch: { $regex: words.join("|"), $options: "i" } },
        })
            .limit(limit)
            .lean();
    }

    /**
     * Get coping strategies for a specific condition/tag
     * Efficient: Single indexed lookup by tag
     */
    async getCopingStrategies(tag: string): Promise<{ tag: string; strategies: string[] } | null> {
        const result = await MentalHealthModel.findOne({ tag: tag.toLowerCase() })
            .select("tag responses")
            .lean();

        if (!result) return null;

        return {
            tag: result.tag,
            strategies: result.responses,
        };
    }

    /**
     * Analyze patient message using MongoDB aggregation pipeline
     * Efficient: All processing done on database side
     */
    async analyzeCondition(message: string): Promise<{
        identifiedConditions: MatchResult[];
        isCrisis: boolean;
        primaryCondition: string | null;
    }> {
        const words = this.extractKeywords(message);
        
        if (words.length === 0) {
            return { identifiedConditions: [], isCrisis: false, primaryCondition: null };
        }

        // Build regex pattern for matching
        const regexPattern = words.join("|");

        // Use aggregation pipeline - all processing on DB side
        const results = await MentalHealthModel.aggregate([
            // Stage 1: Filter documents that have matching patterns (uses index)
            {
                $match: {
                    tag: { $ne: "unknown" },
                    patterns: { $elemMatch: { $regex: regexPattern, $options: "i" } },
                },
            },
            // Stage 2: Calculate match score on DB side
            {
                $addFields: {
                    matchedPatterns: {
                        $filter: {
                            input: "$patterns",
                            as: "pattern",
                            cond: {
                                $regexMatch: {
                                    input: { $toLower: "$$pattern" },
                                    regex: regexPattern,
                                    options: "i",
                                },
                            },
                        },
                    },
                },
            },
            // Stage 3: Calculate confidence based on match count
            {
                $addFields: {
                    matchCount: { $size: "$matchedPatterns" },
                    confidence: {
                        $min: [
                            1,
                            {
                                $multiply: [
                                    { $divide: [{ $size: "$matchedPatterns" }, { $size: "$patterns" }] },
                                    2, // Boost factor
                                ],
                            },
                        ],
                    },
                },
            },
            // Stage 4: Sort by confidence and limit results
            { $sort: { confidence: -1 } },
            { $limit: 5 },
            // Stage 5: Project only needed fields
            {
                $project: {
                    tag: 1,
                    confidence: { $round: ["$confidence", 2] },
                    matchedPattern: { $arrayElemAt: ["$matchedPatterns", 0] },
                },
            },
        ]);

        const matches: MatchResult[] = results.map((r) => ({
            tag: r.tag,
            confidence: r.confidence,
            matchedPattern: r.matchedPattern || "",
        }));

        // Check for crisis - single indexed query
        const isCrisis = await this.checkCrisis(message);

        return {
            identifiedConditions: matches.slice(0, 3),
            isCrisis,
            primaryCondition: matches.length > 0 ? matches[0].tag : null,
        };
    }

    /**
     * Check if message indicates crisis - separate indexed query
     */
    private async checkCrisis(message: string): Promise<boolean> {
        const crisisKeywords = ["suicide", "kill myself", "end my life", "want to die", "hurt myself"];
        const lowerMessage = message.toLowerCase();
        
        // Quick local check first (no DB call if no keywords)
        const hasCrisisKeyword = crisisKeywords.some((kw) => lowerMessage.includes(kw));
        if (!hasCrisisKeyword) return false;

        // Verify against crisis patterns in DB
        const crisisDoc = await MentalHealthModel.findOne({
            tag: "crisis",
            patterns: { $elemMatch: { $regex: crisisKeywords.join("|"), $options: "i" } },
        })
            .select("_id")
            .lean();

        return crisisDoc !== null;
    }

    /**
     * Extract meaningful keywords from message
     */
    private extractKeywords(message: string): string[] {
        const stopWords = new Set([
            "i", "me", "my", "myself", "we", "our", "you", "your", "he", "she", "it",
            "they", "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
            "be", "been", "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "could", "should", "may", "might", "must", "can", "to", "of",
            "in", "for", "on", "with", "at", "by", "from", "so", "very", "just",
            "really", "much", "too", "also", "about", "like", "feel", "feeling",
        ]);

        return message
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .split(/\s+/)
            .filter((word) => word.length > 2 && !stopWords.has(word));
    }

    /**
     * Get all available mental health topics
     * Efficient: Uses aggregation to compute stats on DB side
     */
    async getAllTopics(): Promise<TopicInfo[]> {
        const topics = await MentalHealthModel.aggregate([
            {
                $project: {
                    tag: 1,
                    samplePatterns: { $slice: ["$patterns", 3] },
                    responseCount: { $size: "$responses" },
                },
            },
        ]);

        return topics.map((topic) => ({
            tag: topic.tag,
            description: this.getTopicDescription(topic.tag),
            samplePatterns: topic.samplePatterns,
            responseCount: topic.responseCount,
        }));
    }

    /**
     * Get a specific topic by tag
     * Efficient: Single indexed lookup
     */
    async getTopicByTag(tag: string): Promise<IMentalHealth | null> {
        return MentalHealthModel.findOne({ tag: tag.toLowerCase() }).lean();
    }

    /**
     * Get human-readable description for a tag
     */
    private getTopicDescription(tag: string): string {
        const descriptions: Record<string, string> = {
            greeting: "Conversation starters and greetings",
            goodbye: "Farewell messages and session endings",
            anxiety: "Anxiety, worry, and nervousness",
            depression: "Depression, sadness, and hopelessness",
            stress: "Stress, burnout, and pressure",
            loneliness: "Loneliness and isolation",
            sleep_issues: "Sleep problems and insomnia",
            self_esteem: "Self-esteem and self-worth issues",
            anger: "Anger and frustration management",
            gratitude: "Appreciation and thankfulness",
            crisis: "Crisis situations requiring immediate help",
            unknown: "General or unclassified concerns",
        };
        return descriptions[tag] || `Topics related to ${tag}`;
    }
}

export const mentalHealthService = new MentalHealthService();
