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

export const AI_MODELS: AIModel[] = [
    {
        id: "deepseek-r1",
        name: "DeepSeek R1 (Reasoning)",
        model: "deepseek/deepseek-r1",
        description: "Best for reasoning-heavy coding, debugging, and multi-step architecture thinking",
        strengths: ["logical-reasoning", "debugging", "multi-step-thinking", "structured-outputs"],
        maxTokens: 8192,
        taskTypes: ["log-analysis", "debugging", "root-cause-analysis", "architecture"]
    },
    {
        id: "deepseek-v3",
        name: "DeepSeek V3 (Balanced)",
        model: "deepseek/deepseek-chat",
        description: "Fast, good general coding, works well for refactoring & autocomplete",
        strengths: ["fast", "coding", "refactoring", "autocomplete"],
        maxTokens: 8192,
        taskTypes: ["code-generation", "refactoring", "autocomplete", "quick-fix"]
    },
    {
        id: "llama-70b",
        name: "Llama 3.1 8B",
        model: "meta-llama/llama-3.1-8b-instruct:free",
        description: "Stable responses, good documentation generation, mid-sized tasks",
        strengths: ["stable", "documentation", "general-purpose"],
        maxTokens: 4096,
        taskTypes: ["documentation", "explanation", "general"]
    },
    {
        id: "mixtral",
        name: "Mistral 7B",
        model: "mistralai/mistral-7b-instruct:free",
        description: "Good Python + JS, lightweight, reliable fallback",
        strengths: ["python", "javascript", "lightweight", "reliable"],
        maxTokens: 4096,
        taskTypes: ["quick-fallback", "python", "javascript", "autocomplete"]
    },
    {
        id: "qwen",
        name: "Qwen 2.5 7B",
        model: "qwen/qwen-2.5-7b-instruct:free",
        description: "Strong coding and reasoning capabilities",
        strengths: ["coding", "reasoning", "general-purpose"],
        maxTokens: 4096,
        taskTypes: ["code-generation", "debugging", "general"]
    },
    {
        id: "gemini-flash",
        name: "Gemini Flash 1.5",
        model: "google/gemini-flash-1.5",
        description: "Fast and efficient for general tasks",
        strengths: ["fast", "general-purpose", "multimodal"],
        maxTokens: 8192,
        taskTypes: ["general", "quick-fallback", "documentation"]
    }
];

/**
 * Task type to model mapping for automatic selection
 */
export const TASK_MODEL_MAP: Record<string, string> = {
    "log-analysis": "deepseek/deepseek-r1",
    "debugging": "deepseek/deepseek-r1",
    "root-cause-analysis": "deepseek/deepseek-r1",
    "code-generation": "deepseek/deepseek-chat",
    "refactoring": "deepseek/deepseek-chat",
    "documentation": "meta-llama/llama-3.1-8b-instruct:free",
    "quick-fallback": "mistralai/mistral-7b-instruct:free",
    "default": "deepseek/deepseek-r1"
};

/**
 * Fallback chain for reliability
 */
export const FALLBACK_CHAIN: Record<string, string[]> = {
    "log-analysis": [
        "deepseek/deepseek-r1",
        "qwen/qwen-2.5-7b-instruct:free",
        "meta-llama/llama-3.1-8b-instruct:free"
    ],
    "code-generation": [
        "deepseek/deepseek-chat",
        "qwen/qwen-2.5-7b-instruct:free",
        "mistralai/mistral-7b-instruct:free"
    ],
    "default": [
        "deepseek/deepseek-r1",
        "qwen/qwen-2.5-7b-instruct:free",
        "mistralai/mistral-7b-instruct:free"
    ]
};

/**
 * Get model by ID
 */
export function getModelById(id: string): AIModel | undefined {
    return AI_MODELS.find(m => m.id === id);
}

/**
 * Get all available models
 */
export function getAllModels(): AIModel[] {
    return AI_MODELS;
}

/**
 * Get models by task type
 */
export function getModelsByTaskType(taskType: string): AIModel[] {
    return AI_MODELS.filter(m => m.taskTypes.includes(taskType));
}