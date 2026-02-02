import { z } from "zod";
import { Tool, ToolResult } from "../types";
import { TextResponseBuilder } from "../utils";
import { mentalHealthService } from "../services/mentalHealth.service";

/**
 * Tool 1: Analyze patient's condition from their message
 * Use this to understand what mental health situation the patient is experiencing
 */
export const analyzePatientCondition: Tool = {
    name: "analyze-patient-condition",
    description:
        "Analyzes patient's message to identify their mental health condition. Returns identified conditions with confidence scores, crisis detection, and primary condition. Use this first to understand the patient's situation.",
    parameters: {
        patientMessage: z.string().describe("The patient's message describing their current situation or feelings"),
    },
    handler: async (params: { patientMessage: string }): Promise<ToolResult> => {
        const patientMessage = params?.patientMessage;

        if (!patientMessage?.trim()) {
            return TextResponseBuilder({ success: false, error: "Patient message is required" });
        }

        const analysis = await mentalHealthService.analyzeCondition(patientMessage);
        const data = {
            ...analysis,
            recommendation: analysis.isCrisis
                ? "URGENT: Patient may be in crisis. Provide crisis resources immediately."
                : analysis.primaryCondition
                  ? `Focus on ${analysis.primaryCondition} coping strategies.`
                  : "Ask clarifying questions to better understand the patient's situation.",
        }

        return TextResponseBuilder(data);
    },
};

/**
 * Tool 2: Get coping strategies for a specific condition
 * Use this after identifying the condition to get relevant strategies
 */
export const getCopingStrategies: Tool = {
    name: "get-coping-strategies",
    description:
        "Retrieves coping strategies and supportive responses for a specific mental health condition (e.g., anxiety, depression, stress). Use after analyzing the patient's condition.",
    parameters: {
        condition: z.string().describe("The mental health condition tag (e.g., 'anxiety', 'depression', 'stress', 'loneliness')"),
    },
    handler: async (params: { condition: string }): Promise<ToolResult> => {
        const condition = params?.condition;

        if (!condition?.trim()) {
            return TextResponseBuilder({ success: false, error: "Condition is required" });
        }

        const strategies = await mentalHealthService.getCopingStrategies(condition);

        if (!strategies) {
            return TextResponseBuilder({
                success: false,
                error: `No strategies found for condition: ${condition}`,
                suggestion: "Try using 'list-mental-health-topics' to see available conditions.",
            });
        }

        return TextResponseBuilder(strategies);
    },
};

/**
 * Tool 3: Search mental health topics by keywords
 * Use this for broad searches when the condition isn't clear
 */
export const searchMentalHealthTopics: Tool = {
    name: "search-mental-health-topics",
    description:
        "Searches the mental health database for topics matching keywords. Useful when the patient's condition isn't immediately clear or for finding related topics.",
    parameters: {
        query: z.string().describe("Keywords to search for (e.g., 'feeling tired', 'can't focus', 'relationship problems')"),
        limit: z.number().optional().default(5).describe("Maximum number of results to return (default: 5)"),
    },
    handler: async (params: { query: string; limit?: number }): Promise<ToolResult> => {
        const query = params?.query;
        const limit = params?.limit ?? 5;

        if (!query?.trim()) {
            return TextResponseBuilder({ success: false, error: "Search query is required" });
        }

        const results = await mentalHealthService.searchTopics(query, limit);

        return TextResponseBuilder({
            query,
            resultsCount: results.length,
            topics: results.map((r) => ({
                tag: r.tag,
                relevantPatterns: r.patterns.slice(0, 3),
                sampleResponse: r.responses[0],
            })),
        });
    },
};

/**
 * Tool 4: List all available mental health topics
 * Use this to understand what topics are available in the database
 */
export const listMentalHealthTopics: Tool = {
    name: "list-mental-health-topics",
    description:
        "Lists all available mental health topics in the database. Use this to understand what conditions and situations can be addressed.",
    parameters: {},
    handler: async (): Promise<ToolResult> => {
        const topics = await mentalHealthService.getAllTopics();

        return TextResponseBuilder({
            totalTopics: topics.length,
            topics: topics.filter((t) => t.tag !== "unknown"),
        });
    },
};

/**
 * Tool 5: Get detailed info about a specific topic
 * Use this to get full details including all patterns and responses
 */
export const getTopicDetails: Tool = {
    name: "get-topic-details",
    description:
        "Gets complete details for a specific mental health topic including all patterns and responses. Use this for in-depth information about a condition.",
    parameters: {
        tag: z.string().describe("The topic tag (e.g., 'anxiety', 'depression', 'crisis')"),
    },
    handler: async (params: { tag: string }): Promise<ToolResult> => {
        const tag = params?.tag;

        if (!tag?.trim()) {
            return TextResponseBuilder({ success: false, error: "Topic tag is required" });
        }

        const topic = await mentalHealthService.getTopicByTag(tag);

        if (!topic) {
            return TextResponseBuilder({
                success: false,
                error: `Topic not found: ${tag}`,
                suggestion: "Use 'list-mental-health-topics' to see available topics.",
            });
        }

        return TextResponseBuilder({
            tag: topic.tag,
            patterns: topic.patterns,
            responses: topic.responses,
            isCrisis: topic.tag === "crisis",
        });
    },
};

// Export all tools as an array for easy registration
export const mentalHealthTools = [
    analyzePatientCondition,
    getCopingStrategies,
    searchMentalHealthTopics,
    listMentalHealthTopics,
    getTopicDetails,
];