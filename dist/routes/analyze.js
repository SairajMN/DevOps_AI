"use strict";
/**
 * Analyze Routes - API endpoints for log analysis
 * Express/Fastify compatible route handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheckHandler = healthCheckHandler;
exports.listModelsHandler = listModelsHandler;
exports.getModelHandler = getModelHandler;
exports.analyzeLogHandler = analyzeLogHandler;
exports.quickAnalyzeHandler = quickAnalyzeHandler;
exports.fixCodeHandler = fixCodeHandler;
exports.multiStepHandler = multiStepHandler;
exports.batchAnalyzeHandler = batchAnalyzeHandler;
exports.createTaskHandler = createTaskHandler;
exports.executeTaskHandler = executeTaskHandler;
exports.getTaskHandler = getTaskHandler;
exports.getQueueStatusHandler = getQueueStatusHandler;
exports.retryTaskHandler = retryTaskHandler;
exports.detectTaskTypeHandler = detectTaskTypeHandler;
exports.pythonStatusHandler = pythonStatusHandler;
exports.pythonAnalyzeHandler = pythonAnalyzeHandler;
exports.pythonHistoryHandler = pythonHistoryHandler;
exports.pythonReportHandler = pythonReportHandler;
exports.hybridAnalyzeHandler = hybridAnalyzeHandler;
exports.registerRoutes = registerRoutes;
const accomplishAgent_1 = require("../agent/accomplishAgent");
const taskOrchestrator_1 = require("../agent/taskOrchestrator");
const models_1 = require("../ai/models");
const modelRouter_1 = require("../ai/modelRouter");
const pythonBridge_1 = require("../bridge/pythonBridge");
// ============================================================================
// Health Check
// ============================================================================
async function healthCheckHandler(req, res) {
    try {
        const health = await (0, accomplishAgent_1.getAgentHealth)();
        res.json({
            status: health.status,
            checks: health.checks,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Health check failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
// ============================================================================
// Model Endpoints
// ============================================================================
function listModelsHandler(req, res) {
    res.json({
        models: models_1.AI_MODELS.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            strengths: m.strengths,
            taskTypes: m.taskTypes
        }))
    });
}
function getModelHandler(req, res) {
    const { modelId } = req.params;
    const model = (0, models_1.getModelById)(modelId);
    if (!model) {
        res.status(404).json({ error: "Model not found" });
        return;
    }
    res.json({ model });
}
// ============================================================================
// Log Analysis Endpoints
// ============================================================================
async function analyzeLogHandler(req, res) {
    const { log, modelId, useEnhancedPrompt, confidenceThreshold } = req.body;
    if (!log) {
        res.status(400).json({ error: "Log content is required" });
        return;
    }
    try {
        const result = await (0, accomplishAgent_1.runLogWorkflow)(log, {
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
        }
        else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({
            error: "Analysis failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
async function quickAnalyzeHandler(req, res) {
    const { log } = req.body;
    if (!log) {
        res.status(400).json({ error: "Log content is required" });
        return;
    }
    try {
        const result = await (0, taskOrchestrator_1.quickAnalyze)(log);
        res.json({
            success: result.success,
            analysis: result.data,
            error: result.error,
            metadata: {
                model: result.model,
                duration: result.duration
            }
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Quick analysis failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
// ============================================================================
// Code Fix Endpoints
// ============================================================================
async function fixCodeHandler(req, res) {
    const { code, errorMessage, language, modelId } = req.body;
    if (!code || !errorMessage) {
        res.status(400).json({ error: "Code and errorMessage are required" });
        return;
    }
    try {
        const result = await (0, accomplishAgent_1.runCodeFixWorkflow)(code, errorMessage, language || "python", { modelId });
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
        }
        else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({
            error: "Code fix failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
// ============================================================================
// Multi-Step Analysis Endpoints
// ============================================================================
async function multiStepHandler(req, res) {
    const { log, code, language } = req.body;
    if (!log) {
        res.status(400).json({ error: "Log content is required" });
        return;
    }
    try {
        const result = await (0, accomplishAgent_1.runMultiStepWorkflow)(log, code, language);
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
        }
        else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({
            error: "Multi-step analysis failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
// ============================================================================
// Batch Analysis Endpoints
// ============================================================================
async function batchAnalyzeHandler(req, res) {
    const { logs, modelId } = req.body;
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
        res.status(400).json({ error: "Logs array is required" });
        return;
    }
    try {
        const results = await (0, accomplishAgent_1.runBatchAnalysis)(logs, { modelId });
        const response = {};
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
    }
    catch (error) {
        res.status(500).json({
            error: "Batch analysis failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
// ============================================================================
// Task Management Endpoints
// ============================================================================
function createTaskHandler(req, res) {
    const { type, input, priority, metadata } = req.body;
    if (!type || !input) {
        res.status(400).json({ error: "Task type and input are required" });
        return;
    }
    try {
        const task = taskOrchestrator_1.taskManager.createTask(type, input, priority, metadata);
        res.status(201).json({ task });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to create task",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
async function executeTaskHandler(req, res) {
    const { taskId } = req.params;
    try {
        const task = await taskOrchestrator_1.taskManager.executeTask(taskId);
        res.json({ task });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to execute task",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
function getTaskHandler(req, res) {
    const { taskId } = req.params;
    const task = taskOrchestrator_1.taskManager.getTask(taskId);
    if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
    }
    res.json({ task });
}
function getQueueStatusHandler(req, res) {
    const queue = taskOrchestrator_1.taskManager.getQueueStatus();
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
async function retryTaskHandler(req, res) {
    const { taskId } = req.params;
    try {
        const task = await taskOrchestrator_1.taskManager.retryTask(taskId);
        res.json({ task });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to retry task",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
// ============================================================================
// Utility Endpoints
// ============================================================================
function detectTaskTypeHandler(req, res) {
    const { content } = req.body;
    if (!content) {
        res.status(400).json({ error: "Content is required" });
        return;
    }
    const taskType = (0, modelRouter_1.detectTaskType)(content);
    res.json({ taskType });
}
// ============================================================================
// Python Integration Endpoints
// ============================================================================
async function pythonStatusHandler(req, res) {
    try {
        const envCheck = await pythonBridge_1.pythonBridge.checkPythonEnvironment();
        const depCheck = await pythonBridge_1.pythonBridge.checkPythonDependencies();
        res.json({
            python: envCheck,
            dependencies: depCheck
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Python status check failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
async function pythonAnalyzeHandler(req, res) {
    const { log } = req.body;
    if (!log) {
        res.status(400).json({ error: "Log content is required" });
        return;
    }
    try {
        const result = await (0, pythonBridge_1.analyzeWithPython)(log);
        res.json({
            success: true,
            source: "python",
            result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: "Python analysis failed",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
async function pythonHistoryHandler(req, res) {
    const { limit, type } = req.query;
    try {
        const result = await pythonBridge_1.pythonBridge.getIncidentHistory(limit ? parseInt(limit) : 20, type);
        res.json({
            success: true,
            history: result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to get history",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
async function pythonReportHandler(req, res) {
    const { type } = req.query;
    try {
        const result = await pythonBridge_1.pythonBridge.generateReport(type || "summary");
        res.json({
            success: true,
            report: result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to generate report",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
async function hybridAnalyzeHandler(req, res) {
    const { log, preferPython = false, preferAI = false } = req.body;
    if (!log) {
        res.status(400).json({ error: "Log content is required" });
        return;
    }
    const result = {
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
    const errors = [];
    // Run Python pipeline
    if (!preferAI) {
        try {
            console.log("[Hybrid] Running Python pipeline...");
            result.python = await (0, pythonBridge_1.analyzeWithPython)(log);
            result.combined.sources.push("python");
        }
        catch (error) {
            console.error("[Hybrid] Python pipeline failed:", error);
            errors.push(`Python: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Run AI analysis
    if (!preferPython) {
        try {
            console.log("[Hybrid] Running AI analysis...");
            const aiResult = await (0, accomplishAgent_1.runLogWorkflow)(log, { confidenceThreshold: 50 });
            if (aiResult.success && aiResult.data) {
                result.ai = aiResult.data;
                result.combined.sources.push("ai");
            }
        }
        catch (error) {
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
        }
        else {
            result.combined.error_type = result.ai.error_type;
            result.combined.root_cause = result.ai.root_cause;
            result.combined.confidence = result.ai.confidence;
        }
        // Combine fixes
        const pythonFixes = result.python.fixes?.map(f => f.description) || [];
        const aiFixes = result.ai.step_by_step_fix || [];
        result.combined.step_by_step_fix = [...new Set([...pythonFixes, ...aiFixes])];
        result.combined.suggested_fix = result.ai.suggested_fix || pythonFixes[0] || "";
    }
    else if (result.python) {
        // Only Python succeeded
        result.combined.error_type = result.python.classification?.category || "unknown";
        result.combined.root_cause = result.python.analysis?.root_cause || "";
        result.combined.confidence = Math.round((result.python.classification?.confidence || 0.5) * 100);
        result.combined.suggested_fix = result.python.fixes?.[0]?.description || "";
        result.combined.step_by_step_fix = result.python.fixes?.map(f => f.description) || [];
    }
    else if (result.ai) {
        // Only AI succeeded
        result.combined.error_type = result.ai.error_type;
        result.combined.root_cause = result.ai.root_cause;
        result.combined.confidence = result.ai.confidence;
        result.combined.suggested_fix = result.ai.suggested_fix;
        result.combined.step_by_step_fix = result.ai.step_by_step_fix;
    }
    else {
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
function registerRoutes(app) {
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
exports.default = {
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
//# sourceMappingURL=analyze.js.map