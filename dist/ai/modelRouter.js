"use strict";
/**
 * Model Router - Intelligent model selection based on task type
 * Automatically selects the best model for each task
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectModel = selectModel;
exports.selectModelWithContext = selectModelWithContext;
exports.getModelInfo = getModelInfo;
exports.detectTaskType = detectTaskType;
exports.getRecommendedModels = getRecommendedModels;
const models_1 = require("./models");
/**
 * Select the best model for a given task type
 */
function selectModel(taskType) {
    return models_1.TASK_MODEL_MAP[taskType] || models_1.TASK_MODEL_MAP["default"];
}
/**
 * Select model with context-aware intelligence
 */
function selectModelWithContext(context) {
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
        const languageModelMap = {
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
function getModelInfo(modelId) {
    return models_1.AI_MODELS.find(m => m.model === modelId || m.id === modelId);
}
/**
 * Detect task type from content
 */
function detectTaskType(content) {
    const lowerContent = content.toLowerCase();
    // Log analysis patterns
    if (lowerContent.includes("error:") ||
        lowerContent.includes("exception:") ||
        lowerContent.includes("traceback") ||
        lowerContent.includes("stack trace") ||
        lowerContent.includes("failed to") ||
        lowerContent.includes("log") && (lowerContent.includes("analyze") || lowerContent.includes("parse"))) {
        return "log-analysis";
    }
    // Debugging patterns
    if (lowerContent.includes("debug") ||
        lowerContent.includes("fix this") ||
        lowerContent.includes("why is") ||
        lowerContent.includes("what's wrong") ||
        lowerContent.includes("not working")) {
        return "debugging";
    }
    // Code generation patterns
    if (lowerContent.includes("generate") ||
        lowerContent.includes("create") ||
        lowerContent.includes("write code") ||
        lowerContent.includes("implement") ||
        lowerContent.includes("build a")) {
        return "code-generation";
    }
    // Refactoring patterns
    if (lowerContent.includes("refactor") ||
        lowerContent.includes("optimize") ||
        lowerContent.includes("improve") ||
        lowerContent.includes("clean up")) {
        return "refactoring";
    }
    // Documentation patterns
    if (lowerContent.includes("document") ||
        lowerContent.includes("explain") ||
        lowerContent.includes("describe") ||
        lowerContent.includes("what does")) {
        return "documentation";
    }
    // Default
    return "general";
}
/**
 * Get recommended models for a task
 */
function getRecommendedModels(taskType) {
    const recommendedIds = [];
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
        .map(id => models_1.AI_MODELS.find(m => m.id === id))
        .filter((m) => m !== undefined);
}
exports.default = {
    selectModel,
    selectModelWithContext,
    getModelInfo,
    detectTaskType,
    getRecommendedModels
};
//# sourceMappingURL=modelRouter.js.map