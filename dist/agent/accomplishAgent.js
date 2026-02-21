"use strict";
/**
 * Accomplish AI Agent - Primary AI orchestration layer
 * Uses @accomplish_ai/agent-core as primary with OpenRouter fallback
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAccomplishAIAvailable = isAccomplishAIAvailable;
exports.runLogWorkflow = runLogWorkflow;
exports.runCodeFixWorkflow = runCodeFixWorkflow;
exports.runMultiStepWorkflow = runMultiStepWorkflow;
exports.runBatchAnalysis = runBatchAnalysis;
exports.getAgentHealth = getAgentHealth;
const agent_core_1 = require("@accomplish_ai/agent-core");
const openrouterClient_1 = require("../ai/openrouterClient");
const modelRouter_1 = require("../ai/modelRouter");
const prompts_1 = require("./prompts");
// ============================================================================
// Accomplish AI Manager (Singleton)
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let taskManager = null;
let accomplishAIEnabled = false;
/**
 * Initialize Accomplish AI Task Manager
 */
async function initAccomplishAI() {
    if (taskManager) {
        return taskManager;
    }
    try {
        console.log("[AccomplishAI] Initializing...");
        // Build provider configs - use OpenAI if available
        // Cast to any to bypass type checking since API matches test file
        const buildConfig = agent_core_1.buildProviderConfigs;
        const providersResult = await buildConfig({
            enableOpenAi: !!process.env.OPENAI_API_KEY
        });
        // Create task manager with providers
        const createManager = agent_core_1.createTaskManager;
        taskManager = createManager({
            providers: providersResult.providers,
            model: process.env.DEFAULT_MODEL || agent_core_1.DEFAULT_MODEL
        });
        accomplishAIEnabled = true;
        console.log("[AccomplishAI] Initialized successfully");
        return taskManager;
    }
    catch (error) {
        console.error("[AccomplishAI] Initialization failed:", error);
        accomplishAIEnabled = false;
        return null;
    }
}
/**
 * Check if Accomplish AI is available
 */
async function isAccomplishAIAvailable() {
    if (accomplishAIEnabled && taskManager) {
        return true;
    }
    const tm = await initAccomplishAI();
    return tm !== null;
}
// ============================================================================
// Log Analysis Workflow
// ============================================================================
/**
 * Run log analysis using Accomplish AI (primary) or OpenRouter (fallback)
 */
async function runLogWorkflow(logText, options = {}) {
    const opts = {
        preferAccomplishAI: true,
        ...options
    };
    const startTime = Date.now();
    let attempts = 0;
    // Truncate log if too large
    const truncatedLog = (0, openrouterClient_1.truncateLogText)(logText);
    // Determine task type and model
    const taskType = opts.taskType || (0, modelRouter_1.detectTaskType)(truncatedLog) || "log-analysis";
    const model = opts.modelId || (0, modelRouter_1.selectModel)(taskType);
    console.log(`[Agent] Starting log analysis workflow`);
    console.log(`[Agent] Task type: ${taskType}`);
    console.log(`[Agent] Model: ${model}`);
    console.log(`[Agent] Prefer Accomplish AI: ${opts.preferAccomplishAI}`);
    // Try Accomplish AI first (if preferred)
    if (opts.preferAccomplishAI) {
        try {
            const tm = await initAccomplishAI();
            if (tm) {
                console.log("[AccomplishAI] Running log analysis...");
                attempts++;
                const messages = opts.useEnhancedPrompt
                    ? (0, prompts_1.buildEnhancedLogPrompt)(truncatedLog)
                    : (0, prompts_1.buildLogPrompt)(truncatedLog);
                // Use Accomplish AI task manager
                const result = await tm.runTask({
                    input: messages.map((m) => m.content).join("\n\n")
                });
                if (result && result.output) {
                    const analysis = (0, openrouterClient_1.parseJSONResponse)(result.output);
                    if (analysis) {
                        console.log("[AccomplishAI] Analysis successful");
                        return {
                            success: true,
                            data: analysis,
                            model: result.model || model,
                            attempts,
                            duration: Date.now() - startTime,
                            source: "accomplish-ai"
                        };
                    }
                }
            }
        }
        catch (error) {
            console.warn("[AccomplishAI] Analysis failed, falling back to OpenRouter:", error);
        }
    }
    // Fallback to OpenRouter
    console.log("[OpenRouter] Running log analysis...");
    attempts++;
    try {
        const messages = opts.useEnhancedPrompt
            ? (0, prompts_1.buildEnhancedLogPrompt)(truncatedLog)
            : (0, prompts_1.buildLogPrompt)(truncatedLog);
        const response = await (0, openrouterClient_1.callLLMWithFallback)({
            model,
            messages,
            temperature: 0,
            max_tokens: 4096
        }, taskType);
        const analysis = (0, openrouterClient_1.parseJSONResponse)(response.content);
        if (!analysis) {
            throw new Error("Failed to parse LLM response as JSON");
        }
        // Check confidence threshold
        if (analysis.confidence < (opts.confidenceThreshold || 70)) {
            console.log(`[OpenRouter] Low confidence (${analysis.confidence}), running reflection...`);
            const reflectionMessages = (0, prompts_1.buildReflectionPrompt)(truncatedLog, JSON.stringify(analysis));
            const reflectionResponse = await (0, openrouterClient_1.callLLMWithFallback)({
                model,
                messages: reflectionMessages,
                temperature: 0,
                max_tokens: 4096
            }, taskType);
            const improvedAnalysis = (0, openrouterClient_1.parseJSONResponse)(reflectionResponse.content);
            if (improvedAnalysis && improvedAnalysis.confidence > analysis.confidence) {
                console.log(`[OpenRouter] Reflection improved confidence to ${improvedAnalysis.confidence}`);
                return {
                    success: true,
                    data: improvedAnalysis,
                    model: reflectionResponse.model,
                    attempts: attempts + 1,
                    duration: Date.now() - startTime,
                    source: "openrouter"
                };
            }
        }
        return {
            success: true,
            data: analysis,
            model: response.model,
            attempts,
            duration: Date.now() - startTime,
            source: "openrouter"
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Agent] Workflow failed: ${errorMsg}`);
        return {
            success: false,
            error: errorMsg,
            model,
            attempts,
            duration: Date.now() - startTime,
            source: "openrouter"
        };
    }
}
// ============================================================================
// Code Fix Workflow
// ============================================================================
/**
 * Run code fix workflow
 */
async function runCodeFixWorkflow(code, errorMessage, language = "python", options = {}) {
    const startTime = Date.now();
    let attempts = 0;
    const taskType = "code-generation";
    const model = options.modelId || (0, modelRouter_1.selectModel)(taskType);
    console.log(`[Agent] Starting code fix workflow`);
    console.log(`[Agent] Language: ${language}`);
    console.log(`[Agent] Model: ${model}`);
    // Try Accomplish AI first
    if (options.preferAccomplishAI !== false) {
        try {
            const tm = await initAccomplishAI();
            if (tm) {
                console.log("[AccomplishAI] Running code fix...");
                attempts++;
                const messages = (0, prompts_1.buildCodeFixPrompt)(code, errorMessage, language);
                const result = await tm.runTask({
                    input: messages.map((m) => m.content).join("\n\n")
                });
                if (result && result.output) {
                    const fixResult = (0, openrouterClient_1.parseJSONResponse)(result.output);
                    if (fixResult) {
                        return {
                            success: true,
                            data: fixResult,
                            model: result.model || model,
                            attempts,
                            duration: Date.now() - startTime,
                            source: "accomplish-ai"
                        };
                    }
                }
            }
        }
        catch (error) {
            console.warn("[AccomplishAI] Code fix failed, falling back to OpenRouter:", error);
        }
    }
    // Fallback to OpenRouter
    console.log("[OpenRouter] Running code fix...");
    attempts++;
    try {
        const messages = (0, prompts_1.buildCodeFixPrompt)(code, errorMessage, language);
        const response = await (0, openrouterClient_1.callLLMWithFallback)({
            model,
            messages,
            temperature: 0,
            max_tokens: 4096
        }, taskType);
        const fixResult = (0, openrouterClient_1.parseJSONResponse)(response.content);
        if (!fixResult) {
            throw new Error("Failed to parse code fix response as JSON");
        }
        return {
            success: true,
            data: fixResult,
            model: response.model,
            attempts,
            duration: Date.now() - startTime,
            source: "openrouter"
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Agent] Code fix workflow failed: ${errorMsg}`);
        return {
            success: false,
            error: errorMsg,
            model,
            attempts,
            duration: Date.now() - startTime,
            source: "openrouter"
        };
    }
}
/**
 * Run comprehensive multi-step analysis
 */
async function runMultiStepWorkflow(logText, code, language = "python") {
    const startTime = Date.now();
    console.log(`[Agent] Starting multi-step workflow`);
    try {
        // Step 1: Analyze log
        const analysisResult = await runLogWorkflow(logText, {
            useEnhancedPrompt: true,
            preferAccomplishAI: true
        });
        if (!analysisResult.success || !analysisResult.data) {
            throw new Error(analysisResult.error || "Log analysis failed");
        }
        const result = {
            analysis: analysisResult.data
        };
        // Step 2: Generate code fix if code is provided and it's a code issue
        if (code && analysisResult.data.is_code_issue) {
            const fixResult = await runCodeFixWorkflow(code, analysisResult.data.root_cause, language, { preferAccomplishAI: true });
            if (fixResult.success && fixResult.data) {
                result.fix = fixResult.data;
            }
        }
        // Step 3: Classification
        result.classification = {
            category: analysisResult.data.error_category,
            priority: analysisResult.data.severity === "critical" ? "p0" :
                analysisResult.data.severity === "high" ? "p1" :
                    analysisResult.data.severity === "medium" ? "p2" : "p3",
            tags: analysisResult.data.related_errors
        };
        return {
            success: true,
            data: result,
            model: analysisResult.model,
            attempts: analysisResult.attempts,
            duration: Date.now() - startTime,
            source: analysisResult.source
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Agent] Multi-step workflow failed: ${errorMsg}`);
        return {
            success: false,
            error: errorMsg,
            model: "unknown",
            attempts: 1,
            duration: Date.now() - startTime,
            source: "openrouter"
        };
    }
}
// ============================================================================
// Batch Processing
// ============================================================================
/**
 * Process multiple logs in batch
 */
async function runBatchAnalysis(logs, options = {}) {
    const results = new Map();
    console.log(`[Agent] Starting batch analysis of ${logs.length} logs`);
    for (const log of logs) {
        console.log(`[Agent] Processing log: ${log.id}`);
        const result = await runLogWorkflow(log.content, options);
        results.set(log.id, result);
    }
    console.log(`[Agent] Batch analysis complete`);
    return results;
}
// ============================================================================
// Agent Status & Health
// ============================================================================
/**
 * Get agent health status
 */
async function getAgentHealth() {
    const checks = {};
    // Check Accomplish AI
    try {
        checks.accomplishAI = await isAccomplishAIAvailable();
    }
    catch {
        checks.accomplishAI = false;
    }
    // Check OpenRouter API
    try {
        const { healthCheck } = await Promise.resolve().then(() => __importStar(require("../ai/openrouterClient")));
        checks.openrouter = await healthCheck();
    }
    catch {
        checks.openrouter = false;
    }
    // Check environment
    checks.environment = !!process.env.OPENROUTER_API_KEY;
    // Determine overall status
    const allChecks = Object.values(checks);
    const status = allChecks.every(Boolean) ? "healthy" :
        allChecks.some(Boolean) ? "degraded" : "unhealthy";
    return { status, checks };
}
// Export default
exports.default = {
    runLogWorkflow,
    runCodeFixWorkflow,
    runMultiStepWorkflow,
    runBatchAnalysis,
    getAgentHealth,
    isAccomplishAIAvailable
};
//# sourceMappingURL=accomplishAgent.js.map