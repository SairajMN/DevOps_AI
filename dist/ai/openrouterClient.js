"use strict";
/**
 * OpenRouter Client - Robust API client with retry and fallback logic
 * Handles communication with OpenRouter API for multiple LLM providers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncateLogText = truncateLogText;
exports.callLLM = callLLM;
exports.callLLMWithRetry = callLLMWithRetry;
exports.callLLMWithFallback = callLLMWithFallback;
exports.parseJSONResponse = parseJSONResponse;
exports.healthCheck = healthCheck;
const axios_1 = __importDefault(require("axios"));
const models_1 = require("./models");
// Configuration
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
/**
 * Get API key from environment
 */
function getApiKey() {
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
function truncateLogText(text, maxBytes = 40000) {
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
async function callLLM(options) {
    const apiKey = getApiKey();
    try {
        const response = await axios_1.default.post(OPENROUTER_API_URL, {
            model: options.model,
            messages: options.messages,
            temperature: options.temperature ?? 0,
            max_tokens: options.max_tokens,
            top_p: options.top_p,
            stream: options.stream ?? false
        }, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
                "X-Title": "DevOps AI Log Analyzer"
            },
            timeout: options.max_tokens ? DEFAULT_TIMEOUT + (options.max_tokens * 10) : DEFAULT_TIMEOUT
        });
        const choice = response.data.choices[0];
        return {
            content: choice.message.content,
            model: response.data.model || options.model,
            usage: response.data.usage,
            finish_reason: choice.finish_reason
        };
    }
    catch (error) {
        const axiosError = error;
        const errorMessage = axiosError.response?.data?.message
            || axiosError.message
            || "Unknown error occurred";
        const errorDetails = {
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
async function callLLMWithRetry(options, maxRetries = MAX_RETRIES) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[OpenRouter] Attempt ${attempt}/${maxRetries} with model ${options.model}`);
            return await callLLM(options);
        }
        catch (error) {
            lastError = error;
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
async function callLLMWithFallback(options, taskType = "default") {
    const fallbackChain = models_1.FALLBACK_CHAIN[taskType] || models_1.FALLBACK_CHAIN["default"];
    // If model is specified, use it first then fallback
    const modelsToTry = options.model
        ? [options.model, ...fallbackChain.filter(m => m !== options.model)]
        : fallbackChain;
    let lastError = null;
    for (const model of modelsToTry) {
        try {
            console.log(`[OpenRouter] Trying model: ${model}`);
            const result = await callLLMWithRetry({
                ...options,
                model
            });
            console.log(`[OpenRouter] Success with model: ${model}`);
            return result;
        }
        catch (error) {
            lastError = error;
            console.warn(`[OpenRouter] Model ${model} failed, trying next fallback...`);
        }
    }
    throw new Error(`All models failed for task type: ${taskType}. Last error: ${lastError?.message}`);
}
/**
 * Validate JSON response from LLM
 */
function parseJSONResponse(content) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    }
    catch (error) {
        console.error("[OpenRouter] Failed to parse JSON response:", error);
        return null;
    }
}
/**
 * Health check for OpenRouter API
 */
async function healthCheck() {
    try {
        const apiKey = getApiKey();
        const response = await axios_1.default.get("https://openrouter.ai/api/v1/models", {
            headers: {
                "Authorization": `Bearer ${apiKey}`
            },
            timeout: 10000
        });
        return response.status === 200;
    }
    catch (error) {
        console.error("[OpenRouter] Health check failed:", error);
        return false;
    }
}
// Export default client
exports.default = {
    callLLM,
    callLLMWithRetry,
    callLLMWithFallback,
    parseJSONResponse,
    truncateLogText,
    healthCheck
};
//# sourceMappingURL=openrouterClient.js.map