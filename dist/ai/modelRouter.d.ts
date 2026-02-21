/**
 * Model Router - Intelligent model selection based on task type
 * Automatically selects the best model for each task
 */
import { AIModel } from "./models";
export type TaskType = "log-analysis" | "debugging" | "root-cause-analysis" | "code-generation" | "refactoring" | "documentation" | "quick-fallback" | "architecture" | "explanation" | "general";
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
export declare function selectModel(taskType: TaskType): string;
/**
 * Select model with context-aware intelligence
 */
export declare function selectModelWithContext(context: TaskContext): string;
/**
 * Get model info by model ID
 */
export declare function getModelInfo(modelId: string): AIModel | undefined;
/**
 * Detect task type from content
 */
export declare function detectTaskType(content: string): TaskType;
/**
 * Get recommended models for a task
 */
export declare function getRecommendedModels(taskType: TaskType): AIModel[];
declare const _default: {
    selectModel: typeof selectModel;
    selectModelWithContext: typeof selectModelWithContext;
    getModelInfo: typeof getModelInfo;
    detectTaskType: typeof detectTaskType;
    getRecommendedModels: typeof getRecommendedModels;
};
export default _default;
//# sourceMappingURL=modelRouter.d.ts.map