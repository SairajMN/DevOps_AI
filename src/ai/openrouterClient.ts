/**
 * OpenRouter Client - Robust API client with retry and fallback logic
 * Handles communication with OpenRouter API for multiple LLM providers
 */

import axios, { AxiosError } from "axios";
import { FALLBACK_CHAIN } from "./models";

// Types
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

// Configuration
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Get API key from environment
 */
function getApiKey(): string {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }
    return apiKey;
}

/**
 * Truncate log text to prevent token limit issues
 * @param text - Text to truncate
 * @param maxBytes - Maximum bytes (default 40KB)
 */
export function truncateLogText(text: string, maxBytes: number = 40000): string {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);

    if (encoded.length <= maxBytes) {
        return text;
    }

    // Truncate and add indicator
    const truncated = text.slice(0, maxBytes);
    return truncated + "\n\n[... LOG TRUNCATED DUE TO SIZE ...]";
}

/**
 * Call OpenRouter API with a single model
 */
export async function callLLM(options: LLMRequestOptions): Promise<LLMResponse> {
    const apiKey = getApiKey();

    try {
        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: options.model,
                messages: options.messages,
                temperature: options.temperature ?? 0,
                max_tokens: options.max_tokens,
                top_p: options.top_p,
                stream: options.stream ?? false
            },
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
                    "X-Title": "DevOps AI Log Analyzer"
                },
                timeout: options.max_tokens ? DEFAULT_TIMEOUT + (options.max_tokens * 10) : DEFAULT_TIMEOUT
            }
        );

        const choice = response.data.choices[0];

        return {
            content: choice.message.content,
            model: response.data.model || options.model,
            usage: response.data.usage,
            finish_reason: choice.finish_reason
        };
    } catch (error) {
        const axiosError = error as AxiosError<OpenRouterError>;

        const errorMessage = axiosError.response?.data?.message
            || axiosError.message
            || "Unknown error occurred";

        const errorDetails: OpenRouterError = {
            message: errorMessage,
            type: axiosError.response?.data?.type || "api_error",
            code: axiosError.response?.status,
            details: axiosError.response?.data
        };

        console.error(`[OpenRouter] Error calling ${options.model}:`, errorDetails);
        throw errorDetails;
    }
}

/**
 * Call LLM with retry logic
 */
export async function callLLMWithRetry(
    options: LLMRequestOptions,
    maxRetries: number = MAX_RETRIES
): Promise<LLMResponse> {
    let lastError: OpenRouterError | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[OpenRouter] Attempt ${attempt}/${maxRetries} with model ${options.model}`);
            return await callLLM(options);
        } catch (error) {
            lastError = error as OpenRouterError;

            // Don't retry on certain errors
            if (lastError.code === 400 || lastError.code === 401) {
                throw lastError;
            }

            // Wait before retrying
            if (attempt < maxRetries) {
                const delay = RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
                console.log(`[OpenRouter] Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Call LLM with fallback chain
 * Tries models in order until one succeeds
 */
export async function callLLMWithFallback(
    options: LLMRequestOptions,
    taskType: string = "default"
): Promise<LLMResponse> {
    const fallbackChain = FALLBACK_CHAIN[taskType] || FALLBACK_CHAIN["default"];

    // If model is specified, use it first then fallback
    const modelsToTry = options.model
        ? [options.model, ...fallbackChain.filter(m => m !== options.model)]
        : fallbackChain;

    let lastError: OpenRouterError | null = null;

    for (const model of modelsToTry) {
        try {
            console.log(`[OpenRouter] Trying model: ${model}`);
            const result = await callLLMWithRetry({
                ...options,
                model
            });

            console.log(`[OpenRouter] Success with model: ${model}`);
            return result;
        } catch (error) {
            lastError = error as OpenRouterError;
            console.warn(`[OpenRouter] Model ${model} failed, trying next fallback...`);
        }
    }

    throw new Error(`All models failed for task type: ${taskType}. Last error: ${lastError?.message}`);
}

/**
 * Validate JSON response from LLM
 */
export function parseJSONResponse<T>(content: string): T | null {
    try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as T;
        }
        return null;
    } catch (error) {
        console.error("[OpenRouter] Failed to parse JSON response:", error);
        return null;
    }
}

/**
 * Health check for OpenRouter API
 */
export async function healthCheck(): Promise<boolean> {
    try {
        const apiKey = getApiKey();

        const response = await axios.get("https://openrouter.ai/api/v1/models", {
            headers: {
                "Authorization": `Bearer ${apiKey}`
            },
            timeout: 10000
        });

        return response.status === 200;
    } catch (error) {
        console.error("[OpenRouter] Health check failed:", error);
        return false;
    }
}

// Export default client
export default {
    callLLM,
    callLLMWithRetry,
    callLLMWithFallback,
    parseJSONResponse,
    truncateLogText,
    healthCheck
};