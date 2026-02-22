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
  isFree: boolean;
  contextLength?: number;
  provider?: string;
}

export const AI_MODELS: AIModel[] = [
  // ==================== DEEPSEEK MODELS ====================
  {
    id: "deepseek-r1",
    name: "DeepSeek R1 (Reasoning)",
    model: "deepseek/deepseek-r1",
    description:
      "Best for reasoning-heavy coding, debugging, and multi-step architecture thinking",
    strengths: [
      "logical-reasoning",
      "debugging",
      "multi-step-thinking",
      "structured-outputs",
    ],
    maxTokens: 8192,
    taskTypes: [
      "log-analysis",
      "debugging",
      "root-cause-analysis",
      "architecture",
    ],
    isFree: true,
    contextLength: 64000,
    provider: "DeepSeek",
  },
  {
    id: "deepseek-r1-free",
    name: "DeepSeek R1 (Free)",
    model: "deepseek/deepseek-r1:free",
    description: "Free tier of DeepSeek R1 - excellent reasoning and coding",
    strengths: ["reasoning", "coding", "debugging", "math"],
    maxTokens: 8192,
    taskTypes: ["log-analysis", "debugging", "code-generation"],
    isFree: true,
    contextLength: 64000,
    provider: "DeepSeek",
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3 (Balanced)",
    model: "deepseek/deepseek-chat",
    description:
      "Fast, good general coding, works well for refactoring & autocomplete",
    strengths: ["fast", "coding", "refactoring", "autocomplete"],
    maxTokens: 8192,
    taskTypes: ["code-generation", "refactoring", "autocomplete", "quick-fix"],
    isFree: true,
    contextLength: 64000,
    provider: "DeepSeek",
  },

  // ==================== META LLAMA MODELS ====================
  {
    id: "llama-3.3-70b-free",
    name: "Llama 3.3 70B (Free)",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    description:
      "Powerful 70B model - excellent for complex reasoning and coding",
    strengths: [
      "reasoning",
      "coding",
      "general-purpose",
      "instruction-following",
    ],
    maxTokens: 4096,
    taskTypes: ["log-analysis", "code-generation", "debugging", "general"],
    isFree: true,
    contextLength: 131072,
    provider: "Meta",
  },
  {
    id: "llama-3.2-3b-free",
    name: "Llama 3.2 3B (Free)",
    model: "meta-llama/llama-3.2-3b-instruct:free",
    description: "Lightweight and fast - great for quick tasks",
    strengths: ["fast", "lightweight", "quick-tasks"],
    maxTokens: 2048,
    taskTypes: ["quick-fix", "autocomplete", "simple-tasks"],
    isFree: true,
    contextLength: 131072,
    provider: "Meta",
  },
  {
    id: "llama-3.1-8b-free",
    name: "Llama 3.1 8B (Free)",
    model: "meta-llama/llama-3.1-8b-instruct:free",
    description:
      "Stable responses, good documentation generation, mid-sized tasks",
    strengths: ["stable", "documentation", "general-purpose"],
    maxTokens: 4096,
    taskTypes: ["documentation", "explanation", "general"],
    isFree: true,
    contextLength: 131072,
    provider: "Meta",
  },

  // ==================== MISTRAL MODELS ====================
  {
    id: "mistral-7b-free",
    name: "Mistral 7B (Free)",
    model: "mistralai/mistral-7b-instruct:free",
    description: "Good Python + JS, lightweight, reliable fallback",
    strengths: ["python", "javascript", "lightweight", "reliable"],
    maxTokens: 4096,
    taskTypes: ["quick-fallback", "python", "javascript", "autocomplete"],
    isFree: true,
    contextLength: 32768,
    provider: "Mistral",
  },
  {
    id: "mistral-small-3.1",
    name: "Mistral Small 3.1 (Free)",
    model: "mistralai/mistral-small-3.1-24b-instruct:free",
    description: "Newer Mistral model with improved capabilities",
    strengths: ["coding", "reasoning", "multilingual"],
    maxTokens: 4096,
    taskTypes: ["code-generation", "debugging", "general"],
    isFree: true,
    contextLength: 128000,
    provider: "Mistral",
  },

  // ==================== QWEN MODELS ====================
  {
    id: "qwen-2.5-7b-free",
    name: "Qwen 2.5 7B (Free)",
    model: "qwen/qwen-2.5-7b-instruct:free",
    description: "Strong coding and reasoning capabilities",
    strengths: ["coding", "reasoning", "general-purpose"],
    maxTokens: 4096,
    taskTypes: ["code-generation", "debugging", "general"],
    isFree: true,
    contextLength: 32768,
    provider: "Qwen",
  },
  {
    id: "qwen-2.5-coder-32b-free",
    name: "Qwen 2.5 Coder 32B (Free)",
    model: "qwen/qwen-2.5-coder-32b-instruct:free",
    description: "Specialized for coding tasks - excellent for code generation",
    strengths: ["coding", "code-generation", "debugging", "refactoring"],
    maxTokens: 8192,
    taskTypes: ["code-generation", "debugging", "refactoring", "code-review"],
    isFree: true,
    contextLength: 32768,
    provider: "Qwen",
  },

  // ==================== GOOGLE GEMINI MODELS ====================
  {
    id: "gemini-flash-1.5-free",
    name: "Gemini Flash 1.5 (Free)",
    model: "google/gemini-flash-1.5-8b",
    description: "Fast and efficient for general tasks",
    strengths: ["fast", "general-purpose", "multimodal"],
    maxTokens: 8192,
    taskTypes: ["general", "quick-fallback", "documentation"],
    isFree: true,
    contextLength: 1000000,
    provider: "Google",
  },
  {
    id: "gemini-2.0-flash-free",
    name: "Gemini 2.0 Flash (Free)",
    model: "google/gemini-2.0-flash-exp:free",
    description: "Latest Gemini model with improved capabilities",
    strengths: ["fast", "reasoning", "multimodal", "coding"],
    maxTokens: 8192,
    taskTypes: ["general", "coding", "reasoning", "multimodal"],
    isFree: true,
    contextLength: 1000000,
    provider: "Google",
  },

  // ==================== OTHER FREE MODELS ====================
  {
    id: "phi-4-free",
    name: "Phi-4 (Free)",
    model: "microsoft/phi-4:free",
    description: "Microsoft's compact but powerful model",
    strengths: ["reasoning", "math", "coding", "compact"],
    maxTokens: 4096,
    taskTypes: ["reasoning", "coding", "math"],
    isFree: true,
    contextLength: 16384,
    provider: "Microsoft",
  },
  {
    id: "gemma-3-1b-free",
    name: "Gemma 3 1B (Free)",
    model: "google/gemma-3-1b-it:free",
    description: "Ultra-lightweight model for simple tasks",
    strengths: ["ultra-fast", "lightweight", "simple-tasks"],
    maxTokens: 2048,
    taskTypes: ["simple-tasks", "quick-fix"],
    isFree: true,
    contextLength: 32768,
    provider: "Google",
  },
  {
    id: "claude-3-haiku-free",
    name: "Claude 3 Haiku (Free)",
    model: "anthropic/claude-3-haiku",
    description: "Fast and efficient Claude model",
    strengths: ["fast", "reasoning", "coding", "safe"],
    maxTokens: 4096,
    taskTypes: ["general", "coding", "quick-tasks"],
    isFree: true,
    contextLength: 200000,
    provider: "Anthropic",
  },
  {
    id: "nous-hermes-free",
    name: "Nous Hermes 2 (Free)",
    model: "nousresearch/nous-hermes-2-mixtral-8x7b-dpo:free",
    description: "Fine-tuned Mixtral with excellent instruction following",
    strengths: ["instruction-following", "coding", "creative"],
    maxTokens: 4096,
    taskTypes: ["general", "coding", "creative"],
    isFree: true,
    contextLength: 32768,
    provider: "Nous Research",
  },
  {
    id: "yi-1.5-34b-free",
    name: "Yi 1.5 34B (Free)",
    model: "01-ai/yi-1.5-34b-chat:free",
    description: "Large model with strong bilingual capabilities",
    strengths: ["bilingual", "reasoning", "general-purpose"],
    maxTokens: 4096,
    taskTypes: ["general", "reasoning", "multilingual"],
    isFree: true,
    contextLength: 16384,
    provider: "01.AI",
  },
  {
    id: "solar-10.7b-free",
    name: "Solar 10.7B (Free)",
    model: "upstage/solar-10.7b-instruct:free",
    description: "Well-rounded model for various tasks",
    strengths: ["general-purpose", "instruction-following"],
    maxTokens: 4096,
    taskTypes: ["general", "instruction-following"],
    isFree: true,
    contextLength: 4096,
    provider: "Upstage",
  },
];

/**
 * Task type to model mapping for automatic selection
 * Updated to use currently available free models on OpenRouter
 */
export const TASK_MODEL_MAP: Record<string, string> = {
  "log-analysis": "deepseek/deepseek-chat",
  debugging: "deepseek/deepseek-chat",
  "root-cause-analysis": "deepseek/deepseek-chat",
  "code-generation": "deepseek/deepseek-chat",
  refactoring: "deepseek/deepseek-chat",
  documentation: "meta-llama/llama-3.1-8b-instruct:free",
  "quick-fallback": "google/gemini-2.0-flash-exp:free",
  general: "deepseek/deepseek-chat",
  default: "deepseek/deepseek-chat",
};

/**
 * Fallback chain for reliability
 * Updated to use currently available free models on OpenRouter
 */
export const FALLBACK_CHAIN: Record<string, string[]> = {
  "log-analysis": [
    "deepseek/deepseek-chat",
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.1-8b-instruct:free",
  ],
  "code-generation": [
    "deepseek/deepseek-chat",
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.1-8b-instruct:free",
  ],
  default: [
    "deepseek/deepseek-chat",
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.1-8b-instruct:free",
  ],
};

/**
 * Get model by ID
 */
export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

/**
 * Get all available models
 */
export function getAllModels(): AIModel[] {
  return AI_MODELS;
}

/**
 * Get all free models
 */
export function getFreeModels(): AIModel[] {
  return AI_MODELS.filter((m) => m.isFree);
}

/**
 * Get models by task type
 */
export function getModelsByTaskType(taskType: string): AIModel[] {
  return AI_MODELS.filter((m) => m.taskTypes.includes(taskType));
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: string): AIModel[] {
  return AI_MODELS.filter((m) => m.provider === provider);
}

/**
 * Get all providers
 */
export function getProviders(): string[] {
  return [
    ...new Set(AI_MODELS.map((m) => m.provider).filter(Boolean)),
  ] as string[];
}
