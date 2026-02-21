/**
 * Model Router - Intelligent model selection based on task type
 * Automatically selects the best model for each task
 */

import { TASK_MODEL_MAP, AI_MODELS, AIModel } from "./models";

export type TaskType =
    | "log-analysis"
    | "debugging"
    | "root-cause-analysis"
    | "code-generation"
    | "refactoring"
    | "documentation"
    | "quick-fallback"
    | "architecture"
    | "explanation"
    | "general";

export interface TaskContext {
    type: TaskType;
    complexity?: "low" | "medium" | "high";
    language?: string;
    requiresReasoning?: boolean;
    requiresSpeed?: boolean;
    logLength?: number;
}

/**
 * Select the best model for a given task type
 */
export function selectModel(taskType: TaskType): string {
    return TASK_MODEL_MAP[taskType] || TASK_MODEL_MAP["default"];
}

/**
 * Select model with context-aware intelligence
 */
export function selectModelWithContext(context: TaskContext): string {
    // High complexity or reasoning tasks -> DeepSeek R1
    if (context.complexity === "high" || context.requiresReasoning) {
        return "deepseek/deepseek-r1:free";
    }

    // Speed-critical tasks -> Mixtral (fastest)
    if (context.requiresSpeed) {
        return "mistralai/mixtral-8x7b-instruct:free";
    }

    // Language-specific selection
    if (context.language) {
        const languageModelMap: Record<string, string> = {
            "python": "mistralai/mixtral-8x7b-instruct:free",
            "javascript": "mistralai/mixtral-8x7b-instruct:free",
            "typescript": "deepseek/deepseek-chat:free",
            "java": "meta-llama/llama-3-70b-instruct:free",
            "go": "deepseek/deepseek-chat:free",
            "rust": "deepseek/deepseek-r1:free"
        };

        const preferredModel = languageModelMap[context.language.toLowerCase()];
        if (preferredModel) {
            return preferredModel;
        }
    }

    // Log length consideration
    if (context.logLength && context.logLength > 30000) {
        // For very long logs, use model with larger context
        return "deepseek/deepseek-r1:free";
    }

    // Default to task type mapping
    return selectModel(context.type);
}

/**
 * Get model info by model ID
 */
export function getModelInfo(modelId: string): AIModel | undefined {
    return AI_MODELS.find(m => m.model === modelId || m.id === modelId);
}

/**
 * Detect task type from content
 */
export function detectTaskType(content: string): TaskType {
    const lowerContent = content.toLowerCase();

    // Log analysis patterns
    if (
        lowerContent.includes("error:") ||
        lowerContent.includes("exception:") ||
        lowerContent.includes("traceback") ||
        lowerContent.includes("stack trace") ||
        lowerContent.includes("failed to") ||
        lowerContent.includes("log") && (lowerContent.includes("analyze") || lowerContent.includes("parse"))
    ) {
        return "log-analysis";
    }

    // Debugging patterns
    if (
        lowerContent.includes("debug") ||
        lowerContent.includes("fix this") ||
        lowerContent.includes("why is") ||
        lowerContent.includes("what's wrong") ||
        lowerContent.includes("not working")
    ) {
        return "debugging";
    }

    // Code generation patterns
    if (
        lowerContent.includes("generate") ||
        lowerContent.includes("create") ||
        lowerContent.includes("write code") ||
        lowerContent.includes("implement") ||
        lowerContent.includes("build a")
    ) {
        return "code-generation";
    }

    // Refactoring patterns
    if (
        lowerContent.includes("refactor") ||
        lowerContent.includes("optimize") ||
        lowerContent.includes("improve") ||
        lowerContent.includes("clean up")
    ) {
        return "refactoring";
    }

    // Documentation patterns
    if (
        lowerContent.includes("document") ||
        lowerContent.includes("explain") ||
        lowerContent.includes("describe") ||
        lowerContent.includes("what does")
    ) {
        return "documentation";
    }

    // Default
    return "general";
}

/**
 * Get recommended models for a task
 */
export function getRecommendedModels(taskType: TaskType): AIModel[] {
    const recommendedIds: string[] = [];

    switch (taskType) {
        case "log-analysis":
        case "debugging":
        case "root-cause-analysis":
            recommendedIds.push("deepseek-r1", "mixtral");
            break;
        case "code-generation":
        case "refactoring":
            recommendedIds.push("deepseek-v3", "mixtral");
            break;
        case "documentation":
        case "explanation":
            recommendedIds.push("llama-70b", "deepseek-v3");
            break;
        default:
            recommendedIds.push("deepseek-r1", "mixtral");
    }

    return recommendedIds
        .map(id => AI_MODELS.find(m => m.id === id))
        .filter((m): m is AIModel => m !== undefined);
}

export default {
    selectModel,
    selectModelWithContext,
    getModelInfo,
    detectTaskType,
    getRecommendedModels
};