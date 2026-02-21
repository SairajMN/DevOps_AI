/**
 * OpenRouter Client - Robust API client with retry and fallback logic
 * Handles communication with OpenRouter API for multiple LLM providers
 */
export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
export interface LLMResponse {
    content: string;
    model: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    finish_reason?: string;
}
export interface LLMRequestOptions {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stream?: boolean;
}
export interface OpenRouterError {
    message: string;
    type: string;
    code?: number;
    details?: unknown;
}
/**
 * Truncate log text to prevent token limit issues
 * @param text - Text to truncate
 * @param maxBytes - Maximum bytes (default 40KB)
 */
export declare function truncateLogText(text: string, maxBytes?: number): string;
/**
 * Call OpenRouter API with a single model
 */
export declare function callLLM(options: LLMRequestOptions): Promise<LLMResponse>;
/**
 * Call LLM with retry logic
 */
export declare function callLLMWithRetry(options: LLMRequestOptions, maxRetries?: number): Promise<LLMResponse>;
/**
 * Call LLM with fallback chain
 * Tries models in order until one succeeds
 */
export declare function callLLMWithFallback(options: LLMRequestOptions, taskType?: string): Promise<LLMResponse>;
/**
 * Validate JSON response from LLM
 */
export declare function parseJSONResponse<T>(content: string): T | null;
/**
 * Health check for OpenRouter API
 */
export declare function healthCheck(): Promise<boolean>;
declare const _default: {
    callLLM: typeof callLLM;
    callLLMWithRetry: typeof callLLMWithRetry;
    callLLMWithFallback: typeof callLLMWithFallback;
    parseJSONResponse: typeof parseJSONResponse;
    truncateLogText: typeof truncateLogText;
    healthCheck: typeof healthCheck;
};
export default _default;
//# sourceMappingURL=openrouterClient.d.ts.map