/**
 * AI Model Registry - Central configuration for all available models
 * Free-tier models available through OpenRouter
 */
export interface AIModel {
    id: string;
    name: string;
    model: string;
    description: string;
    strengths: string[];
    maxTokens?: number;
    taskTypes: string[];
}
export declare const AI_MODELS: AIModel[];
/**
 * Task type to model mapping for automatic selection
 */
export declare const TASK_MODEL_MAP: Record<string, string>;
/**
 * Fallback chain for reliability
 */
export declare const FALLBACK_CHAIN: Record<string, string[]>;
/**
 * Get model by ID
 */
export declare function getModelById(id: string): AIModel | undefined;
/**
 * Get all available models
 */
export declare function getAllModels(): AIModel[];
/**
 * Get models by task type
 */
export declare function getModelsByTaskType(taskType: string): AIModel[];
//# sourceMappingURL=models.d.ts.map