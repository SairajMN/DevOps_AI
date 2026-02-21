/**
 * Analyze Routes - API endpoints for log analysis
 * Express/Fastify compatible route handlers
 */

import { Request, Response } from "express";
import {
    runLogWorkflow,
    runCodeFixWorkflow,
    runMultiStepWorkflow,
    runBatchAnalysis,
    getAgentHealth,
    WorkflowResult
} from "../agent/accomplishAgent";
import { taskManager, quickAnalyze, quickFix, fullAnalysis } from "../agent/taskOrchestrator";
import { AI_MODELS, getModelById } from "../ai/models";
import { detectTaskType } from "../ai/modelRouter";
import { LogAnalysisResult, CodeFixResult } from "../agent/prompts";
import {
    pythonBridge,
    analyzeWithPython,
    PythonAnalysisResult
} from "../bridge/pythonBridge";

// ============================================================================
// Request/Response Types
// ============================================================================

interface AnalyzeLogRequest {
    log: string;
    modelId?: string;
    useEnhancedPrompt?: boolean;
    confidenceThreshold?: number;
}

interface FixCodeRequest {
    code: string;
    errorMessage: string;
    language?: string;
    modelId?: string;
}

interface MultiStepRequest {
    log: string;
    code?: string;
    language?: string;
}

interface BatchRequest {
    logs: Array<{ id: string; content: string }>;
    modelId?: string;
}

// ============================================================================
// Health Check
// ============================================================================

export async function healthCheckHandler(req: Request, res: Response): Promise<void> {
    try {
        const health = await getAgentHealth();
        res.json({
            status: health.status,
            checks: health.checks,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: "Health check failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

// ============================================================================
// Model Endpoints
// ============================================================================

export function listModelsHandler(req: Request, res: Response): void {
    res.json({
        models: AI_MODELS.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            strengths: m.strengths,
            taskTypes: m.taskTypes
        }))
    });
}

export function getModelHandler(req: Request, res: Response): void {
    const { modelId } = req.params;
    const model = getModelById(modelId);

    if (!model) {
        res.status(404).json({ error: "Model not found" });
        return;
    }

    res.json({ model });
}

// ============================================================================
// Log Analysis Endpoints
// ============================================================================

export async function analyzeLogHandler(req: Request, res: Response): Promise<void> {
    const { log, modelId, useEnhancedPrompt, confidenceThreshold } = req.body as AnalyzeLogRequest;

    if (!log) {
        res.status(400).json({ error: "Log content is required" });
        return;
    }

    try {
        const result = await runLogWorkflow(log, {
            modelId,
            useEnhancedPrompt,
            confidenceThreshold
        });

        if (result.success) {
            res.json({
                success: true,
                analysis: result.data,
                metadata: {
                    model: result.model,
                    attempts: result.attempts,
                    duration: result.duration
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            error: "Analysis failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

export async function quickAnalyzeHandler(req: Request, res: Response): Promise<void> {
    const { log } = req.body as { log: string };

    if (!log) {
        res.status(400).json({ error: "Log content is required" });
        return;
    }

    try {
        const result = await quickAnalyze(log);

        res.json({
            success: result.success,
            analysis: result.data,
            error: result.error,
            metadata: {
                model: result.model,
                duration: result.duration
            }
        });
    } catch (error) {
        res.status(500).json({
            error: "Quick analysis failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

// ============================================================================
// Code Fix Endpoints
// ============================================================================

export async function fixCodeHandler(req: Request, res: Response): Promise<void> {
    const { code, errorMessage, language, modelId } = req.body as FixCodeRequest;

    if (!code || !errorMessage) {
        res.status(400).json({ error: "Code and errorMessage are required" });
        return;
    }

    try {
        const result = await runCodeFixWorkflow(code, errorMessage, language || "python", { modelId });

        if (result.success) {
            res.json({
                success: true,
                fix: result.data,
                metadata: {
                    model: result.model,
                    attempts: result.attempts,
                    duration: result.duration
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            error: "Code fix failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

// ============================================================================
// Multi-Step Analysis Endpoints
// ============================================================================

export async function multiStepHandler(req: Request, res: Response): Promise<void> {
    const { log, code, language } = req.body as MultiStepRequest;

    if (!log) {
        res.status(400).json({ error: "Log content is required" });
        return;
    }

    try {
        const result = await runMultiStepWorkflow(log, code, language);

        if (result.success) {
            res.json({
                success: true,
                analysis: result.data?.analysis,
                fix: result.data?.fix,
                classification: result.data?.classification,
                metadata: {
                    model: result.model,
                    attempts: result.attempts,
                    duration: result.duration
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            error: "Multi-step analysis failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

// ============================================================================
// Batch Analysis Endpoints
// ============================================================================

export async function batchAnalyzeHandler(req: Request, res: Response): Promise<void> {
    const { logs, modelId } = req.body as BatchRequest;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
        res.status(400).json({ error: "Logs array is required" });
        return;
    }

    try {
        const results = await runBatchAnalysis(logs, { modelId });
        const response: Record<string, unknown> = {};

        results.forEach((result, id) => {
            response[id] = {
                success: result.success,
                analysis: result.data,
                error: result.error,
                metadata: {
                    model: result.model,
                    duration: result.duration
                }
            };
        });

        res.json({
            success: true,
            totalProcessed: logs.length,
            results: response
        });
    } catch (error) {
        res.status(500).json({
            error: "Batch analysis failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

// ============================================================================
// Task Management Endpoints
// ============================================================================

export function createTaskHandler(req: Request, res: Response): void {
    const { type, input, priority, metadata } = req.body;

    if (!type || !input) {
        res.status(400).json({ error: "Task type and input are required" });
        return;
    }

    try {
        const task = taskManager.createTask(type, input, priority, metadata);
        res.status(201).json({ task });
    } catch (error) {
        res.status(500).json({
            error: "Failed to create task",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

export async function executeTaskHandler(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;

    try {
        const task = await taskManager.executeTask(taskId);
        res.json({ task });
    } catch (error) {
        res.status(500).json({
            error: "Failed to execute task",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

export function getTaskHandler(req: Request, res: Response): void {
    const { taskId } = req.params;
    const task = taskManager.getTask(taskId);

    if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
    }

    res.json({ task });
}

export function getQueueStatusHandler(req: Request, res: Response): void {
    const queue = taskManager.getQueueStatus();
    res.json({
        queue: {
            pending: queue.pending.length,
            running: queue.running.length,
            completed: queue.completed.length,
            failed: queue.failed.length
        },
        tasks: queue
    });
}

export async function retryTaskHandler(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;

    try {
        const task = await taskManager.retryTask(taskId);
        res.json({ task });
    } catch (error) {
        res.status(500).json({
            error: "Failed to retry task",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

// ============================================================================
// Utility Endpoints
// ============================================================================

export function detectTaskTypeHandler(req: Request, res: Response): void {
    const { content } = req.body;

    if (!content) {
        res.status(400).json({ error: "Content is required" });
        return;
    }

    const taskType = detectTaskType(content);
    res.json({ taskType });
}

// ============================================================================
// Python Integration Endpoints
// ============================================================================

export async function pythonStatusHandler(req: Request, res: Response): Promise<void> {
    try {
        const envCheck = await pythonBridge.checkPythonEnvironment();
        const depCheck = await pythonBridge.checkPythonDependencies();

        res.json({
            python: envCheck,
            dependencies: depCheck
        });
    } catch (error) {
        res.status(500).json({
            error: "Python status check failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

export async function pythonAnalyzeHandler(req: Request, res: Response): Promise<void> {
    const { log } = req.body as { log: string };

    if (!log) {
        res.status(400).json({ error: "Log content is required" });
        return;
    }

    try {
        const result = await analyzeWithPython(log);
        res.json({
            success: true,
            source: "python",
            result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Python analysis failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

export async function pythonHistoryHandler(req: Request, res: Response): Promise<void> {
    const { limit, type } = req.query;

    try {
        const result = await pythonBridge.getIncidentHistory(
            limit ? parseInt(limit as string) : 20,
            type as string
        );
        res.json({
            success: true,
            history: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to get history",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

export async function pythonReportHandler(req: Request, res: Response): Promise<void> {
    const { type } = req.query;

    try {
        const result = await pythonBridge.generateReport(type as string || "summary");
        res.json({
            success: true,
            report: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to generate report",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

// ============================================================================
// Hybrid Analysis Endpoint (Python + AI)
// ============================================================================

interface HybridAnalysisResult {
    python: PythonAnalysisResult | null;
    ai: LogAnalysisResult | null;
    combined: {
        error_type: string;
        root_cause: string;
        confidence: number;
        suggested_fix: string;
        step_by_step_fix: string[];
        sources: string[];
    };
}

export async function hybridAnalyzeHandler(req: Request, res: Response): Promise<void> {
    const { log, preferPython = false, preferAI = false } = req.body as {
        log: string;
        preferPython?: boolean;
        preferAI?: boolean;
    };

    if (!log) {
        res.status(400).json({ error: "Log content is required" });
        return;
    }

    const result: HybridAnalysisResult = {
        python: null,
        ai: null,
        combined: {
            error_type: "",
            root_cause: "",
            confidence: 0,
            suggested_fix: "",
            step_by_step_fix: [],
            sources: []
        }
    };

    const errors: string[] = [];

    // Run Python pipeline
    if (!preferAI) {
        try {
            console.log("[Hybrid] Running Python pipeline...");
            result.python = await analyzeWithPython(log);
            result.combined.sources.push("python");
        } catch (error) {
            console.error("[Hybrid] Python pipeline failed:", error);
            errors.push(`Python: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Run AI analysis
    if (!preferPython) {
        try {
            console.log("[Hybrid] Running AI analysis...");
            const aiResult = await runLogWorkflow(log, { confidenceThreshold: 50 });
            if (aiResult.success && aiResult.data) {
                result.ai = aiResult.data;
                result.combined.sources.push("ai");
            }
        } catch (error) {
            console.error("[Hybrid] AI analysis failed:", error);
            errors.push(`AI: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Combine results
    if (result.python && result.ai) {
        // Both succeeded - merge with confidence weighting
        const pythonConf = result.python.classification?.confidence || 0.5;
        const aiConf = (result.ai.confidence || 50) / 100;

        if (pythonConf >= aiConf) {
            result.combined.error_type = result.python.classification?.category || result.ai.error_type;
            result.combined.root_cause = result.python.analysis?.root_cause || result.ai.root_cause;
            result.combined.confidence = Math.round(pythonConf * 100);
        } else {
            result.combined.error_type = result.ai.error_type;
            result.combined.root_cause = result.ai.root_cause;
            result.combined.confidence = result.ai.confidence;
        }

        // Combine fixes
        const pythonFixes = result.python.fixes?.map(f => f.description) || [];
        const aiFixes = result.ai.step_by_step_fix || [];
        result.combined.step_by_step_fix = [...new Set([...pythonFixes, ...aiFixes])];
        result.combined.suggested_fix = result.ai.suggested_fix || pythonFixes[0] || "";
    } else if (result.python) {
        // Only Python succeeded
        result.combined.error_type = result.python.classification?.category || "unknown";
        result.combined.root_cause = result.python.analysis?.root_cause || "";
        result.combined.confidence = Math.round((result.python.classification?.confidence || 0.5) * 100);
        result.combined.suggested_fix = result.python.fixes?.[0]?.description || "";
        result.combined.step_by_step_fix = result.python.fixes?.map(f => f.description) || [];
    } else if (result.ai) {
        // Only AI succeeded
        result.combined.error_type = result.ai.error_type;
        result.combined.root_cause = result.ai.root_cause;
        result.combined.confidence = result.ai.confidence;
        result.combined.suggested_fix = result.ai.suggested_fix;
        result.combined.step_by_step_fix = result.ai.step_by_step_fix;
    } else {
        // Both failed
        res.status(500).json({
            success: false,
            errors,
            message: "Both Python and AI analysis failed"
        });
        return;
    }

    res.json({
        success: true,
        python: result.python,
        ai: result.ai ? {
            error_type: result.ai.error_type,
            root_cause: result.ai.root_cause,
            confidence: result.ai.confidence,
            suggested_fix: result.ai.suggested_fix
        } : null,
        combined: result.combined
    });
}

// ============================================================================
// Route Registration Helper
// ============================================================================

export function registerRoutes(app: import("express").Application): void {
    // Health
    app.get("/api/health", healthCheckHandler);

    // Models
    app.get("/api/models", listModelsHandler);
    app.get("/api/models/:modelId", getModelHandler);

    // Analysis
    app.post("/api/analyze", analyzeLogHandler);
    app.post("/api/analyze/quick", quickAnalyzeHandler);
    app.post("/api/analyze/multi", multiStepHandler);
    app.post("/api/analyze/batch", batchAnalyzeHandler);

    // Code Fix
    app.post("/api/fix", fixCodeHandler);

    // Tasks
    app.post("/api/tasks", createTaskHandler);
    app.get("/api/tasks/:taskId", getTaskHandler);
    app.post("/api/tasks/:taskId/execute", executeTaskHandler);
    app.post("/api/tasks/:taskId/retry", retryTaskHandler);
    app.get("/api/queue", getQueueStatusHandler);

    // Utilities
    app.post("/api/detect-task", detectTaskTypeHandler);

    // Python Integration
    app.get("/api/python/status", pythonStatusHandler);
    app.post("/api/python/analyze", pythonAnalyzeHandler);
    app.get("/api/python/history", pythonHistoryHandler);
    app.get("/api/python/report", pythonReportHandler);

    // Hybrid Analysis (Python + AI)
    app.post("/api/analyze/hybrid", hybridAnalyzeHandler);
}

export default {
    healthCheckHandler,
    listModelsHandler,
    getModelHandler,
    analyzeLogHandler,
    quickAnalyzeHandler,
    fixCodeHandler,
    multiStepHandler,
    batchAnalyzeHandler,
    createTaskHandler,
    executeTaskHandler,
    getTaskHandler,
    getQueueStatusHandler,
    retryTaskHandler,
    detectTaskTypeHandler,
    registerRoutes
};