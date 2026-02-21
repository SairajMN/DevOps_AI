"use strict";
/**
 * Task Orchestrator - Manages complex multi-step tasks
 * Coordinates between different tools and workflows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskManager = void 0;
exports.quickAnalyze = quickAnalyze;
exports.quickFix = quickFix;
exports.fullAnalysis = fullAnalysis;
const accomplishAgent_1 = require("./accomplishAgent");
// ============================================================================
// Task Manager
// ============================================================================
class TaskManager {
    constructor() {
        this.queue = {
            pending: [],
            running: [],
            completed: [],
            failed: []
        };
        this.maxConcurrent = 5;
        this.taskIdCounter = 0;
    }
    /**
     * Create a new task
     */
    createTask(type, input, priority = "medium", metadata) {
        const task = {
            id: `task-${++this.taskIdCounter}-${Date.now()}`,
            type,
            status: "pending",
            priority,
            input,
            createdAt: new Date(),
            metadata
        };
        // Insert based on priority
        this.insertByPriority(task);
        console.log(`[TaskManager] Created task ${task.id} with priority ${priority}`);
        return task;
    }
    /**
     * Insert task by priority
     */
    insertByPriority(task) {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const insertIndex = this.queue.pending.findIndex(t => priorityOrder[t.priority] > priorityOrder[task.priority]);
        if (insertIndex === -1) {
            this.queue.pending.push(task);
        }
        else {
            this.queue.pending.splice(insertIndex, 0, task);
        }
    }
    /**
     * Execute a task
     */
    async executeTask(taskId) {
        const taskIndex = this.queue.pending.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            throw new Error(`Task ${taskId} not found in pending queue`);
        }
        const task = this.queue.pending.splice(taskIndex, 1)[0];
        task.status = "running";
        task.startedAt = new Date();
        this.queue.running.push(task);
        console.log(`[TaskManager] Executing task ${task.id}`);
        try {
            let result;
            switch (task.type) {
                case "log-analysis":
                case "debugging":
                case "root-cause-analysis":
                    result = await (0, accomplishAgent_1.runLogWorkflow)(task.input.logText || "", {
                        modelId: task.input.modelId,
                        taskType: task.type
                    });
                    if (result.success && result.data) {
                        task.output = { analysis: result.data };
                    }
                    break;
                case "code-generation":
                case "refactoring":
                    result = await (0, accomplishAgent_1.runCodeFixWorkflow)(task.input.code || "", task.input.logText || "", task.input.language || "python");
                    if (result.success && result.data) {
                        task.output = { fix: result.data };
                    }
                    break;
                default:
                    // Multi-step workflow for complex tasks
                    const multiResult = await (0, accomplishAgent_1.runMultiStepWorkflow)(task.input.logText || "", task.input.code, task.input.language);
                    if (multiResult.success && multiResult.data) {
                        task.output = {
                            analysis: multiResult.data.analysis,
                            fix: multiResult.data.fix,
                            classification: multiResult.data.classification
                        };
                    }
            }
            task.status = "completed";
            task.completedAt = new Date();
        }
        catch (error) {
            task.status = "failed";
            task.error = error instanceof Error ? error.message : String(error);
            console.error(`[TaskManager] Task ${task.id} failed:`, task.error);
        }
        // Move to appropriate queue
        const runningIndex = this.queue.running.findIndex(t => t.id === taskId);
        this.queue.running.splice(runningIndex, 1);
        if (task.status === "completed") {
            this.queue.completed.push(task);
        }
        else {
            this.queue.failed.push(task);
        }
        return task;
    }
    /**
     * Process next task in queue
     */
    async processNext() {
        if (this.queue.pending.length === 0) {
            return null;
        }
        if (this.queue.running.length >= this.maxConcurrent) {
            console.log(`[TaskManager] Max concurrent tasks reached`);
            return null;
        }
        const nextTask = this.queue.pending[0];
        return this.executeTask(nextTask.id);
    }
    /**
     * Process all pending tasks
     */
    async processAll() {
        const results = [];
        while (this.queue.pending.length > 0) {
            const task = await this.processNext();
            if (task) {
                results.push(task);
            }
            else {
                break;
            }
        }
        return results;
    }
    /**
     * Get task by ID
     */
    getTask(taskId) {
        return [
            ...this.queue.pending,
            ...this.queue.running,
            ...this.queue.completed,
            ...this.queue.failed
        ].find(t => t.id === taskId);
    }
    /**
     * Get queue status
     */
    getQueueStatus() {
        return { ...this.queue };
    }
    /**
     * Cancel a task
     */
    cancelTask(taskId) {
        const pendingIndex = this.queue.pending.findIndex(t => t.id === taskId);
        if (pendingIndex !== -1) {
            const task = this.queue.pending.splice(pendingIndex, 1)[0];
            task.status = "cancelled";
            this.queue.failed.push(task);
            return true;
        }
        return false;
    }
    /**
     * Clear completed tasks
     */
    clearCompleted() {
        const count = this.queue.completed.length;
        this.queue.completed = [];
        return count;
    }
    /**
     * Retry a failed task
     */
    async retryTask(taskId) {
        const failedTask = this.queue.failed.find(t => t.id === taskId);
        if (!failedTask) {
            throw new Error(`Task ${taskId} not found in failed queue`);
        }
        // Remove from failed queue
        const failedIndex = this.queue.failed.findIndex(t => t.id === taskId);
        this.queue.failed.splice(failedIndex, 1);
        // Reset and re-queue
        failedTask.status = "pending";
        failedTask.error = undefined;
        failedTask.completedAt = undefined;
        this.insertByPriority(failedTask);
        return this.executeTask(failedTask.id);
    }
}
// ============================================================================
// Singleton Instance
// ============================================================================
exports.taskManager = new TaskManager();
// ============================================================================
// Convenience Functions
// ============================================================================
/**
 * Quick analyze log
 */
async function quickAnalyze(logText) {
    return (0, accomplishAgent_1.runLogWorkflow)(logText);
}
/**
 * Quick fix code
 */
async function quickFix(code, errorMessage, language = "python") {
    return (0, accomplishAgent_1.runCodeFixWorkflow)(code, errorMessage, language);
}
/**
 * Full analysis with fix
 */
async function fullAnalysis(logText, code, language) {
    const result = await (0, accomplishAgent_1.runMultiStepWorkflow)(logText, code, language);
    if (result.success && result.data) {
        return {
            success: true,
            data: {
                analysis: result.data.analysis,
                fix: result.data.fix,
                classification: result.data.classification
            },
            model: result.model,
            attempts: result.attempts,
            duration: result.duration,
            source: result.source
        };
    }
    return {
        success: false,
        error: result.error,
        model: result.model,
        attempts: result.attempts,
        duration: result.duration,
        source: "openrouter"
    };
}
exports.default = {
    taskManager: exports.taskManager,
    quickAnalyze,
    quickFix,
    fullAnalysis
};
//# sourceMappingURL=taskOrchestrator.js.map