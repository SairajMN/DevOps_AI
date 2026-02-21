/**
 * Accomplish AI Agent - Primary AI orchestration layer
 * Uses @accomplish_ai/agent-core as primary with OpenRouter fallback
 */

import {
    buildProviderConfigs,
    createTaskManager,
    DEFAULT_MODEL
} from "@accomplish_ai/agent-core";
import {
    callLLMWithFallback,
    parseJSONResponse,
    truncateLogText,
    LLMResponse
} from "../ai/openrouterClient";
import { selectModel, detectTaskType } from "../ai/modelRouter";
import {
    buildLogPrompt,
    buildEnhancedLogPrompt,
    buildCodeFixPrompt,
    buildReflectionPrompt,
    LogAnalysisResult,
    CodeFixResult
} from "./prompts";

// ============================================================================
// Types
// ============================================================================

export interface AgentState {
    status: "idle" | "running" | "completed" | "failed";
    currentStep: string;
    attempts: number;
    maxAttempts: number;
    lastError?: string;
    startTime?: Date;
    endTime?: Date;
}

export interface WorkflowResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    model: string;
    attempts: number;
    duration: number;
    source: "accomplish-ai" | "openrouter";
}

export interface LogWorkflowOptions {
    useEnhancedPrompt?: boolean;
    confidenceThreshold?: number;
    maxRetries?: number;
    modelId?: string;
    taskType?: string;
    preferAccomplishAI?: boolean;
}

// ============================================================================
// Accomplish AI Manager (Singleton)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let taskManager: any = null;
let accomplishAIEnabled = false;

/**
 * Initialize Accomplish AI Task Manager
 */
async function initAccomplishAI(): Promise<any> {
    if (taskManager) {
        return taskManager;
    }

    try {
        console.log("[AccomplishAI] Initializing...");

        // Build provider configs - use OpenAI if available
        // Cast to any to bypass type checking since API matches test file
        const buildConfig: any = buildProviderConfigs;
        const providersResult = await buildConfig({
            enableOpenAi: !!process.env.OPENAI_API_KEY
        });

        // Create task manager with providers
        const createManager: any = createTaskManager;
        taskManager = createManager({
            providers: providersResult.providers,
            model: process.env.DEFAULT_MODEL || DEFAULT_MODEL
        });

        accomplishAIEnabled = true;
        console.log("[AccomplishAI] Initialized successfully");
        return taskManager;
    } catch (error) {
        console.error("[AccomplishAI] Initialization failed:", error);
        accomplishAIEnabled = false;
        return null;
    }
}

/**
 * Check if Accomplish AI is available
 */
export async function isAccomplishAIAvailable(): Promise<boolean> {
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
export async function runLogWorkflow(
    logText: string,
    options: LogWorkflowOptions = {}
): Promise<WorkflowResult<LogAnalysisResult>> {
    const opts = {
        preferAccomplishAI: true,
        ...options
    };
    const startTime = Date.now();
    let attempts = 0;

    // Truncate log if too large
    const truncatedLog = truncateLogText(logText);

    // Determine task type and model
    const taskType = opts.taskType || detectTaskType(truncatedLog) || "log-analysis";
    const model = opts.modelId || selectModel(taskType as any);

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
                    ? buildEnhancedLogPrompt(truncatedLog)
                    : buildLogPrompt(truncatedLog);

                // Use Accomplish AI task manager
                const result = await tm.runTask({
                    input: messages.map((m: { content: string }) => m.content).join("\n\n")
                });

                if (result && result.output) {
                    const analysis = parseJSONResponse<LogAnalysisResult>(result.output);

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
        } catch (error) {
            console.warn("[AccomplishAI] Analysis failed, falling back to OpenRouter:", error);
        }
    }

    // Fallback to OpenRouter
    console.log("[OpenRouter] Running log analysis...");
    attempts++;

    try {
        const messages = opts.useEnhancedPrompt
            ? buildEnhancedLogPrompt(truncatedLog)
            : buildLogPrompt(truncatedLog);

        const response: LLMResponse = await callLLMWithFallback(
            {
                model,
                messages,
                temperature: 0,
                max_tokens: 4096
            },
            taskType
        );

        const analysis = parseJSONResponse<LogAnalysisResult>(response.content);

        if (!analysis) {
            throw new Error("Failed to parse LLM response as JSON");
        }

        // Check confidence threshold
        if (analysis.confidence < (opts.confidenceThreshold || 70)) {
            console.log(`[OpenRouter] Low confidence (${analysis.confidence}), running reflection...`);

            const reflectionMessages = buildReflectionPrompt(truncatedLog, JSON.stringify(analysis));
            const reflectionResponse = await callLLMWithFallback(
                {
                    model,
                    messages: reflectionMessages,
                    temperature: 0,
                    max_tokens: 4096
                },
                taskType
            );

            const improvedAnalysis = parseJSONResponse<LogAnalysisResult>(reflectionResponse.content);
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
    } catch (error) {
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
export async function runCodeFixWorkflow(
    code: string,
    errorMessage: string,
    language: string = "python",
    options: LogWorkflowOptions = {}
): Promise<WorkflowResult<CodeFixResult>> {
    const startTime = Date.now();
    let attempts = 0;

    const taskType = "code-generation";
    const model = options.modelId || selectModel(taskType as any);

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

                const messages = buildCodeFixPrompt(code, errorMessage, language);

                const result = await tm.runTask({
                    input: messages.map((m: { content: string }) => m.content).join("\n\n")
                });

                if (result && result.output) {
                    const fixResult = parseJSONResponse<CodeFixResult>(result.output);

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
        } catch (error) {
            console.warn("[AccomplishAI] Code fix failed, falling back to OpenRouter:", error);
        }
    }

    // Fallback to OpenRouter
    console.log("[OpenRouter] Running code fix...");
    attempts++;

    try {
        const messages = buildCodeFixPrompt(code, errorMessage, language);

        const response = await callLLMWithFallback(
            {
                model,
                messages,
                temperature: 0,
                max_tokens: 4096
            },
            taskType
        );

        const fixResult = parseJSONResponse<CodeFixResult>(response.content);

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
    } catch (error) {
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

// ============================================================================
// Multi-Step Analysis Workflow
// ============================================================================

export interface MultiStepResult {
    analysis: LogAnalysisResult;
    fix?: CodeFixResult;
    classification?: {
        category: string;
        priority: string;
        tags: string[];
    };
}

/**
 * Run comprehensive multi-step analysis
 */
export async function runMultiStepWorkflow(
    logText: string,
    code?: string,
    language: string = "python"
): Promise<WorkflowResult<MultiStepResult>> {
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

        const result: MultiStepResult = {
            analysis: analysisResult.data
        };

        // Step 2: Generate code fix if code is provided and it's a code issue
        if (code && analysisResult.data.is_code_issue) {
            const fixResult = await runCodeFixWorkflow(
                code,
                analysisResult.data.root_cause,
                language,
                { preferAccomplishAI: true }
            );

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
    } catch (error) {
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
export async function runBatchAnalysis(
    logs: Array<{ id: string; content: string }>,
    options: LogWorkflowOptions = {}
): Promise<Map<string, WorkflowResult<LogAnalysisResult>>> {
    const results = new Map<string, WorkflowResult<LogAnalysisResult>>();

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
export async function getAgentHealth(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    checks: Record<string, boolean>;
}> {
    const checks: Record<string, boolean> = {};

    // Check Accomplish AI
    try {
        checks.accomplishAI = await isAccomplishAIAvailable();
    } catch {
        checks.accomplishAI = false;
    }

    // Check OpenRouter API
    try {
        const { healthCheck } = await import("../ai/openrouterClient");
        checks.openrouter = await healthCheck();
    } catch {
        checks.openrouter = false;
    }

    // Check environment
    checks.environment = !!process.env.OPENROUTER_API_KEY;

    // Determine overall status
    const allChecks = Object.values(checks);
    const status: "healthy" | "degraded" | "unhealthy" =
        allChecks.every(Boolean) ? "healthy" :
            allChecks.some(Boolean) ? "degraded" : "unhealthy";

    return { status, checks };
}

// Export default
export default {
    runLogWorkflow,
    runCodeFixWorkflow,
    runMultiStepWorkflow,
    runBatchAnalysis,
    getAgentHealth,
    isAccomplishAIAvailable
};